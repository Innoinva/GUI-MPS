import React from 'react';
import { Button, Card, Input } from '@/shared/components/ui';
import { useRngStore } from '@/features/training/store/rngStore';
import { useButtonStore } from '@/features/training/store/buttonStore';
import type {
  ScaleTemplate,
  RNGChordMember,
  ContourCurve,
  TemplateType,
  ModelAssignmentPolicy,
} from '@/features/training/types/rng.types';
import { page } from '@/features/training/utils/combos';
import { RNGTemplatesPanel } from '@/features/training/components/RNGTemplatesPanel';
import { ToneShapeWorkbench } from '@/features/training/components/ToneShapeWorkbench';
import { OctaveEditorModal, type OctaveEditorTarget } from '@/features/training/components/OctaveEditorModal';
import { useSoundBankStore } from '@/features/sound-design/store/soundBankStore';
import { useTabManager } from '@/shared/hooks/useTabManager';
import { ButtonDesignerScreen } from '@/features/buttons/screens/ButtonDesignerScreen';

export const RNGConfiguration: React.FC = () => {
  const { openOrActivate } = useTabManager();

  // Store selectors
  const templates = useRngStore((s) => s.templates);
  const config = useRngStore((s) => s.config);
  const items = useRngStore((s) => s.items);
  const combosResolved = useRngStore((s) => s.combos);
  const combosBase = useRngStore((s) => s.combosBase);
  const chords = useRngStore((s) => s.chords);
  const comboPolicies = useRngStore((s) => s.comboOctavePolicies);
  const chordPolicies = useRngStore((s) => s.chordOctavePolicies);

  const setTemplate = useRngStore((s) => s.setTemplate);
  const setConfig = useRngStore((s) => s.setConfig);
  const setSelectedIndices = useRngStore((s) => s.setSelectedIndices);
  const resolveItems = useRngStore((s) => s.resolveItems);
  const buildCombosResolved = useRngStore((s) => s.buildCombos);
  const buildCombosBase = useRngStore((s) => s.buildCombosBase);

  const addChord = useRngStore((s) => s.addChord);
  const updateChord = useRngStore((s) => s.updateChord);
  const removeChord = useRngStore((s) => s.removeChord);

  const setModelFilter = useRngStore((s) => s.setModelFilter);
  const setSingleContour = useRngStore((s) => s.setSingleContour);
  const setComboGroupContour = useRngStore((s) => s.setComboGroupContour);
  const setComboNoteContour = useRngStore((s) => s.setComboNoteContour);
  const setChordGroupContour = useRngStore((s) => s.setChordGroupContour);
  const setChordNoteContour = useRngStore((s) => s.setChordNoteContour);

  const setComboOctavePolicy = useRngStore((s) => s.setComboOctavePolicy);
  const setChordOctavePolicy = useRngStore((s) => s.setChordOctavePolicy);

  // Buttons generation
  const genSingles = useButtonStore((s) => s.generateFromRngSingles);
  const genCombosAll = useButtonStore((s) => s.generateFromRngCombos);
  const genCombosUsing = useButtonStore((s) => s.generateFromRngCombosUsing);
  const genChordsAll = useButtonStore((s: any) => s.generateFromRngChords) as undefined | (() => void);
  const genChordsUsing = useButtonStore((s: any) => s.generateFromRngChordsUsing) as undefined | ((ids: string[]) => void);

  // Templates and source list (octave-agnostic)
  const tplList: ScaleTemplate[] = React.useMemo(() => Object.values(templates), [templates]);
  const currentTpl = config.templateId ? templates[config.templateId] : undefined;
  const templateType: TemplateType = (currentTpl?.type ?? 'letter') as TemplateType;

  const sourceList: string[] = React.useMemo(() => {
    if (!currentTpl) return [];
    if (currentTpl.type === 'letter') return currentTpl.letters ?? [];
    return (currentTpl.freqsHz ?? []).map((f) => `${f.toFixed(2)} Hz`);
  }, [currentTpl]);

  // Resolve + build
  React.useEffect(() => {
    resolveItems(440);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.templateId, JSON.stringify(config.selectedIndices), JSON.stringify(config.octave), config.polyphony.enabled, config.polyphony.source]);

  const itemsKey = React.useMemo(() => items.map((i) => i.id).join('|'), [items]);
  React.useEffect(() => {
    if (config.polyphony.enabled) {
      buildCombosResolved();
      buildCombosBase();
    } else {
      buildCombosBase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, config.polyphony.enabled, config.polyphony.k, config.polyphony.source]);

  // k input (buffered)
  const [kInput, setKInput] = React.useState(String(config.polyphony.k));
  React.useEffect(() => setKInput(String(config.polyphony.k)), [config.polyphony.k]);
  const commitK = () => {
    const n = Number(kInput);
    const val = Number.isFinite(n) ? Math.max(2, Math.min(12, n)) : config.polyphony.k;
    if (val !== config.polyphony.k) setConfig({ polyphony: { ...config.polyphony, k: val } });
    setKInput(String(val));
  };

  // Pagination inputs
  const [basePerPage, setBasePerPage] = React.useState(20);
  const [basePerPageInput, setBasePerPageInput] = React.useState(String(basePerPage));
  React.useEffect(() => setBasePerPageInput(String(basePerPage)), [basePerPage]);
  const commitBasePerPage = () => {
    const n = Number(basePerPageInput);
    const val = Number.isFinite(n) ? Math.max(5, Math.min(100, n)) : basePerPage;
    setBasePerPage(val);
    setBasePerPageInput(String(val));
  };

  const [chPerPage, setChPerPage] = React.useState(20);
  const [chPerPageInput, setChPerPageInput] = React.useState(String(chPerPage));
  React.useEffect(() => setChPerPageInput(String(chPerPage)), [chPerPage]);
  const commitChPerPage = () => {
    const n = Number(chPerPageInput);
    const val = Number.isFinite(n) ? Math.max(5, Math.min(100, n)) : chPerPage;
    setChPerPage(val);
    setChPerPageInput(String(val));
  };

  // Selection helpers
  const onToggleSelectAll = (check: boolean) => {
    const all = sourceList.map((_, i) => i);
    setSelectedIndices(check ? all : []);
  };
  const onToggleIndex = (idx: number) => {
    const s = new Set(config.selectedIndices);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setSelectedIndices(Array.from(s).sort((a, b) => a - b));
  };

  // Octaves
  const onToggleOctave = (type: 'single' | 'chord', oct: number) => {
    const path = type === 'single' ? 'singleOctaves' : 'chordOctaves';
    const curr = new Set((config.octave as any)[path] as number[]);
    curr.has(oct) ? curr.delete(oct) : curr.add(oct);
    const next = Array.from(curr).sort((a, b) => a - b);
    if (type === 'single' && config.octave.sameForSingleAndChord) {
      setConfig({ octave: { ...config.octave, singleOctaves: next, chordOctaves: [...next] } });
    } else {
      setConfig({ octave: { ...config.octave, [path]: next } as any });
    }
  };

  // Stimulus toggles
  const setSingle = () => setConfig({ polyphony: { ...config.polyphony, enabled: false } });
  const setSimul = () => setConfig({ polyphony: { ...config.polyphony, enabled: true } });
  const setSource = (src: 'combinations' | 'chords' | 'both') => setConfig({ polyphony: { ...config.polyphony, source: src } });

  // Chord builder
  const [chordName, setChordName] = React.useState('');
  const [adHocFreq, setAdHocFreq] = React.useState('');
  const [memberItemIds, setMemberItemIds] = React.useState<Set<string>>(new Set());
  const toggleMember = (id: string) => {
    const next = new Set(memberItemIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setMemberItemIds(next);
  };
  const adHocValid = React.useMemo(() => {
    const f = Number(adHocFreq.trim());
    return Number.isFinite(f) && f > 0;
  }, [adHocFreq]);
  const builderCount = memberItemIds.size + (adHocValid ? 1 : 0);
  const [selectedChordIds, setSelectedChordIds] = React.useState<Set<string>>(new Set());
  const addCurrentChord = () => {
    if (builderCount < 2) return;
    const members: RNGChordMember[] = [];
    memberItemIds.forEach((id) => members.push({ itemRefId: id }));
    if (adHocValid) members.push({ freqHz: Number(adHocFreq.trim()), label: `${Number(adHocFreq.trim()).toFixed(2)} Hz` });
    const id = addChord(chordName.trim() || 'Chord', members);
    setChordName(''); setAdHocFreq(''); setMemberItemIds(new Set());
    setSelectedChordIds(new Set([...selectedChordIds, id]));
  };

  // Chords pagination
  const [chPage, setChPage] = React.useState(0);
  const chordsSorted = React.useMemo(
    () => chords.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })),
    [chords]
  );
  React.useEffect(() => { setChPage(0); }, [chords.length]);
  const chPageCount = Math.max(1, Math.ceil(chordsSorted.length / chPerPage));
  React.useEffect(() => { if (chPage > chPageCount - 1) setChPage(chPageCount - 1); }, [chordsSorted.length, chPerPage, chPageCount, chPage]);
  const chordsPaged = React.useMemo(() => page(chordsSorted, chPage, chPerPage), [chordsSorted, chPage, chPerPage]);

  // Base combinations
  const [basePageIndex, setBasePageIndex] = React.useState(0);
  const [selectedBaseComboIds, setSelectedBaseComboIds] = React.useState<Set<string>>(new Set());
  const combosBaseSorted = React.useMemo(
    () => combosBase.slice().sort((a, b) => a.labels.localeCompare(b.labels, undefined, { numeric: true, sensitivity: 'base' })),
    [combosBase]
  );
  React.useEffect(() => { setBasePageIndex(0); setSelectedBaseComboIds(new Set()); }, [combosBaseSorted.length, config.polyphony.k]);
  const basePageCount = Math.max(1, Math.ceil(combosBaseSorted.length / basePerPage));
  React.useEffect(() => { if (basePageIndex > basePageCount - 1) setBasePageIndex(basePageCount - 1); }, [combosBaseSorted.length, basePerPage, basePageIndex, basePageCount]);
  const combosBasePaged = React.useMemo(() => page(combosBaseSorted, basePageIndex, basePerPage), [combosBaseSorted, basePageIndex, basePerPage]);

  // Sound models
  const bankModels: any[] = useSoundBankStore((s) => s.models ?? []);
  const allModelIds = React.useMemo(() => bankModels.map((m) => m.meta.id), [bankModels]);
  const selectedModels = config.modelFilter.selectedModelIds.length ? config.modelFilter.selectedModelIds : allModelIds;

  // Octave Editor modal
  const [octEditorOpen, setOctEditorOpen] = React.useState(false);
  const [octTarget, setOctTarget] = React.useState<OctaveEditorTarget | null>(null);
  const openComboOctaves = (comboBaseId: string, labels: string, noteLabels: string[]) => {
    setOctTarget({ kind: 'combo', id: comboBaseId, name: labels, noteLabels });
    setOctEditorOpen(true);
  };
  const openChordOctaves = (chordId: string) => {
    const ch = chords.find(x => x.id === chordId);
    if (!ch) return;
    const noteLabels = ch.members.map(m => m.label ?? m.itemRefId ?? `${m.freqHz?.toFixed(2)} Hz`);
    setOctTarget({ kind: 'chord', id: chordId, name: ch.name, noteLabels });
    setOctEditorOpen(true);
  };
  const onSaveOctaves = (policy: any) => {
    if (!octTarget) return;
    if (octTarget.kind === 'combo') setComboOctavePolicy(octTarget.id, policy);
    else setChordOctavePolicy(octTarget.id, policy);
  };

  // Generate ⇒ open Buttons tab
  const openButtonsTab = () => {
    openOrActivate({
      id: 'training:buttons',
      title: 'Buttons Designer',
      category: 'training',
      closable: true,
      render: () => <ButtonDesignerScreen />,
    });
  };

  const generateButtons = () => {
    if (!config.polyphony.enabled) {
      genSingles(); openButtonsTab(); return;
    }
    if (config.polyphony.source === 'chords') {
      if (genChordsUsing && selectedChordIds.size > 0) genChordsUsing(Array.from(selectedChordIds));
      else if (genChordsAll) genChordsAll();
      openButtonsTab(); return;
    }
    if (config.polyphony.source === 'combinations' || config.polyphony.source === 'both') {
      // Button store expects "base-..." IDs
      const baseIds = selectedBaseComboIds.size > 0 ? Array.from(selectedBaseComboIds) : combosBaseSorted.map(c => c.id);
      if (baseIds.length > 0) genCombosUsing(baseIds); else genCombosAll();
      openButtonsTab(); return;
    }
  };

  const StimulusTypeToggle = (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button variant={!config.polyphony.enabled ? 'primary' : 'secondary'} onClick={setSingle}>Single</Button>
      <Button variant={config.polyphony.enabled ? 'primary' : 'secondary'} onClick={setSimul}>Simultaneous</Button>
      {config.polyphony.enabled && (
        <>
          <div style={inline}>
            <span>k:</span>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={kInput}
              onChange={(e) => setKInput(e.target.value)}
              onBlur={commitK}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              style={numInput}
            />
          </div>
          <div style={inline}>
            <span>Source:</span>
            <select value={config.polyphony.source} onChange={(e) => setSource(e.target.value as any)} style={select}>
              <option value="combinations">Combinations</option>
              <option value="chords">Custom Chords</option>
              <option value="both">Both</option>
            </select>
          </div>
        </>
      )}
    </div>
  );

  // Two-row grid: 1fr scroll content + auto footer (no sticky hacks)
  return (
    <div style={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: '1fr auto' }}>
      {/* Scrollable content */}
      <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: 16, minHeight: 0, display: 'grid', gap: 16 }}>
        <RNGTemplatesPanel />

        <div id="rng-source">
          <Card title="Source & Selection">
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 2fr' }}>
              <div>
                <div style={label}>Active template</div>
                <select value={config.templateId ?? ''} onChange={(e) => setTemplate(e.target.value || null)} style={select}>
                  {tplList.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>

                <div style={{ marginTop: 12 }}>
                  <div style={label}>Octaves</div>
                  <label style={inline}>
                    <input
                      type="checkbox"
                      checked={config.octave.sameForSingleAndChord}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setConfig({
                          octave: {
                            ...config.octave,
                            sameForSingleAndChord: checked,
                            ...(checked ? { chordOctaves: [...config.octave.singleOctaves] } : {}),
                          },
                        });
                      }}
                    />
                    <span>Use same octaves for single & simultaneous</span>
                  </label>

                  <div style={{ marginTop: 8 }}>
                    <div style={grid5x2}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((o) => (
                        <label key={`single-o${o}`} style={chip}>
                          <input type="checkbox" checked={config.octave.singleOctaves.includes(o)} onChange={() => onToggleOctave('single', o)} />
                          <span>o{o}</span>
                        </label>
                      ))}
                    </div>

                    {!config.octave.sameForSingleAndChord && (
                      <>
                        <div style={{ ...label, marginTop: 12 }}>Octaves (Simultaneous)</div>
                        <div style={grid5x2}>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((o) => (
                            <label key={`chord-o${o}`} style={chip}>
                              <input type="checkbox" checked={config.octave.chordOctaves.includes(o)} onChange={() => onToggleOctave('chord', o)} />
                              <span>o{o}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div style={label}>Select notes/frequencies</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Button variant="secondary" onClick={() => onToggleSelectAll(true)}>Select all</Button>
                  <Button variant="ghost" onClick={() => onToggleSelectAll(false)}>Clear</Button>
                </div>
                <div className="grid-auto">
                  {sourceList.map((lab, i) => (
                    <label key={i} className="chip" style={{ borderRadius: 'var(--radius-md)' }}>
                      <input type="checkbox" checked={config.selectedIndices.includes(i)} onChange={() => onToggleIndex(i)} />
                      <span>{lab}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div id="rng-stimulus">
          <Card title="Stimulus Type">
            {StimulusTypeToggle}

            {config.polyphony.enabled && (config.polyphony.source === 'combinations' || config.polyphony.source === 'both') && (
              <div style={{ marginTop: 12 }}>
                <div style={{ ...label, marginBottom: 8 }}>Combinations (note names only) • Total: {combosBaseSorted.length}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span>Per page:</span>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    value={basePerPageInput}
                    onChange={(e)=> setBasePerPageInput(e.target.value)}
                    onBlur={commitBasePerPage}
                    onKeyDown={(e)=>{ if (e.key==='Enter') (e.target as HTMLInputElement).blur(); }}
                    style={numInput}
                  />
                  <span>Page:</span>
                  <input
                    type="number" min={1} max={basePageCount}
                    value={basePageIndex + 1}
                    onChange={(e) => setBasePageIndex(Math.max(0, Math.min(basePageCount - 1, Number(e.target.value) - 1)))}
                    style={numInput}
                  />
                  <span>of {basePageCount}</span>
                  <Button variant="ghost" onClick={() => setSelectedBaseComboIds(new Set())}>Clear selection</Button>
                </div>

                {combosBaseSorted.length === 0 ? (
                  <div style={{ color: 'var(--color-text-tertiary)' }}>No combinations for the current selection and k.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {combosBasePaged.map((c) => {
                      const summary = comboPolicies[c.id]?.mode ?? 'global';
                      const noteLabels = c.labels.split(' + ');
                      return (
                        <div key={c.id} style={{
                          display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center',
                          border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', padding: '6px 8px'
                        }}>
                          <label style={inline}>
                            <input
                              type="checkbox"
                              checked={selectedBaseComboIds.has(c.id)}
                              onChange={() => {
                                const next = new Set(selectedBaseComboIds);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                setSelectedBaseComboIds(next);
                              }}
                            />
                            <span>{c.labels}</span>
                          </label>
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Octaves: {summary}</span>
                          <Button variant="ghost" onClick={() => openComboOctaves(c.id, c.labels, noteLabels)}>Octaves…</Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {config.polyphony.enabled && (config.polyphony.source === 'chords' || config.polyphony.source === 'both') && (
              <div style={{ marginTop: 16 }}>
                <Card title="Chord Builder">
                  <div className="stack-md">
                    <div>
                      <div style={label}>Available items (resolved)</div>
                      <div className="grid-auto">
                        {items.map((it) => (
                          <label key={it.id} className="chip" style={{ borderRadius: 'var(--radius-md)' }}>
                            <input type="checkbox" checked={memberItemIds.has(it.id)} onChange={() => toggleMember(it.id)} />
                            <span>{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr auto' }}>
                      <Input label="Chord name" value={chordName} onChange={(e) => setChordName(e.target.value)} placeholder="My Chord" />
                      <Input label="Ad‑hoc frequency (Hz)" value={adHocFreq} onChange={(e) => setAdHocFreq(e.target.value)} placeholder="e.g., 442.00" />
                      <Button variant="secondary" onClick={addCurrentChord} disabled={builderCount < 2}>Add Chord</Button>
                    </div>
                  </div>
                </Card>

                <Card title="Chord Library">
                  <div className="stack-sm">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Per page:</span>
                      <input
                        type="text" inputMode="numeric" pattern="[0-9]*"
                        value={chPerPageInput}
                        onChange={(e)=> setChPerPageInput(e.target.value)}
                        onBlur={commitChPerPage}
                        onKeyDown={(e)=>{ if (e.key==='Enter') (e.target as HTMLInputElement).blur(); }}
                        style={numInput}
                      />
                      <span>Page:</span>
                      <input
                        type="number" min={1} max={Math.max(1, chPageCount)}
                        value={chPage + 1}
                        onChange={(e) => setChPage(Math.max(0, Math.min(chPageCount - 1, Number(e.target.value) - 1)))}
                        style={numInput}
                      />
                      <span>of {chPageCount}</span>
                    </div>

                    {chordsSorted.length === 0 ? (
                      <div style={{ color: 'var(--color-text-tertiary)' }}>No custom chords yet.</div>
                    ) : (
                      <div className="stack-sm">
                        {chordsPaged.map((ch) => {
                          const summary = chordPolicies[ch.id]?.mode ?? 'global';
                          return (
                            <div key={ch.id} style={{
                              display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center',
                              padding: '8px 12px', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)'
                            }}>
                              <div>
                                <Input value={ch.name} onChange={(e) => updateChord(ch.id, { name: e.target.value })} placeholder="Chord name" />
                                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
                                  {ch.members.map((m) => m.label ?? m.itemRefId ?? `${m.freqHz?.toFixed(2)} Hz`).join(' + ')}
                                </div>
                              </div>
                              <label style={inline}>
                                <input
                                  type="checkbox"
                                  checked={selectedChordIds.has(ch.id)}
                                  onChange={() => {
                                    const next = new Set(selectedChordIds);
                                    next.has(ch.id) ? next.delete(ch.id) : next.add(ch.id);
                                    setSelectedChordIds(next);
                                  }}
                                />
                                <span>Select</span>
                              </label>
                              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>Octaves: {summary}</span>
                              <div className="row">
                                <Button variant="ghost" onClick={() => openChordOctaves(ch.id)}>Octaves…</Button>
                                <Button variant="ghost" onClick={() => removeChord(ch.id)}>Delete</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </Card>
        </div>

        <div id="rng-tone">
          <Card title="Tone Shape">
            <div className="stack-md">
              <ToneShapeWorkbench
                singlesBase={
                  !currentTpl ? [] :
                  currentTpl.type === 'letter'
                    ? (config.selectedIndices ?? []).map((idx) => ({ token: `pi-${idx}`, label: currentTpl.letters?.[idx] ?? `pc-${idx}` }))
                    : (config.selectedIndices ?? []).map((idx) => {
                        const hz = currentTpl.freqsHz?.[idx];
                        return { token: `pf-${idx}`, label: typeof hz === 'number' ? `${hz.toFixed(2)} Hz` : `pf-${idx}` };
                      })
                }
                templateType={templateType}
                singleOctaves={config.octave.singleOctaves}
                resolvedItemIds={items.map(i=>i.id)}
                applySingleBatch={(token, octs, cv: ContourCurve)=> {
                  if (token.startsWith('pf-')) {
                    const idx = Number(token.split('-')[1]);
                    const hz = currentTpl?.freqsHz?.[idx];
                    if (typeof hz === 'number') setSingleContour(`f-${hz.toFixed(5)}`, cv);
                    return;
                  }
                  const idx = Number(token.split('-')[1]);
                  const wanted = new Set(octs);
                  items.forEach((it) => {
                    const m = it.id.match(/^pc-(\d+)-o(\d+)$/);
                    if (m && Number(m[1]) === idx && wanted.has(Number(m[2]))) setSingleContour(it.id, cv);
                  });
                }}
                applySingleOne={(token, octave, cv: ContourCurve)=> {
                  if (token.startsWith('pf-')) {
                    const idx = Number(token.split('-')[1]);
                    const hz = currentTpl?.freqsHz?.[idx];
                    if (typeof hz === 'number') setSingleContour(`f-${hz.toFixed(5)}`, cv);
                    return;
                  }
                  const idx = Number(token.split('-')[1]);
                  setSingleContour(`pc-${idx}-o${octave}`, cv);
                }}
                combosAll={combosBaseSorted}
                combosSelectedIds={new Set()}
                onSaveComboGroup={(id, cv)=> setComboGroupContour(id, cv)}
                onSaveComboNote={(id, noteIdx, cv)=> setComboNoteContour(id, noteIdx, cv)}
                chordsAll={chords}
                chordsSelectedIds={selectedChordIds}
                onSaveChordGroup={(id, cv)=> setChordGroupContour(id, cv)}
                onSaveChordNote={(id, key, cv)=> setChordNoteContour(id, key, cv)}
              />
            </div>
          </Card>
        </div>

        <div id="rng-prob">
          <Card title="Probability">
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 2fr' }}>
              <div>
                <div style={label}>Distribution</div>
                <select value={config.probability.kind} onChange={(e) => setConfig({ probability: { kind: e.target.value as any } })} style={select}>
                  <option value="uniform">Uniform</option>
                  <option value="custom">Custom (per item weights)</option>
                </select>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', marginTop: 6 }}>
                  Uniform plays each resolved item equally. Custom lets you weight items individually.
                </div>
              </div>

              {items.length > 0 && config.probability.kind === 'custom' && (
                <div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>Weights (per resolved item)</div>
                  <div className="grid-auto">
                    {items.map((it, i) => (
                      <label key={it.id} className="chip" style={{ borderRadius: 'var(--radius-md)' }}>
                        <span style={{ flex: 1 }}>{it.label}</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={config.probability.weights?.[i] ?? 1}
                          onChange={(e) => {
                            const w = [...(config.probability.weights ?? Array(items.length).fill(1))];
                            w[i] = Math.max(0, Number(e.target.value));
                            setConfig({ probability: { ...config.probability, weights: w } });
                          }}
                          style={numInput}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div id="rng-models">
          <Card title="Sound Models">
            <div className="stack-sm">
              <div className="row" style={{ gap: 8 }}>
                <Button variant="secondary" onClick={() => setModelFilter(allModelIds)}>Select all</Button>
                <Button variant="ghost" onClick={() => setModelFilter([])}>Clear</Button>
              </div>
              <div className="grid-auto-md">
                {bankModels.map((m) => (
                  <label key={m.meta.id} className="chip" style={{ borderRadius: 'var(--radius-md)' }}>
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(m.meta.id)}
                      onChange={() => {
                        const s = new Set(selectedModels);
                        s.has(m.meta.id) ? s.delete(m.meta.id) : s.add(m.meta.id);
                        setModelFilter(Array.from(s));
                      }}
                    />
                    <span>{m.name ?? m.meta.id}</span>
                  </label>
                ))}
              </div>

              <div className="stack-sm" style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <div style={label}>Model assignment</div>
                    <select
                      value={config.modelAssignment?.policy ?? 'roundRobin'}
                      onChange={(e) => setConfig({ modelAssignment: { ...config.modelAssignment, policy: e.target.value as ModelAssignmentPolicy } })}
                      style={select}
                    >
                      <option value="same">Same model for all voices</option>
                      <option value="roundRobin">Round‑robin across selected models</option>
                      <option value="byIndex">By voice index</option>
                    </select>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', marginTop: 6 }}>
                      Applied at generation so each button’s voices are pre‑assigned to models.
                    </div>
                  </div>

                  <div>
                    <div style={label}>Default model (fallback)</div>
                    <select
                      value={config.modelAssignment?.defaultModelId ?? ''}
                      onChange={(e) => setConfig({ modelAssignment: { ...config.modelAssignment, defaultModelId: e.target.value || null } })}
                      style={select}
                    >
                      <option value="">None</option>
                      {bankModels.map((m) => (<option key={m.meta.id} value={m.meta.id}>{m.name ?? m.meta.id}</option>))}
                    </select>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', marginTop: 6 }}>
                      Used if no model is selected in RNG.
                    </div>
                  </div>
                </div>

                {config.modelAssignment?.policy === 'byIndex' && (
                  <div style={{ marginTop: 12 }}>
                    <div style={label}>By voice index mapping (1–12)</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
                          <span>Voice {idx}</span>
                          <select
                            value={config.modelAssignment?.byIndex?.[idx - 1] ?? ''}
                            onChange={(e) => {
                              const arr = [...(config.modelAssignment?.byIndex ?? Array(12).fill(''))];
                              arr[idx - 1] = e.target.value;
                              setConfig({ modelAssignment: { ...config.modelAssignment, byIndex: arr } });
                            }}
                            style={select}
                          >
                            <option value="">(none)</option>
                            {selectedModels.map((id) => (<option key={id} value={id}>{bankModels.find((m) => m.meta.id === id)?.name ?? id}</option>))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', marginTop: 6 }}>
                      If a voice index is unmapped or missing, we fall back to selected models (or the default model).
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Fixed footer (always visible) */}
      <div style={{ borderTop: '1px solid var(--color-border-primary,#e5e7eb)', background: 'var(--color-bg-secondary,#fff)', padding: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={generateButtons}>Generate Buttons</Button>
      </div>

      <OctaveEditorModal
        open={octEditorOpen}
        target={octTarget}
        globalOctaves={config.octave.chordOctaves}
        value={
          octTarget?.kind === 'combo'
            ? comboPolicies[octTarget.id]
            : octTarget?.kind === 'chord'
              ? chordPolicies[octTarget.id]
              : undefined
        }
        onChange={onSaveOctaves}
        onClose={() => { setOctEditorOpen(false); setOctTarget(null); }}
      />
    </div>
  );
};

// Styles
const label: React.CSSProperties = { color: 'var(--color-text-secondary,#374151)', fontSize: 'var(--font-size-sm,12px)', marginBottom: 6 };
const select: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--color-border-primary,#e5e7eb)',
  background: 'var(--color-bg-secondary,#fff)', color: 'var(--color-text-primary,#111827)',
};
const numInput: React.CSSProperties = { width: 110, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border-primary,#e5e7eb)', background: 'var(--color-bg-secondary,#fff)', color: 'var(--color-text-primary,#111827)' };
const inline: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8 };
const grid5x2: React.CSSProperties = { display: 'grid', gap: 6, gridTemplateColumns: 'repeat(5, minmax(44px, auto))' };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--color-border-primary,#e5e7eb)', borderRadius: 999, background: '#fff', color: '#111827' };