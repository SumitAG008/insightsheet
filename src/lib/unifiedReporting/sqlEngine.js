/** SQLite (sql.js) for running SQL over sources kept in the browser; loaded only when a query runs. */
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let loading = null;
export const loadSqlJs = () => {
  loading ||= initSqlJs({ locateFile: () => wasmUrl });
  return loading;
};
