import React from 'react';
import { Button, Card } from '@/shared/components/ui';
import type { ContourCurve, RNGCombination, RNGChord, TemplateType } from '@/features/training/types/rng.types';
import { FloatingWindow } from '@/features/training/components/FloatingWindow';
import { ContourEditor } from '@/features/training/components/ContourEditor';
import { SingleNoteOctaveModal } from '@/features/training/components/SingleNoteOctaveModal';

export interface SingleBase {
  token: string;   // "pi-<idx>" or "pf-<idx>"
  label: string;   // "C", "C#", ... or "440.00 Hz"
}

interface Props {
  // Singles (octave-agnostic base notes)
  singlesBase: SingleBase[];
  templateType: TemplateType;
  singleOctaves: number[];   // Source & Selection single octaves 1..10
  // Resolved items and helpers for applying contours to actual item ids
  resolvedItemIds: string[]; // s.items.map(i=>i.id) for scan
  // Apply functions
  applySingleBatch: (baseToken: string, octaves: number[], curve: ContourCurve) => void;
  applySingleOne: (baseToken: string, octave: number, curve: ContourCurve) => void;

  // Multi — Combinations (octave-agnostic)
  showOnlySelectedCombos: boolean;
  onToggleShowOnlySelectedCombos: (on: boolean) => void;
  combosAll: RNGCombination[];             // full lexicographic list
  combosSelectedIds: Set<string>;          // selected in Stimulus Type
  onSaveComboGroup: (comboBaseId: string, curve?: ContourCurve) => void;
  onSaveComboNote: (comboBaseId: string, noteIndex: number, curve?: ContourCurve) => void;

  // Multi — Custom Chords
  showOnlySelectedChords: boolean;
  onToggleShowOnlySelectedChords: (on: boolean) => void;
  chordsAll: RNGChord[];
  chordsSelectedIds: Set<string>;
  onSaveChordGroup: (chordId: string, curve?: ContourCurve) => void;
  onSaveChordNote: (chordId: string, noteKey: string, curve?: ContourCurve) => void;
}

export const ToneShapeWorkbench: React.FC<Props> = ({
  singlesBase, templateType, singleOctaves, resolvedItemIds,
  applySingleBatch, applySingleOne,

  showOnlySelectedCombos, onToggleShowOnlySelectedCombos, combosAll, combosSelectedIds,
  onSaveComboGroup, onSaveComboNote,

  showOnlySelectedChords, onToggleShowOnlySelectedChords, chordsAll, chordsSelectedIds,
  onSaveChordGroup, onSaveChordNote,
}) => {
  // Singles modal
  const [singleModal, setSingleModal] = React.useState<{ open: boolean; token: string; label: string }>(
    { open: false, token: '', label: '' }
  );

  // Group/per-note editors (draggable) for Multi
  const [groupOpen, setGroupOpen] = React.useState<{ title: string; save: (c?: ContourCurve)=>void } | null>(null);
  const [perNoteOpen, setPerNoteOpen] = React.useState<{ title: string; notes: { key: string; label: string; save: (c?: ContourCurve)=>void }[] } | null>(null);
  const [curve, setCurve] = React.useState<ContourCurve>({ startHz: 440, endHz: 660, shape: 'linear' });

  // Filtering
  const combosToShow = React.useMemo(() => {
    return showOnlySelectedCombos ? combosAll.filter(c => combosSelectedIds.has(c.id)) : combosAll;
  }, [showOnlySelectedCombos, combosSelectedIds, combosAll]);

  const chordsToShow = React.useMemo(() => {
    return showOnlySelectedChords ? chordsAll.filter(ch => chordsSelectedIds.has(ch.id)) : chordsAll;
  }, [showOnlySelectedChords, chordsSelectedIds, chordsAll]);

  // Multi editors openers
  const openComboGroup = (c: RNGCombination) => {
    setCurve({ startHz: 440, endHz: 660, shape: 'custom' });
    setGroupOpen({ title: c.labels, save: (cv)=> onSaveComboGroup(c.id, cv) });
  };
  const openComboPerNote = (c: RNGCombination) => {
    const labels = c.labels.split(' + ');
    const notes = labels.map((lab, idx) => ({
      key: String(idx + 1),
      label: lab,
      save: (cv?: ContourCurve) => onSaveComboNote(c.id, idx + 1, cv),
    }));
    setPerNoteOpen({ title: `${c.labels} — per‑note`, notes });
  };

  const openChordGroup = (ch: RNGChord) => {
    setCurve({ startHz: 440, endHz: 660, shape: 'custom' });
    setGroupOpen({ title: ch.name, save: (cv)=> onSaveChordGroup(ch.id, cv) });
  };
  const openChordPerNote = (ch: RNGChord) => {
    const notes = ch.members.map((m) => {
      const key = m.itemRefId ?? `${m.freqHz ?? 0}`;
      const label = m.label ?? m.itemRefId ?? `${m.freqHz?.toFixed(2)} Hz`;
      return { key, label, save: (cv?: ContourCurve) => onSaveChordNote(ch.id, key, cv) };
    });
    setPerNoteOpen({ title: `${ch.name} — per‑note`, notes });
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Singles (octave-agnostic) */}
      <Card title="Single stimuli (octave‑agnostic)">
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {singlesBase.length === 0 && <div style={hint}>No notes selected in Source & Selection.</div>}
          {singlesBase.map(nb => (
            <div key={nb.token} style={row}>
              <label style={check}><input type="checkbox" /><span>{nb.label}</span></label>
              <Button variant="ghost" onClick={()=> setSingleModal({ open: true, token: nb.token, label: nb.label })}>
                Octaves & contour…
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Multi — Combinations */}
      <Card title="Multi stimuli — Combinations">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <label style={check}>
            <input type="checkbox" checked={showOnlySelectedCombos} onChange={(e)=> onToggleShowOnlySelectedCombos(e.target.checked)} />
            <span>Show only selected in Stimulus Type</span>
          </label>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {combosToShow.length === 0 && <div style={hint}>No combinations available. Adjust Source & Selection and k.</div>}
          {combosToShow.map(c => (
            <div key={c.id} style={row}>
              <label style={check}><input type="checkbox" /><span>{c.labels}</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={()=> openComboGroup(c)}>Edit group contour…</Button>
                <Button variant="ghost" onClick={()=> openComboPerNote(c)}>Edit per‑note contours…</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Multi — Custom Chords */}
      <Card title="Multi stimuli — Custom Chords">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <label style={check}>
            <input type="checkbox" checked={showOnlySelectedChords} onChange={(e)=> onToggleShowOnlySelectedChords(e.target.checked)} />
            <span>Show only selected in Stimulus Type</span>
          </label>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {chordsToShow.length === 0 && <div style={hint}>No custom chords available.</div>}
          {chordsToShow.map(ch => (
            <div key={ch.id} style={row}>
              <label style={check}><input type="checkbox" /><span style={{ fontWeight: 600 }}>{ch.name}</span></label>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                {ch.members.map(m => m.label ?? m.itemRefId ?? `${m.freqHz?.toFixed(2)} Hz`).join(' + ')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={()=> openChordGroup(ch)}>Edit group contour…</Button>
                <Button variant="ghost" onClick={()=> openChordPerNote(ch)}>Edit per‑note contours…</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Draggable Group editor */}
      {groupOpen && (
        <FloatingWindow title={`Tone Shape — ${groupOpen.title}`} onClose={()=> setGroupOpen(null)} initial={{ w: 840, h: 520 }}>
          <ContourEditor
            startHz={curve.startHz}
            endHz={curve.endHz}
            shape={curve.shape}
            onChange={(next)=> setCurve({ startHz: next.startHz, endHz: next.endHz, shape: next.shape, points: next.points })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="ghost" onClick={()=> setGroupOpen(null)}>Cancel</Button>
            <Button variant="primary" onClick={()=> { groupOpen.save(curve); setGroupOpen(null); }}>Save</Button>
          </div>
        </FloatingWindow>
      )}

      {/* Draggable Per-note editor */}
      {perNoteOpen && (
        <FloatingWindow title={`Tone Shape — ${perNoteOpen.title}`} onClose={()=> setPerNoteOpen(null)} initial={{ w: 920, h: 640 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {perNoteOpen.notes.map(n => (
              <div key={n.key} style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', padding: 8 }}>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>{n.label}</div>
                <ContourEditor startHz={440} endHz={660} shape="custom"
                  onChange={(next)=> n.save({ startHz: next.startHz, endHz: next.endHz, shape: next.shape, points: next.points })}/>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="primary" onClick={()=> setPerNoteOpen(null)}>Done</Button>
          </div>
        </FloatingWindow>
      )}

      {/* Single-note Octaves & contour modal */}
      <SingleNoteOctaveModal
        open={singleModal.open}
        noteLabel={singleModal.label}
        baseToken={singleModal.token}
        templateType={templateType}
        globalOctaves={singleOctaves}
        onApplyMany={(octs, cv)=> { applySingleBatch(singleModal.token, octs, cv); }}
        onApplyOne={(o, cv)=> { applySingleOne(singleModal.token, o, cv); }}
        onClose={()=> setSingleModal({ open: false, token: '', label: '' })}
      />
    </div>
  );
};

const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' };
const check: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8 };
const hint: React.CSSProperties = { color: 'var(--color-text-tertiary)' };