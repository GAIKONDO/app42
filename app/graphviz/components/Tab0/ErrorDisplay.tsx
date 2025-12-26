/**
 * エラー表示コンポーネント
 */

'use client';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '8px',
      margin: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: '#DC2626',
        }}>
          エラーが発生しました
        </h3>
      </div>
      <p style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        color: '#991B1B',
        lineHeight: '1.6',
      }}>
        {error}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#B91C1C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#DC2626';
          }}
        >
          再試行
        </button>
      )}
    </div>
  );
}

