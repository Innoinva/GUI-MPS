import React from 'react';
import { useButtonStore } from '@/features/training/store/buttonStore';
import type { ButtonDefinition } from '@/features/training/types/buttons.types';

interface Props {
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;

  // View
  zoom: number;                    // 0.5 .. 2
  pan: { x: number; y: number };   // px
  setPan: (p: { x: number; y: number }) => void;

  gridSize?: number;               // default 20
}

const defaultColor = '#6B21A8';

export const ButtonPreviewCanvas: React.FC<Props> = ({
  selectedIds, onSelect, zoom, pan, setPan, gridSize = 20
}) => {
  const buttons = useButtonStore((s) => s.buttons);
  const updateButton = useButtonStore((s) => s.updateButton);

  const stageRef = React.useRef<HTMLDivElement | null>(null);

  // Background pan with right mouse button
  const panState = React.useRef<null | { startX: number; startY: number; initX: number; initY: number }>(null);
  const onStageMouseDown = (e: React.MouseEvent) => {
    // Left click empties selection
    if (e.button === 0) {
      onSelect(new Set());
      return;
    }
    // Right/middle click -> start panning
    if (e.button === 1 || e.button === 2) {
      panState.current = { startX: e.clientX, startY: e.clientY, initX: pan.x, initY: pan.y };
      window.addEventListener('mousemove', onPanMove);
      window.addEventListener('mouseup', onPanUp);
      e.preventDefault();
    }
  };
  const onPanMove = (ev: MouseEvent) => {
    const st = panState.current; if (!st) return;
    const dx = ev.clientX - st.startX;
    const dy = ev.clientY - st.startY;
    setPan({ x: st.initX + dx, y: st.initY + dy });
  };
  const onPanUp = () => {
    panState.current = null;
    window.removeEventListener('mousemove', onPanMove);
    window.removeEventListener('mouseup', onPanUp);
  };

  // Ctrl+wheel zoom at cursor
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    const nextZoom = clamp(to2(zoom + delta), 0.5, 2);

    // Zoom toward cursor: adjust pan so the logical point under cursor remains stable
    const stage = stageRef.current;
    if (!stage) { return; }
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left - pan.x;
    const cy = e.clientY - rect.top - pan.y;

    const k = nextZoom / zoom;
    const nx = pan.x - (cx * (k - 1));
    const ny = pan.y - (cy * (k - 1));

    setPan({ x: nx, y: ny });
    setZoomExternal(nextZoom);
  };

  // We cannot set zoom from here; provide proxy
  const [zoomExternal, setZoomExternal] = React.useState(zoom);
  React.useEffect(() => setZoomExternal(zoom), [zoom]);

  // Drag buttons (convert screen to world coords using zoom/pan)
  const dragRef = React.useRef<null | {
    id: string;
    initX: number; initY: number;     // initial button layout position
    worldStartX: number; worldStartY: number;
  }>(null);

  const screenToWorld = React.useCallback((clientX: number, clientY: number) => {
    const st = stageRef.current;
    if (!st) return { x: 0, y: 0 };
    const rect = st.getBoundingClientRect();
    const localX = clientX - rect.left - pan.x;
    const localY = clientY - rect.top - pan.y;
    return { x: localX / zoom, y: localY / zoom };
  }, [pan.x, pan.y, zoom]);

  const onButtonMouseDown = (e: React.MouseEvent, b: ButtonDefinition) => {
    e.stopPropagation();
    if (e.button !== 0) return; // only left button for dragging button

    // Selection (shift to toggle)
    const next = new Set(selectedIds);
    if (e.shiftKey) {
      next.has(b.id) ? next.delete(b.id) : next.add(b.id);
    } else {
      next.clear(); next.add(b.id);
    }
    onSelect(next);

    // Init drag in world coords
    const lay = b.layout ?? { x: 40, y: 40 };
    const w = screenToWorld(e.clientX, e.clientY);
    dragRef.current = {
      id: b.id,
      initX: lay.x,
      initY: lay.y,
      worldStartX: w.x,
      worldStartY: w.y,
    };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragUp);
  };

  const onDragMove = (ev: MouseEvent) => {
    const st = dragRef.current; if (!st) return;
    const w = screenToWorld(ev.clientX, ev.clientY);
    const dx = w.x - st.worldStartX;
    const dy = w.y - st.worldStartY;
    const nx = snap(st.initX + dx, gridSize);
    const ny = snap(st.initY + dy, gridSize);
    updateButton(st.id, { layout: { ...( (useButtonStore.getState().buttons.find(b=>b.id===st.id)?.layout) ?? {}), x: nx, y: ny } });
  };

  const onDragUp = () => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragUp);
  };

  // Context menu off (for right-drag pan)
  React.useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    const prevent = (e: MouseEvent) => e.preventDefault();
    st.addEventListener('contextmenu', prevent);
    return () => st.removeEventListener('contextmenu', prevent);
  }, []);

  return (
    <div ref={stageRef} style={stage} onMouseDown={onStageMouseDown} onWheel={onWheel}>
      {/* Scrolling grid overlay */}
      <div style={{ ...gridOverlay, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} />

      {/* Content group with pan+zoom */}
      <div style={{ ...contentGroup, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {buttons.map(renderBtn(selectedIds, onButtonMouseDown))}
      </div>

      {buttons.length === 0 && <div style={hint}>Button Preview Area</div>}
    </div>
  );
};

function renderBtn(
  selectedIds: Set<string>,
  onMouseDown: (e: React.MouseEvent, b: ButtonDefinition) => void
) {
  return (b: ButtonDefinition) => {
    const ap = b.appearance ?? {};
    const size = clamp(ap.sizePx ?? 96, 24, 384);
    const color = ap.color ?? defaultColor;
    const shape = ap.shape ?? 'circle';
    const lay = b.layout ?? { x: 40, y: 40 };
    const selected = selectedIds.has(b.id);

    const style: React.CSSProperties = {
      position: 'absolute',
      left: lay.x,
      top: lay.y,
      width: size,
      height: size,
      background: color,
      borderRadius: shape === 'circle' ? '50%' : shape === 'oval' ? `${size / 2}px / ${size / 3}px` : shape === 'square' ? 8 : 12,
      border: ap.border?.enabled ? `${ap.border?.thickness ?? 2}px solid ${ap.border?.color ?? '#ffffff'}` : undefined,
      boxShadow: selected ? '0 0 0 4px rgba(59,130,246,0.35)' : '0 2px 10px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', userSelect: 'none', cursor: 'move',
      transition: 'box-shadow 120ms ease',
    };

    return (
      <div key={b.id} style={style} onMouseDown={(e)=>onMouseDown(e, b)} title={b.label}>
        <div style={{ textAlign: 'center', padding: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{b.label}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{b.freqHz.length} voice(s)</div>
        </div>
      </div>
    );
  };
}

/* utils */
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function to2(n: number) { return Math.round(n * 100) / 100; }
function snap(n: number, s: number) { return Math.round(n / s) * s; }

/* styles */
const stage: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: 'var(--color-bg-canvas, #f5f6f7)',
  border: '2px dashed #d1d5db',
  borderRadius: 12,
  overflow: 'hidden',
};

const gridOverlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  pointerEvents: 'none',
  zIndex: 0,
};

const contentGroup: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
};

const hint: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  color: '#9CA3AF',
  fontSize: 12,
  pointerEvents: 'none',
};