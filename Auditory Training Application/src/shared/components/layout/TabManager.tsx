import React from 'react';
import { useTabManager } from '@/shared/hooks/useTabManager';

export const TabManager: React.FC = () => {
  const mgr: any = useTabManager?.() ?? {};

  const tabsRaw: any[] =
    (Array.isArray(mgr.tabs) && mgr.tabs) ||
    (Array.isArray(mgr.list) && mgr.list) ||
    (Array.isArray(mgr.state?.tabs) && mgr.state.tabs) ||
    (Array.isArray(mgr.state?.list) && mgr.state.list) ||
    [];

  const tabs = tabsRaw.map((t: any) => ({
    id: t?.id ?? t?.key ?? String(Math.random()),
    title: t?.title ?? t?.name ?? 'Untitled',
    closable: t?.closable !== false,
    render:
      typeof t?.render === 'function'
        ? t.render
        : t?.component
        ? () => t.component
        : () => null,
  }));

  const activeId: string | null =
    mgr.activeId ??
    mgr.activeKey ??
    mgr.active?.id ??
    mgr.state?.activeId ??
    (tabs.length ? tabs[tabs.length - 1].id : null);

  const activate =
    mgr.activate ??
    mgr.setActive ??
    mgr.activateTab ??
    mgr.setActiveId ??
    ((id: string) => {});

  const close =
    mgr.close ??
    mgr.remove ??
    mgr.closeTab ??
    mgr.removeTab ??
    ((id: string) => {});

  const hasTabs = tabs.length > 0;
  const effectiveActiveId = activeId ?? (hasTabs ? tabs[tabs.length - 1].id : null);

  return (
    <div style={wrap(hasTabs)}>
      {hasTabs && (
        <header style={bar}>
          <div style={tabsRow}>
            {tabs.map((t) => (
              <div
                key={t.id}
                style={tab(effectiveActiveId === t.id)}
                onClick={() => activate(t.id)}
                title={t.title}
              >
                <span>{t.title}</span>
                {t.closable && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); close(t.id); }}
                    style={closeBtn}
                    aria-label={`Close ${t.title}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </header>
      )}

      <main style={main}>
        {tabs.map((t) => (
          <section
            key={t.id}
            style={{
              display: effectiveActiveId === t.id ? 'block' : 'none',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',   // important: only the child screen scrolls
            }}
          >
            {t.render()}
          </section>
        ))}
        {!hasTabs && (
          <div style={emptyHint}>
            Open a hub from the Sidebar (e.g., Auditory Training Center).
          </div>
        )}
      </main>
    </div>
  );
};

const wrap = (hasTabs: boolean): React.CSSProperties => ({
  display: 'grid',
  gridTemplateRows: hasTabs ? 'auto 1fr' : '1fr',
  height: '100%',
  background: 'inherit',
});

const bar: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid var(--color-border-primary, #e5e7eb)',
  background: 'var(--color-bg-secondary, rgba(255,255,255,0.9))',
  backdropFilter: 'saturate(150%) blur(4px)',
};

const tabsRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 36,
  flexWrap: 'wrap',
};

const tab = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-border-primary, #e5e7eb)',
  background: active ? 'var(--color-accent, #4f46e5)' : 'var(--color-bg-primary, #fff)',
  color: active ? 'var(--color-on-accent, #fff)' : 'var(--color-text-primary, #111827)',
  cursor: 'pointer',
});

const closeBtn: React.CSSProperties = {
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
};

const main: React.CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
};

const emptyHint: React.CSSProperties = {
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--color-text-tertiary, #6b7280)',
  fontSize: 12,
  padding: 16,
};