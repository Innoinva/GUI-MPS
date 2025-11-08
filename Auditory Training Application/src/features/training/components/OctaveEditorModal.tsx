import React from 'react';
import type { OctavePolicy } from '@/features/training/types/rng.types';

export interface OctaveEditorTarget {
  kind: 'combo' | 'chord';
  id: string;
  name: string;
  noteLabels: string[];
}

interface Props {
  open: boolean;
  target: OctaveEditorTarget | null;
  globalOctaves: number[];
  value?: OctavePolicy;
  onChange: (policy: OctavePolicy) => void;
  onClose: () => void;
}

export const OctaveEditorModal: React.FC<Props> = ({ open, target, globalOctaves, value, onChange, onClose }) => {
  const noteCount = target?.noteLabels?.length ?? 0;

  const [mode, setMode] = React.useState<OctavePolicy['mode']>(value?.mode ?? 'global');
  const [uniformOctaves, setUniformOctaves] = React.useState<number[]>(value?.mode === 'uniform' ? dedupeSort(value.octaves) : [...globalOctaves]);

  const [indAllowed, setIndAllowed] = React.useState<Record<number, number[]>>(() => {
    if (value?.mode === 'independent' && 'allowed' in value) return cloneAllowed(value.allowed);
    const init: Record<number, number[]> = {};
    for (let i = 1; i <= noteCount; i++) init[i] = [...globalOctaves];
    return init;
  });

  const [rootIndex, setRootIndex] = React.useState<number>(() => (value?.mode === 'relative' && 'rootIndex' in value ? value.rootIndex : 1));
  const [rootOctaves, setRootOctaves] = React.useState<number[]>(value?.mode === 'relative' && 'rootOctaves' in value ? dedupeSort(value.rootOctaves) : [...globalOctaves]);
  const [offsets, setOffsets] = React.useState<number[]>(value?.mode === 'relative' && 'offsets' in value ? [...value.offsets] : Array.from({ length: Math.max(1, noteCount) }, () => 0));

  React.useEffect(() => {
    if (!open || !target) return;
    setMode(value?.mode ?? 'global');
    setUniformOctaves(value?.mode === 'uniform' ? dedupeSort(value.octaves) : [...globalOctaves]);

    if (value?.mode === 'independent' && 'allowed' in value) setIndAllowed(cloneAllowed(value.allowed));
    else {
      const init: Record<number, number[]> = {};
      for (let i = 1; i <= (target.noteLabels?.length ?? 0); i++) init[i] = [...globalOctaves];
      setIndAllowed(init);
    }

    if (value?.mode === 'relative' && 'rootIndex' in value) {
      setRootIndex(value.rootIndex);
      setRootOctaves(dedupeSort(value.rootOctaves));
      setOffsets([...value.offsets]);
    } else {
      setRootIndex(1);
      setRootOctaves([...globalOctaves]);
      setOffsets(Array.from({ length: Math.max(1, target.noteLabels?.length ?? 1) }, () => 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id]);

  if (!open || !target) return null;

  const commit = () => {
    if (mode === 'global') onChange({ mode: 'global' });
    else if (mode === 'uniform') onChange({ mode: 'uniform', octaves: dedupeSort(uniformOctaves) });
    else if (mode === 'independent') onChange({ mode: 'independent', allowed: normalizeAllowed(indAllowed) });
    else if (mode === 'relative') onChange({ mode: 'relative', rootIndex, rootOctaves: dedupeSort(rootOctaves), offsets: normalizeOffsets(offsets, noteCount) });
    onClose();
  };

  const toggleUniform = (o: number) => setUniformOctaves(toggleInArray(uniformOctaves, o));
  const toggleInd = (noteIdx: number, o: number) => {
    const allowed = indAllowed[noteIdx] ?? [];
    setIndAllowed({ ...indAllowed, [noteIdx]: toggleInArray(allowed, o) });
  };
  const toggleRootOct = (o: number) => setRootOctaves(toggleInArray(rootOctaves, o));

  return (
    <div style={backdrop} onMouseDown={(e)=>{ if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <div style={title}>Octaves — {target.kind === 'combo' ? 'Combination' : 'Chord'}: {target.name}</div>

        <div style={{ display: 'grid', gap: 12, color: '#111827' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={radio}><input type="radio" checked={mode==='global'} onChange={()=>setMode('global')} /> Global</label>
            <label style={radio}><input type="radio" checked={mode==='uniform'} onChange={()=>setMode('uniform')} /> Uniform</label>
            <label style={radio}><input type="radio" checked={mode==='independent'} onChange={()=>setMode('independent')} /> Independent per note</label>
            <label style={radio}><input type="radio" checked={mode==='relative'} onChange={()=>setMode('relative')} /> Relative (root + offsets)</label>
          </div>

          {mode === 'global' && (
            <div>
              <div style={hint}>Using Source & Selection octaves</div>
              <div style={grid}>
                {Array.from({length:10},(_,i)=>i+1).map(o=>(
                  <span key={o} style={{ ...chip, opacity: globalOctaves.includes(o) ? 1 : 0.35 }}>o{o}</span>
                ))}
              </div>
            </div>
          )}

          {mode === 'uniform' && (
            <div>
              <div style={hint}>Choose octaves for the entire entry</div>
              <div style={grid}>
                {Array.from({length:10},(_,i)=>i+1).map(o=>(
                  <label key={o} style={chip}><input type="checkbox" checked={uniformOctaves.includes(o)} onChange={()=>toggleUniform(o)} /><span>o{o}</span></label>
                ))}
              </div>
            </div>
          )}

          {mode === 'independent' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={hint}>Choose octaves for each note</div>
              {(target.noteLabels || []).map((lab, i) => {
                const noteIdx = i+1;
                const allowed = indAllowed[noteIdx] ?? [];
                return (
                  <div key={noteIdx} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fff' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>{lab}</div>
                    <div style={grid}>
                      {Array.from({length:10},(_,k)=>k+1).map(o=>(
                        <label key={o} style={chip}><input type="checkbox" checked={allowed.includes(o)} onChange={()=>toggleInd(noteIdx, o)} /><span>o{o}</span></label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'relative' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div><strong>Root note:</strong></div>
                <select value={rootIndex} onChange={(e)=> setRootIndex(Number(e.target.value))} style={selectBox}>
                  {Array.from({length: noteCount}, (_,i)=>i+1).map(i => (
                    <option key={i} value={i}>{i}. {target.noteLabels?.[i-1] ?? `Note ${i}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={hint}>Allowed octaves for root</div>
                <div style={grid}>
                  {Array.from({length:10},(_,i)=>i+1).map(o=>(
                    <label key={o} style={chip}><input type="checkbox" checked={rootOctaves.includes(o)} onChange={()=>toggleRootOct(o)} /><span>o{o}</span></label>
                  ))}
                </div>
              </div>

              <div>
                <div style={hint}>Per‑note offsets (octaves) relative to root</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Array.from({length: noteCount}, (_,i)=>i+1).map(i => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, alignItems: 'center' }}>
                      <div style={{ color: '#111827' }}>{i}. {target.noteLabels?.[i-1] ?? `Note ${i}`} {i === rootIndex && <span style={{ color: '#6b7280' }}>(root)</span>}</div>
                      <input
                        type="number"
                        value={offsets[i-1] ?? 0}
                        onChange={(e)=> {
                          const next = [...offsets];
                          next[i-1] = i === rootIndex ? 0 : clampInt(Number(e.target.value), -5, 5);
                          setOffsets(next);
                        }}
                        disabled={i === rootIndex}
                        style={num}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btn('ghost')}>Cancel</button>
            <button onClick={commit} style={btn('primary')}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* helpers */
function cloneAllowed(src: Record<number, number[]>): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  Object.keys(src).forEach(k => { out[Number(k)] = [...src[Number(k)]]; });
  return out;
}
function normalizeAllowed(src: Record<number, number[]>): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  Object.keys(src).forEach(k => { out[Number(k)] = dedupeSort(src[Number(k)]) });
  return out;
}
function toggleInArray(arr: number[], v: number) {
  const s = new Set(arr); s.has(v) ? s.delete(v) : s.add(v); return dedupeSort(Array.from(s));
}
function dedupeSort(arr: number[]) { return Array.from(new Set(arr)).sort((a,b)=>a-b); }
function clampInt(n: number, lo: number, hi: number) { if (!Number.isFinite(n)) return 0; return Math.max(lo, Math.min(hi, Math.trunc(n))); }

/* theme-safe styles */
const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 9999 };
const modal: React.CSSProperties = { width: 'min(900px, 94vw)', maxHeight: '85vh', overflow: 'auto', background: 'var(--color-bg-secondary,#fff)', border: '1px solid var(--color-border-primary,#e5e7eb)', borderRadius: 12, padding: 16 };
const title: React.CSSProperties = { fontWeight: 700, fontSize: 16, marginBottom: 12, color: 'var(--color-text-primary,#111827)' };
const radio: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary,#111827)' };
const hint: React.CSSProperties = { color: 'var(--color-text-secondary,#6b7280)', fontSize: 12 };
const grid: React.CSSProperties = { display: 'grid', gap: 6, gridTemplateColumns: 'repeat(5, minmax(44px, auto))' };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--color-border-primary,#e5e7eb)', borderRadius: 999, background: '#fff', color: '#111827' };
const selectBox: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border-primary,#d1d5db)', background: '#fff', color: '#111827' };
const num: React.CSSProperties = { width: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border-primary,#d1d5db)', background: '#fff', color: '#111827' };
const btn = (kind: 'primary'|'ghost'): React.CSSProperties => kind === 'primary'
  ? ({ padding: '8px 12px', background: '#4f46e5', color: '#fff', border: '1px solid #4338ca', borderRadius: 8, cursor: 'pointer' })
  : ({ padding: '8px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' });