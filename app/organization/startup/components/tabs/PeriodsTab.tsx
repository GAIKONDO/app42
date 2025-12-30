'use client';

import { useEffect, useRef } from 'react';

interface PeriodsTabProps {
  localConsiderationStartPeriod: string;
  setLocalConsiderationStartPeriod: (period: string) => void;
  localConsiderationEndPeriod: string;
  setLocalConsiderationEndPeriod: (period: string) => void;
  localExecutionStartPeriod: string;
  setLocalExecutionStartPeriod: (period: string) => void;
  localExecutionEndPeriod: string;
  setLocalExecutionEndPeriod: (period: string) => void;
  localMonetizationStartPeriod: string;
  setLocalMonetizationStartPeriod: (period: string) => void;
  localMonetizationEndPeriod: string;
  setLocalMonetizationEndPeriod: (period: string) => void;
  localMonetizationRenewalNotRequired: boolean;
  setLocalMonetizationRenewalNotRequired: (value: boolean) => void;
}

export default function PeriodsTab({
  localConsiderationStartPeriod,
  setLocalConsiderationStartPeriod,
  localConsiderationEndPeriod,
  setLocalConsiderationEndPeriod,
  localExecutionStartPeriod,
  setLocalExecutionStartPeriod,
  localExecutionEndPeriod,
  setLocalExecutionEndPeriod,
  localMonetizationStartPeriod,
  setLocalMonetizationStartPeriod,
  localMonetizationEndPeriod,
  setLocalMonetizationEndPeriod,
  localMonetizationRenewalNotRequired,
  setLocalMonetizationRenewalNotRequired,
}: PeriodsTabProps) {
  // 初期読み込みかどうかを判定するためのref
  const isInitialMount = useRef(true);
  const hasInitialized = useRef(false);

  // 初期読み込みが完了したかどうかを判定
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // 初期値が設定されたら、初期化完了とマーク
      if (localExecutionEndPeriod || localMonetizationStartPeriod || localMonetizationRenewalNotRequired) {
        hasInitialized.current = true;
      }
    } else {
      hasInitialized.current = true;
    }
  }, [localExecutionEndPeriod, localMonetizationStartPeriod, localMonetizationRenewalNotRequired]);

  // NDA締結期間の終了日が変更されたら、NDA更新予定日の開始予定日を自動設定
  // ただし、初期読み込み時や既に開始予定日が設定されている場合は上書きしない
  useEffect(() => {
    // 初期読み込み時は実行しない
    if (!hasInitialized.current) return;
    
    // 更新不要がチェックされている場合は実行しない
    if (localMonetizationRenewalNotRequired) return;
    
    // 既に開始予定日が設定されている場合は上書きしない
    if (localMonetizationStartPeriod) return;
    
    // 終了日が設定されている場合のみ自動設定
    if (localExecutionEndPeriod) {
      setLocalMonetizationStartPeriod(localExecutionEndPeriod);
    }
  }, [localExecutionEndPeriod, localMonetizationRenewalNotRequired, localMonetizationStartPeriod, setLocalMonetizationStartPeriod]);

  // 更新不要チェックボックスが変更されたら、開始予定日をクリア
  // ただし、初期読み込み時は実行しない
  useEffect(() => {
    // 初期読み込み時は実行しない
    if (!hasInitialized.current) return;
    
    if (localMonetizationRenewalNotRequired) {
      setLocalMonetizationStartPeriod('');
    }
  }, [localMonetizationRenewalNotRequired, setLocalMonetizationStartPeriod]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>
      
      {/* 机上-NDA締結期間 */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>机上-NDA締結期間</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#6B7280', fontSize: '14px' }}>
              開始予定日
            </label>
            <input
              type="date"
              value={localConsiderationStartPeriod}
              onChange={(e) => setLocalConsiderationStartPeriod(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#6B7280', fontSize: '14px' }}>
              終了期間
            </label>
            <input
              type="date"
              value={localConsiderationEndPeriod}
              onChange={(e) => setLocalConsiderationEndPeriod(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      </div>
      
      {/* NDA締結期間 */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>NDA締結期間</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#6B7280', fontSize: '14px' }}>
              開始予定日
            </label>
            <input
              type="date"
              value={localExecutionStartPeriod}
              onChange={(e) => setLocalExecutionStartPeriod(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#6B7280', fontSize: '14px' }}>
              終了期間
            </label>
            <input
              type="date"
              value={localExecutionEndPeriod}
              onChange={(e) => setLocalExecutionEndPeriod(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      </div>
      
      {/* NDA更新予定日 */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>NDA更新予定日</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
            <input
              type="checkbox"
              checked={localMonetizationRenewalNotRequired}
              onChange={(e) => setLocalMonetizationRenewalNotRequired(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer',
              }}
            />
            <span>更新不要</span>
          </label>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#6B7280', fontSize: '14px' }}>
            開始予定日
          </label>
          <input
            type="date"
            value={localMonetizationStartPeriod}
            onChange={(e) => setLocalMonetizationStartPeriod(e.target.value)}
            disabled={localMonetizationRenewalNotRequired}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: localMonetizationRenewalNotRequired ? '#F3F4F6' : '#FFFFFF',
              color: localMonetizationRenewalNotRequired ? '#9CA3AF' : '#1F2937',
              cursor: localMonetizationRenewalNotRequired ? 'not-allowed' : 'text',
            }}
          />
        </div>
      </div>
    </div>
  );
}

