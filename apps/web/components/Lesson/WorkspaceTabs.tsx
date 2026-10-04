'use client';

export type WorkspaceTab = 'learn' | 'code';

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'code', label: 'Code' },
];

export const tabPanelId = (tab: WorkspaceTab) => `lesson-panel-${tab}`;
export const tabId = (tab: WorkspaceTab) => `lesson-tab-${tab}`;

/**
 * Tabs that replace the split view below the lg breakpoint. Follows the ARIA tabs pattern:
 * arrow keys move between tabs, the active tab is the only one in the tab order.
 */
export function WorkspaceTabs({ active, onChange }: { active: WorkspaceTab; onChange: (tab: WorkspaceTab) => void }) {
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === active);
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    onChange(next.id);
    document.getElementById(tabId(next.id))?.focus();
  }

  return (
    <div
      role='tablist'
      aria-label='Lesson workspace'
      className='sticky top-14 z-30 flex border-b border-steel-800 bg-steel-950/95 backdrop-blur lg:hidden'
    >
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={tabId(tab.id)}
            type='button'
            role='tab'
            aria-selected={selected}
            aria-controls={tabPanelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={onKeyDown}
            className={
              'flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ' +
              (selected ? 'border-molten-500 text-amber-300' : 'border-transparent text-steel-400 hover:text-steel-100')
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
