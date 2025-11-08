import React from 'react';
import './Sidebar.css';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { useTabManager } from '@/shared/hooks/useTabManager';
import { SoundDesignHub } from '@/features/sound-design/components/SoundDesignHub';
import { TrainingHub } from '@/features/training/components/TrainingHub';
import { SettingsHome } from '@/features/settings/components/SettingsHome';
import { listen } from '@tauri-apps/api/event';

interface NavItem {
  id: string;
  label: string;
  icon: string; // placeholder icons; we can swap to a pro icon set later
  onClick: () => void;
}

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>('sidebar-collapsed', false);
  const { openOrActivate } = useTabManager();

  const items: NavItem[] = [
    {
      id: 'nav-sound',
      label: 'Sound Design Studio',
      icon: '🎛️',
      onClick: () =>
        openOrActivate({
          id: 'sound:hub',
          title: 'Sound Design Hub',
          category: 'sound-design',
          closable: true,
          render: () => <SoundDesignHub />,
        }),
    },
    {
      id: 'nav-training',
      label: 'Auditory Training Center',
      icon: '🎮',
      onClick: () =>
        openOrActivate({
          id: 'training:hub',
          title: 'Training Hub',
          category: 'training',
          closable: true,
          render: () => <TrainingHub />,
        }),
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      icon: '⚙️',
      onClick: () =>
        openOrActivate({
          id: 'settings:home',
          title: 'Settings',
          category: 'settings',
          closable: true,
          render: () => <SettingsHome />,
        }),
    },
  ];

  // Persist sidebar width via CSS variable
  React.useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '56px' : '240px');
  }, [collapsed]);

  // Keyboard shortcut: Ctrl+B (Windows/Linux) or Cmd+B (macOS)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      const isModifier = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isTextField =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable === true);

      if (!isTextField && isModifier && key === 'b') {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCollapsed]);

  // Listen for Tauri menu event: "toggle-sidebar"
  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen('toggle-sidebar', () => {
      setCollapsed((v) => !v);
    }).then((off) => {
      unlisten = off;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [setCollapsed]);

  return (
    <nav className={['sidebar', collapsed ? 'sidebar--collapsed' : ''].join(' ')}>
      {/* Sticky header: always-visible collapse/expand control */}
      <div className="sidebar__header">
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand sidebar (Ctrl/Cmd+B)' : 'Collapse sidebar (Ctrl/Cmd+B)'}
          title={collapsed ? 'Expand sidebar (Ctrl/Cmd+B)' : 'Collapse sidebar (Ctrl/Cmd+B)'}
        >
          <span className="sidebar__chevron" aria-hidden="true">
            {collapsed ? '»' : '«'}
          </span>
          {!collapsed && <span className="sidebar__toggleLabel">Sidebar</span>}
          {!collapsed && <span className="sidebar__hint">(Ctrl/Cmd+B)</span>}
        </button>
      </div>

      <ul className="sidebar__list" role="menu" aria-orientation="vertical">
        {items.map((it) => (
          <li key={it.id} className="sidebar__item" role="none">
            <button
              role="menuitem"
              className="sidebar__button"
              onClick={it.onClick}
              title={it.label}
              aria-label={collapsed ? it.label : undefined}
            >
              <span className="sidebar__icon" aria-hidden="true">
                {it.icon}
              </span>
              {!collapsed && <span className="sidebar__label">{it.label}</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};