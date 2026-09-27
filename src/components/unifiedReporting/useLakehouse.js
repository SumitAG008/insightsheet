/**
 * Unified Reporting ↔ Meldra lakehouse.
 *
 * The server is the source of truth for stored sources: on load the list of
 * Iceberg tables in the account's namespace replaces whatever this browser
 * remembered (so data follows the user to any device). Sources keep their id
 * and key when they move to the lakehouse or are refreshed, so links and
 * dashboard tiles keep pointing at them.
 */
import { useCallback, useEffect, useState } from 'react';
import { backendApi } from '@/api/backendClient';
import { isLake, lakeSource } from '@/lib/unifiedReporting/model';
import { remoteCache } from '@/lib/unifiedReporting/engine';

/** Browser rows are keyed by join name; the lakehouse gets them under the original column names. */
export function namedRows(src) {
  return src.rows.map((r) => Object.fromEntries(src.columns.map((c) => [c.name, r[c.key] ?? null])));
}

const choices = (src) => src.columns.map((c) => ({ name: c.name, key: c.key, role: c.role }));

export default function useLakehouse({ sources, setSources, toast }) {
  const [lake, setLake] = useState({ enabled: false, checked: false });
  const [storeInLake, setStoreInLake] = useState(true);
  const [lakeLinks, setLakeLinks] = useState([]);

  useEffect(() => {
    let live = true;
    backendApi.lakehouse.status()
      .then((s) => { if (live) setLake({ ...s, checked: true }); })
      .catch(() => { if (live) setLake({ enabled: false, checked: true }); });
    return () => { live = false; };
  }, []);

  const active = lake.enabled && storeInLake;

  /** Replace one source in state with its stored version, keeping id and key. */
  const put = useCallback((src, desc) => {
    const next = { ...lakeSource(desc, src.id), key: src.key };
    setSources((ss) => ss.map((x) => (x.id === src.id ? next : x)));
    return next;
  }, [setSources]);

  /** Bring the list in line with the server: update stored sources, add ones from other devices, drop deleted ones. */
  const reconcile = useCallback(async () => {
    const { sources: list } = await backendApi.lakehouse.sources();
    setSources((cur) => {
      const byTable = new Map(list.map((d) => [d.table, d]));
      const kept = cur
        .filter((s) => !isLake(s) || byTable.has(s.lake.table))
        .map((s) => (isLake(s) ? { ...lakeSource(byTable.get(s.lake.table), s.id), key: s.key } : s));
      const known = new Set(kept.filter(isLake).map((s) => s.lake.table));
      const taken = new Set(kept.map((s) => s.key));
      const added = list.filter((d) => !known.has(d.table)).map((d) => {
        const s = lakeSource(d);
        while (taken.has(s.key)) s.key = `${s.key}_2`;
        taken.add(s.key);
        return s;
      });
      return [...kept, ...added];
    });
    return list.length;
  }, [setSources]);

  /** Upload files straight into the lakehouse (large files never pass through the browser's memory). */
  const uploadFiles = useCallback(async (files, onProgress) => {
    const added = [];
    const errors = [];
    const limit = (lake.max_upload_mb || 1024) * 1024 * 1024;
    for (const [i, f] of files.entries()) {
      if (f.size > limit) {
        errors.push(`${f.name} is larger than ${lake.max_upload_mb} MB.`);
        continue;
      }
      try {
        const out = await backendApi.lakehouse.upload(f, null, (p) => onProgress?.({ ...p, file: f.name, index: i + 1, count: files.length }));
        added.push(...out.sources.map((d) => lakeSource(d)));
      } catch (e) {
        errors.push(e.message);
      }
    }
    return { added, errors };
  }, [lake.max_upload_mb]);

  /** Store a browser source in the lakehouse; returns the stored source (same id and key). */
  const moveToLake = useCallback(async (src) => {
    if (isLake(src)) return src;
    const { source } = await backendApi.lakehouse.storeRows({
      name: src.name, system: src.system, kind: src.kind, columns: src.columns.map((c) => c.name), rows: namedRows(src), origin: src.origin,
    });
    const { source: saved } = await backendApi.lakehouse.update(source.table, { columns: choices(src) });
    return { ...lakeSource(saved, src.id), key: src.key };
  }, []);

  const moveMany = useCallback(async (list) => {
    const out = [];
    for (const s of list) out.push(await moveToLake(s));
    return out;
  }, [moveToLake]);

  /** Save the user's edits (system name, column roles and join names) to the stored profile. */
  const saveChoices = useCallback(async (src, patch) => {
    const body = {};
    if (patch.system !== undefined) body.system = patch.system;
    if (patch.columns) body.columns = choices({ columns: patch.columns });
    if (!Object.keys(body).length) return;
    try {
      const { source } = await backendApi.lakehouse.update(src.lake.table, body);
      put(src, source);
    } catch (e) {
      toast(e.message);
    }
  }, [put, toast]);

  /** New rows for a stored source (refresh from an API or a database): swapped in whole, choices kept. */
  const replaceRows = useCallback(async (src, columns, rows, kind, origin) => {
    const { source } = await backendApi.lakehouse.storeRows({
      name: src.name, system: src.system, kind, columns, rows, origin, replaceTable: src.lake.table,
    });
    return put(src, source);
  }, [put]);

  const remove = useCallback((src) => backendApi.lakehouse.remove(src.lake.table), []);
  const removeAll = useCallback(() => backendApi.lakehouse.removeAll(), []);

  // Links between stored tables are found on the server, over all rows.
  const lakeTables = sources.filter(isLake).map((s) => s.lake.table).join(',');
  useEffect(() => {
    const stored = sources.filter(isLake);
    if (stored.length < 2) {
      setLakeLinks([]);
      return undefined;
    }
    let live = true;
    const idOf = Object.fromEntries(stored.map((s) => [s.lake.table, s.id]));
    backendApi.lakehouse.suggestLinks(stored.map((s) => s.lake.table)).then(({ links }) => {
      if (!live) return;
      setLakeLinks(links.filter((l) => idOf[l.from.table] && idOf[l.to.table]).map((l) => ({
        id: `rel_${idOf[l.from.table]}_${l.from.col}_${idOf[l.to.table]}`,
        from: { source: idOf[l.from.table], col: l.from.col },
        to: { source: idOf[l.to.table], col: l.to.col },
        overlap: l.overlap,
      })));
    }).catch(() => {});
    return () => { live = false; };
  }, [lakeTables]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cached lakehouse answers are keyed by table version; drop them when the stored tables change.
  useEffect(() => { remoteCache.clear(); }, [lakeTables]);

  return { lake, active, storeInLake, setStoreInLake, reconcile, uploadFiles, moveToLake, moveMany, saveChoices, replaceRows, remove, removeAll, lakeLinks };
}
