import React from 'react';
import { useButtonStore } from '@/features/training/store/buttonStore';
import { useRngStore } from '@/features/training/store/rngStore';
import { ButtonPreviewCanvas } from '@/features/buttons/components/ButtonPreviewCanvas';
import { ButtonInspectorPanel } from '@/features/buttons/components/ButtonInspectorPanel';

const LS_LEFT_WIDTH = 'bd-left-width';
const LEFT_MIN = 280;
const LEFT_MAX = 560;
const GRID = 20;

export const ButtonDesignerScreen: React.FC = () => {
  // Selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Stores
  const buttons = useButtonStore((s) => s.buttons);
  const linked = useButtonStore((s) => s.linked);
  const setLinked = useButtonStore((s) => s.setLinked);
  const snapshotFromRng = useButtonStore((s) => s.snapshotFromRng);
  const optimizeLayout = useButtonStore((s) => s.optimizeLayout);
  const clear = useButtonStore((s) => s.clear);
  const removeButton = useButtonStore((s) => s.removeButton);
  const exportJson = useButtonStore((s) => s.exportJson);
  const importJson = useButtonStore((s) => s.importJson);
  const generateMode = useButtonStore((s) => s.generateMode);
  const setGenerateMode = useButtonStore((s) => s.setGenerateMode);
  const updateButton = useButtonStore((s) => s.updateButton);

  // RNG generation paths
  const genSingles = useButtonStore((s) => s.generateFromRngSingles);
  const genCombosAll = useButtonStore((s) => s.generateFromRngCombos);
  const genChordsAll = useButtonStore((s: any) => s.generateFromRngChords) as undefined | (() => void);

  // RNG config for Auto mode
  const rngConfig = useRngStore((s) => s.config);

  // Toolbar: export/import/delete
  const onDeleteSelected = () => {
    selectedIds.forEach((id) => removeButton(id));
    setSelectedIds(new Set());
  };
  const onExport = () => {
    const data = exportJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `buttons-${new Date().toISOString().replace(/[:]/g,'-')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const onImportClick = () => fileRef.current?.click();
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => importJson(String(reader.result ?? ''), generateMode);
    reader.readAsText(f);
    e.target.value = '';
  };

  // Left panel width
  const [leftWidth, setLeftWidth] = React.useState<number>(() => {
    const saved = Number(localStorage.getItem(LS_LEFT_WIDTH) || '');
    if (Number.isFinite(saved)) return clamp(saved, LEFT_MIN, LEFT_MAX);
    return 360;
  });
  React.useEffect(() => { localStorage.setItem(LS_LEFT_WIDTH, String(leftWidth)); }, [leftWidth]);

  // Divider drag
  const dragState = React.useRef<{ startX: number; startW: number } | null>(null);
  const onDividerDown = (e: React.MouseEvent) => {
    dragState.current = { startX: e.clientX, startW: leftWidth };
    window.addEventListener('mousemove', onDividerMove);
    window.addEventListener('mouseup', onDividerUp);
    e.preventDefault();
  };
  const onDividerMove = (e: MouseEvent) => {
    const st = dragState.current; if (!st) return;
    const dx = e.clientX - st.startX;
    setLeftWidth(clamp(st.startW + dx, LEFT_MIN, LEFT_MAX));
  };
  const onDividerUp = () => {
    dragState.current = null;
    window.removeEventListener('mousemove', onDividerMove);
    window.removeEventListener('mouseup', onDividerUp);
  };

  // Preview transforms
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomIn = () => setZoom((z) => clamp(round2(z + 0.1), 0.5, 2));
  const zoomOut = () => setZoom((z) => clamp(round2(z - 0.1), 0.5, 2));
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Generate from RNG (inside Buttons)
  const [genMenuOpen, setGenMenuOpen] = React.useState(false);
  const toggleGenMenu = () => setGenMenuOpen((v) => !v);
  const closeGenMenu = () => setGenMenuOpen(false);

  const generateAuto = () => {
    if (!rngConfig?.polyphony?.enabled) {
      genSingles();
    } else if (rngConfig.polyphony.source === 'chords') {
      genChordsAll?.();
    } else {
      genCombosAll();
    }
    closeGenMenu();
  };
  const generateSinglesOnly = () => { genSingles(); closeGenMenu(); };
  const generateCombosAll = () => { genCombosAll(); closeGenMenu(); };
  const generateChordsAll = () => { genChordsAll?.(); closeGenMenu(); };

  // Alignment & distribution (continue Button Designer dev)
  const selectedButtons = React.useMemo(
    () => buttons.filter(b => selectedIds.has(b.id)),
    [buttons, selectedIds]
  );

  const alignLeft = () => {
    if (selectedButtons.length < 2) return;
    const x = Math.min(...selectedButtons.map(b => (b.layout?.x ?? 0)));
    selectedButtons.forEach(b => updateButton(b.id, { layout: { ...(b.layout ?? {}), x } }));
  };
  const alignRight = () => {
    if (selectedButtons.length < 2) return;
    const maxR = Math.max(...selectedButtons.map(b => (b.layout?.x ?? 0) + (b.appearance?.sizePx ?? 96)));
    selectedButtons.forEach(b => {
      const w = Math.max(24, Math.min(384, b.appearance?.sizePx ?? 96));
      updateButton(b.id, { layout: { ...(b.layout ?? {}), x: maxR - w } });
    });
  };
  const alignTop = () => {
    if (selectedButtons.length < 2) return;
    const y = Math.min(...selectedButtons.map(b => (b.layout?.y ?? 0)));
    selectedButtons.forEach(b => updateButton(b.id, { layout: { ...(b.layout ?? {}), y } }));
  };
  const alignBottom = () => {
    if (selectedButtons.length < 2) return;
    const maxB = Math.max(...selectedButtons.map(b => (b.layout?.y ?? 0) + (b.appearance?.sizePx ?? 96)));
    selectedButtons.forEach(b => {
      const h = Math.max(24, Math.min(384, b.appearance?.sizePx ?? 96));
      updateButton(b.id, { layout: { ...(b.layout ?? {}), y: maxB - h } });
    });
  };
  const alignCenterX = () => {
    if (selectedButtons.length < 2) return;
    const xs = selectedButtons.map(b => (b.layout?.x ?? 0));
    const ws = selectedButtons.map(b => Math.max(24, Math.min(384, b.appearance?.sizePx ?? 96)));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
    const cx = (minX + maxX) / 2;
    selectedButtons.forEach((b, i) => {
      const w = ws[i];
      updateButton(b.id, { layout: { ...(b.layout ?? {}), x: Math.round(cx - w / 2) } });
    });
  };
  const alignCenterY = () => {
    if (selectedButtons.length < 2) return;
    const ys = selectedButtons.map(b => (b.layout?.y ?? 0));
    const hs = selectedButtons.map(b => Math.max(24, Math.min(384, b.appearance?.sizePx ?? 96)));
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys.map((y, i) => y + hs[i]));
    const cy = (minY + maxY) / 2;
    selectedButtons.forEach((b, i) => {
      const h = hs[i];
      updateButton(b.id, { layout: { ...(b.layout ?? {}), y: Math.round(cy - h / 2) } });
    });
  };

  const distributeHoriz = () => {
    const n = selectedButtons.length;
    if (n < 3) return;
    const arr = selectedButtons
      .map(b => ({ id: b.id, x: b.layout?.x ?? 0, w: Math.max(24, Math.min(384, b.appearance?.sizePx ?? 96)) }))
      .sort((a, b) => a.x - b.x);
    const left = arr[0].x;
    const right = arr[n - 1].x + arr[n - 1].w;
    const totalWidth = arr.reduce((s, a) => s + a.w, 0);
    const gap = (right - left - totalWidth) / (n - 1);
    let cursor = left;
    arr.forEach(a => {
      updateButton(a.id, { layout: { ...(useButtonStore.getState().buttons.find(b => b.id === a.id)?.layout ?? {}), x: Math.round(cursor) } });
      cursor += a.w + gap;
    });
  };

  const distributeVert = () => {
    const n = selectedButtons.length;
    if (n < 3) return;
    const arr = selectedButtons
      .map(b => ({ id: b.id, y: b.layout?.y ?? 0, h: Math.max(24, Math.min(384, b.appearance?.sizePx ?? 96)) }))
      .sort((a, b) => a.y - b.y);
    const top = arr[0].y;
    const bottom = arr[n - 1].y + arr[n - 1].h;
    const totalHeight = arr.reduce((s, a) => s + a.h, 0);
    const gap = (bottom - top - totalHeight) / (n - 1);
    let cursor = top;
    arr.forEach(a => {
      updateButton(a.id, { layout: { ...(useButtonStore.getState().buttons.find(b => b.id === a.id)?.layout ?? {}), y: Math.round(cursor) } });
      cursor += a.h + gap;
    });
  };

  // Keyboard nudge
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedIds.size === 0) return;
      const step = e.shiftKey ? GRID : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;
      e.preventDefault();
      useButtonStore.getState().buttons.forEach(b => {
        if (selectedIds.has(b.id)) {
          const x = (b.layout?.x ?? 0) + dx;
          const y = (b.layout?.y ?? 0) + dy;
          updateButton(b.id, { layout: { ...(b.layout ?? {}), x, y } });
        }
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, updateButton]);

  return (
    <div style={wrap}>
      {/* Toolbar */}
      <div style={toolbar}>
        <div style={row}>
          <label style={lab}>
            <input type="checkbox" checked={linked} onChange={(e)=> setLinked(e.target.checked)} />
            <span>Link to RNG</span>
          </label>
          <button style={btn('ghost')} onClick={snapshotFromRng} title="Freeze current buttons">Snapshot</button>
        </div>

        <div style={row}>
          <span style={lab}>Generate mode:</span>
          <button style={btn(generateMode === 'replace' ? 'primary' : 'ghost')} onClick={()=> setGenerateMode('replace')} title="Replace on next generation">Replace</button>
          <button style={btn(generateMode === 'append' ? 'primary' : 'ghost')} onClick={()=> setGenerateMode('append')} title="Append on next generation">Append</button>
        </div>

        {/* Generate from RNG (inside Buttons) */}
        <div style={{ position: 'relative' }}>
          <button style={btn('primary')} onClick={generateAuto} title="Generate from current RNG settings (auto)">
            Generate (Auto)
          </button>
          <button style={btn('ghost')} onClick={toggleGenMenu} title="More generate options">▼</button>
          {genMenuOpen && (
            <div style={menu} onMouseLeave={closeGenMenu}>
              <button style={menuItem} onClick={generateSinglesOnly}>Singles only</button>
              <button style={menuItem} onClick={generateCombosAll}>All combinations</button>
              <button style={menuItem} onClick={generateChordsAll} disabled={!genChordsAll}>All chords</button>
            </div>
          )}
        </div>

        <div style={row}>
          <button style={btn('ghost')} onClick={()=> optimizeLayout({})} title="Auto-pack buttons">Optimize layout</button>
          <button style={btn('ghost')} onClick={onExport} title="Export buttons to JSON">Export</button>
          <button style={btn('ghost')} onClick={onImportClick} title="Import buttons from JSON">Import</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} style={{ display: 'none' }} />
        </div>

        <div style={row}>
          <button style={btn('danger')} onClick={onDeleteSelected} disabled={selectedIds.size === 0} title="Delete selected">
            Delete{selectedIds.size ? ` (${selectedIds.size})` : '' }
          </button>
          <button style={btn('danger')} onClick={()=> clear()} title="Remove all buttons">Clear all</button>
        </div>

        <div style={row}>
          <span style={lab}>Align</span>
          <button style={btn('ghost')} onClick={alignLeft} title="Align left">⟸</button>
          <button style={btn('ghost')} onClick={alignCenterX} title="Align center X">╳</button>
          <button style={btn('ghost')} onClick={alignRight} title="Align right">⟹</button>
          <button style={btn('ghost')} onClick={alignTop} title="Align top">⟰</button>
          <button style={btn('ghost')} onClick={alignCenterY} title="Align center Y">╳</button>
          <button style={btn('ghost')} onClick={alignBottom} title="Align bottom">⟱</button>
          <span style={lab}>Distribute</span>
          <button style={btn('ghost')} onClick={distributeHoriz} title="Distribute horizontally">⇔</button>
          <button style={btn('ghost')} onClick={distributeVert} title="Distribute vertically">⇕</button>
        </div>

        <div style={row}>
          <span style={lab}>Zoom</span>
          <button style={btn('ghost')} onClick={zoomOut} title="Zoom out">−</button>
          <input type="range" min={0.5} max={2} step={0.1} value={zoom} onChange={(e)=> setZoom(Number(e.target.value))} style={range} />
          <button style={btn('ghost')} onClick={zoomIn} title="Zoom in">+</button>
          <button style={btn('ghost')} onClick={zoomReset} title="Reset view">Reset</button>
        </div>
      </div>

      {/* Work area */}
      <div style={{ ...work, gridTemplateColumns: `${leftWidth}px 8px 1fr` }}>
        <aside style={leftPane} aria-label="Button Inspector">
          <ButtonInspectorPanel selectedIds={selectedIds} />
        </aside>

        <div role="separator" aria-orientation="vertical" aria-label="Resize inspector" style={divider} onMouseDown={onDividerDown}>
          <div style={handle} />
        </div>

        <section style={rightPane} aria-label="Button Preview">
          <ButtonPreviewCanvas
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            zoom={zoom}
            pan={pan}
            setPan={setPan}
            gridSize={GRID}
          />
        </section>
      </div>
    </div>
  );
};

/* utils */
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function round2(n: number) { return Math.round(n * 100) / 100; }

/* styles */
const wrap: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  height: '100%',
  minHeight: 0,
};
const toolbar: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: 8,
  borderBottom: '1px solid var(--color-border-primary, #e5e7eb)',
  background: 'var(--color-bg-secondary, #fff)',
};
const work: React.CSSProperties = {
  display: 'grid',
  gridAutoRows: '1fr',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
};
const leftPane: React.CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflowY: 'auto',
  background: 'var(--panel-bg, #fff)',
  borderRight: '1px solid var(--color-border-primary, #e5e7eb)',
};
const divider: React.CSSProperties = { cursor: 'col-resize', display: 'grid', placeItems: 'center', background: 'transparent' };
const handle: React.CSSProperties = { width: 2, height: '60%', background: 'var(--color-border-primary, #e5e7eb)', borderRadius: 1 };
const rightPane: React.CSSProperties = { height: '100%', minHeight: 0, overflow: 'hidden', padding: 12 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const lab: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary,#374151)', fontSize: 13 };
const btn = (kind: 'primary'|'ghost'|'danger'): React.CSSProperties => {
  if (kind === 'primary') return { padding: '6px 10px', borderRadius: 8, border: '1px solid #4338ca', background: '#4f46e5', color: '#fff', cursor: 'pointer' };
  if (kind === 'danger')  return { padding: '6px 10px', borderRadius: 8, border: '1px solid #ef4444', background: '#dc2626', color: '#fff', cursor: 'pointer' };
  return { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border-primary,#e5e7eb)', background: 'var(--color-bg-primary,#fff)', color: 'var(--color-text-primary,#111827)', cursor: 'pointer' };
};
const range: React.CSSProperties = { width: 140 };
const menu: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  boxShadow: '0 6px 24px rgba(0,0,0,0.1)',
  display: 'grid',
  minWidth: 180,
  zIndex: 5,
};
const menuItem: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
};