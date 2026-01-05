import { useState } from 'react';
import { saveStartup, deleteStartup, generateUniqueStartupId, getStartups, tauriAlert, toggleStartupFavorite } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import type { Startup } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

interface UseStartupHandlersProps {
  organizationId: string;
  organization: OrgNodeData | null;
  startups: Startup[];
  setStartups: React.Dispatch<React.SetStateAction<Startup[]>>;
}

export function useStartupHandlers({
  organizationId,
  organization,
  startups,
  setStartups,
}: UseStartupHandlersProps) {
  // スタートアップ追加モーダルの状態
  const [showAddStartupModal, setShowAddStartupModal] = useState(false);
  const [newStartupTitle, setNewStartupTitle] = useState('');
  const [newStartupDescription, setNewStartupDescription] = useState('');
  const [newStartupId, setNewStartupId] = useState<string>('');
  const [savingStartup, setSavingStartup] = useState(false);
  
  // スタートアップ編集・削除の状態
  const [editingStartupId, setEditingStartupId] = useState<string | null>(null);
  const [editingStartupTitle, setEditingStartupTitle] = useState('');
  const [showDeleteStartupConfirmModal, setShowDeleteStartupConfirmModal] = useState(false);
  const [deleteTargetStartupId, setDeleteTargetStartupId] = useState<string | null>(null);

  // スタートアップ追加モーダルを開く
  const handleOpenAddStartupModal = () => {
    const newId = generateUniqueStartupId();
    setNewStartupId(newId);
    setNewStartupTitle('');
    setNewStartupDescription('');
    setShowAddStartupModal(true);
  };

  // スタートアップを追加
  const handleAddStartup = async () => {
    if (!newStartupTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    // organizationオブジェクトから正しいIDを取得
    let validOrgId = organization?.id || organizationId;
    
    // organizationIdがorganizationsテーブルに存在するか確認
    if (validOrgId) {
      try {
        const { callTauriCommand } = await import('@/lib/localFirebase');
        const orgCheckResult = await callTauriCommand('doc_get', {
          collectionName: 'organizations',
          docId: validOrgId,
        });
        if (!orgCheckResult || !orgCheckResult.exists) {
          devWarn('⚠️ [handleAddStartup] organizationIdがorganizationsテーブルに存在しません。名前で検索します:', {
            organizationId: validOrgId,
            organizationName: organization?.name,
          });
          // 名前で組織を検索
          if (organization?.name) {
            const { searchOrgsByName } = await import('@/lib/orgApi');
            const searchResults = await searchOrgsByName(organization.name);
            if (searchResults && searchResults.length > 0) {
              const exactMatch = searchResults.find((org: any) => org.name === organization.name);
              if (exactMatch && exactMatch.id) {
                validOrgId = exactMatch.id;
                devLog('✅ [handleAddStartup] 名前で検索して正しいIDを取得:', validOrgId);
              } else if (searchResults[0] && searchResults[0].id) {
                validOrgId = searchResults[0].id;
                devWarn('⚠️ [handleAddStartup] 完全一致が見つかりませんでした。最初の結果を使用:', validOrgId);
              }
            }
          }
        } else {
          devLog('✅ [handleAddStartup] organizationIdがorganizationsテーブルに存在します:', validOrgId);
        }
      } catch (orgCheckError: any) {
        devWarn('⚠️ [handleAddStartup] 組織IDの確認でエラー（続行します）:', orgCheckError);
      }
    }
    
    if (!validOrgId) {
      await tauriAlert('組織IDが取得できませんでした');
      return;
    }

    try {
      setSavingStartup(true);
      devLog('📝 スタートアップを追加します:', { 
        id: newStartupId,
        organizationId: validOrgId, 
        title: newStartupTitle.trim(),
      });
      
      const startupId = await saveStartup({
        id: newStartupId,
        organizationId: validOrgId,
        title: newStartupTitle.trim(),
        description: newStartupDescription.trim() || undefined,
      });
      
      devLog('✅ スタートアップを追加しました。ID:', startupId);
      
      // リストを再取得
      const updatedStartups = await getStartups(validOrgId);
      devLog('📋 再取得したスタートアップリスト数:', updatedStartups.length);
      setStartups(updatedStartups);
      
      // モーダルを閉じてフォームをリセット
      setShowAddStartupModal(false);
      setNewStartupTitle('');
      setNewStartupDescription('');
      setNewStartupId('');
      
      await tauriAlert('スタートアップを追加しました');
    } catch (error: any) {
      console.error('❌ スタートアップの追加に失敗しました:', error);
      await tauriAlert(`追加に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingStartup(false);
    }
  };

  // スタートアップの編集を開始
  const handleStartEditStartup = (startup: Startup) => {
    setEditingStartupId(startup.id);
    setEditingStartupTitle(startup.title);
  };

  // スタートアップの編集をキャンセル
  const handleCancelEditStartup = () => {
    setEditingStartupId(null);
    setEditingStartupTitle('');
  };

  // スタートアップの編集を保存
  const handleSaveEditStartup = async (startupId: string) => {
    if (!editingStartupTitle.trim()) {
      await tauriAlert('タイトルを入力してください');
      return;
    }

    try {
      setSavingStartup(true);
      const startup = startups.find(s => s.id === startupId);
      if (!startup) {
        throw new Error('スタートアップが見つかりません');
      }

      await saveStartup({
        ...startup,
        title: editingStartupTitle.trim(),
      });

      const validOrgId = organization?.id || organizationId;
      const updatedStartups = await getStartups(validOrgId);
      setStartups(updatedStartups);
      setEditingStartupId(null);
      setEditingStartupTitle('');
      
      await tauriAlert('スタートアップを更新しました');
    } catch (error: any) {
      console.error('❌ スタートアップの更新に失敗しました:', error);
      await tauriAlert(`更新に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingStartup(false);
    }
  };

  // スタートアップの削除をリクエスト
  const handleDeleteStartup = (startupId: string) => {
    setDeleteTargetStartupId(startupId);
    setShowDeleteStartupConfirmModal(true);
  };

  // スタートアップの削除を確認
  const confirmDeleteStartup = async () => {
    if (!deleteTargetStartupId) {
      return;
    }

    const startupId = deleteTargetStartupId;
    const startup = startups.find(s => s.id === startupId);
    const startupTitle = startup?.title || 'このスタートアップ';
    
    setShowDeleteStartupConfirmModal(false);
    setDeleteTargetStartupId(null);
    
    try {
      setSavingStartup(true);
      await deleteStartup(startupId);
      
      const validOrgId = organization?.id || organizationId;
      const updatedStartups = await getStartups(validOrgId);
      setStartups(updatedStartups);
      
      await tauriAlert('スタートアップを削除しました');
    } catch (error: any) {
      console.error('❌ スタートアップの削除に失敗しました:', error);
      await tauriAlert(`削除に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setSavingStartup(false);
    }
  };

  // スタートアップの削除をキャンセル
  const cancelDeleteStartup = () => {
    setShowDeleteStartupConfirmModal(false);
    setDeleteTargetStartupId(null);
  };

  // スタートアップのお気に入りを切り替え
  const handleToggleFavorite = async (startupId: string) => {
    try {
      const newFavoriteState = await toggleStartupFavorite(startupId);
      
      // ローカル状態を更新
      setStartups(prev => prev.map(s => 
        s.id === startupId ? { ...s, isFavorite: newFavoriteState } : s
      ));
    } catch (error: any) {
      console.error('❌ お気に入りの切り替えに失敗しました:', error);
      await tauriAlert(`お気に入りの切り替えに失敗しました: ${error?.message || '不明なエラー'}`);
    }
  };

  return {
    // 状態
    showAddStartupModal,
    newStartupId,
    newStartupTitle,
    newStartupDescription,
    savingStartup,
    editingStartupId,
    editingStartupTitle,
    showDeleteStartupConfirmModal,
    deleteTargetStartupId,
    // セッター
    setShowAddStartupModal,
    setNewStartupTitle,
    setNewStartupDescription,
    setNewStartupId,
    setEditingStartupTitle,
    // ハンドラー
    handleOpenAddStartupModal,
    handleAddStartup,
    handleStartEditStartup,
    handleCancelEditStartup,
    handleSaveEditStartup,
    handleDeleteStartup,
    confirmDeleteStartup,
    cancelDeleteStartup,
    handleToggleFavorite,
  };
}

