import React from 'react';
import { Button, Card } from '@/shared/components/ui';
import { useTabManager } from '@/shared/hooks/useTabManager';
import { RNGConfiguration } from './RNGConfiguration';
import { ButtonDesignerScreen } from '@/features/buttons/screens/ButtonDesignerScreen';

export const TrainingHub: React.FC = () => {
  const { openOrActivate } = useTabManager();

  const openRng = () =>
    openOrActivate({
      id: 'training:rng',
      title: 'RNG Configuration',
      category: 'training',
      closable: true,
      render: () => <RNGConfiguration />,
    });

  const openButtons = () =>
    openOrActivate({
      id: 'training:buttons',
      title: 'Buttons Designer',
      category: 'training',
      closable: true,
      render: () => <ButtonDesignerScreen />,
    });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Training Hub">
        <p>Configure what to practice, then design buttons and play the game.</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={openRng}>Open RNG Configuration</Button>
          <Button variant="secondary" onClick={openButtons}>Open Buttons Designer</Button>
        </div>
      </Card>
    </div>
  );
};