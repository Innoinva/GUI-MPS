import React from 'react';
import './App.css';
import { AppShell } from '@/shared/components/layout/AppShell';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { TabManager } from '@/shared/components/layout/TabManager';

function App() {
  return (
    <div className="app">
      <header className="app-header" role="banner">
        <h1>Auditory Training Application</h1>
        <p>Professional standalone desktop prototype</p>
      </header>

      <AppShell sidebar={<Sidebar />}>
        <TabManager />
      </AppShell>
    </div>
  );
}

export default App;