/**
 * 参照整合性エラー表示バナー
 */

'use client';

import type { ValidationResult } from '@/lib/graphvizHierarchyApi';

interface ValidationBannerProps {
  validationResult: ValidationResult;
}

export function ValidationBanner({ validationResult }: ValidationBannerProps) {
  if (validationResult.isValid) {
    return null;
  }
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#FEF3C7',
      border: '1px solid #FCD34D',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: '#92400E',
        }}>
          参照整合性エラーが検出されました
        </h4>
      </div>
      <div style={{
        fontSize: '14px',
        color: '#78350F',
      }}>
        <p style={{ margin: '0 0 8px 0' }}>
          {validationResult.errors.length}件のエラーが見つかりました：
        </p>
        <ul style={{
          margin: '0 0 0 20px',
          padding: 0,
          listStyle: 'disc',
        }}>
          {validationResult.errors.slice(0, 5).map((error, index) => (
            <li key={index} style={{ marginBottom: '4px' }}>
              {error.message}
            </li>
          ))}
          {validationResult.errors.length > 5 && (
            <li style={{ color: '#92400E', fontStyle: 'italic' }}>
              他 {validationResult.errors.length - 5} 件のエラー...
            </li>
          )}
        </ul>
        {validationResult.warnings.length > 0 && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FCD34D' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 500 }}>
              警告: {validationResult.warnings.length}件
            </p>
            <ul style={{
              margin: '0 0 0 20px',
              padding: 0,
              listStyle: 'disc',
            }}>
              {validationResult.warnings.slice(0, 3).map((warning, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

