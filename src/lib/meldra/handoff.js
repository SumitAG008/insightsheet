// Ask Meldra hands a request to a tool page: the files the user attached and the instruction
// the planner wrote for that tool. Kept in memory only (never stored), and consumed once by the
// page it was meant for, so refreshing or opening the tool later starts clean.

let pending = null;
const listeners = new Set();
const MAX_AGE_MS = 5 * 60 * 1000;

const samePath = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

export function setHandoff({ path, toolTitle, files = [], instruction = '' }) {
  pending = { path, toolTitle, files, instruction, at: Date.now() };
  listeners.forEach((fn) => fn());
}

/** The handoff waiting for this page, without consuming it. */
export function peekHandoff(path) {
  if (!pending || Date.now() - pending.at > MAX_AGE_MS) return null;
  return samePath(pending.path, path) ? pending : null;
}

/** Take the handoff for this page; later calls return null. */
export function takeHandoff(path) {
  const h = peekHandoff(path);
  if (h) pending = null;
  return h;
}

export function onHandoff(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Whether a file input's accept list allows this file. */
export function accepts(input, file) {
  const list = String(input.accept || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return true;
  const name = file.name.toLowerCase();
  const type = String(file.type || '').toLowerCase();
  return list.some((a) => (a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? type.startsWith(a.slice(0, -1)) : type === a));
}

/**
 * Put files into the page's own file inputs, as if the user had picked them. Files go to
 * the first input that accepts them, in page order; a multi-file input takes all it accepts,
 * and single-file inputs take one each (so two files fill "file A" and "file B").
 * Returns the files that found no input.
 */
export function fillFileInputs(root, files) {
  const inputs = [...root.querySelectorAll('input[type="file"]')].filter((i) => !i.disabled && !i.closest('[data-meldra-skip]'));
  const used = new Set();
  const left = [];
  const batches = new Map();
  for (const file of files) {
    const target = inputs.find((i) => accepts(i, file) && (i.multiple ? true : !used.has(i)));
    if (!target) { left.push(file); continue; }
    used.add(target);
    if (!batches.has(target)) batches.set(target, []);
    batches.get(target).push(file);
  }
  for (const [input, list] of batches) {
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return left;
}

/** Fill the page's instruction box (marked data-meldra-prompt) the way typing would. */
export function fillPrompt(root, text) {
  const el = root.querySelector('[data-meldra-prompt]');
  if (!el || !text) return false;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
  return true;
}
