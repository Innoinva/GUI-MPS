import React from 'react';
import { Button, Card, Input } from '@/shared/components/ui';
import { useSettingsStore } from '@/shared/store/settingsStore';

export const GlobalSettingsPage: React.FC = () => {
  const global = useSettingsStore((s) => s.global);
  const updateGlobal = useSettingsStore((s) => s.updateGlobal);
  const resetGlobal = useSettingsStore((s) => s.resetGlobal);

  const handleSave = () => {
    console.log('Global settings saved', global);
  };

  const handleReset = () => {
    resetGlobal();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Appearance">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <div style={labelStyle}>Theme</div>
            <select
              value={global.theme}
              onChange={(e) => updateGlobal({ theme: e.target.value as 'dark' | 'light' })}
              style={selectStyle}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>

          <label>
            <div style={labelStyle}>UI Density</div>
            <select
              value={global.density}
              onChange={(e) => updateGlobal({ density: e.target.value as 'comfortable' | 'compact' })}
              style={selectStyle}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title="General">
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={rowStyle}>
            <input
              type="checkbox"
              checked={global.autoSave}
              onChange={(e) => updateGlobal({ autoSave: e.target.checked })}
            />
            <span>Auto-save preferences</span>
          </label>

          <label style={rowStyle}>
            <input
              type="checkbox"
              checked={global.confirmExit}
              onChange={(e) => updateGlobal({ confirmExit: e.target.checked })}
            />
            <span>Confirm before exit</span>
          </label>

          <div>
            <Input
              label="Data directory"
              value={global.dataDir}
              onChange={(e) => updateGlobal({ dataDir: e.target.value })}
              placeholder="Choose where to store app data"
            />
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={handleReset}>Reset to Defaults</Button>
        <Button variant="primary" onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
};

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const labelStyle: React.CSSProperties = { marginBottom: 6, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' };
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-primary)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
};