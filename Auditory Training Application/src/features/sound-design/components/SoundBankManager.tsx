import React from 'react';
import { Button, Card, Input } from '@/shared/components/ui';
import { useSoundBankStore } from '@/features/sound-design/store/soundBankStore';
import { useTabManager } from '@/shared/hooks/useTabManager';
import { SynthesisWorkbench } from './SynthesisWorkbench';
import { deleteModelFile } from '@/features/sound-design/services/fileBank';

export const SoundBankManager: React.FC = () => {
  const models = useSoundBankStore((s) => s.models);
  const remove = useSoundBankStore((s) => s.remove);
  const { openOrActivate } = useTabManager();
  const [q, setQ] = React.useState('');

  const filtered = models.filter((m) => {
    const hay = `${m.name} ${m.meta.tags.join(' ')}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const openEditor = (id: string) => {
    const model = models.find((m) => m.meta.id === id);
    if (!model) return;
    openOrActivate({
      id: `synth:sms:${id}`,
      title: `Synthesis – ${model.name}`,
      category: 'sound-design',
      closable: true,
      render: () => <SynthesisWorkbench initialModel={model} />,
    });
  };

  const exportModel = (id: string) => {
    const model = models.find((m) => m.meta.id === id);
    if (!model) return;
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${model.name || model.meta.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((txt) => {
      try {
        const obj = JSON.parse(txt);
        openOrActivate({
          id: `synth:sms:import:${Date.now()}`,
          title: `Synthesis – Imported`,
          category: 'sound-design',
          closable: true,
          render: () => <SynthesisWorkbench initialModel={obj} />,
        });
      } catch {
        // ignore malformed
      }
    });
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        title="Sound Model Bank"
        actions={
          <label style={{ display: 'inline-block' }}>
            <input type="file" accept="application/json" onChange={importModel} style={{ display: 'none' }} />
            <Button variant="secondary">Import JSON</Button>
          </label>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or tags" />
          <div style={{ display: 'grid', gap: 8 }}>
            {filtered.length === 0 && <div style={{ color: 'var(--color-text-secondary)' }}>No models found.</div>}
            {filtered.map((m) => (
              <div
                key={m.meta.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-secondary)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                    SMS • {new Date(m.meta.updatedAt).toLocaleString()} • {m.meta.tags.join(', ')}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => openEditor(m.meta.id)}>
                  Open
                </Button>
                <Button variant="ghost" onClick={() => exportModel(m.meta.id)}>
                  Export
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    remove(m.meta.id);
                    await deleteModelFile(m.meta.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};