import React from 'react';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  children: React.ReactNode[]; // One panel per tab in order
}

export const Tabs: React.FC<TabsProps> = ({ items, value, defaultValue, onChange, children }) => {
  const [internal, setInternal] = React.useState<string>(defaultValue || items[0]?.id);
  const activeId = value ?? internal;

  const handleSelect = (id: string) => {
    if (onChange) onChange(id);
    else setInternal(id);
  };

  const activeIndex = Math.max(0, items.findIndex((t) => t.id === activeId));

  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist" aria-label="Tabs">
        {items.map((tab, idx) => {
          const selected = idx === activeIndex;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              disabled={tab.disabled}
              className={['tabs__tab', selected ? 'is-active' : '', tab.disabled ? 'is-disabled' : ''].join(' ')}
              onClick={() => !tab.disabled && handleSelect(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="tabs__panels">
        {React.Children.map(children, (child, idx) => {
          if (idx !== activeIndex) return null;
          const tab = items[activeIndex];
          return (
            <div
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              className="tabs__panel"
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
};