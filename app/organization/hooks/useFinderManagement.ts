import { useCallback } from 'react';
import type { OrgNodeData } from '@/components/OrgChart';
import { getOrgTreeFromDb, updateOrg, updateOrgParent, createOrg, tauriAlert } from '@/lib/orgApi';
import { findOrgInTree } from '../utils/organizationUtils';
import { devLog } from '../utils/devLog';

export function useFinderManagement(
  setOrgData: (data: OrgNodeData | null) => void,
  finderSelectedPath: OrgNodeData[],
  setFinderSelectedPath: (path: OrgNodeData[]) => void,
  setEditingOrgId: (id: string | null) => void,
  setEditingOrgName: (name: string) => void,
  filteredOrgData: OrgNodeData | null,
  orgData: OrgNodeData | null
) {
  const rebuildSelectedPath = useCallback((currentPath: OrgNodeData[], newTree: OrgNodeData): OrgNodeData[] => {
    const findOrgInTreeHelper = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
      if (node.id === targetId) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findOrgInTreeHelper(child, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const newPath: OrgNodeData[] = [];
    for (const org of currentPath) {
      if (org.id) {
        const updatedOrg = findOrgInTreeHelper(newTree, org.id);
        if (updatedOrg) {
          newPath.push(updatedOrg);
        } else {
          break;
        }
      }
    }
    return newPath;
  }, []);

  const handleReorderOrg = useCallback(async (orgId: string, newPosition: number, parentId: string | null) => {
    try {
      await updateOrg(orgId, undefined, undefined, undefined, newPosition);
      const tree = await getOrgTreeFromDb();
      if (tree) {
        setOrgData(tree);
        const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
        setFinderSelectedPath(updatedPath);
      }
    } catch (error: any) {
      console.error('❌ [onReorderOrg] 組織の順番変更に失敗しました:', error);
      await tauriAlert(`組織の順番変更に失敗しました: ${error.message || error}`);
    }
  }, [finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath]);

  const handleMoveOrg = useCallback(async (orgId: string, newParentId: string | null) => {
    try {
      await updateOrgParent(orgId, newParentId);
      const tree = await getOrgTreeFromDb();
      if (tree) {
        setOrgData(tree);
        const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
        setFinderSelectedPath(updatedPath);
      }
    } catch (error: any) {
      console.error('❌ [onMoveOrg] 組織の移動に失敗しました:', error);
      await tauriAlert(`組織の移動に失敗しました: ${error.message || error}`);
    }
  }, [finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath]);

  const handleEditSave = useCallback(async (orgId: string, newName: string) => {
    try {
      devLog('🔄 [handleEditSave] 組織名を更新開始:', { orgId, newName });
      
      await updateOrg(orgId, newName);
      devLog('✅ [handleEditSave] 組織名の更新が完了しました');
      
      // Supabase使用時は、更新が反映されるまで少し待つ
      const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
      if (useSupabase) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // 組織ツリーを再取得（Supabase使用時は複数回試行）
      let tree: OrgNodeData | null = null;
      const maxAttempts = useSupabase ? 5 : 3;
      let attempts = 0;
      
      while (attempts < maxAttempts && !tree) {
        try {
          tree = await getOrgTreeFromDb();
          if (tree) {
            // 更新された組織がツリーに含まれているか確認
            const findUpdatedOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
              if (node.id === targetId) return node;
              if (node.children) {
                for (const child of node.children) {
                  const found = findUpdatedOrg(child, targetId);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const updatedOrg = findUpdatedOrg(tree, orgId);
            if (updatedOrg && updatedOrg.name === newName) {
              devLog('✅ [handleEditSave] 更新された組織をツリーで確認:', { orgId, newName });
              break;
            } else if (updatedOrg) {
              devLog('⏳ [handleEditSave] 組織は見つかりましたが、名前がまだ更新されていません:', {
                orgId,
                expectedName: newName,
                actualName: updatedOrg.name,
                attempt: attempts + 1,
              });
              if (attempts < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
                tree = null;
              }
            }
          }
        } catch (getTreeError: any) {
          console.warn(`⚠️ [handleEditSave] 組織ツリーの取得に失敗 (試行 ${attempts + 1}/${maxAttempts}):`, getTreeError);
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        attempts++;
      }
      
      if (!tree) {
        // ツリーの取得に失敗した場合でも、編集モードを終了
        console.warn('⚠️ [handleEditSave] 組織ツリーの取得に失敗しましたが、編集モードを終了します。');
        setEditingOrgId(null);
        setEditingOrgName('');
        await tauriAlert('組織名は更新されましたが、表示の更新に時間がかかっています。ページをリロードしてください。');
        return;
      }
      
      setOrgData(tree);
      const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
      setFinderSelectedPath(updatedPath);
      setEditingOrgId(null);
      setEditingOrgName('');
      
      devLog('✅ [handleEditSave] 組織名の更新処理が完了しました');
    } catch (error: any) {
      console.error('❌ [handleEditSave] 組織名の更新に失敗しました:', error);
      const errorMessage = error?.response?.data?.error || error?.message || String(error);
      await tauriAlert(`組織名の更新に失敗しました: ${errorMessage}`);
      // エラーが発生しても編集モードを終了（ユーザーが再度編集できるように）
      setEditingOrgId(null);
      setEditingOrgName('');
    }
  }, [finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath, setEditingOrgId, setEditingOrgName]);

  const handleCreateOrg = useCallback(async (parentId: string | null, type?: string) => {
    try {
      const currentTree = filteredOrgData || orgData!;
      if (!currentTree) {
        await tauriAlert('組織データが読み込まれていません。ページをリロードしてください。');
        return;
      }
      
      let parentLevel = -1;
      if (parentId) {
        const parentOrg = findOrgInTree(currentTree, parentId);
        if (!parentOrg) {
          await tauriAlert(`親組織（ID: ${parentId}）が見つかりません。`);
          return;
        }
        parentLevel = (parentOrg as any)?.level ?? 0;
      }
      
      const level = parentLevel >= 0 ? parentLevel + 1 : 1;
      const levelName = `階層レベル ${level}`;
      const defaultName = type === 'company' ? '新しい事業会社' : type === 'person' ? '新しい個人' : '新しい組織';
      
      devLog('🔍 [onCreateOrg] 組織を作成中:', {
        parentId,
        name: defaultName,
        type: type || 'organization',
        level,
        levelName,
      });
      
      const result = await createOrg(parentId, defaultName, null, null, level, levelName, 0, type);
      
      devLog('🔍 [onCreateOrg] createOrgの結果:', {
        result,
        hasId: !!result?.id,
        id: result?.id,
        fullResult: JSON.stringify(result, null, 2)
      });
      
      if (!result || !result.id) {
        throw new Error('組織の作成に失敗しました。IDが返されませんでした。');
      }
      
      devLog('✅ [onCreateOrg] 組織を作成しました:', {
        id: result.id,
        name: result.name || '新しい組織',
        parentId: result.parent_id || parentId,
        level: result.level || level,
        levelName: result.level_name || levelName
      });
      
      // データベースの更新を待つために、複数回再取得を試みる
      // Supabase使用時は、リアルタイム更新が反映されるまで時間がかかる可能性があるため、待機時間を長めにする
      const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
      const waitTime = useSupabase ? 500 : 300; // Supabase使用時は500ms、SQLite使用時は300ms
      const maxAttempts = useSupabase ? 10 : 5; // Supabase使用時は最大10回、SQLite使用時は最大5回
      
      let tree: OrgNodeData | null = null;
      let attempts = 0;
      
      while (attempts < maxAttempts && !tree) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        try {
          tree = await getOrgTreeFromDb();
          
          if (tree) {
            const findNewOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
              if (node.id === targetId) return node;
              if (node.children) {
                for (const child of node.children) {
                  const found = findNewOrg(child, targetId);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const foundOrg = findNewOrg(tree, result.id);
            if (foundOrg) {
              console.log(`✅ [onCreateOrg] 作成された組織をツリーで確認 (試行 ${attempts + 1}/${maxAttempts}):`, result.id);
              break;
            } else {
              console.log(`⏳ [onCreateOrg] 組織がまだツリーに反映されていません (試行 ${attempts + 1}/${maxAttempts})`);
              tree = null;
            }
          }
        } catch (getTreeError: any) {
          console.warn(`⚠️ [onCreateOrg] 組織ツリーの取得に失敗 (試行 ${attempts + 1}/${maxAttempts}):`, getTreeError);
          // エラーが発生しても再試行を続ける
        }
        
        attempts++;
      }
      
      // 最後にもう一度取得を試みる
      if (!tree) {
        try {
          tree = await getOrgTreeFromDb();
        } catch (finalError: any) {
          console.error('❌ [onCreateOrg] 最終的な組織ツリーの取得に失敗:', finalError);
        }
      }
      
      if (!tree) {
        // ツリーの取得に失敗した場合でも、作成された組織の情報を使って処理を続行
        console.warn('⚠️ [onCreateOrg] 組織ツリーの取得に失敗しましたが、作成された組織の情報を使用して処理を続行します。');
        // エラーを投げずに、作成された組織の情報を使って処理を続行
        // ただし、ツリーが取得できない場合は、ユーザーに警告を表示
        await tauriAlert('組織は作成されましたが、表示の更新に時間がかかっています。ページをリロードしてください。');
        return;
      }
      
      console.log('✅ [onCreateOrg] 組織ツリーを更新:', tree);
      setOrgData(tree);
      
      const updatedPath = rebuildSelectedPath(finderSelectedPath, tree);
      setFinderSelectedPath(updatedPath);
      
      const newOrg = (() => {
        const findNewOrg = (node: OrgNodeData, targetId: string): OrgNodeData | null => {
          if (node.id === targetId) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findNewOrg(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        return findNewOrg(tree, result.id);
      })();
      
      devLog('🔍 [onCreateOrg] 作成された組織をツリーで検索:', {
        searchId: result.id,
        foundOrg: newOrg,
        foundOrgId: newOrg?.id,
        foundOrgName: newOrg?.name,
        hasId: !!newOrg?.id
      });
      
      if (newOrg?.id) {
        devLog('✅ [onCreateOrg] 作成された組織が見つかりました。編集モードに設定:', {
          id: newOrg.id,
          name: newOrg.name
        });
        setEditingOrgId(newOrg.id);
        setEditingOrgName(defaultName);
        
        if (parentId) {
          const parentOrg = findOrgInTree(tree, parentId);
          if (parentOrg) {
            const parentIndex = updatedPath.findIndex(org => org.id === parentId);
            if (parentIndex < 0) {
              setFinderSelectedPath([...updatedPath, parentOrg]);
            }
          }
        }
      } else {
        console.warn('⚠️ [onCreateOrg] 新しく作成された組織が見つかりませんでした:', result.id);
      }
    } catch (error: any) {
      console.error('❌ [onCreateOrg] 組織の作成に失敗しました:', error);
      const errorMessage = error?.response?.data?.error || error?.message || String(error);
      await tauriAlert(`組織の作成に失敗しました: ${errorMessage}`);
    }
  }, [filteredOrgData, orgData, finderSelectedPath, rebuildSelectedPath, setOrgData, setFinderSelectedPath, setEditingOrgId, setEditingOrgName]);

  return {
    handleReorderOrg,
    handleMoveOrg,
    handleEditSave,
    handleCreateOrg,
  };
}

