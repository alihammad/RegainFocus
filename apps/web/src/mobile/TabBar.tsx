import { InboxIcon, PencilIcon } from '../components/icons';

export type Tab = 'capture' | 'inbox';

interface Props {
  tab: Tab;
  onTab: (tab: Tab) => void;
  count: number;
  inert?: boolean;
}

// Two tabs for now; a Today tab joins them in phase 4, so keep the bar a simple row.
export function TabBar({ tab, onTab, count, inert }: Props) {
  return (
    <nav aria-label="Sections" className="tab-bar" inert={inert}>
      <button
        type="button"
        className="tab"
        aria-current={tab === 'capture' ? 'page' : undefined}
        onClick={() => onTab('capture')}
      >
        <PencilIcon />
        <span>Capture</span>
      </button>
      <button
        type="button"
        className="tab"
        aria-current={tab === 'inbox' ? 'page' : undefined}
        onClick={() => onTab('inbox')}
      >
        <span className="tab-icon">
          <InboxIcon />
          <span className="tab-badge" aria-label={`${count} in inbox`}>
            {count}
          </span>
        </span>
        <span>Inbox</span>
      </button>
    </nav>
  );
}
