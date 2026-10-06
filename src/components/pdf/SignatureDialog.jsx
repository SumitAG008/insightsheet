// Make a signature to place on a PDF: draw it, type it, or upload a photo of it.
// The result is a trimmed PNG (transparent background) that the editor places and the server writes in.
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const INK = '#0b1f66';
const SCRIPT_FONT = "'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', 'Apple Chancery', cursive";
const MODES = [['draw', 'Draw'], ['type', 'Type'], ['upload', 'Upload']];

/** Crop a canvas to its ink, so the placed signature is exactly as big as the signature. */
function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = 4;
  const w = x1 - x0 + 1 + pad * 2;
  const h = y1 - y0 + 1 + pad * 2;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').drawImage(canvas, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
  return { data: out.toDataURL('image/png'), aspect: w / h };
}

export default function SignatureDialog({ open, onOpenChange, onDone }) {
  const [mode, setMode] = useState('draw');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const drawing = useRef(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setHasInk(false);
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }, [open, mode]);

  const point = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };

  const down = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = point(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const [x, y] = point(e);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(...drawing.current);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawing.current = [x, y];
    setHasInk(true);
  };
  const up = () => { drawing.current = null; };

  const fromTyped = () => {
    const c = document.createElement('canvas');
    c.width = 900;
    c.height = 220;
    const ctx = c.getContext('2d');
    ctx.fillStyle = INK;
    ctx.font = `96px ${SCRIPT_FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(name.trim(), 20, 115, 860);
    return trimCanvas(c);
  };

  const fromUpload = (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|bmp|gif)$/.test(file.type)) {
      setError('Choose a PNG or JPG photo of your signature.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 900 / img.width, 300 / img.height);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      // Paper turns transparent, so the signature sits on the page like ink.
      const px = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < px.data.length; i += 4) {
        const light = (px.data[i] + px.data[i + 1] + px.data[i + 2]) / 3;
        if (light > 200) px.data[i + 3] = 0;
      }
      ctx.putImageData(px, 0, 0);
      URL.revokeObjectURL(url);
      const sig = trimCanvas(c);
      if (!sig) setError('No signature was found in that photo. Use dark ink on white paper.');
      else onDone(sig);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setError('That image could not be read.'); };
    img.src = url;
  };

  const finish = () => {
    const sig = mode === 'draw' ? trimCanvas(canvasRef.current) : fromTyped();
    if (!sig) {
      setError(mode === 'draw' ? 'Draw your signature first.' : 'Type your name first.');
      return;
    }
    onDone(sig);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Your signature</DialogTitle>
          <DialogDescription>Draw, type or upload it once, then click where it goes. It is used only in this document.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2" role="tablist">
          {MODES.map(([id, label]) => (
            <Button key={id} size="sm" role="tab" aria-selected={mode === id} variant={mode === id ? 'default' : 'outline'}
              className={mode === id ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} onClick={() => setMode(id)}>
              {label}
            </Button>
          ))}
        </div>
        {mode === 'draw' && (
          <div>
            <canvas ref={canvasRef} width={900} height={300} data-testid="signature-pad"
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
              className="w-full h-44 rounded-lg border-2 border-dashed border-slate-300 bg-white touch-none cursor-crosshair" />
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>Sign with your mouse, finger or stylus.</span>
              {hasInk && (
                <button type="button" className="underline" onClick={() => { const c = canvasRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setHasInk(false); }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
        {mode === 'type' && (
          <div className="space-y-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" aria-label="Your full name" maxLength={60} />
            <div className="h-24 rounded-lg border border-slate-200 bg-white flex items-center px-4 text-4xl truncate" style={{ fontFamily: SCRIPT_FONT, color: INK }}>
              {name || <span className="text-slate-300">Your name</span>}
            </div>
          </div>
        )}
        {mode === 'upload' && (
          <label className="block rounded-lg border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer text-slate-600">
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => fromUpload(e.target.files?.[0])} />
            Choose a photo or scan of your signature (dark ink on white paper works best)
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {mode !== 'upload' && <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={finish}>Use this signature</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

SignatureDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};
