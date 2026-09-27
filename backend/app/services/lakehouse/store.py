"""
Tables in the Meldra lakehouse.

Every customer (tenant) gets its own Iceberg namespace, derived on the server
from the signed-in account, never from the request. A table is one source (one
CSV, one Excel sheet, one API pull, one database query). Its Meldra profile
(display names, column roles, known values, date range, non-secret origin) is a
JSON file written next to the table's data through the table's own FileIO, and
the table property "meldra.profile" points at the current version.

Ingest streams: files are read in Arrow record batches, typed with the same
DuckDB SQL for every batch, and committed to Iceberg in one transaction, so a
reader never sees half a table.
"""
import csv
import hashlib
import io
import json
import re
import secrets
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, List, Optional, Tuple

import duckdb
import pyarrow as pa

from . import config
from .profile import SAMPLE_ROWS, profile_sample, select_sql, summarize, unique_keys

TABLE_RE = re.compile(r"^[a-z0-9_]{1,80}$")
APPEND_ROWS = 500_000
MAX_SHEETS = 40

_catalog = None
_catalog_lock = threading.Lock()


class LakehouseError(ValueError):
    """A problem the user can act on (bad file, unknown table, lakehouse off)."""


def get_catalog():
    global _catalog
    if not config.enabled():
        raise LakehouseError("The Meldra lakehouse is not configured on this server.")
    with _catalog_lock:
        if _catalog is None:
            from pyiceberg.catalog import load_catalog
            _catalog = load_catalog("meldra", **config.catalog_properties())
        return _catalog


def reset_catalog():
    """Forget the cached catalog (tests and configuration changes)."""
    global _catalog
    with _catalog_lock:
        _catalog = None


def namespace_for(tenant: str) -> str:
    """One namespace per tenant, not guessable from the e-mail and stable across sessions."""
    digest = hashlib.sha256(f"meldra-tenant:{str(tenant).strip().lower()}".encode()).hexdigest()[:24]
    prefix = config.namespace_prefix()
    return f"{prefix}_t_{digest}" if prefix else f"t_{digest}"


def _ensure_namespace(cat, ns: str) -> None:
    from pyiceberg.exceptions import NamespaceAlreadyExistsError
    try:
        cat.create_namespace(ns)
    except NamespaceAlreadyExistsError:
        pass


def _ident(ns: str, table: str) -> Tuple[str, str]:
    if not TABLE_RE.match(table or ""):
        raise LakehouseError("Unknown table.")
    return (ns, table)


def _new_table_name(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", str(name).lower()).strip("_")[:40] or "source"
    return f"{base}_{secrets.token_hex(3)}"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------- readers: file → Arrow record batches (all text; typing happens later) ----------------

def _sniff_delimiter(sample: str, ext: str) -> str:
    if ext == "tsv":
        return "\t"
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except csv.Error:
        return ","


def _clean_headers(raw: List[Any]) -> List[str]:
    out = []
    for i, h in enumerate(raw):
        h = str(h if h is not None else "").replace("﻿", "").strip()
        out.append(h or f"column_{i + 1}")
    seen: Dict[str, int] = {}
    for i, h in enumerate(out):  # duplicate headers get a suffix, like spreadsheet tools do
        if h in seen:
            seen[h] += 1
            out[i] = f"{h} ({seen[h]})"
        else:
            seen[h] = 1
    return out


def read_csv(path: str, ext: str) -> Iterator[pa.RecordBatch]:
    """
    Stream a CSV as all-text Arrow batches. DuckDB's reader keeps memory flat however large
    the file is; pyarrow's reader is the fallback for files that are not UTF-8.
    """
    for encoding in ("utf-8", "latin-1"):
        try:
            with open(path, "r", encoding=encoding, newline="") as f:
                head = f.read(65536)
            break
        except UnicodeDecodeError:
            continue
    delim = _sniff_delimiter(head, ext)
    first = next(csv.reader(io.StringIO(head), delimiter=delim), None)
    if not first:
        raise LakehouseError("The file has no header line.")
    names = _clean_headers(first)
    if encoding == "utf-8":
        yield from _read_csv_duckdb(path, delim, names)
    else:
        yield from _read_csv_arrow(path, delim, names, encoding)


def _read_csv_duckdb(path: str, delim: str, names: List[str]) -> Iterator[pa.RecordBatch]:
    con = duckdb.connect()
    try:
        _limit(con)
        cols = "{" + ", ".join(f"'{n.replace(chr(39), chr(39) * 2)}': 'VARCHAR'" for n in names) + "}"
        rel = con.execute(
            "SELECT * FROM read_csv(?, delim = ?, quote = '\"', escape = '\"', header = false, skip = 1, "
            f"columns = {cols}, ignore_errors = true, null_padding = true, max_line_size = 16777216)",
            [path, delim],
        )
        for batch in rel.fetch_record_batch(100_000):
            if batch.num_rows:
                yield batch
    finally:
        con.close()


def _read_csv_arrow(path: str, delim: str, names: List[str], encoding: str) -> Iterator[pa.RecordBatch]:
    import pyarrow.csv as pacsv
    reader = pacsv.open_csv(
        path,
        read_options=pacsv.ReadOptions(column_names=names, skip_rows=1, block_size=4 << 20, encoding=encoding),
        parse_options=pacsv.ParseOptions(delimiter=delim, newlines_in_values=True, invalid_row_handler=lambda row: "skip"),
        convert_options=pacsv.ConvertOptions(column_types={n: pa.string() for n in names}, strings_can_be_null=False),
    )
    for batch in reader:
        if batch.num_rows:
            yield batch


def _limit(con) -> None:
    """Bound DuckDB's memory; larger work spills to disk instead of failing or exhausting the server."""
    import os
    import tempfile
    con.execute(f"SET memory_limit = '{os.environ.get('LAKEHOUSE_DUCKDB_MEMORY', '1GB')}'")
    con.execute(f"SET temp_directory = '{os.path.join(tempfile.gettempdir(), 'meldra-duckdb')}'")


def _cell(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, bool):
        return "true" if v else "false"  # as the browser writes them
    if isinstance(v, datetime):
        return v.date().isoformat() if (v.hour, v.minute, v.second) == (0, 0, 0) else v.isoformat(sep=" ")
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def _rows_to_batches(names: List[str], rows: Iterator[List[Any]], size: int = 50_000) -> Iterator[pa.RecordBatch]:
    buf: List[List[Any]] = []
    schema = pa.schema([(n, pa.string()) for n in names])
    for r in rows:
        buf.append([_cell(r[i]) if i < len(r) else None for i in range(len(names))])
        if len(buf) >= size:
            yield pa.RecordBatch.from_arrays([pa.array([x[i] for x in buf], pa.string()) for i in range(len(names))], schema=schema)
            buf = []
    if buf:
        yield pa.RecordBatch.from_arrays([pa.array([x[i] for x in buf], pa.string()) for i in range(len(names))], schema=schema)


def read_excel(path: str, ext: str) -> List[Tuple[str, List[str], Iterator[pa.RecordBatch]]]:
    """One entry per non-empty sheet: (sheet name, headers, batches)."""
    out = []
    if ext == "xlsx":
        from openpyxl import load_workbook
        wb = load_workbook(path, read_only=True, data_only=True)
        for ws in wb.worksheets[:MAX_SHEETS]:
            it = ws.iter_rows(values_only=True)
            header = next(it, None)
            if not header or not any(h not in (None, "") for h in header):
                continue
            keep = [i for i, h in enumerate(header) if h not in (None, "")]
            names = _clean_headers([header[i] for i in keep])

            def rows(it=it, keep=keep):  # bind this sheet's iterator and columns (not the loop's last ones)
                for r in it:
                    if r and any(c not in (None, "") for c in r):
                        yield [r[i] if i < len(r) else None for i in keep]
            out.append((ws.title, names, _rows_to_batches(names, rows())))
    else:
        import xlrd
        book = xlrd.open_workbook(path)
        for sh in book.sheets()[:MAX_SHEETS]:
            if sh.nrows < 2:
                continue
            header = sh.row_values(0)
            keep = [i for i, h in enumerate(header) if str(h).strip()]
            names = _clean_headers([header[i] for i in keep])

            def rows(sh=sh, keep=keep):
                for r in range(1, sh.nrows):
                    vals = sh.row_values(r)
                    for i in keep:
                        if sh.cell_type(r, i) == xlrd.XL_CELL_DATE:
                            vals[i] = xlrd.xldate_as_datetime(vals[i], book.datemode)
                    yield [vals[i] for i in keep]
            out.append((sh.name, names, _rows_to_batches(names, rows())))
    return out


def read_parquet(path: str) -> Iterator[pa.RecordBatch]:
    import pyarrow.parquet as pq
    for batch in pq.ParquetFile(path).iter_batches(batch_size=200_000):
        yield batch


# ---------------- ingest ----------------

def _write_profile(tbl, profile: Dict[str, Any]) -> str:
    location = f"{tbl.location().rstrip('/')}/meldra/profile-{int(time.time() * 1000)}-{secrets.token_hex(3)}.json"
    out = tbl.io.new_output(location)
    with out.create(overwrite=True) as f:
        f.write(json.dumps(profile, default=str).encode())
    previous = tbl.properties.get("meldra.profile")
    with tbl.transaction() as tx:
        tx.set_properties({"meldra.profile": location, "meldra.name": str(profile.get("name", ""))[:200]})
    if previous and previous != location:
        _delete_file(tbl, previous)  # keep one profile version; nothing is left behind after edits
    return location


def _delete_file(tbl, location: str) -> None:
    try:
        tbl.io.delete(location)
    except Exception:
        pass


def _read_profile(tbl) -> Dict[str, Any]:
    loc = tbl.properties.get("meldra.profile")
    if not loc:
        return {}
    with tbl.io.new_input(loc).open() as f:
        return json.loads(f.read())


def ingest_batches(tenant: str, name: str, system: str, batches: Iterator[pa.RecordBatch], origin: Optional[Dict[str, Any]] = None,
                   kind: str = "file", replace_table: Optional[str] = None) -> Dict[str, Any]:
    """Type, profile and store a stream of batches as one Iceberg table. Returns the source description."""
    cat = get_catalog()
    ns = namespace_for(tenant)
    _ensure_namespace(cat, ns)
    it = iter(batches)
    first = next(it, None)
    if first is None or first.num_rows == 0:
        raise LakehouseError(f"{name} has no rows.")

    con = duckdb.connect()
    _limit(con)
    # Sample for typing decisions: the first batches up to SAMPLE_ROWS rows.
    sample_batches = [first]
    rows = first.num_rows
    while rows < SAMPLE_ROWS:
        nxt = next(it, None)
        if nxt is None:
            break
        sample_batches.append(nxt)
        rows += nxt.num_rows
    raw_schema = first.schema
    names = [f.name for f in raw_schema]
    keys = unique_keys(names)
    sample = pa.Table.from_batches(sample_batches, schema=raw_schema)
    con.register("sample_raw", sample)
    columns = profile_sample(con, "sample_raw", raw_schema, names, keys)
    sql = select_sql(raw_schema, columns, "b")

    def typed(batch_list: List[pa.RecordBatch]) -> pa.Table:
        con.register("b", pa.Table.from_batches(batch_list, schema=raw_schema))
        out = con.execute(sql).arrow()
        con.unregister("b")
        return out

    first_typed = typed(sample_batches)
    schema = first_typed.schema
    table_name = _new_table_name(name)
    tbl = cat.create_table((ns, table_name), schema=schema, properties={"meldra.name": str(name)[:200], "meldra.status": "loading"})
    total = 0
    try:
        with tbl.transaction() as tx:  # one commit: readers never see a half-loaded table
            pending = [first_typed]
            pending_rows = first_typed.num_rows
            for batch in it:
                pending.append(typed([batch]).cast(schema))
                pending_rows += batch.num_rows
                if pending_rows >= APPEND_ROWS:
                    tx.append(pa.concat_tables(pending))
                    total += pending_rows
                    pending, pending_rows = [], 0
            if pending:
                tx.append(pa.concat_tables(pending))
                total += pending_rows
        tbl = cat.load_table((ns, table_name))
        # Profile the stored table (known values over all rows, date range).
        values, month_range = summarize(con, lambda phys: tbl.scan(selected_fields=(phys,)).to_arrow_batch_reader(), columns)
        profile = {
            "name": name, "system": system or name, "kind": kind, "columns": columns, "row_count": total,
            "values": values, "month_range": month_range, "origin": origin or None,
            "created_at": _now(), "refreshed_at": _now(),
        }
        _write_profile(tbl, profile)
    except Exception:
        try:
            _purge(cat, (ns, table_name))
        except Exception:
            cat.drop_table((ns, table_name))
        raise
    finally:
        con.close()

    if replace_table:
        # Refresh: keep the user's column choices and swap the new table in.
        old = describe_table(tenant, replace_table)
        profile = _carry_choices(old, profile)
        _write_profile(cat.load_table((ns, table_name)), profile)
        drop_table(tenant, replace_table)
    return describe_table(tenant, table_name)


def _carry_choices(old: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    prev = {c["name"]: c for c in old.get("columns", [])}
    used = set()
    for c in new["columns"]:
        p = prev.get(c["name"])
        if p:
            c["key"], c["role"], c["unit"] = p["key"], p["role"], p.get("unit", c["unit"])
        while c["key"] in used:
            c["key"] = f"{c['key']}_2"
        used.add(c["key"])
    new["system"] = old.get("system") or new["system"]
    new["created_at"] = old.get("created_at") or new["created_at"]
    new["values"] = {next((c["key"] for c in new["columns"] if c["phys"] == k or c["key"] == k), k): v for k, v in new["values"].items()}
    return new


def ingest_file(tenant: str, path: str, filename: str, system: Optional[str] = None) -> List[Dict[str, Any]]:
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    base = re.sub(r"\.[^.]+$", "", filename) or "source"
    if ext in ("csv", "tsv", "txt"):
        return [ingest_batches(tenant, base, system or base, read_csv(path, ext))]
    if ext == "parquet":
        return [ingest_batches(tenant, base, system or base, read_parquet(path))]
    if ext in ("xlsx", "xls"):
        sheets = read_excel(path, ext)
        if not sheets:
            raise LakehouseError(f"{filename} has no sheets with data.")
        out = []
        for sheet, _names, batches in sheets:
            nm = f"{base} · {sheet}" if len(sheets) > 1 else base
            try:
                out.append(ingest_batches(tenant, nm, system or nm, batches))
            except LakehouseError:
                continue  # an empty sheet
        if not out:
            raise LakehouseError(f"{filename} has no sheets with data.")
        return out
    raise LakehouseError(f"{filename}: upload a .csv, .tsv, .xlsx, .xls or .parquet file.")


def ingest_rows(tenant: str, name: str, system: str, columns: List[str], rows: List[Dict[str, Any]], kind: str,
                origin: Optional[Dict[str, Any]] = None, replace_table: Optional[str] = None) -> Dict[str, Any]:
    """Store rows that arrived as JSON (an API pull, a database query, or a browser source moved to Meldra)."""
    names = _clean_headers(columns or (list(rows[0].keys()) if rows else []))
    if not rows or not names:
        raise LakehouseError(f"{name} has no rows.")
    src = [c for c in (columns or list(rows[0].keys()))]
    gen = ([r.get(c) for c in src] for r in rows)
    return ingest_batches(tenant, name, system, _rows_to_batches(names, gen), origin=origin, kind=kind, replace_table=replace_table)


# ---------------- reading, editing, deleting ----------------

def describe_table(tenant: str, table: str) -> Dict[str, Any]:
    cat = get_catalog()
    tbl = _load(cat, namespace_for(tenant), table)
    prof = _read_profile(tbl)
    snap = tbl.current_snapshot()
    return {"table": table, "version": str(snap.snapshot_id) if snap else "0", **prof}


def _load(cat, ns: str, table: str):
    from pyiceberg.exceptions import NoSuchTableError
    try:
        return cat.load_table(_ident(ns, table))
    except NoSuchTableError:
        raise LakehouseError("Unknown table.")


def load_for_query(tenant: str, table: str):
    """(Iceberg table, profile) for a table in the tenant's namespace only."""
    cat = get_catalog()
    tbl = _load(cat, namespace_for(tenant), table)
    return tbl, _read_profile(tbl)


def list_tables(tenant: str) -> List[Dict[str, Any]]:
    from pyiceberg.exceptions import NoSuchNamespaceError
    cat = get_catalog()
    ns = namespace_for(tenant)
    try:
        idents = cat.list_tables(ns)
    except NoSuchNamespaceError:
        return []
    out = []
    for ident in idents:
        try:
            d = describe_table(tenant, ident[-1])
            if d.get("columns"):
                out.append(d)
        except Exception:
            continue  # a table still loading or damaged is skipped, not fatal
    return sorted(out, key=lambda d: d.get("created_at") or "")


def update_table(tenant: str, table: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    """Save the user's choices: system name, and per column the role, unit and join name."""
    cat = get_catalog()
    tbl = _load(cat, namespace_for(tenant), table)
    prof = _read_profile(tbl)
    if "system" in patch and str(patch["system"]).strip():
        prof["system"] = str(patch["system"]).strip()[:120]
    if "name" in patch and str(patch["name"]).strip():
        prof["name"] = str(patch["name"]).strip()[:200]
    changes = patch.get("columns") if isinstance(patch.get("columns"), list) else []
    by_name = {c["name"]: c for c in prof.get("columns", [])}
    for ch in changes:
        c = by_name.get(str(ch.get("name")))
        if not c:
            continue
        if ch.get("role") in ("dimension", "measure", "ignore"):
            if ch["role"] == "measure" and c["type"] not in ("number",):
                raise LakehouseError(f"{c['name']} has no numbers to add up.")
            c["role"] = ch["role"]
            if ch["role"] == "measure":
                c["unit"] = c.get("unit") or "number"
        if ch.get("key"):
            new_key = re.sub(r"[^a-z0-9_]+", "_", str(ch["key"]).lower()).strip("_")
            if new_key and new_key != c["key"]:
                if any(o["key"] == new_key for o in prof["columns"] if o is not c):
                    raise LakehouseError(f"{prof.get('name')} already has a column named {new_key}.")
                if c["key"] in prof.get("values", {}):
                    prof["values"][new_key] = prof["values"].pop(c["key"])
                c["key"] = new_key
    _write_profile(tbl, prof)
    return describe_table(tenant, table)


def table_files(tbl) -> List[str]:
    """Every file a table owns: data files of all snapshots, manifests, manifest lists, metadata history, statistics, profile."""
    io_ = tbl.io
    md = tbl.metadata
    files = {tbl.metadata_location}
    files.update(e.metadata_file for e in (md.metadata_log or []))
    for snap in md.snapshots or []:
        if snap.manifest_list:
            files.add(snap.manifest_list)
        for manifest in snap.manifests(io_):
            files.add(manifest.manifest_path)
            for entry in manifest.fetch_manifest_entry(io_, discard_deleted=False):
                files.add(entry.data_file.file_path)
    for stat in getattr(md, "statistics", None) or []:
        files.add(stat.statistics_path)
    if tbl.properties.get("meldra.profile"):
        files.add(tbl.properties["meldra.profile"])
    return sorted(f for f in files if f)


def _purge(cat, ident) -> None:
    """
    Delete a table and every file it owns. Meldra removes the files itself rather than
    relying on the catalog's purge (Polaris runs purge as a background task that can fail),
    so erasure is complete and verifiable whichever catalog is used.
    """
    tbl = cat.load_table(ident)
    failed = []
    for location in table_files(tbl):
        try:
            tbl.io.delete(location)
        except FileNotFoundError:
            pass
        except Exception:
            failed.append(location)
        if location.startswith("file:"):
            _remove_local_crc(location)
    if failed:
        raise LakehouseError(f"{len(failed)} file(s) of this source could not be deleted; nothing was dropped. Try again.")
    cat.drop_table(ident)


def _remove_local_crc(location: str) -> None:
    """Hadoop-style checksum files written next to metadata on local test warehouses."""
    import os
    path = location[len("file:"):].lstrip("/")
    path = "/" + path
    crc = os.path.join(os.path.dirname(path), f".{os.path.basename(path)}.crc")
    if os.path.exists(crc):
        os.remove(crc)


def drop_table(tenant: str, table: str) -> None:
    cat = get_catalog()
    ident = _ident(namespace_for(tenant), table)
    _load(cat, ident[0], table)
    _purge(cat, ident)


def drop_all(tenant: str) -> int:
    """Delete every table of a tenant (account deletion / 'remove all data')."""
    from pyiceberg.exceptions import NoSuchNamespaceError
    cat = get_catalog()
    ns = namespace_for(tenant)
    try:
        idents = cat.list_tables(ns)
    except NoSuchNamespaceError:
        return 0
    for ident in idents:
        _purge(cat, ident)
    try:
        cat.drop_namespace(ns)
    except Exception:
        pass
    return len(idents)


def preview(tenant: str, table: str, limit: int = 50) -> Dict[str, Any]:
    tbl, prof = load_for_query(tenant, table)
    arrow = tbl.scan(limit=max(1, min(limit, 200))).to_arrow()
    by_phys = {c["phys"]: c for c in prof.get("columns", [])}
    cols = [by_phys.get(n, {"name": n})["name"] for n in arrow.column_names]
    rows = [[None if v is None else (v.isoformat() if hasattr(v, "isoformat") else v) for v in r.values()] for r in arrow.to_pylist()]
    return {"columns": cols, "rows": rows}
