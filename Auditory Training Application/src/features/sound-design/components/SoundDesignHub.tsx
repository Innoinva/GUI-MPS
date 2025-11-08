import React from 'react';
import { Button, Card } from '@/shared/components/ui';
import { useTabManager } from '@/shared/hooks/useTabManager';
import { AnalyzerWorkbench } from './AnalyzerWorkbench';
import { SynthesisWorkbench } from './SynthesisWorkbench';
import { SoundBankManager } from './SoundBankManager';
import { loadAllModelFiles } from '@/features/sound-design/services/fileBank';
import { useSoundBankStore } from '@/features/sound-design/store/soundBankStore';

export const SoundDesignHub: React.FC = () => {
  const { openOrActivate } = useTabManager();

  // Hydrate bank from disk once
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadAllModelFiles();
      if (!mounted) return;
      const state = useSoundBankStore.getState();
      const existing = new Set(state.models.map((m) => m.meta.id));
      loaded.forEach((m) => {
        if (!existing.has(m.meta.id)) state.add(m);
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const openAnalyzer = () =>
    openOrActivate({
      id: 'analyzer:workbench',
      title: 'Analyzer Workbench',
      category: 'sound-design',
      closable: true,
      render: () => <AnalyzerWorkbench />,
    });

  const openSynthesisBlank = () =>
    openOrActivate({
      id: 'synthesis:sms:new',
      title: 'Synthesis – New SMS',
      category: 'sound-design',
      closable: true,
      render: () => <SynthesisWorkbench />,
    });

  const openBank = () =>
    openOrActivate({
      id: 'soundbank:manager',
      title: 'Sound Model Bank',
      category: 'sound-design',
      closable: true,
      render: () => <SoundBankManager />,
    });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Sound Design Dashboard">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={openAnalyzer}>New Analysis</Button>
          <Button variant="secondary" onClick={openSynthesisBlank}>New Spectral Model</Button>
          <Button variant="ghost" onClick={openBank}>Open Sound Model Bank</Button>
        </div>
      </Card>
    </div>
  );
};