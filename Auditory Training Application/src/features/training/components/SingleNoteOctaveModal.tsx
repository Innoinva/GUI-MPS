import React from 'react';
import { Button, Card } from '@/shared/components/ui';
import type { ContourCurve, TemplateType } from '@/features/training/types/rng.types';
import { ContourEditor } from '@/features/training/components/ContourEditor';

interface Props {
  open: boolean;
  noteLabel: string;
  baseToken: string;                 // "pi-<idx>" or "pf-<idx>"
  templateType: TemplateType;        // 'letter' | 'frequency'
  globalOctaves: number[];           // from Source & Selection (singleOctaves)
  onApplyMany: (octaves: number[], curve: ContourCurve) => void; // batch across octaves for this note
  onApplyOne: (octave: number, curve: ContourCurve) => void;     // fine-tune single octave
  onClose: () => void;
}

export const SingleNoteOctaveModal: React.FC<Props> = ({
  open, noteLabel, baseToken, templateType, globalOctaves, onApplyMany, onApplyOne, onClose
}) => {
  const [selectedOcts, setSelectedOcts] = React.useState<number[]>([...globalOctaves]);
  const [curve, setCurve] = React.useState<ContourCurve>({ startHz: 440, endHz: 660, shape: 'linear' });

  React.useEffect(() => {
    if (open) {
      setSelectedOcts([...globalOctaves]);
      setCurve({ startHz: 440, endHz: 660, shape: 'linear' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, baseToken, noteLabel, globalOctaves.join(',')]);

  if (!open) return null;

  const toggle = (o: number) => {
    const s = new Set(selectedOcts);
    s.has(o) ? s.delete(o) : s.add(o);
    setSelectedOcts(Array.from(s).sort((a,b)=>a-b));
  };

  const batchApply = () => {
    // For frequency templates, treat as a single “base frequency” (no octave dimension)
    const octs = templateType === 'frequency' ? [] : selectedOcts;
    onApplyMany(octs, curve);
    onClose();
  };

  return (
    <div style={backdrop} onMouseDown={(e)=>{ if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        <Card title={`Octaves & contour — ${noteLabel}`}>
          <div style={{ display: 'grid', gap: 12 }}>
            {templateType === 'letter' ? (
              <>
                <div style={hint}>Choose octaves to apply this contour (pre‑selected from Source & Selection).</div>
                <div style={grid5x2}>
                  {Array.from({length:10},(_,i)=>i+1).map(o=>(
                    <label key={o} style={chip}>
                      <input type="checkbox" checked={selectedOcts.includes(o)} onChange={()=>toggle(o)} />
                      <span>o{o}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <div style={hint}>This template is frequency‑based (octave‑agnostic). The contour is applied to the base frequency.</div>
            )}

            <ContourEditor
              startHz={curve.startHz}
              endHz={curve.endHz}
              shape={curve.shape}
              onChange={(next)=> setCurve({ startHz: next.startHz, endHz: next.endHz, shape: next.shape, points: next.points })}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {templateType === 'letter' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={small}>Fine‑tune one octave:</span>
                  {Array.from({length:10},(_,i)=>i+1).map(o=>(
                    <Button key={o} variant="ghost" onClick={()=>{ onApplyOne(o, curve); }} disabled={!globalOctaves.includes(o)}>
                      o{o}
                    </Button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={batchApply}>
                  {templateType === 'letter' ? `Apply to ${selectedOcts.length} octave(s)` : 'Apply'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { width: 'min(860px, 92vw)', maxHeight: '85vh', overflow: 'auto' };
const hint: React.CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' };
const small: React.CSSProperties = { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' };
const grid5x2: React.CSSProperties = { display: 'grid', gap: 6, gridTemplateColumns: 'repeat(5, minmax(44px, auto))' };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-full)' };