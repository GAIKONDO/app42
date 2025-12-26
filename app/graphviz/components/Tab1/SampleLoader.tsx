/**
 * サンプル読み込みUIコンポーネント
 */

'use client';

type SampleType = 'topology' | 'device' | 'links' | 'intent' | 'complex_topology' | 'complex_links' | 'site_topology';

interface SampleLoaderProps {
  onLoadSample: (type: SampleType) => void;
}

export function SampleLoader({ onLoadSample }: SampleLoaderProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: '#666' }}>サンプル:</span>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {(['topology', 'device', 'links', 'intent'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onLoadSample(type)}
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
            {type}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid #E5E7EB' }}>
        <span style={{ fontSize: '12px', color: '#666' }}>階層:</span>
        <button
          onClick={() => onLoadSample('site_topology')}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            border: '1px solid #4262FF',
            borderRadius: '4px',
            backgroundColor: '#E0E7FF',
            color: '#3730A3',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#C7D2FE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#E0E7FF';
          }}
        >
          棟間
        </button>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid #E5E7EB' }}>
        <span style={{ fontSize: '12px', color: '#666' }}>複雑:</span>
        {(['complex_topology', 'complex_links'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onLoadSample(type)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: '1px solid #4262FF',
              borderRadius: '4px',
              backgroundColor: '#E0E7FF',
              color: '#3730A3',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#C7D2FE';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#E0E7FF';
            }}
          >
            {type.replace('complex_', '')}
          </button>
        ))}
      </div>
    </div>
  );
}

