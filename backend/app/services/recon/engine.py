"""
Reconciliation engine v2: two lists of transactions in, matches and explained exceptions out.

Passes run in order on what is still unmatched, safest first:

  1. reference      a shared reference (invoice no., UTR, cheque no.) and the same amount
  2. amount_date    the same amount within a date window, only when the pair is each other's single
                    best candidate (two equally good candidates are never matched automatically)
  3. fuzzy          the same amount, a wider window, and a similar name or partial reference
  4. one_to_many    one item equals the sum of several on the other side (batch payments, split
                    invoices), and the reverse
  5. group          several items on each side under one shared reference with equal totals

Everything left is an exception, classified (likely fee or charge, partial payment, timing,
possible duplicate, not on the other side) with its closest candidates, so a person (or Claude,
see explain.py) can decide. Same input, same output: no randomness, no AI in the matching itself.

Amounts on side B are compared after `factor` (1 = same sign, -1 = opposite: a bank credit is a
cash-book debit). It is detected automatically when not given.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

PASSES = ("reference", "amount_date", "fuzzy", "one_to_many", "group")
PASS_TEXT = {
    "reference": "Same reference and amount",
    "amount_date": "Same amount, close dates",
    "fuzzy": "Same amount, similar name or reference",
    "one_to_many": "One item equals the sum of several",
    "group": "Items under one reference with equal totals",
    "manual": "Matched by you",
    "suggested": "Suggestion you accepted",
}


@dataclass
class Options:
    factor: Optional[int] = None          # 1, -1, or None to detect
    tol_abs: float = 0.0                  # absolute tolerance in currency units
    tol_pct: float = 0.0                  # tolerance as a fraction of the amount (0.001 = 0.1%)
    date_window: int = 3                  # days, amount + date pass
    ref_window: int = 60                  # days, reference pass
    fuzzy_window: int = 31                # days, fuzzy pass
    many_window: int = 31                 # days, one-to-many pass
    max_parts: int = 6                    # most items summed in one-to-many
    passes: Sequence[str] = PASSES
    fee_limit: float = 50.0               # a difference up to this is "likely fee/charge"
    period_end: Optional[str] = None      # ISO date; later items are "next period"
    forced: List[Tuple[List[str], List[str]]] = field(default_factory=list)  # pairs you accepted


def _days(a: Optional[str], b: Optional[str]) -> int:
    if not a or not b:
        return 0
    return abs((date.fromisoformat(a) - date.fromisoformat(b)).days)


def _cents(x: float) -> int:
    return int(round(x * 100))


def detect_factor(a_rows: List[Dict[str, Any]], b_rows: List[Dict[str, Any]]) -> int:
    """Same sign or opposite: whichever makes more amounts agree."""
    ca = Counter(_cents(r["amount"]) for r in a_rows)
    cb_same = Counter(_cents(r["amount"]) for r in b_rows)
    cb_opp = Counter(_cents(-r["amount"]) for r in b_rows)
    same = sum(min(n, cb_same.get(k, 0)) for k, n in ca.items())
    opp = sum(min(n, cb_opp.get(k, 0)) for k, n in ca.items())
    return -1 if opp > same else 1


class Recon:
    def __init__(self, a_rows: List[Dict[str, Any]], b_rows: List[Dict[str, Any]], opts: Options):
        self.opts = opts
        self.factor = opts.factor or detect_factor(a_rows, b_rows)
        self.a = {r["id"]: r for r in a_rows}
        self.b = {r["id"]: {**r, "cmp": round(r["amount"] * self.factor, 2)} for r in b_rows}
        for r in self.a.values():
            r["cmp"] = r["amount"]
        self.open_a = set(self.a)
        self.open_b = set(self.b)
        self.matches: List[Dict[str, Any]] = []

    # ---------------------------------------------------------------- helpers
    def tol(self, amount: float) -> float:
        return max(self.opts.tol_abs, abs(amount) * self.opts.tol_pct, 0.005)

    def close(self, x: float, y: float) -> bool:
        return abs(x - y) <= self.tol(max(abs(x), abs(y)))

    def _match(self, a_ids: Iterable[str], b_ids: Iterable[str], kind: str, why: str) -> None:
        a_ids, b_ids = list(a_ids), list(b_ids)
        for i in a_ids:
            self.open_a.discard(i)
        for i in b_ids:
            self.open_b.discard(i)
        sa = round(sum(self.a[i]["cmp"] for i in a_ids), 2)
        sb = round(sum(self.b[i]["cmp"] for i in b_ids), 2)
        dates = [self.a[i]["date"] for i in a_ids] + [self.b[i]["date"] for i in b_ids]
        dates = [d for d in dates if d]
        self.matches.append({
            "id": f"M{len(self.matches) + 1}",
            "pass": kind,
            "a": a_ids,
            "b": b_ids,
            "amount_a": sa,
            "amount_b": round(sum(self.b[i]["amount"] for i in b_ids), 2),
            "difference": round(sa - sb, 2),
            "date_gap": _days(min(dates), max(dates)) if len(dates) > 1 else 0,
            "why": why,
        })

    @staticmethod
    def _similarity(x: Dict[str, Any], y: Dict[str, Any]) -> float:
        nx, ny = set(x["names"]), set(y["names"])
        inter = len(nx & ny)
        name = inter / len(nx | ny) if nx and ny else 0.0
        if inter >= 2:
            # "MAPLE & OAK INTERIORS" vs "Maple and Oak Interiors Ltd — office refit": the shorter name is fully inside the longer.
            name = max(name, inter / min(len(nx), len(ny)))
        ref = 0.0
        for kx in x["keys"]:
            for ky in y["keys"]:
                if kx == ky:
                    return 1.0
                short, long_ = sorted((kx, ky), key=len)
                if len(short) >= 4 and short in long_:
                    ref = max(ref, 0.8)
        return max(name, ref)

    def _mutual_best(self, pairs: List[Tuple[float, str, str]]) -> List[Tuple[str, str]]:
        """Pairs (score, a, b) where lower score is better; keep those that are each side's unique best."""
        best_a: Dict[str, List[Tuple[float, str]]] = defaultdict(list)
        best_b: Dict[str, List[Tuple[float, str]]] = defaultdict(list)
        for s, a, b in pairs:
            best_a[a].append((s, b))
            best_b[b].append((s, a))
        out = []
        for a, lst in best_a.items():
            lst.sort()
            top = lst[0][0]
            if sum(1 for s, _ in lst if s == top) > 1:
                continue  # two equally good candidates: leave it for a person
            b = lst[0][1]
            blst = sorted(best_b[b])
            if sum(1 for s, _ in blst if s == blst[0][0]) > 1 or blst[0][1] != a:
                continue
            out.append((a, b))
        return out

    # ---------------------------------------------------------------- passes
    def apply_forced(self) -> None:
        for a_ids, b_ids in self.opts.forced:
            a_ids = [i for i in a_ids if i in self.open_a]
            b_ids = [i for i in b_ids if i in self.open_b]
            if a_ids and b_ids:
                self._match(a_ids, b_ids, "manual", "You matched these")

    def pass_reference(self) -> None:
        by_key: Dict[str, List[str]] = defaultdict(list)
        for i in self.open_b:
            for k in self.b[i]["keys"]:
                by_key[k].append(i)
        pairs = []
        for ai in self.open_a:
            a = self.a[ai]
            for k in a["keys"]:
                for bi in by_key.get(k, []):
                    b = self.b[bi]
                    if self.close(a["cmp"], b["cmp"]) and _days(a["date"], b["date"]) <= self.opts.ref_window:
                        pairs.append((_days(a["date"], b["date"]) + abs(a["cmp"] - b["cmp"]), ai, bi))
        for ai, bi in self._mutual_best(list(set(pairs))):
            shared = sorted(set(self.a[ai]["keys"]) & set(self.b[bi]["keys"]))
            self._match([ai], [bi], "reference", f"Reference {shared[0] if shared else ''} and amount agree")

    def _amount_pairs(self, window: int, need_similarity: float = 0.0) -> List[Tuple[float, str, str]]:
        by_amt: Dict[int, List[str]] = defaultdict(list)
        for i in self.open_b:
            by_amt[_cents(self.b[i]["cmp"])].append(i)
        exact_tol = self.opts.tol_abs == 0 and self.opts.tol_pct == 0
        pairs = []
        for ai in self.open_a:
            a = self.a[ai]
            if exact_tol:
                cands = by_amt.get(_cents(a["cmp"]), [])
            else:
                cands = [bi for bi in self.open_b if self.close(a["cmp"], self.b[bi]["cmp"])]
            for bi in cands:
                b = self.b[bi]
                gap = _days(a["date"], b["date"])
                if gap > window:
                    continue
                sim = self._similarity(a, b)
                if sim < need_similarity:
                    continue
                pairs.append((gap - sim, ai, bi))
        return pairs

    def pass_amount_date(self) -> None:
        for ai, bi in self._mutual_best(self._amount_pairs(self.opts.date_window)):
            gap = _days(self.a[ai]["date"], self.b[bi]["date"])
            self._match([ai], [bi], "amount_date", "Same amount, same day" if gap == 0 else f"Same amount, {gap} day{'s' if gap != 1 else ''} apart")

    def pass_fuzzy(self) -> None:
        for ai, bi in self._mutual_best(self._amount_pairs(self.opts.fuzzy_window, need_similarity=0.5)):
            self._match([ai], [bi], "fuzzy", "Same amount; name or reference is similar")

    def _subset(self, target: float, cands: List[Dict[str, Any]]) -> Optional[List[str]]:
        """Smallest set of 2..max_parts items summing to target within tolerance (bounded search)."""
        cands = sorted(cands, key=lambda r: -abs(r["cmp"]))[:24]
        t = _cents(target)
        tol = _cents(self.tol(target))
        vals = [_cents(r["cmp"]) for r in cands]
        suffix_pos = [0] * (len(vals) + 1)
        suffix_neg = [0] * (len(vals) + 1)
        for i in range(len(vals) - 1, -1, -1):
            suffix_pos[i] = suffix_pos[i + 1] + max(vals[i], 0)
            suffix_neg[i] = suffix_neg[i + 1] + min(vals[i], 0)
        best: List[Optional[List[int]]] = [None]
        budget = [40000]

        def dfs(i: int, total: int, chosen: List[int]) -> None:
            if budget[0] <= 0:
                return
            budget[0] -= 1
            if len(chosen) >= 2 and abs(total - t) <= tol:
                if best[0] is None or len(chosen) < len(best[0]):
                    best[0] = list(chosen)
                return
            if i >= len(vals) or len(chosen) >= self.opts.max_parts:
                return
            if best[0] is not None and len(chosen) + 1 >= len(best[0]):
                return
            if total + suffix_pos[i] < t - tol or total + suffix_neg[i] > t + tol:
                return
            chosen.append(i)
            dfs(i + 1, total + vals[i], chosen)
            chosen.pop()
            dfs(i + 1, total, chosen)

        dfs(0, 0, [])
        return [cands[i]["id"] for i in best[0]] if best[0] else None

    def pass_one_to_many(self) -> None:
        def run(one_side: str) -> None:
            ones = self.a if one_side == "a" else self.b
            many = self.b if one_side == "a" else self.a
            open_one = self.open_a if one_side == "a" else self.open_b
            open_many = self.open_b if one_side == "a" else self.open_a
            for oi in sorted(open_one, key=lambda i: -abs(ones[i]["cmp"])):
                if oi not in open_one:
                    continue
                o = ones[oi]
                pool = []
                for mi in open_many:
                    m = many[mi]
                    if (m["cmp"] > 0) != (o["cmp"] > 0) or abs(m["cmp"]) >= abs(o["cmp"]) - 0.005:
                        continue
                    if _days(o["date"], m["date"]) > self.opts.many_window:
                        continue
                    related = self._similarity(o, m) >= 0.34 or (o["counterparty"] and o["counterparty"].lower() == m["counterparty"].lower())
                    pool.append((0 if related else 1, _days(o["date"], m["date"]), m))
                related_pool = [m for r, _, m in pool if r == 0]
                cands = related_pool if len(related_pool) >= 2 else [m for _, _, m in sorted(pool, key=lambda x: (x[0], x[1]))[:16]]
                if len(cands) < 2:
                    continue
                parts = self._subset(o["cmp"], cands)
                if not parts:
                    continue
                if one_side == "a":
                    self._match([oi], parts, "one_to_many", f"One item equals the sum of {len(parts)} on the other side")
                else:
                    self._match(parts, [oi], "one_to_many", f"{len(parts)} items together equal one on the other side")

        run("a")
        run("b")

    def pass_group(self) -> None:
        groups: Dict[str, Tuple[set, set]] = defaultdict(lambda: (set(), set()))
        for i in self.open_a:
            for k in self.a[i]["keys"]:
                groups[k][0].add(i)
        for i in self.open_b:
            for k in self.b[i]["keys"]:
                groups[k][1].add(i)
        for k, (ga, gb) in sorted(groups.items(), key=lambda kv: -len(kv[1][0]) - len(kv[1][1])):
            ga, gb = ga & self.open_a, gb & self.open_b
            if not ga or not gb or len(ga) + len(gb) < 3:
                continue
            sa = sum(self.a[i]["cmp"] for i in ga)
            sb = sum(self.b[i]["cmp"] for i in gb)
            if self.close(sa, sb):
                self._match(sorted(ga), sorted(gb), "group", f"{len(ga)} + {len(gb)} items under reference {k} with equal totals")

    # ---------------------------------------------------------------- exceptions
    def exceptions(self) -> List[Dict[str, Any]]:
        out = []
        side_rows = {"A": self.a, "B": self.b}
        for side, open_ids, other, other_open in (("A", self.open_a, self.b, self.open_b), ("B", self.open_b, self.a, self.open_a)):
            rows = side_rows[side]
            for i in sorted(open_ids, key=lambda x: (rows[x]["date"] or "", x)):
                r = rows[i]
                cands = []
                for oi in other_open:
                    o = other[oi]
                    sim = self._similarity(r, o)
                    same_amt = self.close(r["cmp"], o["cmp"])
                    gap = _days(r["date"], o["date"])
                    if not (sim >= 0.5 or (same_amt and gap <= 120)):
                        continue
                    diff = round(r["cmp"] - o["cmp"], 2)
                    score = (0 if sim >= 0.8 else 1 if sim >= 0.5 else 2) * 1000 + min(gap, 999) + (0 if same_amt else 500)
                    cands.append((score, {"id": oi, "date": o["date"], "amount": o["amount"], "reference": o["reference"], "description": o["description"][:120],
                                          "difference": diff, "days_apart": gap, "similarity": round(sim, 2)}))
                cands = [c for _, c in sorted(cands, key=lambda x: x[0])[:3]]
                kind, hint = self._classify(r, side, cands)
                out.append({"id": i, "side": side, "date": r["date"], "amount": r["amount"], "reference": r["reference"], "description": r["description"],
                            "counterparty": r["counterparty"], "source_row": r["source_row"], "carried": r.get("carried", False), "first_seen": r.get("first_seen"),
                            "kind": kind, "hint": hint, "candidates": cands})
        return out

    def _classify(self, r: Dict[str, Any], side: str, cands: List[Dict[str, Any]]) -> Tuple[str, str]:
        text = f" {r['reference']} {r['description']} ".lower()
        same_side = self.a if side == "A" else self.b
        # A copy of an entry on the same side, matched or not: same amount, same reference or wording, within 45 days.
        for x, o in same_side.items():
            if x == r["id"] or o["amount"] != r["amount"] or _days(o["date"], r["date"]) > 45:
                continue
            if (r["keys"] and set(r["keys"]) & set(o["keys"])) or (r["description"] and r["description"].lower() == o["description"].lower()) or self._similarity(r, o) >= 0.8:
                return "duplicate", f"Same amount and wording as {x} ({o['date']}): possible duplicate entry."
        if self.opts.period_end and r["date"] and r["date"] > self.opts.period_end:
            return "next_period", "Dated after the period end: it should clear next period."
        for c in cands:
            if c["similarity"] >= 0.5 and c["difference"]:
                # TDS (India) / withholding: the receipt is short by a standard rate of the invoice.
                gross = max(abs(r["cmp"]), abs(r["cmp"] - c["difference"]))
                rate = abs(c["difference"]) / gross if gross else 0
                for pct in (0.01, 0.02, 0.05, 0.1):
                    if abs(rate - pct) < 0.0005:
                        return "tds", f"{abs(c['difference']):,.2f} short against {c['id']}, exactly {pct:.0%}: likely TDS or withholding deducted. Book it to TDS receivable."
            if c["similarity"] >= 0.5 and c["difference"] and abs(c["difference"]) <= self.opts.fee_limit and abs(c["difference"]) < abs(r["cmp"]) * 0.1:
                return "fee", f"Matches {c['id']} except for {abs(c['difference']):,.2f}: likely a bank charge, fee or rounding."
            if c["similarity"] >= 0.5 and c["difference"]:
                return "partial", f"Same reference or name as {c['id']} but {abs(c['difference']):,.2f} different: possible partial or short payment."
            if not c["difference"] and c["days_apart"] > self.opts.fuzzy_window:
                return "timing", f"Same amount as {c['id']} but {c['days_apart']} days apart: timing difference."
        if any(w in text for w in ("charge", "chgs", "chrg", " fee", "commission", "interest", "gst on", "service tax", " sms ", "maintenance", "cheque book")):
            return "missing_other", "Bank charge, fee or interest not recorded on the other side: post it."
        if re.search(r"\b(chq|cheque|check)\b", text) or (r["reference"].strip().isdigit() and len(r["reference"].strip()) <= 8 and "cheque" in text):
            return "uncleared", "Cheque not yet cleared on the other side (unpresented or uncredited): it should clear in a later period."
        if any(w in text for w in (" dd ", "direct debit", "nach", "ecs", "standing order", " so ")):
            return "missing_other", "Direct debit or standing order not recorded on the other side."
        return "missing_other", "Not found on the other side."

    # ---------------------------------------------------------------- run
    def run(self) -> Dict[str, Any]:
        self.apply_forced()
        steps = {"reference": self.pass_reference, "amount_date": self.pass_amount_date, "fuzzy": self.pass_fuzzy,
                 "one_to_many": self.pass_one_to_many, "group": self.pass_group}
        for p in PASSES:
            if p in self.opts.passes:
                steps[p]()
        exceptions = self.exceptions()
        total_a = round(sum(r["cmp"] for r in self.a.values()), 2)
        total_b = round(sum(r["cmp"] for r in self.b.values()), 2)
        open_a = round(sum(self.a[i]["cmp"] for i in self.open_a), 2)
        open_b = round(sum(self.b[i]["cmp"] for i in self.open_b), 2)
        matched_diff = round(sum(m["difference"] for m in self.matches), 2)
        by_pass = Counter(m["pass"] for m in self.matches)
        by_kind = Counter(e["kind"] for e in exceptions)
        n_a, n_b = len(self.a), len(self.b)
        matched_a = n_a - len(self.open_a)
        matched_b = n_b - len(self.open_b)
        return {
            "factor": self.factor,
            "summary": {
                "rows_a": n_a, "rows_b": n_b, "matched_a": matched_a, "matched_b": matched_b,
                "match_rate": round((matched_a + matched_b) / (n_a + n_b), 4) if n_a + n_b else 0,
                "total_a": total_a, "total_b": total_b, "difference": round(total_a - total_b, 2),
                "open_a": open_a, "open_b": open_b, "matched_differences": matched_diff,
                # The proof: the difference between the files is the open items plus tolerances accepted on matches.
                "proof_ok": abs(round(total_a - total_b, 2) - round(open_a - open_b + matched_diff, 2)) < 0.01,
                "by_pass": {p: by_pass.get(p, 0) for p in (*PASSES, "manual")},
                "by_kind": dict(by_kind),
            },
            "matches": self.matches,
            "exceptions": exceptions,
        }


def reconcile(a_rows: List[Dict[str, Any]], b_rows: List[Dict[str, Any]], opts: Optional[Options] = None) -> Dict[str, Any]:
    return Recon(a_rows, b_rows, opts or Options()).run()
