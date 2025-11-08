import React from 'react';
import { Card } from '@/shared/components/ui';

export interface ContourEditorProps {
  startHz: number;
  endHz: number;
  shape: 'linear' | 'exp' | 'sine' | 'custom';
  // Emits the new params; when shape === 'custom' the points array is included
  onChange: (next: {
    startHz: number;
    endHz: number;
    shape: ContourEditorProps['shape'];
    points?: Array<{ t: number; v: number }>; // t in [0,1], v in [0,1]
  }) => void;
}

/**
 * First iteration:
 * - Structured, vector-style polyline editor (no Bézier yet).
 * - Click to add a point, drag to move, Alt+Click to remove (except endpoints).
 * - Normalized domain: time t in [0,1] (x-axis), value v in [0,1] (y-axis).
 * - startHz/endHz fields + shape preset (linear/exp/sine/custom).
 * Future iterations: Bézier handles, segment types, snapping, presets, import/export.
 */
export const ContourEditor: React.FC<ContourEditorProps> = ({
  startHz,
  endHz,
  shape,
  onChange,
}) => {
  // Points in normalized coordinates; endpoints fixed at (0,0) and (1,1).
  const [points, setPoints] = React.useState<Array<{ t: number; v: number }>>([
    { t: 0, v: 0 },
    { t: 1, v: 1 },
  ]);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  // Presets quickly replace the points (linear/exp/sine)
  React.useEffect(() => {
    if (shape === 'custom') return;
    if (shape === 'linear') {
      setPoints([
        { t: 0, v: 0 },
        { t: 1, v: 1 },
      ]);
    } else if (shape === 'exp') {
      setPoints([
        { t: 0, v: 0 },
        { t: 0.25, v: 0.06 },
        { t: 0.5, v: 0.2 },
        { t: 0.75, v: 0.45 },
        { t: 1, v: 1 },
      ]);
    } else if (shape === 'sine') {
      const N = 16;
      const p: Array<{ t: number; v: number }> = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const v = 0.5 - 0.5 * Math.cos(Math.PI * t); // 0→1 half-sine
        p.push({ t, v });
      }
      setPoints(p);
    }
  }, [shape]);

  // Draw the editor
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = getVar('--color-bg-secondary', '#2a2a2a');
    ctx.fillRect(0, 0, W, H);

    // Grid
    drawGrid(ctx, W, H);

    // Polyline
    ctx.strokeStyle = getVar('--color-accent-primary', '#00d4ff');
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = p.t * W;
      const y = (1 - p.v) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    points.forEach((p, i) => {
      const x = p.t * W;
      const y = (1 - p.v) * H;
      ctx.beginPath();
      ctx.arc(x, y, i === 0 || i === points.length - 1 ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle =
        i === 0 || i === points.length - 1
          ? getVar('--color-accent-secondary', '#ff006e')
          : getVar('--color-text-primary', '#ffffff');
      ctx.fill();
      ctx.strokeStyle = getVar('--color-border-primary', '#3a3a3a');
      ctx.stroke();
    });
  }, [points]);

  // Helpers
  function getVar(name: string, fallback: string) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return v?.trim() || fallback;
  }

  function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.strokeStyle = getVar('--color-border-primary', '#3a3a3a');
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    // vertical lines (0, .25, .5, .75, 1)
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const x = t * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    });
    // horizontal lines (0, .25, .5, .75, 1)
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
      const y = (1 - v) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function norm(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const t = clamp(x / ev.currentTarget.width, 0, 1);
    const v = clamp(1 - y / ev.currentTarget.height, 0, 1);
    return { t, v, x, y };
  }

  function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
  }

  function nearestPointIndex(x: number, y: number) {
    const canvas = canvasRef.current!;
    const W = canvas.width;
    const H = canvas.height;
    const R = 8; // px
    let best = -1;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const px = p.t * W;
      const py = (1 - p.v) * H;
      const d = Math.hypot(px - x, py - y);
      if (d < bestD && d <= R) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  const onMouseDown = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = norm(ev);
    const idx = nearestPointIndex(x, y);
    if (idx >= 0) {
      setDragIndex(idx);
      return;
    }
    // Add a new point on click (ignored if Alt is pressed)
    if (!ev.altKey) {
      const { t, v } = norm(ev);
      const p = [...points, { t, v }];
      p.sort((a, b) => a.t - b.t);
      setPoints(p);
      setDragIndex(p.findIndex((pt) => pt.t === t && pt.v === v));
    }
  };

  const onMouseMove = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragIndex === null) return;
    const i = dragIndex;
    // Keep endpoints anchored
    if (i === 0 || i === points.length - 1) return;
    const { t, v } = norm(ev);
    const left = points[i - 1].t + 0.001;
    const right = points[i + 1].t - 0.001;
    const p = points.slice();
    p[i] = { t: clamp(t, left, right), v };
    setPoints(p);
  };

  const onMouseUp = () => setDragIndex(null);

  const onContextMenu = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    // Remove nearest non-endpoint on right-click
    ev.preventDefault();
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const idx = nearestPointIndex(x, y);
    if (idx > 0 && idx < points.length - 1) {
      const p = points.slice();
      p.splice(idx, 1);
      setPoints(p);
    }
  };

  // Emit changes upward when user edits numeric fields or points
  React.useEffect(() => {
    onChange({ startHz, endHz, shape, points: shape === 'custom' ? points : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, startHz, endHz, shape]);

  return (
    <Card title="Contour Editor">
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div>
          <div style={label}>Start (Hz)</div>
          <input
            type="number"
            min={1}
            step={0.1}
            value={startHz}
            onChange={(e) => onChange({ startHz: Number(e.target.value), endHz, shape, points: shape === 'custom' ? points : undefined })}
            style={num}
          />
        </div>
        <div>
          <div style={label}>End (Hz)</div>
          <input
            type="number"
            min={1}
            step={0.1}
            value={endHz}
            onChange={(e) => onChange({ startHz, endHz: Number(e.target.value), shape, points: shape === 'custom' ? points : undefined })}
            style={num}
          />
        </div>
        <div>
          <div style={label}>Shape</div>
          <select
            value={shape}
            onChange={(e) => onChange({ startHz, endHz, shape: e.target.value as any, points: e.target.value === 'custom' ? points : undefined })}
            style={sel}
          >
            <option value="linear">Linear</option>
            <option value="exp">Exponential</option>
            <option value="sine">Sine (half)</option>
            <option value="custom">Custom (points)</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={hint}>
          Tips: Click to add a point; drag to move; right‑click (or Alt+Click) to remove (endpoints fixed).
        </div>
        <div style={{ marginTop: 8, overflow: 'hidden', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
          <canvas
            ref={canvasRef}
            width={720}
            height={220}
            style={{ width: '100%', height: 220, display: 'block', background: 'var(--color-bg-secondary)' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onContextMenu={onContextMenu}
          />
        </div>
      </div>
    </Card>
  );
};

const label: React.CSSProperties = { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 6 };
const num: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
};
const sel = num;
const hint: React.CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' };