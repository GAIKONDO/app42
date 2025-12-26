/**
 * ローディングインジケーターコンポーネント
 */

'use client';

export function LoadingIndicator() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      minHeight: '400px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #E5E7EB',
        borderTop: '4px solid #4262FF',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{
        marginTop: '16px',
        fontSize: '14px',
        color: '#6B7280',
      }}>
        データを読み込み中...
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

