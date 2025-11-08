import React from 'react';
import { Button, Card, Input } from '@/shared/components/ui';
import { analyzeFileToSms, type AnalysisParams } from '@/features/sound-design/services/mockAnalysis';
import { audioEngine } from '@/shared/services/mockAudio/webAudioEngine';
import { useTabManager } from '@/shared/hooks/useTabManager';
import { SynthesisWorkbench } from './SynthesisWorkbench';

export const AnalyzerWorkbench: React.FC = () => {
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewHandle, setPreviewHandle] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>('');
  const [modelName, setModelName] = React.useState<string>('');

  const [params, setParams] = React.useState<AnalysisParams>({
    fftSize: 2048,
    hopSize: 512,
    window: 'hann',
    maxPartials: 12,
    noiseBands: 6,
  });

  const { openOrActivate } = useTabManager();

  const onChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setModelName(f.name.replace(/\.[^/.]+$/, ''));
  };

  const onPreview = () => {
    if (!file) return;
    // Quick preview: play a tone (simulating "preview file" for now)
    if (previewHandle) {
      audioEngine.stop(previewHandle);
      setPreviewHandle(null);
      return;
    }
    const h = audioEngine.playTone(440, 0.2, 'sine', 1.2);
    setPreviewHandle(h);
    setTimeout(() => setPreviewHandle(null), 1300);
  };

  const onAnalyze = async () => {
    if (!file) {
      setStatus('Please choose an audio file first.');
      return;
    }
    setStatus('Analyzing...');
    try {
      const model = await analyzeFileToSms(file, params);
      if (modelName) model.name = modelName;
      setStatus('Analysis complete.');

      openOrActivate({
        id: `synth:sms:${model.meta.id}`,
        title: `Synthesis – ${model.name}`,
        category: 'sound-design',
        closable: true,
        render: () => <SynthesisWorkbench initialModel={model} />,
      });
    } catch (e) {
      setStatus('Analysis failed.');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Audio Source">
        <div style={{ display: 'grid', gap: 12 }}>
          <input ref={fileRef} type="file" accept="audio/*" onChange={onChooseFile} />
          <Input label="Result model name" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Analyzed Model" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={onPreview} disabled={!file}>
              {previewHandle ? 'Stop Preview' : 'Preview'}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Analysis Parameters">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <label>
            <div style={labelStyle}>FFT Size</div>
            <select value={params.fftSize} onChange={(e) => setParams((p) => ({ ...p, fftSize: Number(e.target.value) as 1024|2048|4096 }))} style={selectStyle}>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
            </select>
          </label>

          <label>
            <div style={labelStyle}>Hop Size</div>
            <select value={params.hopSize} onChange={(e) => setParams((p) => ({ ...p, hopSize: Number(e.target.value) as 256|512 }))} style={selectStyle}>
              <option value={256}>256</option>
              <option value={512}>512</option>
            </select>
          </label>

          <label>
            <div style={labelStyle}>Window</div>
            <select value={params.window} onChange={(e) => setParams((p) => ({ ...p, window: e.target.value as any }))} style={selectStyle}>
              <option value="hann">Hann</option>
              <option value="hamming">Hamming</option>
              <option value="blackman">Blackman</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <div style={labelStyle}>Max Partials</div>
            <input type="number" min={1} max={32} value={params.maxPartials} onChange={(e) => setParams((p) => ({ ...p, maxPartials: Number(e.target.value) }))} style={inputStyle} />
          </label>

          <label>
            <div style={labelStyle}>Noise Bands</div>
            <input type="number" min={1} max={16} value={params.noiseBands} onChange={(e) => setParams((p) => ({ ...p, noiseBands: Number(e.target.value) }))} style={inputStyle} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <Button variant="primary" onClick={onAnalyze} disabled={!file}>Analyze → Convert to Model</Button>
        </div>
      </Card>

      {status && <div style={{ color: 'var(--color-text-secondary)' }}>{status}</div>}
    </div>
  );
};

const labelStyle: React.CSSProperties = { marginBottom: 6, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' };
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
};
const inputStyle = selectStyle;