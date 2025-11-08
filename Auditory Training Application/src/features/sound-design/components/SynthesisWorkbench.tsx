import React from 'react';
import { Button, Card, Input, Slider } from '@/shared/components/ui';
import type { SmsModel, SmsHarmonicPartial } from '@/features/sound-design/types/sms';
import { useSoundBankStore } from '@/features/sound-design/store/soundBankStore';
import { audioEngine } from '@/shared/services/mockAudio/webAudioEngine';
import { generateId } from '@/shared/utils/id';
import { saveModelFile } from '@/features/sound-design/services/fileBank';

interface Props {
  initialModel?: SmsModel;
}

function newBlankModel(name = 'New Spectral Model'): SmsModel {
  const now = Date.now();
  const partials: SmsHarmonicPartial[] = Array.from({ length: 8 }, (_, i) => ({
    idx: i + 1,
    amp: Math.max(0.1, 1 / (i + 1)),
  }));
  return {
    method: 'sms',
    name,
    harmonic: {
      f0: 220,
      partialCount: 8,
      partials,
      decay: 0.5,
    },
    noise: {
      tilt: -0.2,
      bands: [
        { freq: 500, gain: 0.3 },
        { freq: 2000, gain: 0.2 },
        { freq: 8000, gain: 0.1 },
      ],
    },
    envelope: { attack: 0.01, release: 0.3 },
    meta: { id: generateId('sms'), createdAt: now, updatedAt: now, tags: ['template'] },
  };
}

export const SynthesisWorkbench: React.FC<Props> = ({ initialModel }) => {
  const [model, setModel] = React.useState<SmsModel>(initialModel ?? newBlankModel());
  const [playHandle, setPlayHandle] = React.useState<string | null>(null);
  const addToBank = useSoundBankStore((s) => s.add);
  const updateBank = useSoundBankStore((s) => s.update);

  const setName = (name: string) => setModel((m) => ({ ...m, name }));
  const setF0 = (f0: number) => setModel((m) => ({ ...m, harmonic: { ...m.harmonic, f0 } }));
  const setPartialCount = (count: number) =>
    setModel((m) => {
      const next = [...m.harmonic.partials];
      if (count > next.length) {
        for (let i = next.length; i < count; i++) next.push({ idx: i + 1, amp: Math.max(0.05, 1 / (i + 1)) });
      }
      return { ...m, harmonic: { ...m.harmonic, partialCount: count, partials: next } };
    });
  const setPartialAmp = (idx: number, amp: number) =>
    setModel((m) => {
      const next = m.harmonic.partials.map((p) => (p.idx === idx ? { ...p, amp } : p));
      return { ...m, harmonic: { ...m.harmonic, partials: next } };
    });
  const setNoiseTilt = (tilt: number) => setModel((m) => ({ ...m, noise: { ...m.noise, tilt } }));
  const setEnv = (attack: number, release: number) => setModel((m) => ({ ...m, envelope: { attack, release } }));

  const onPlay = () => {
    if (playHandle) {
      audioEngine.stop(playHandle);
      setPlayHandle(null);
      return;
    }
    const h = audioEngine.playSmsModel(model, 1.5, 0.5);
    setPlayHandle(h);
    setTimeout(() => setPlayHandle(null), 1800);
  };

  const onSave = async () => {
    if (!model.meta.id) {
      const saved = addToBank({ ...model });
      setModel(saved);
      await saveModelFile(saved);
      return;
    }
    updateBank(model);
    await saveModelFile(model);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Model Info" actions={<Button variant="primary" onClick={onSave}>Save to Bank</Button>}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '2fr 1fr 1fr' }}>
          <Input label="Name" value={model.name} onChange={(e) => setName(e.target.value)} />
          <div>
            <div style={labelStyle}>Fundamental (Hz)</div>
            <input
              type="number"
              min={20}
              max={2000}
              value={model.harmonic.f0}
              onChange={(e) => setF0(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>Partials</div>
            <input
              type="number"
              min={1}
              max={32}
              value={model.harmonic.partialCount}
              onChange={(e) => setPartialCount(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>
      </Card>

      <Card title="Harmonics">
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {model.harmonic.partials.slice(0, model.harmonic.partialCount).map((p) => (
              <div key={p.idx}>
                <Slider
                  label={`H${p.idx}`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={Number(p.amp.toFixed(2))}
                  onChange={(e) => setPartialAmp(p.idx, Number(e.currentTarget.value))}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Noise & Envelope">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div style={labelStyle}>Noise tilt</div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={model.noise.tilt}
              onChange={(e) => setNoiseTilt(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <Slider
              label="Attack (s)"
              min={0}
              max={1}
              step={0.005}
              value={Number(model.envelope.attack.toFixed(3))}
              onChange={(e) => setEnv(Number(e.currentTarget.value), model.envelope.release)}
            />
            <Slider
              label="Release (s)"
              min={0}
              max={2}
              step={0.01}
              value={Number(model.envelope.release.toFixed(2))}
              onChange={(e) => setEnv(model.envelope.attack, Number(e.currentTarget.value))}
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" onClick={onPlay}>{playHandle ? 'Stop' : 'Play Preview'}</Button>
        </div>
      </Card>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  marginBottom: 6,
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
};