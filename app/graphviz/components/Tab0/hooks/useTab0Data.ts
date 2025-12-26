/**
 * Tab0のデータ読み込みと状態管理のカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getSitesOnly, 
  validateHierarchyReferences,
  clearHierarchyCache,
  type SiteTopology,
  type ValidationResult,
} from '@/lib/graphvizHierarchyApi';

export function useTab0Data(organizationId?: string | null, initialFileId?: string | null) {
  const [sites, setSites] = useState<SiteTopology[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  const loadInitialData = useCallback(async (clearCache = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [Tab0] 初期データ読み込み開始', { organizationId, clearCache });
      
      // キャッシュをクリア（必要に応じて）
      if (clearCache) {
        console.log('🔄 [Tab0] キャッシュをクリア中...');
        clearHierarchyCache();
      }
      
      // 1. 参照整合性チェック
      console.log('🔄 [Tab0] 参照整合性チェック中...');
      const validation = await validateHierarchyReferences(organizationId || undefined);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        console.warn('⚠️ [Tab0] 参照整合性エラー:', validation.errors);
        // エラーがある場合でも、表示可能なデータは表示
      } else {
        console.log('✅ [Tab0] 参照整合性チェック: OK');
      }
      
      // 2. 棟データのみを取得（軽量、遅延読み込み）
      console.log('🔄 [Tab0] 棟データ取得中...');
      const sitesData = await getSitesOnly(organizationId || undefined);
      console.log('✅ [Tab0] 棟データ取得完了:', sitesData.length, '件', sitesData);
      
      setSites(sitesData);
      
    } catch (err: any) {
      console.error('❌ [Tab0] データ取得エラー:', err);
      setError(err.message || 'データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);
  
  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
  }, [organizationId, loadInitialData]);
  
  // ページがフォーカスされたときにデータを再読み込み（上書き保存後の反映のため）
  useEffect(() => {
    const handleFocus = () => {
      if (initialFileId) {
        console.log('🔄 [Tab0] ページがフォーカスされました。データを再読み込みします:', initialFileId);
        // キャッシュをクリアしてデータを再読み込み
        loadInitialData(true);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialFileId, loadInitialData]);
  
  // initialFileIdが変更されたとき（ファイルが更新されたとき）にデータを再読み込み
  useEffect(() => {
    if (initialFileId) {
      console.log('🔄 [Tab0] initialFileIdが変更されました。データを再読み込みします:', initialFileId);
      // キャッシュをクリアしてデータを再読み込み
      loadInitialData(true);
    }
  }, [initialFileId, loadInitialData]);
  
  return {
    sites,
    isLoading,
    error,
    validationResult,
    loadInitialData,
    setError,
    setIsLoading,
  };
}

