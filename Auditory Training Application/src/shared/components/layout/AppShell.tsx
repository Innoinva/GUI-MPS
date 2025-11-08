import React from 'react';
import { Sidebar } from './Sidebar';
import { TabManager } from './TabManager';

export const AppShell: React.FC = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--sidebar-width, 240px) 1fr', height: '100vh' }}>
      <Sidebar />
      {/* Right area must allow its child to size/scroll */}
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        <TabManager />
      </div>
    </div>
  );
};