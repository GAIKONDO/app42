/**
 * 共同編集フック
 * リアルタイム同期と競合解決を統合したReactフック
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import { getDataSourceInstance } from '../dataSource';
import { updateWithConflictResolution, ConflictError } from '../conflictResolution';

export interface UseCollaborativeEditingOptions<T> {
  table: string;
  docId: string;
  initialData?: T;
  onConflict?: (error: ConflictError) => void;
  enabled?: boolean;
}

/**
 * 共同編集フック
 * 
 * @example
 * ```tsx
 * const { data, update, isLoading, error } = useCollaborativeEditing({
 *   table: 'organizations',
 *   docId: 'org-id',
 *   initialData: { name: '組織名' },
 *   onConflict: (error) => {
 *     console.error('競合が発生しました:', error);
 *     // 最新のデータを再取得
 *   },
 * });
 * 
 * // データを更新
 * update({ name: '新しい組織名' });
 * ```
 */
export function useCollaborativeEditing<T extends { id: string; version?: number }>(
  options: UseCollaborativeEditingOptions<T>
) {
  const {
    table,
    docId,
    initialData,
    onConflict,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const dataSource = getDataSourceInstance();
  const isUpdatingRef = useRef(false);

  // データを取得
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dataSource.doc_get(table, docId);
      setData(result as T);
    } catch (err: any) {
      setError(err);
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  }, [table, docId, dataSource]);

  // 初回データ取得
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // リアルタイム同期
  useRealtimeSync({
    table,
    enabled,
    onUpdate: (payload) => {
      // 自分が更新中でない場合のみ、リアルタイム更新を反映
      if (!isUpdatingRef.current && payload.new?.id === docId) {
        setData(payload.new as T);
      }
    },
    onDelete: (payload) => {
      if (payload.old?.id === docId) {
        setData(null);
      }
    },
  });

  // データを更新
  const update = useCallback(async (updates: Partial<T>) => {
    if (!data) {
      throw new Error('データが読み込まれていません');
    }

    try {
      isUpdatingRef.current = true;
      setError(null);

      // 競合解決を使用して更新
      const updated = await updateWithConflictResolution(table, docId, {
        ...updates,
        version: data.version || 0,
      } as Partial<T & { version: number }>);

      setData(updated as T);
    } catch (err: any) {
      setError(err);
      
      if (err instanceof ConflictError) {
        // 競合が発生した場合
        if (onConflict) {
          onConflict(err);
        }
        // 最新のデータを再取得
        await fetchData();
      } else {
        console.error('更新エラー:', err);
      }
    } finally {
      isUpdatingRef.current = false;
    }
  }, [table, docId, data, onConflict, fetchData]);

  return {
    data,
    update,
    isLoading,
    error,
    refetch: fetchData,
  };
}

