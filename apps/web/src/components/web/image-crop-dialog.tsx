'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ImageCropDialogProps = {
  file: File | null;
  aspect?: number;
  title?: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
};

export function ImageCropDialog({
  file,
  aspect = 1,
  title = 'Crop photo',
  onCancel,
  onCropped,
}: ImageCropDialogProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [ready, setReady] = useState(false);

  const viewport = useMemo(() => {
    const width = 320;
    return { width, height: Math.round(width / aspect) };
  }, [aspect]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setReady(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const coverScale = useCallback(() => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return 1;
    return Math.max(viewport.width / img.naturalWidth, viewport.height / img.naturalHeight);
  }, [viewport.height, viewport.width]);

  function clampOffset(next: { x: number; y: number }, nextScale = scale) {
    const img = imgRef.current;
    if (!img?.naturalWidth) return next;
    const drawnW = img.naturalWidth * coverScale() * nextScale;
    const drawnH = img.naturalHeight * coverScale() * nextScale;
    const maxX = Math.max(0, (drawnW - viewport.width) / 2);
    const maxY = Math.max(0, (drawnH - viewport.height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function onPointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setOffset(clampOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  async function confirmCrop() {
    const img = imgRef.current;
    if (!img || !file) return;
    const outputW = 720;
    const outputH = Math.round(outputW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const totalScale = coverScale() * scale;
    const drawnW = img.naturalWidth * totalScale;
    const drawnH = img.naturalHeight * totalScale;
    const dx = (viewport.width - drawnW) / 2 + offset.x;
    const dy = (viewport.height - drawnH) / 2 + offset.y;
    ctx.scale(outputW / viewport.width, outputH / viewport.height);
    ctx.drawImage(img, dx, dy, drawnW, drawnH);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return;
    const cropped = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-crop.jpg', { type: 'image/jpeg' });
    onCropped(cropped);
  }

  if (!file || !objectUrl) return null;

  const totalScale = ready ? coverScale() * scale : 1;
  const drawnW = ready && imgRef.current ? imgRef.current.naturalWidth * totalScale : viewport.width;
  const drawnH = ready && imgRef.current ? imgRef.current.naturalHeight * totalScale : viewport.height;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Drag to reposition. Use the slider to zoom.</p>
        <div
          className="relative mx-auto mt-4 cursor-move overflow-hidden rounded-md border border-border bg-black"
          style={{ width: viewport.width, height: viewport.height }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={objectUrl}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: drawnW,
              height: drawnH,
              left: (viewport.width - drawnW) / 2 + offset.x,
              top: (viewport.height - drawnH) / 2 + offset.y,
            }}
            onLoad={() => setReady(true)}
          />
        </div>
        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={scale}
            onChange={(event) => {
              const next = Number(event.target.value);
              setScale(next);
              setOffset((prev) => clampOffset(prev, next));
            }}
            className="mt-2 w-full"
          />
        </label>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded border border-border px-4 py-2 text-sm font-bold text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmCrop()}
            className="flex-1 rounded bg-brand px-4 py-2 text-sm font-black text-foreground"
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
