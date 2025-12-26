/**
 * Tab0のヘッダーコンポーネント
 */

import type { ValidationResult } from '@/lib/graphvizHierarchyApi';
import { ValidationBanner } from '../ValidationBanner';

interface Tab0HeaderProps {
  validationResult: ValidationResult | null;
  sitesCount: number;
}

export function Tab0Header({ validationResult, sitesCount }: Tab0HeaderProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: 600, 
        color: '#1a1a1a', 
        marginBottom: '8px' 
      }}>
        タブ0: 全体俯瞰
      </h2>
      <p style={{ 
        color: '#666', 
        fontSize: '14px',
        marginBottom: '16px',
      }}>
        すべての棟、ラック、機器を一つのビューで確認できます。
        <br />
        <strong>階層:</strong> タブ0（全体俯瞰） → タブ1（棟間） → タブ2（棟内） → タブ3（ラック内） → タブ4（機器詳細）
      </p>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#0369A1',
        marginBottom: '16px',
      }}>
        <strong>機能:</strong>
        <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li>棟をクリックすると、その棟内の機器構成を表示</li>
          <li>ラックをクリックすると、ラック内のサーバーを表示</li>
          <li>機器をクリックすると、機器の詳細を表示</li>
        </ul>
      </div>
      
      {/* 参照整合性エラーの表示 */}
      {validationResult && !validationResult.isValid && (
        <ValidationBanner validationResult={validationResult} />
      )}
      
      {/* 棟数の表示 */}
      {sitesCount > 0 ? (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#F9FAFB',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#6B7280',
          marginBottom: '16px',
        }}>
          表示中の棟: <strong>{sitesCount}</strong> 件
        </div>
      ) : (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400E',
          marginBottom: '16px',
        }}>
          ⚠️ データがありません。
        </div>
      )}
    </div>
  );
}

