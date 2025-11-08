import React from 'react';
import { RNGConfiguration } from '@/features/training/components/RNGConfiguration';
import { ButtonDesignerScreen } from '@/features/buttons/screens/ButtonDesignerScreen';

type InnerTabKey = 'rng' | 'buttons';
interface InnerTab {
  id: InnerTabKey;
  title: string;
  component: React.ReactNode;
  closable: boolean;
}

export const TrainingHub: React.FC = () => {
  const [tabs, setTabs] = React.useState<InnerTab[]>([]);
  const [activeId, setActiveId] = React.useState<InnerTabKey | null>(null);

  const openTab = React.useCallback((key: InnerTabKey) => {
    setTabs((prev) => {
      if (prev.find(t => t.id === key)) return prev;
      if (key === 'rng') return [...prev, { id: 'rng', title: 'Random Generator (RNG)', component: <RNGPane />, closable: true }];
      return [...prev, { id: 'buttons', title: 'Buttons Designer', component: <ButtonsPane />, closable: true }];
    });
    setActiveId(key);
  }, []);

  const closeTab = (key: InnerTabKey) => {
    setTabs((prev) => prev.filter(t => t.id !== key));
    setActiveId((curr) => {
      if (curr !== key) return curr;
      const remaining = tabs.filter(t => t.id !== key);
      return (remaining.length ? remaining[remaining.length - 1].id : null);
    });
  };

  return (
    <div style={wrap}>
      <aside style={miniMenu}>
        <div style={sectionTitle}>Auditory Training Center</div>
        <button type="button" style={menuBtn} onClick={() => openTab('rng')}>Open RNG</button>
        <button type="button" style={menuBtn} onClick={() => openTab('buttons')}>Open Buttons Designer</button>
        <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280' }}>
          RNG generation will auto-open Buttons Designer.
        </div>
      </aside>

      <main style={content}>
        <div style={tabbar}>
          {tabs.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveId(t.id)}
              style={tab(activeId === t.id)}
              title={t.title}
            >
              <span>{t.title}</span>
              {t.closable && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                  style={closeBtn}
                  aria-label={`Close ${t.title}`}
                  title="Close"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {tabs.length === 0 && <div style={emptyHint}>Open RNG or Buttons from the left.</div>}
        </div>

        <div style={pane}>
          {tabs.map((t) => (
            <div key={t.id} style={{ display: activeId === t.id ? 'block' : 'none', height: '100%' }}>
              {t.component}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

/* RNG pane with a left “Contents” quick navigator. IMPORTANT:
   - innerMain MUST NOT SCROLL; RNGConfiguration owns scroll + footer.
*/
const RNGPane: React.FC = () => {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div style={innerWrap}>
      <nav style={innerNav}>
        <div style={navTitle}>RNG Contents</div>
        <button style={navItem} onClick={()=>scrollTo('rng-source')}>Source & Selection</button>
        <button style={navItem} onClick={()=>scrollTo('rng-stimulus')}>Stimulus Type</button>
        <button style={navItem} onClick={()=>scrollTo('rng-tone')}>Tone Shape</button>
        <button style={navItem} onClick={()=>scrollTo('rng-prob')}>Probability</button>
        <button style={navItem} onClick={()=>scrollTo('rng-models')}>Sound Models</button>
      </nav>
      <section style={innerMain}>
        <RNGConfiguration />
      </section>
    </div>
  );
};

const ButtonsPane: React.FC = () => (
  <div style={{ height: '100%' }}>
    <ButtonDesignerScreen />
  </div>
);

/* styles */
const wrap: React.CSSProperties = { display: 'grid', gridTemplateColumns: '260px 1fr', height: '100%', background: '#f8fafc' };
const miniMenu: React.CSSProperties = { borderRight: '1px solid #e5e7eb', background: '#ffffff', padding: 12, overflowY: 'auto' };
const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, marginBottom: 10 };
const menuBtn: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 8,
  border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer',
};
const content: React.CSSProperties = { display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%' };
const tabbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: '#ffffff', borderBottom: '1px solid #e5e7eb', minHeight: 40 };
const tab = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px',
  borderRadius: 8, border: '1px solid #e5e7eb', background: active ? '#4f46e5' : '#ffffff',
  color: active ? '#ffffff' : '#111827', cursor: 'pointer',
});
const closeBtn: React.CSSProperties = { appearance: 'none', border: 'none', background: 'transparent', color: 'inherit', fontSize: 14, cursor: 'pointer', lineHeight: 1 };
const emptyHint: React.CSSProperties = { color: '#6b7280', fontSize: 12 };
const pane: React.CSSProperties = { height: '100%', overflow: 'hidden' };
const innerWrap: React.CSSProperties = { height: '100%', display: 'grid', gridTemplateColumns: '200px 1fr' };
const innerNav: React.CSSProperties = { borderRight: '1px solid #e5e7eb', background: '#ffffff', padding: 10, overflowY: 'auto' };
const navTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#374151' };
const navItem: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', marginBottom: 6,
  border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer',
};
/* Critical: innerMain must not scroll; let RNGConfiguration manage scrolling + footer */
const innerMain: React.CSSProperties = { height: '100%', minHeight: 0, overflow: 'hidden', padding: 0 };