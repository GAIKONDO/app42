'use client';

type ViewMode = 'card' | 'list' | 'finder';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '4px', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '2px' }}>
      <button
        onClick={() => onViewModeChange('card')}
        title="カード形式"
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          backgroundColor: viewMode === 'card' ? '#3B82F6' : 'transparent',
          color: viewMode === 'card' ? '#FFFFFF' : '#6B7280',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        title="リスト形式"
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          backgroundColor: viewMode === 'list' ? '#3B82F6' : 'transparent',
          color: viewMode === 'list' ? '#FFFFFF' : '#6B7280',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        onClick={() => onViewModeChange('finder')}
        title="Finder形式"
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          backgroundColor: viewMode === 'finder' ? '#3B82F6' : 'transparent',
          color: viewMode === 'finder' ? '#FFFFFF' : '#6B7280',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

