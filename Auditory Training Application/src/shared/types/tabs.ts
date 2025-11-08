export type TabCategory = 'sound-design' | 'training' | 'settings' | 'shared';

export interface TabConfig {
  id: string;
  title: string;
  category: TabCategory;
  closable?: boolean;
  render: () => JSX.Element; // lightweight render function for panel
}