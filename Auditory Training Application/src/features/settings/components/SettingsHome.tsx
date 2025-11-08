import React from 'react';
import { Button, Card } from '@/shared/components/ui';
import { useTabManager } from '@/shared/hooks/useTabManager';
import { GlobalSettingsPage } from './pages/GlobalSettingsPage';
import { SoundDesignSettingsPage } from './pages/SoundDesignSettingsPage';
import { TrainingSettingsPage } from './pages/TrainingSettingsPage';

export const SettingsHome: React.FC = () => {
  const { openOrActivate } = useTabManager();

  const openGlobal = () =>
    openOrActivate({
      id: 'settings:global',
      title: 'Global Settings',
      category: 'settings',
      closable: true,
      render: () => <GlobalSettingsPage />,
    });

  const openStudio = () =>
    openOrActivate({
      id: 'settings:studio',
      title: 'Sound Design Settings',
      category: 'settings',
      closable: true,
      render: () => <SoundDesignSettingsPage />,
    });

  const openTraining = () =>
    openOrActivate({
      id: 'settings:training',
      title: 'Training Settings',
      category: 'settings',
      closable: true,
      render: () => <TrainingSettingsPage />,
    });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Global">
        <p>General application preferences (appearance, data, confirmations).</p>
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={openGlobal}>Open as Tab</Button>
        </div>
      </Card>

      <Card title="Sound Design">
        <p>Audio engine, MIDI, and workflow preferences for the Sound Design Studio.</p>
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={openStudio}>Open as Tab</Button>
        </div>
      </Card>

      <Card title="Training">
        <p>Profiles, difficulty, and experience preferences for the Training Center.</p>
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={openTraining}>Open as Tab</Button>
        </div>
      </Card>
    </div>
  );
};