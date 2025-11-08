import React from 'react';
import { Button, Card, Input, Slider } from '@/shared/components/ui';
import { useSettingsStore } from '@/shared/store/settingsStore';

export const SoundDesignSettingsPage: React.FC = () => {
  const studio = useSettingsStore((s) => s.studio);
  const updateStudio = useSettingsStore((s) => s.updateStudio);
  const resetStudio = useSettingsStore((s) => s.resetStudio);

  const handleSave = () => {
    console.log('Sound Design settings saved', studio);
  };

  const handleReset = () => {
    resetStudio();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Audio Engine">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <div style={labelStyle}>Sample Rate</div>
            <select
              value={studio.sampleRate}
              onChange={(e) => updateStudio({ sampleRate: Number(e.target.value) as 44100 | 48000 })}
              style={selectStyle}
            >
              <option value={44100}>44,100 Hz</option>
              <option value={48000}>48,000 Hz</option>
            </select>
          </label>

          <label>
            <div style={labelStyle}>Buffer Size</div>
            <select
              value={studio.bufferSize}
              onChange={(e) => updateStudio({ bufferSize: Number(e.target.value) as 128 | 256 | 512 })}
              style={selectStyle}
            >
              <option value={128}>128</option>
              <option value={256}>256</option>
              <option value={512}>512</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={studio.midiEnabled}
              onChange={(e) => updateStudio({ midiEnabled: e.target.checked })}
            />
            <span>Enable MIDI input</span>
          </label>
        </div>
      </Card>

      <Card title="Workflow">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <div style={labelStyle}>UI Density</div>
            <select
              value={studio.uiDensity}
              onChange={(e) => updateStudio({ uiDensity: e.target.value as 'comfortable' | 'compact' })}
              style={selectStyle}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>

          <Input
            label="Default project name"
            value={studio.defaultProject}
            onChange={(e) => updateStudio({ defaultProject: e.target.value })}
            placeholder="e.g., New Sound Model"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <Slider
            label="Preview volume"
            min={0}
            max={100}
            value={studio.previewVolume}
            onChange={(e) => updateStudio({ previewVolume: Number(e.currentTarget.value) })}
          />
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={handleReset}>Reset to Defaults</Button>
        <Button variant="primary" onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = { marginBottom: 6, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' };
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
};