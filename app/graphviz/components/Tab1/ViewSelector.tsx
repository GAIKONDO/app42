/**
 * View切替UIコンポーネント
 */

'use client';

import { VIEW_CONFIGS, type ViewType } from '../utils/viewTypes';

interface ViewSelectorProps {
  viewType: ViewType;
  onViewChange: (view: ViewType) => void;
  availableViews: ViewType[];
}

export function ViewSelector({ viewType, onViewChange, availableViews }: ViewSelectorProps) {
  // availableViewsに含まれるViewのみを表示
  const visibleViews = Object.values(VIEW_CONFIGS).filter(view => 
    availableViews.includes(view.id)
  );

  // availableViewsが1つ以下の場合はViewSelectorを非表示
  if (visibleViews.length <= 1) {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', color: '#666' }}>View:</span>
      {visibleViews.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: viewType === view.id ? '#4262FF' : '#FFFFFF',
            color: viewType === view.id ? '#FFFFFF' : '#1a1a1a',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          title={view.description}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

