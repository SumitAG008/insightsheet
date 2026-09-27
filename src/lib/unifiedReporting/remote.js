/**
 * Fetching answers for lakehouse sources.
 *
 * compute() is synchronous: for lakehouse series it reads remoteCache and throws
 * PendingError when something is missing. ensure() fetches exactly the missing
 * series (batched into one /api/lakehouse/aggregate call) so compute() can run.
 * Cache keys include the table version, so a refreshed table is fetched again.
 */
import { useEffect, useMemo, useState } from 'react';
import { backendApi } from '@/api/backendClient';
import { PendingError, compute, lakeRequests, remoteCache, requestKey } from './engine';

const inflight = new Map();
const MAX_CACHE = 500;

/** Drop the server-only version field before sending; it only keys the cache. */
const toServer = ({ version, lookups, ...req }) => ({ ...req, lookups: lookups.map(({ version: _v, ...l }) => l) }); // eslint-disable-line no-unused-vars

export async function ensure(spec, m) {
  const missing = lakeRequests(spec, m).filter((r) => !remoteCache.has(requestKey(r)));
  if (!missing.length) return;
  const keys = missing.map(requestKey);
  const waiting = keys.filter((k) => inflight.has(k)).map((k) => inflight.get(k));
  const todo = missing.filter((r, i) => !inflight.has(keys[i]));
  if (todo.length) {
    const call = backendApi.lakehouse.aggregate(todo.map(toServer)).then((out) => {
      todo.forEach((r, i) => remoteCache.set(requestKey(r), out.results[i]));
      if (remoteCache.size > MAX_CACHE) [...remoteCache.keys()].slice(0, remoteCache.size - MAX_CACHE).forEach((k) => remoteCache.delete(k));
    }).finally(() => todo.forEach((r) => inflight.delete(requestKey(r))));
    todo.forEach((r) => inflight.set(requestKey(r), call));
    waiting.push(call);
  }
  await Promise.all(waiting);
}

/** compute() that waits for lakehouse series first. */
export async function computeAsync(spec, m) {
  for (let i = 0; i < 3; i++) {
    try {
      return compute(spec, m);
    } catch (e) {
      if (!(e instanceof PendingError)) throw e;
      await ensure(spec, m);
    }
  }
  return compute(spec, m);
}

/**
 * React hook: { res, loading, error } for a spec. Browser-only specs compute
 * immediately; lakehouse specs show loading until the server answers.
 */
export function useResult(spec, m) {
  const [tick, setTick] = useState(0);
  const [error, setError] = useState(null);
  const state = useMemo(() => {
    if (!spec) return { res: null, pending: false, broken: false };
    try {
      return { res: compute(spec, m), pending: false, broken: false };
    } catch (e) {
      if (e instanceof PendingError) return { res: null, pending: true, broken: false };
      return { res: null, pending: false, broken: true };
    }
  }, [spec, m, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state.pending) return undefined;
    let live = true;
    setError(null);
    ensure(spec, m).then(() => { if (live) setTick((t) => t + 1); }).catch((e) => { if (live) setError(e.message || 'The lakehouse did not answer.'); });
    return () => { live = false; };
  }, [state.pending, spec, m]);

  return { res: state.res, loading: state.pending && !error, error: error || (state.broken ? 'broken' : null) };
}
