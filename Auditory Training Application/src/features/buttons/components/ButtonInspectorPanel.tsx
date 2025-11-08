import React from 'react';
import { useButtonStore } from '@/features/training/store/buttonStore';
import type { ButtonDefinition, ButtonShape } from '@/features/training/types/buttons.types';
import { useSoundBankStore } from '@/features/sound-design/store/soundBankStore';

interface Props { selectedIds: Set<string>; }

export const ButtonInspectorPanel: React.FC<Props> = ({ selectedIds }) => {
  const buttons = useButtonStore((s) => s.buttons);
  const update = useButtonStore((s) => s.updateButton);
  const bankModels: any[] = useSoundBankStore((s) => s.models ?? []);

  const selected = buttons.filter(b => selectedIds.has(b.id));
  const single = selected.length === 1 ? selected[0] : null;

  const patchAll = (partial: Partial<ButtonDefinition>) => {
    selected.forEach((b) => update(b.id, partial));
  };

  return (
    <div style={panel}>
      <h2 style={h2}>Button Customization</h2>
      {selected.length === 0 && <div style={muted}>Select a button to edit its properties.</div>}

      {selected.length > 0 && (
        <>
          <section>
            <h3 style={h3}>Appearance</h3>
            <div style={row}>
              <label style={lab}>Size (px)</label>
              <input
                type="number" min={16} max={512}
                value={single?.appearance?.sizePx ?? 96}
                onChange={(e)=>{
                  const v = Math.max(16, Math.min(512, Number(e.target.value) || 96));
                  patchAll({ appearance: { ...(single?.appearance ?? {}), sizePx: v } });
                }}
                style={inp}
              />
              <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                {[64,96,128].map(p=>(
                  <button key={p} onClick={()=>patchAll({ appearance: { ...(single?.appearance ?? {}), sizePx: p } })} style={chip}>{p}px</button>
                ))}
              </div>
            </div>

            <div style={row}>
              <label style={lab}>Shape</label>
              <select
                value={single?.appearance?.shape ?? 'circle'}
                onChange={(e)=>patchAll({ appearance: { ...(single?.appearance ?? {}), shape: e.target.value as ButtonShape } })}
                style={sel}
              >
                <option value="circle">Circle</option>
                <option value="oval">Oval</option>
                <option value="square">Square</option>
                <option value="rect">Rectangle</option>
                <option value="custom">Custom (vector)</option>
              </select>
            </div>

            <div style={row}>
              <label style={lab}>Color</label>
              <input
                type="color"
                value={single?.appearance?.color ?? '#6B21A8'}
                onChange={(e)=>patchAll({ appearance: { ...(single?.appearance ?? {}), color: e.target.value } })}
                style={{ width: 36, height: 24, border: '1px solid #ddd', borderRadius: 6, background: 'transparent' }}
              />
            </div>
          </section>

          <section>
            <h3 style={h3}>Behavior</h3>
            <div style={row}>
              <label style={lab}>Trigger</label>
              <select
                value={single?.behavior?.trigger ?? 'momentary'}
                onChange={(e)=>patchAll({ behavior: { ...(single?.behavior ?? {}), trigger: e.target.value as any } })}
                style={sel}
              >
                <option value="momentary">Momentary</option>
                <option value="latch">Latch</option>
                <option value="toggle">Toggle</option>
              </select>
            </div>

            <div style={row}>
              <label style={lab}>Reactive color</label>
              <select
                value={single?.behavior?.reactiveColor?.mode ?? 'off'}
                onChange={(e)=>patchAll({
                  behavior: { ...(single?.behavior ?? {}), reactiveColor: { mode: e.target.value as any, durationMs: single?.behavior?.reactiveColor?.durationMs ?? 500 } }
                })}
                style={sel}
              >
                <option value="off">Off</option>
                <option value="on-correct">On correct</option>
              </select>
              <label style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>Duration (ms)</label>
              <input
                type="number" min={50} max={5000}
                value={single?.behavior?.reactiveColor?.durationMs ?? 500}
                onChange={(e)=>patchAll({
                  behavior: { ...(single?.behavior ?? {}), reactiveColor: { mode: single?.behavior?.reactiveColor?.mode ?? 'on-correct', durationMs: Math.max(50, Number(e.target.value)||500) } }
                })}
                style={{ ...inp, width: 100, marginLeft: 6 }}
              />
            </div>

            <div style={row}>
              <label style={lab}>Light feedback</label>
              <select
                value={single?.behavior?.lightFeedback?.mode ?? 'off'}
                onChange={(e)=>patchAll({
                  behavior: { ...(single?.behavior ?? {}), lightFeedback: { mode: e.target.value as any, durationMs: single?.behavior?.lightFeedback?.durationMs ?? 1000 } }
                })}
                style={sel}
              >
                <option value="off">Off</option>
                <option value="constant">Constant</option>
                <option value="on-correct">On correct</option>
              </select>
              <label style={{ marginLeft: 10, fontSize: 12, color: '#6b7280' }}>Duration (ms)</label>
              <input
                type="number" min={50} max={10000}
                value={single?.behavior?.lightFeedback?.durationMs ?? 1000}
                onChange={(e)=>patchAll({
                  behavior: { ...(single?.behavior ?? {}), lightFeedback: { mode: single?.behavior?.lightFeedback?.mode ?? 'on-correct', durationMs: Math.max(50, Number(e.target.value)||1000) } }
                })}
                style={{ ...inp, width: 100, marginLeft: 6 }}
              />
            </div>
          </section>

          <section>
            <h3 style={h3}>Voices</h3>
            {single && (
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                This button has {single.freqHz.length} voice(s). Models were assigned from RNG policy; you can override below.
              </div>
            )}
            {single?.voices?.map((v, i) => (
              <div key={i} style={row}>
                <label style={lab}>Voice {i+1} model</label>
                <select
                  value={v.modelId ?? ''}
                  onChange={(e)=> {
                    const next = [...(single.voices ?? [])];
                    next[i] = { ...(next[i] ?? { modelId: null }), modelId: e.target.value || null };
                    patchAll({ voices: next });
                  }}
                  style={sel}
                >
                  <option value="">(none)</option>
                  {bankModels.map((m) => (
                    <option key={m.meta.id} value={m.meta.id}>{m.name ?? m.meta.id}</option>
                  ))}
                </select>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
};

const panel: React.CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflowY: 'auto',
  padding: 16,
  background: '#fff',
};
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 700, marginBottom: 12 };
const h3: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: '14px 0 8px' };
const muted: React.CSSProperties = { fontSize: 12, color: '#6b7280' };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' };
const lab: React.CSSProperties = { minWidth: 96, fontSize: 12, color: '#374151' };
const inp: React.CSSProperties = { width: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' };
const sel: React.CSSProperties = inp;
const chip: React.CSSProperties = { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 999, background: '#fff', cursor: 'pointer' };