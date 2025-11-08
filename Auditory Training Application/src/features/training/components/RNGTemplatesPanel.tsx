import React from 'react';
import { Button, Card, Input } from '@/shared/components/ui';
import { useRngStore } from '@/features/training/store/rngStore';

export const RNGTemplatesPanel: React.FC = () => {
  const templates = useRngStore((s) => s.templates);
  const config = useRngStore((s) => s.config);
  const setTemplate = useRngStore((s) => s.setTemplate);
  const addLetter = useRngStore((s) => s.addLetterTemplate);
  const addFreq = useRngStore((s) => s.addFrequencyTemplate);
  const rename = useRngStore((s) => s.renameTemplate);
  const remove = useRngStore((s) => s.removeTemplate);

  const [tplName, setTplName] = React.useState('');
  const [letterList, setLetterList] = React.useState('C,C#,D,D#,E,F,F#,G,G#,A,A#,B');
  const [freqList, setFreqList] = React.useState('261.625565,277.182631,293.664768,311.126984,329.627557,349.228231,369.994423,391.995436,415.304698,440.0,466.163762,493.883301');

  const handleAddLetter = () => {
    const name = tplName.trim() || 'Custom Letter Template';
    const letters = letterList.split(',').map((s) => s.trim()).filter(Boolean);
    if (!letters.length) return;
    const id = addLetter(name, letters);
    setTemplate(id);
  };

  const handleAddFreq = () => {
    const name = tplName.trim() || 'Custom Frequency Template';
    const freqs = freqList.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    if (!freqs.length) return;
    const id = addFreq(name, freqs);
    setTemplate(id);
  };

  const tplArray = React.useMemo(() => Object.values(templates), [templates]);

  return (
    <Card title="Templates">
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <div style={label}>Active template</div>
          <select value={config.templateId ?? ''} onChange={(e) => setTemplate(e.target.value || null)} style={select}>
            {tplArray.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div style={hint}>
            Create letter‑based or frequency‑based templates. Letter templates use the tuning resolver (12‑TET A4=440 by default); frequency templates naturally support microtonal scales.
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
            <Input label="Template name" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="My Template" />
            <span />
          </div>

          <div>
            <div style={label}>Create letter-based (comma-separated)</div>
            <Input value={letterList} onChange={(e) => setLetterList(e.target.value)} placeholder="C,C#,D,D#,E,F,F#,G,G#,A,A#,B" />
            <div style={{ marginTop: 8 }}>
              <Button variant="secondary" onClick={handleAddLetter}>Add Letter Template</Button>
            </div>
          </div>

          <div>
            <div style={label}>Create frequency-based (Hz, comma-separated)</div>
            <Input value={freqList} onChange={(e) => setFreqList(e.target.value)} placeholder="440,466.16,493.88" />
            <div style={{ marginTop: 8 }}>
              <Button variant="secondary" onClick={handleAddFreq}>Add Frequency Template</Button>
            </div>
          </div>
        </div>

        <div>
          <div style={{ ...label, marginBottom: 8 }}>Manage templates</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {tplArray.map((t) => (
              <div key={t.id} style={row}>
                <input
                  value={t.name}
                  onChange={(e) => rename(t.id, e.target.value)}
                  style={nameInput}
                  disabled={!!t.builtIn}
                  title={t.builtIn ? 'Built‑in template (name fixed)' : 'Rename template'}
                />
                <Button
                  variant="ghost"
                  onClick={() => setTemplate(t.id)}
                  title="Set active"
                >
                  Set Active
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { if (!t.builtIn && confirm(`Delete template "${t.name}"?`)) remove(t.id); }}
                  disabled={!!t.builtIn}
                  title={t.builtIn ? 'Built‑in template (cannot delete)' : 'Delete template'}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const label: React.CSSProperties = { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 6 };
const hint: React.CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', marginTop: 6 };
const select: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' };
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' };
const nameInput: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' };