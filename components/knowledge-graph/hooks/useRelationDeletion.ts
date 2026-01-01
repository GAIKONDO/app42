/**
 * リレーション削除フック
 */

import { useState, useCallback } from 'react';
import { deleteRelation } from '@/lib/relationApi';
import { getAllRelations } from '@/lib/relationApi';
import type { Relation } from '@/types/relation';

interface UseRelationDeletionProps {
  relations: Relation[];
  setRelations: (relations: Relation[] | ((prev: Relation[]) => Relation[])) => void;
}

interface UseRelationDeletionReturn {
  deleteTargetRelationId: string | null;
  setDeleteTargetRelationId: (id: string | null) => void;
  showDeleteRelationModal: boolean;
  setShowDeleteRelationModal: (show: boolean) => void;
  isDeletingRelation: boolean;
  handleDeleteRelation: () => Promise<void>;
}

export function useRelationDeletion({
  relations,
  setRelations,
}: UseRelationDeletionProps): UseRelationDeletionReturn {
  const [deleteTargetRelationId, setDeleteTargetRelationId] = useState<string | null>(null);
  const [showDeleteRelationModal, setShowDeleteRelationModal] = useState(false);
  const [isDeletingRelation, setIsDeletingRelation] = useState(false);

  // リレーション削除処理
  const handleDeleteRelation = useCallback(async () => {
    if (!deleteTargetRelationId) {
      console.warn('⚠️ [handleDeleteRelation] 削除対象が設定されていません');
      return;
    }

    const relationId = deleteTargetRelationId;
    const relation = relations.find((r) => r.id === relationId);

    if (!relation) {
      console.warn('⚠️ [handleDeleteRelation] リレーションが見つかりません:', relationId);
      setShowDeleteRelationModal(false);
      setDeleteTargetRelationId(null);
      return;
    }

    setIsDeletingRelation(true);

    try {
      // 1. リレーションを削除
      await deleteRelation(relation.id);
      console.log(`✅ [handleDeleteRelation] リレーション削除: ${relation.id}`);

      // 2. データを再読み込み
      const allRelations = await getAllRelations();
      setRelations(allRelations);

      // モーダルを閉じる
      setShowDeleteRelationModal(false);
      setDeleteTargetRelationId(null);

      alert('リレーションを削除しました。');
    } catch (error: any) {
      console.error('❌ [handleDeleteRelation] リレーション削除エラー:', error);
      alert(`リレーションの削除に失敗しました: ${error?.message || String(error)}`);
    } finally {
      setIsDeletingRelation(false);
    }
  }, [deleteTargetRelationId, relations, setRelations]);

  return {
    deleteTargetRelationId,
    setDeleteTargetRelationId,
    showDeleteRelationModal,
    setShowDeleteRelationModal,
    isDeletingRelation,
    handleDeleteRelation,
  };
}

