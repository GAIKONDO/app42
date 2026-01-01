'use client';

import { useState, useEffect } from 'react';
import type { Relation } from '@/types/relation';
import { getRelationById } from '@/lib/relationApi';
import { getEntityById } from '@/lib/entityApi';

interface DeleteRelationModalProps {
  isOpen: boolean;
  relationId: string | null;
  relations: Relation[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  relationTypeLabels: Record<string, string>;
}

export default function DeleteRelationModal({
  isOpen,
  relationId,
  relations,
  isDeleting,
  onClose,
  onConfirm,
  relationTypeLabels,
}: DeleteRelationModalProps) {
  const [relation, setRelation] = useState<Relation | null>(null);
  const [sourceEntityName, setSourceEntityName] = useState<string>('');
  const [targetEntityName, setTargetEntityName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !relationId) {
      setRelation(null);
      setSourceEntityName('');
      setTargetEntityName('');
      return;
    }

    const loadRelation = async () => {
      setIsLoading(true);
      try {
        const loadedRelation = await getRelationById(relationId);
        if (loadedRelation) {
          setRelation(loadedRelation);
          
          // エンティティ名を取得
          if (loadedRelation.sourceEntityId) {
            try {
              const sourceEntity = await getEntityById(loadedRelation.sourceEntityId);
              setSourceEntityName(sourceEntity?.name || loadedRelation.sourceEntityId);
            } catch (error) {
              setSourceEntityName(loadedRelation.sourceEntityId);
            }
          }
          
          if (loadedRelation.targetEntityId) {
            try {
              const targetEntity = await getEntityById(loadedRelation.targetEntityId);
              setTargetEntityName(targetEntity?.name || loadedRelation.targetEntityId);
            } catch (error) {
              setTargetEntityName(loadedRelation.targetEntityId);
            }
          }
        }
      } catch (error) {
        console.error('リレーション情報の取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRelation();
  }, [isOpen, relationId]);

  if (!isOpen) {
    return null;
  }

  const relationTypeLabel = relation
    ? relationTypeLabels[relation.relationType] || relation.relationType
    : '';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
            ⚠️ リレーションの削除
          </h2>
          
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
              リレーション情報を読み込み中...
            </div>
          ) : relation ? (
            <>
              <div style={{ marginBottom: '16px', color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>
                リレーション「<strong style={{ color: '#1F2937' }}>
                  {sourceEntityName || '不明'} --[{relationTypeLabel}]--&gt; {targetEntityName || '不明'}
                </strong>」を削除しますか？
              </div>

              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>削除されるデータ:</div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#92400E' }}>
                  <li>リレーション情報</li>
                  <li>リレーションの埋め込みデータ（ChromaDB/Supabase）</li>
                </ul>
              </div>

              {relation.description && (
                <div style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px', fontSize: '13px' }}>説明:</div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>{relation.description}</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#EF4444' }}>
              リレーション情報の取得に失敗しました
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || isLoading || !relation}
            style={{
              padding: '10px 20px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: (isDeleting || isLoading || !relation) ? 'not-allowed' : 'pointer',
              opacity: (isDeleting || isLoading || !relation) ? 0.5 : 1,
            }}
          >
            {isDeleting ? '削除中...' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  );
}

