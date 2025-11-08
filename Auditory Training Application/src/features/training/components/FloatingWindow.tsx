import React from 'react';

interface FloatingWindowProps {
  title: string;
  onClose: () => void;
  initial?: { x?: number; y?: number; w?: number; h?: number };
  children: React.ReactNode;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({ title, onClose, initial, children }) => {
  const [pos, setPos] = React.useState({ x: initial?.x ?? 80, y: initial?.y ?? 80 });
  const [size, setSize] = React.useState({ w: initial?.w ?? 720, h: initial?.h ?? 420 });
  const dragging = React.useRef(false);
  const resizing = React.useRef(false);
  const start = React.useRef({ x: 0, y: 0, px: 0, py: 0, w: 0, h: 0 });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (dragging.current) {
      const dx = (e as MouseEvent).clientX - start.current.px;
      const dy = (e as MouseEvent).clientY - start.current.py;
      setPos({ x: start.current.x + dx, y: start.current.y + dy });
    } else if (resizing.current) {
      const dx = (e as MouseEvent).clientX - start.current.px;
      const dy = (e as MouseEvent).clientY - start.current.py;
      setSize({ w: Math.max(420, start.current.w + dx), h: Math.max(260, start.current.h + dy) });
    }
  };

  const onMouseUp = () => { dragging.current = false; resizing.current = false; };

  return (
    <div style={backdrop} onMouseDown={(e)=>{ if (e.target === e.currentTarget) onClose(); }}>
      <div
        style={{ ...win, left: pos.x, top: pos.y, width: size.w, height: size.h }}
        onMouseMove={onMouseMove as any}
        onMouseUp={onMouseUp}
      >
        <div
          style={titleBar}
          onMouseDown={(e) => {
            dragging.current = true;
            start.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY, w: size.w, h: size.h };
          }}
        >
          <div style={{ fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={closeBtn} aria-label="Close">×</button>
        </div>
        <div style={body}>{children}</div>
        <div
          style={resizer}
          onMouseDown={(e) => {
            e.stopPropagation();
            resizing.current = true;
            start.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY, w: size.w, h: size.h };
          }}
        />
      </div>
    </div>
  );
};

const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1000 };
const win: React.CSSProperties = {
  position: 'absolute', boxShadow: 'var(--shadow-lg)', background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-primary)', borderRadius: 10, overflow: 'hidden'
};
const titleBar: React.CSSProperties = {
  height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 10px', background: 'var(--color-bg-tertiary)', cursor: 'move', userSelect: 'none'
};
const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--color-text-primary)',
  fontSize: 20, width: 28, height: 28, lineHeight: '28px', borderRadius: 6, cursor: 'pointer'
};
const body: React.CSSProperties = { padding: 12, width: '100%', height: 'calc(100% - 40px)', overflow: 'auto' };
const resizer: React.CSSProperties = { position: 'absolute', width: 14, height: 14, right: 0, bottom: 0, cursor: 'nwse-resize' };