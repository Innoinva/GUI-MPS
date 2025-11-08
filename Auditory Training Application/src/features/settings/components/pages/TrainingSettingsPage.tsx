import React from 'react';
import { Button, Card, Input } from '@/shared/components/ui';
import { useSettingsStore } from '@/shared/store/settingsStore';

export const TrainingSettingsPage: React.FC = () => {
  const training = useSettingsStore((s) => s.training);
  const updateTraining = useSettingsStore((s) => s.updateTraining);
  const resetTraining = useSettingsStore((s) => s.resetTraining);

  const handleSave = () => {
    console.log('Training settings saved', training);
  };

  const handleReset = () => {
    resetTraining();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Profiles & Difficulty">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <Input
            label="Default profile"
            value={training.defaultProfile}
            onChange={(e) => updateTraining({ defaultProfile: e.target.value })}
            placeholder="Student or Researcher"
          />

          <label>
            <div style={labelStyle}>Default difficulty</div>
            <select
              value={training.difficulty}
              onChange={(e) =>
                updateTraining({ difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })
              }
              style={selectStyle}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title="Experience">
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={training.soundPreview}
              onChange={(e) => updateTraining({ soundPreview: e.target.checked })}
            />
            <span>Enable sound preview</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={training.showTips}
              onChange={(e) => updateTraining({ showTips: e.target.checked })}
            />
            <span>Show practice tips</span>
          </label>
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