/**
 * タブ2: サンプル読み込みUIコンポーネント
 */

'use client';

type SampleType = 'site_equipment';

interface SampleLoaderProps {
  onLoadSample: (type: SampleType) => void;
}

export function SampleLoader({ onLoadSample }: SampleLoaderProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: '#666' }}>サンプル:</span>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onLoadSample('site_equipment')}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            color: '#1a1a1a',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
        >
          棟内機器構成
        </button>
      </div>
    </div>
  );
}

