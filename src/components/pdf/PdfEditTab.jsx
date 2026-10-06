// PDF Edit & Fill: open any PDF or photo of a form, fill its blanks, change printed text, add text
// anywhere, white-out, tick or cross, sign (drawn, typed or uploaded, and optionally with a
// certificate), then download with the original file name plus a timestamp (or a name you choose).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { baseName, safePdfName, timestamp } from '@/lib/pdfNaming';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { backendApi } from '@/api/meldraClient';
import { downloadBlob } from '@/utils/fileNaming';
import { AlertCircle, Check, Download, Eraser, FileSignature, Loader2, MousePointer2, RotateCcw, ShieldCheck, TextCursorInput, Trash2, Type, Upload, X } from 'lucide-react';
import SignatureDialog from '@/components/pdf/SignatureDialog';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,.gif';
const TOOLS = [
  { id: 'select', label: 'Fill', icon: MousePointer2, hint: 'Click a highlighted box to type in it.' },
  { id: 'edittext', label: 'Edit text', icon: TextCursorInput, hint: 'Click a printed line to change it. The old words are removed from the file when you download.' },
  { id: 'text', label: 'Add text', icon: Type, hint: 'Click anywhere on the page to type there.' },
  { id: 'whiteout', label: 'White-out', icon: Eraser, hint: 'Drag over printed text to cover it, then add your own text on top.' },
  { id: 'check', label: 'Tick', icon: Check, hint: 'Click to place a tick.' },
  { id: 'cross', label: 'Cross', icon: X, hint: 'Click to place a cross.' },
  { id: 'sign', label: 'Sign', icon: FileSignature, hint: 'Click a "Sign here" box or anywhere on the page to place your signature. Drag the corner to resize it.' },
];

/** pdf.js text runs -> lines in page fractions, with the font size in points. */
function textLines(content, vp) {
  const runs = [];
  for (const it of content.items || []) {
    const str = (it.str || '').replace(/\s+$/, '');
    if (!str.trim()) continue;
    const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
    const [x, baseline] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    runs.push({ x, baseline, w: it.width || str.length * size * 0.5, size, str });
  }
  runs.sort((a, b) => a.baseline - b.baseline || a.x - b.x);
  const lines = [];
  for (const r of runs) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.baseline - r.baseline) < r.size * 0.4 && r.x - (last.x + last.w) < r.size * 1.5) {
      const gap = r.x - (last.x + last.w);
      last.str += (gap > r.size * 0.15 && !last.str.endsWith(' ') ? ' ' : '') + r.str;
      last.w = Math.max(last.w, r.x + r.w - last.x);
      last.size = Math.max(last.size, r.size);
    } else {
      lines.push({ ...r });
    }
  }
  return lines.map((l, i) => ({
    key: i,
    text: l.str,
    size: Math.round(l.size * 10) / 10,
    x: l.x / vp.width,
    y: (l.baseline - l.size * 0.88) / vp.height,
    w: l.w / vp.width,
    h: (l.size * 1.12) / vp.height,
  }));
}

let nextId = 1;

export default function PdfEditTab() {
  const [file, setFile] = useState(null);
  const [workingPdf, setWorkingPdf] = useState(null); // Blob shown and edited (the fillable version)
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState({}); // index -> { w, h } in points
  const [fields, setFields] = useState({}); // index -> [{ name, type, multiline, x, y, w, h }]
  const [values, setValues] = useState({}); // field name -> value
  const [items, setItems] = useState([]); // added text, white-out, marks
  const [tool, setTool] = useState('select');
  const [selected, setSelected] = useState(null);
  const [textSize, setTextSize] = useState(11);
  const [textColor, setTextColor] = useState('#000000');
  const [fileName, setFileName] = useState('');
  const [flatten, setFlatten] = useState(false);
  const [busy, setBusy] = useState(null); // 'open' | 'save'
  const [error, setError] = useState('');
  const [found, setFound] = useState(null);
  const [lines, setLines] = useState({}); // index -> printed text lines (for Edit text)
  const [editedLines, setEditedLines] = useState({}); // "page:line" -> true once taken over
  const [sigFields, setSigFields] = useState({}); // index -> [{ name, x, y, w, h }] empty signature fields
  const [signature, setSignature] = useState(null); // { data: PNG data URL, aspect }
  const [signOpen, setSignOpen] = useState(false);
  const pendingSign = useRef(null);
  const [cert, setCert] = useState({ on: false, file: null, password: '', reason: '', location: '' });
  const [width, setWidth] = useState(860);
  const drag = useRef(null);
  const itemRefs = useRef({});
  const focusNext = useRef(null);

  useEffect(() => {
    // Put the cursor in a text box right after it is placed.
    const id = focusNext.current;
    if (id && itemRefs.current[id]) {
      focusNext.current = null;
      itemRefs.current[id].focus();
    }
  }, [items]);

  const containerRef = useCallback((el) => {
    if (!el) return;
    const measure = () => setWidth(Math.min(900, Math.max(320, el.clientWidth - 8)));
    measure();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(el);
  }, []);

  const reset = () => {
    setFile(null);
    setWorkingPdf(null);
    setNumPages(0);
    setPageSizes({});
    setFields({});
    setValues({});
    setItems([]);
    setSelected(null);
    setFound(null);
    setLines({});
    setEditedLines({});
    setSigFields({});
    setError('');
  };

  const openFile = async (f) => {
    if (!f) return;
    reset();
    setFile(f);
    setFileName(`${baseName(f.name)}_${timestamp()}`);
    setBusy('open');
    try {
      const res = await backendApi.files.makeFillable(f);
      setFound({ fields: res.fields, checkboxes: res.checkboxes, signatures: res.signatures });
      setWorkingPdf(res.blob);
    } catch (e) {
      if ((f.name || '').toLowerCase().endsWith('.pdf')) {
        setWorkingPdf(f); // still editable with "Add text", even if blanks could not be found
        setError(`${e.message} You can still add text anywhere.`);
      } else {
        setError(e.message || 'This file could not be opened.');
      }
    } finally {
      setBusy(null);
    }
  };

  const onPageLoad = async (index, page) => {
    const vp = page.getViewport({ scale: 1 });
    setPageSizes((s) => ({ ...s, [index]: { w: vp.width, h: vp.height } }));
    const annots = await page.getAnnotations();
    const list = [];
    const sigs = [];
    const initial = {};
    for (const a of annots) {
      if (a.subtype !== 'Widget' || !a.fieldName) continue;
      if (a.fieldType === 'Sig') {
        const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect);
        sigs.push({ name: a.fieldName, x: Math.min(x1, x2) / vp.width, y: Math.min(y1, y2) / vp.height, w: Math.abs(x2 - x1) / vp.width, h: Math.abs(y2 - y1) / vp.height });
        continue;
      }
      const isCheck = a.fieldType === 'Btn' && a.checkBox;
      if (a.fieldType !== 'Tx' && !isCheck) continue;
      const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect);
      list.push({
        name: a.fieldName,
        label: a.alternativeText || a.fieldName,
        type: isCheck ? 'checkbox' : 'text',
        multiline: !!a.multiLine,
        x: Math.min(x1, x2) / vp.width,
        y: Math.min(y1, y2) / vp.height,
        w: Math.abs(x2 - x1) / vp.width,
        h: Math.abs(y2 - y1) / vp.height,
      });
      initial[a.fieldName] = isCheck ? (a.fieldValue && a.fieldValue !== 'Off') : (a.fieldValue || '');
    }
    setFields((f) => ({ ...f, [index]: list }));
    setSigFields((f) => ({ ...f, [index]: sigs }));
    setValues((v) => ({ ...initial, ...v }));
    try {
      const found = textLines(await page.getTextContent(), vp);
      setLines((l) => ({ ...l, [index]: found }));
    } catch {
      setLines((l) => ({ ...l, [index]: [] }));
    }
  };

  // Edit text: cover the printed line (removed from the file on download) and type over it.
  const editLine = (index, line) => {
    const pad = 1.5 / (pageSizes[index]?.w || 595);
    const id = nextId++;
    focusNext.current = id;
    setItems((it) => [
      ...it,
      { id: nextId++, type: 'whiteout', page: index, x: line.x - pad, y: line.y, w: line.w + pad * 2, h: line.h },
      { id, type: 'text', page: index, x: line.x, y: line.y, text: line.text, size: line.size, color: '#000000' },
    ]);
    setEditedLines((e) => ({ ...e, [`${index}:${line.key}`]: true }));
    setSelected(id);
  };

  // Sign: place the signature at a point, or fitted into a signature field's box.
  const placeSignature = (index, x, y, box, sig = signature) => {
    if (!sig) {
      pendingSign.current = { index, x, y, box };
      setSignOpen(true);
      return;
    }
    const size = pageSizes[index] || { w: 595, h: 842 };
    let wPt = 150;
    let hPt = wPt / sig.aspect;
    let px = x - wPt / 2 / size.w;
    let py = y - hPt / 2 / size.h;
    if (box) {
      hPt = Math.max(box.h * size.h, 18);
      wPt = hPt * sig.aspect;
      if (wPt > box.w * size.w) { wPt = box.w * size.w; hPt = wPt / sig.aspect; }
      px = box.x;
      py = box.y + box.h - hPt / size.h;
    }
    const id = nextId++;
    setItems((it) => [...it, { id, type: 'image', page: index, data: sig.data, aspect: sig.aspect, x: px, y: py, w: wPt / size.w, h: hPt / size.h }]);
    setSelected(id);
  };

  const onSignatureDone = (sig) => {
    setSignature(sig);
    setSignOpen(false);
    const p = pendingSign.current;
    pendingSign.current = null;
    if (p) placeSignature(p.index, p.x, p.y, p.box, sig);
    setTool('sign');
  };

  const pointFrac = (e, el) => {
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onPagePointerDown = (index, e) => {
    // Clicks on fields and added items are theirs, except that text and marks can go on a white-out.
    const onWhiteout = e.target?.dataset?.kind === 'whiteout' && ['text', 'check', 'cross'].includes(tool);
    if (e.target !== e.currentTarget && !onWhiteout) return;
    const pageEl = e.currentTarget;
    setSelected(null);
    const { x, y } = pointFrac(e, pageEl);
    const size = pageSizes[index] || { w: 595, h: 842 };
    if (tool === 'text') {
      e.preventDefault(); // keep the click from taking focus away from the new text box
      const id = nextId++;
      focusNext.current = id;
      setItems((it) => [...it, { id, type: 'text', page: index, x, y: y - (textSize * 0.7) / size.h, text: '', size: textSize, color: textColor }]);
      setSelected(id);
    } else if (tool === 'check' || tool === 'cross') {
      const s = 12 / size.w;
      setItems((it) => [...it, { id: nextId++, type: tool, page: index, x: x - s / 2, y: y - (12 / size.h) / 2, w: s, h: 12 / size.h }]);
    } else if (tool === 'sign') {
      placeSignature(index, x, y);
    } else if (tool === 'whiteout') {
      const id = nextId++;
      drag.current = { kind: 'draw', id, x0: x, y0: y, el: pageEl };
      setItems((it) => [...it, { id, type: 'whiteout', page: index, x, y, w: 0, h: 0 }]);
      pageEl.setPointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const { x, y } = pointFrac(e, d.el);
    if (d.kind === 'draw') {
      setItems((it) => it.map((i) => (i.id === d.id ? { ...i, x: Math.min(x, d.x0), y: Math.min(y, d.y0), w: Math.abs(x - d.x0), h: Math.abs(y - d.y0) } : i)));
    } else if (d.kind === 'resize') {
      const w = Math.max(0.03, d.iw + (x - d.x0));
      setItems((it) => it.map((i) => (i.id === d.id ? { ...i, w, h: w * d.ratio } : i)));
    } else if (d.kind === 'move') {
      setItems((it) => it.map((i) => (i.id === d.id ? { ...i, x: d.ix + (x - d.x0), y: d.iy + (y - d.y0) } : i)));
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'draw') setItems((it) => it.filter((i) => i.id !== d.id || (i.w > 0.005 && i.h > 0.003)));
  };

  const startMove = (item, e, pageEl) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = pointFrac(e, pageEl);
    drag.current = { kind: 'move', id: item.id, x0: x, y0: y, ix: item.x, iy: item.y, el: pageEl };
    setSelected(item.id);
  };

  const startResize = (item, e, pageEl) => {
    e.stopPropagation();
    e.preventDefault();
    const { x } = pointFrac(e, pageEl);
    drag.current = { kind: 'resize', id: item.id, x0: x, iw: item.w, ratio: item.h / item.w, el: pageEl };
    setSelected(item.id);
  };

  const updateItem = (id, patch) => setItems((it) => it.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id) => setItems((it) => it.filter((i) => i.id !== id));
  const selectedItem = items.find((i) => i.id === selected);

  const download = async () => {
    if (!workingPdf) return;
    setBusy('save');
    setError('');
    try {
      const out = items.map((i) => {
        if (i.type !== 'text') return i;
        const el = itemRefs.current[i.id];
        const page = el?.closest('[data-page]');
        const w = el && page ? el.offsetWidth / page.clientWidth : 0.3;
        const h = el && page ? el.offsetHeight / page.clientHeight : 0.03;
        return { ...i, w, h };
      });
      let blob = await backendApi.files.pdfApplyEdits(workingPdf, { fields: values, items: out, flatten });
      if (cert.on) {
        if (!cert.file) throw new Error('Choose your certificate file (.pfx or .p12), or untick "Also sign with my digital certificate".');
        // Sign into an empty signature field, unless a drawn signature already sits on it.
        const images = items.filter((i) => i.type === 'image');
        const covered = (f, page) => images.some((i) => i.page === page && i.x < f.x + f.w && i.x + i.w > f.x && i.y < f.y + f.h && i.y + i.h > f.y);
        const free = flatten ? null : Object.entries(sigFields).flatMap(([p, list]) => list.filter((f) => !covered(f, Number(p))))[0];
        blob = await backendApi.files.pdfSignCertificate(blob, {
          certificate: cert.file, password: cert.password, reason: cert.reason, location: cert.location,
          fieldName: free?.name, invisible: !free && images.length > 0,
        });
      }
      downloadBlob(blob, safePdfName(fileName, `${baseName(file?.name)}_${timestamp()}`));
    } catch (e) {
      setError(e.message || 'The PDF could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const toolHint = useMemo(() => TOOLS.find((t) => t.id === tool)?.hint, [tool]);

  if (!file) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border-2 border-dashed border-purple-300 p-10 text-center">
        <label className="cursor-pointer block">
          <input type="file" accept={ACCEPT} className="hidden" data-testid="pdf-edit-input" onChange={(e) => openFile(e.target.files?.[0])} />
          <Upload className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <p className="text-xl font-bold text-slate-800">Open a PDF or a photo of a form</p>
          <p className="text-slate-600 mt-1">PDF (also locked or scanned), JPG, JPEG, PNG, WebP, BMP, TIFF</p>
          <p className="text-sm text-slate-500 mt-3">Fill the blanks, type anywhere, cover and replace text, tick boxes, then download. Your file is never stored.</p>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <SignatureDialog open={signOpen} onOpenChange={(v) => { setSignOpen(v); if (!v) pendingSign.current = null; }} onDone={onSignatureDone} />
      <div className="sticky top-28 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {TOOLS.map((t) => (
            <Button key={t.id} size="sm" variant={tool === t.id ? 'default' : 'outline'} onClick={() => setTool(t.id)}
              className={tool === t.id ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}>
              <t.icon className="w-4 h-4 mr-1" /> {t.label}
            </Button>
          ))}
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <Label className="text-sm text-slate-700">Size</Label>
          <Input type="number" min={6} max={48} value={selectedItem?.type === 'text' ? selectedItem.size : textSize} className="w-16 h-8"
            onChange={(e) => { const v = Number(e.target.value) || 11; setTextSize(v); if (selectedItem?.type === 'text') updateItem(selectedItem.id, { size: v }); }} />
          <input type="color" aria-label="Text colour" value={selectedItem?.type === 'text' ? selectedItem.color : textColor} className="h-8 w-10 rounded border border-slate-300"
            onChange={(e) => { setTextColor(e.target.value); if (selectedItem?.type === 'text') updateItem(selectedItem.id, { color: e.target.value }); }} />
          {selectedItem && (
            <Button size="sm" variant="outline" onClick={() => { removeItem(selectedItem.id); setSelected(null); }}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Another file
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="pdf-edit-name" className="text-sm font-medium text-slate-700">File name</Label>
          <div className="flex items-center gap-1">
            <Input id="pdf-edit-name" value={fileName} onChange={(e) => setFileName(e.target.value)} className="w-80 h-9" />
            <span className="text-slate-500 text-sm">.pdf</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pdf-edit-flatten" checked={flatten} onCheckedChange={(v) => setFlatten(!!v)} />
            <Label htmlFor="pdf-edit-flatten" className="text-sm text-slate-700 cursor-pointer">Lock the result (no further editing)</Label>
          </div>
          <Button onClick={download} disabled={!!busy || !workingPdf} className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto">
            {busy === 'save' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Download PDF
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <Checkbox id="pdf-edit-cert" checked={cert.on} onCheckedChange={(v) => setCert((c) => ({ ...c, on: !!v }))} />
            <Label htmlFor="pdf-edit-cert" className="text-sm text-slate-700 cursor-pointer flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Also sign with my digital certificate (.pfx / .p12)
            </Label>
          </div>
          {cert.on && (
            <>
              <Input type="file" accept=".pfx,.p12" aria-label="Certificate file" className="w-60 h-9"
                onChange={(e) => setCert((c) => ({ ...c, file: e.target.files?.[0] || null }))} />
              <Input type="password" placeholder="Certificate password" aria-label="Certificate password" autoComplete="off" className="w-48 h-9"
                value={cert.password} onChange={(e) => setCert((c) => ({ ...c, password: e.target.value }))} />
              <Input placeholder="Reason (optional)" aria-label="Reason for signing" className="w-40 h-9"
                value={cert.reason} onChange={(e) => setCert((c) => ({ ...c, reason: e.target.value }))} />
              <Input placeholder="Place (optional)" aria-label="Place of signing" className="w-32 h-9"
                value={cert.location} onChange={(e) => setCert((c) => ({ ...c, location: e.target.value }))} />
              <p className="w-full text-xs text-slate-500">
                Your certificate and password are used only to sign this download and are never stored. Readers such as Adobe show who signed and
                flag any later change. USB-token certificates (most Indian Class 3 DSCs) cannot leave the token: download, then sign the
                &quot;Sign here&quot; box in Adobe Reader or your token&apos;s software.
              </p>
            </>
          )}
        </div>
        <p className="text-sm text-slate-600">
          {toolHint}
          {found && ` Found ${found.fields} fill-in boxes, ${found.checkboxes} tick boxes${found.signatures ? ` and ${found.signatures} signature box${found.signatures === 1 ? '' : 'es'}` : ''}.`}
        </p>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div ref={containerRef} className="w-full">
        {busy === 'open' && (
          <div className="text-center py-16 text-slate-600"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Finding the blanks…</div>
        )}
        {workingPdf && (
          <Document file={workingPdf} onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(e) => setError(`This PDF could not be shown: ${e.message}`)} loading={null}>
            {Array.from({ length: numPages }, (_, index) => {
              const size = pageSizes[index] || { w: 595, h: 842 };
              const scale = width / size.w;
              return (
                <div key={index} className="mx-auto mb-6 shadow-lg bg-white relative" style={{ width }}>
                  <Page pageNumber={index + 1} width={width} renderAnnotationLayer={false} renderTextLayer={false}
                    onLoadSuccess={(p) => onPageLoad(index, p)} loading={null} />
                  <div
                    data-page={index}
                    className={`absolute inset-0 ${tool === 'select' ? '' : 'cursor-crosshair'}`}
                    onPointerDown={(e) => onPagePointerDown(index, e)}
                    style={{ touchAction: tool === 'whiteout' ? 'none' : 'auto' }}
                  >
                    {/* Printed lines sit underneath, so fields and signature boxes stay clickable. */}
                    {tool === 'edittext' && (lines[index] || []).filter((l) => !editedLines[`${index}:${l.key}`]).map((l) => (
                      <button key={`l${l.key}`} type="button" title={`Edit: ${l.text}`} aria-label={`Edit line: ${l.text}`}
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); editLine(index, l); }}
                        style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, height: `${l.h * 100}%` }}
                        className="absolute rounded-sm border border-transparent hover:border-purple-500 hover:bg-purple-500/10 cursor-text" />
                    ))}
                    {(fields[index] || []).map((f) => {
                      const style = { left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` };
                      if (f.type === 'checkbox') {
                        return (
                          <button key={f.name} type="button" title={f.label} aria-label={f.label} style={style}
                            onClick={() => setValues((v) => ({ ...v, [f.name]: !v[f.name] }))}
                            className="absolute flex items-center justify-center bg-[#eef4ff] hover:bg-blue-100 border border-blue-400/60 text-blue-900">
                            {values[f.name] ? <Check className="w-full h-full" /> : null}
                          </button>
                        );
                      }
                      const fontSize = Math.max(8, Math.min(14 * scale, f.h * size.h * scale * (f.multiline ? 0.3 : 0.62)));
                      const common = {
                        title: f.label, 'aria-label': f.label, value: values[f.name] ?? '', style: { ...style, fontSize, lineHeight: 1.15 },
                        onChange: (e) => setValues((v) => ({ ...v, [f.name]: e.target.value })),
                        // Solid, so the page preview's own drawing of the field (e.g. a placeholder) never shows through.
                        className: 'absolute px-1 bg-[#eef4ff] focus:bg-white border border-blue-400/50 focus:border-blue-600 outline-none text-[#00008c] rounded-sm',
                      };
                      return f.multiline ? <textarea key={f.name} {...common} className={`${common.className} resize-none`} /> : <input key={f.name} {...common} />;
                    })}
                    {(sigFields[index] || []).map((f) => (
                      <button key={f.name} type="button" title="Sign here" aria-label={`Sign here: ${f.name}`}
                        onClick={() => placeSignature(index, f.x, f.y, f)}
                        style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}
                        className="absolute flex items-center justify-center gap-1 border-2 border-dashed border-amber-500 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-sm">
                        <FileSignature className="w-3 h-3" /> Sign here
                      </button>
                    ))}
                    {items.filter((i) => i.page === index).map((i) => {
                      const pos = { left: `${i.x * 100}%`, top: `${i.y * 100}%` };
                      if (i.type === 'image') {
                        return (
                          <div key={i.id} onPointerDown={(e) => startMove(i, e, e.currentTarget.parentElement)}
                            className={`absolute cursor-move ${selected === i.id ? 'outline outline-2 outline-purple-500' : 'hover:outline hover:outline-1 hover:outline-purple-300'}`}
                            style={{ ...pos, width: `${i.w * 100}%`, height: `${i.h * 100}%` }}>
                            <img src={i.data} alt="Signature" draggable={false} className="w-full h-full object-contain pointer-events-none select-none" />
                            <span onPointerDown={(e) => startResize(i, e, e.currentTarget.closest('[data-page]'))} title="Drag to resize"
                              className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-purple-600 rounded-sm cursor-nwse-resize" />
                          </div>
                        );
                      }
                      if (i.type === 'whiteout') {
                        return (
                          <div key={i.id} data-kind="whiteout"
                            onPointerDown={(e) => { if (tool === 'select' || tool === 'whiteout') startMove(i, e, e.currentTarget.parentElement); }}
                            className={`absolute bg-white ${selected === i.id ? 'outline outline-2 outline-purple-500' : 'outline outline-1 outline-dashed outline-slate-300'}`}
                            style={{ ...pos, width: `${i.w * 100}%`, height: `${i.h * 100}%` }} />
                        );
                      }
                      if (i.type === 'check' || i.type === 'cross') {
                        const Icon = i.type === 'check' ? Check : X;
                        return (
                          <div key={i.id} onPointerDown={(e) => startMove(i, e, e.currentTarget.parentElement)}
                            className={`absolute text-[#00008c] cursor-move ${selected === i.id ? 'outline outline-2 outline-purple-500' : ''}`}
                            style={{ ...pos, width: `${i.w * 100}%`, height: `${i.h * 100}%` }}>
                            <Icon className="w-full h-full" strokeWidth={3} />
                          </div>
                        );
                      }
                      return (
                        <div key={i.id} className={`absolute group ${selected === i.id ? 'outline outline-2 outline-purple-500' : ''}`} style={pos}>
                          <span onPointerDown={(e) => startMove(i, e, e.currentTarget.closest('[data-page]'))}
                            className="absolute -left-4 top-0 w-4 h-4 bg-purple-600 text-white text-[10px] leading-4 text-center cursor-move rounded-sm opacity-70 group-hover:opacity-100"
                            title="Drag to move">⠿</span>
                          <textarea
                            ref={(el) => { itemRefs.current[i.id] = el; }}
                            value={i.text}
                            rows={Math.max(1, i.text.split('\n').length)}
                            cols={Math.max(4, ...i.text.split('\n').map((l) => l.length + 1))}
                            onFocus={() => setSelected(i.id)}
                            onChange={(e) => updateItem(i.id, { text: e.target.value })}
                            placeholder="Type here"
                            className="block bg-transparent border border-dashed border-purple-400/70 outline-none resize-none overflow-hidden p-0 font-[Helvetica,Arial,sans-serif]"
                            style={{ fontSize: i.size * scale, lineHeight: 1.2, color: i.color }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Document>
        )}
      </div>
    </div>
  );
}
