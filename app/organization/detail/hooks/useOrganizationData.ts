import { useState, useEffect } from 'react';
import { getOrgTreeFromDb, findOrganizationById, getOrgMembers, getFocusInitiatives, getMeetingNotes, getStartups, getOrganizationContent } from '@/lib/orgApi';
import type { OrgNodeData } from '@/components/OrgChart';
import type { FocusInitiative, MeetingNote, Regulation, Startup, OrganizationContent } from '@/lib/orgApi';
import { sortMembersByPosition } from '@/lib/memberSort';
import { useRealtimeSync } from '@/lib/hooks';

// 開発環境でのみログを有効化するヘルパー関数（パフォーマンス最適化）
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

export interface UseOrganizationDataReturn {
  organization: OrgNodeData | null;
  organizationContent: OrganizationContent | null;
  focusInitiatives: FocusInitiative[];
  initiativesByOrg: Map<string, { orgName: string; initiatives: FocusInitiative[] }>;
  meetingNotes: MeetingNote[];
  setMeetingNotes: React.Dispatch<React.SetStateAction<MeetingNote[]>>;
  meetingNotesByOrg: Map<string, { orgName: string; meetingNotes: MeetingNote[] }>;
  regulations: Regulation[];
  setRegulations: React.Dispatch<React.SetStateAction<Regulation[]>>;
  regulationsByOrg: Map<string, { orgName: string; regulations: Regulation[] }>;
  startups: Startup[];
  setStartups: React.Dispatch<React.SetStateAction<Startup[]>>;
  startupsByOrg: Map<string, { orgName: string; startups: Startup[] }>;
  loading: boolean;
  error: string | null;
  reloadInitiatives: (orgId: string, orgTree: OrgNodeData | null) => Promise<void>;
}

export function useOrganizationData(organizationId: string | null): UseOrganizationDataReturn {
  const [organization, setOrganization] = useState<OrgNodeData | null>(null);
  const [organizationContent, setOrganizationContent] = useState<OrganizationContent | null>(null);
  const [focusInitiatives, setFocusInitiatives] = useState<FocusInitiative[]>([]);
  const [initiativesByOrg, setInitiativesByOrg] = useState<Map<string, { orgName: string; initiatives: FocusInitiative[] }>>(new Map());
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [meetingNotesByOrg, setMeetingNotesByOrg] = useState<Map<string, { orgName: string; meetingNotes: MeetingNote[] }>>(new Map());
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [regulationsByOrg, setRegulationsByOrg] = useState<Map<string, { orgName: string; regulations: Regulation[] }>>(new Map());
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupsByOrg, setStartupsByOrg] = useState<Map<string, { orgName: string; startups: Startup[] }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 注力施策を再取得して状態を更新する共通関数
  const reloadInitiatives = async (orgId: string, orgTree: OrgNodeData | null) => {
    try {
      // 現在の組織の注力施策を取得
      const currentInitiatives = await getFocusInitiatives(orgId);
      
      // 子組織のIDを収集
      const childOrgIds: string[] = [];
      const collectChildOrgIds = (org: OrgNodeData) => {
        if (org.children) {
          for (const child of org.children) {
            if (child.id) {
              childOrgIds.push(child.id);
            }
            collectChildOrgIds(child); // 再帰的に子組織を収集
          }
        }
      };
      
      if (orgTree) {
        const findOrg = (node: OrgNodeData): OrgNodeData | null => {
          if (node.id === orgId) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findOrg(child);
              if (found) return found;
            }
          }
          return null;
        };
        const foundOrg = findOrg(orgTree);
        if (foundOrg) {
          collectChildOrgIds(foundOrg);
        }
      }
      
      // 子組織の注力施策を取得
      const childInitiatives: FocusInitiative[] = [];
      for (const childOrgId of childOrgIds) {
        try {
          const childInitiativesData = await getFocusInitiatives(childOrgId);
          childInitiatives.push(...childInitiativesData);
        } catch (error) {
          devWarn(`⚠️ [reloadInitiatives] 子組織 ${childOrgId} の注力施策取得に失敗:`, error);
        }
      }
      
      // すべての注力施策を設定
      const allInitiatives = [...currentInitiatives, ...childInitiatives];
      setFocusInitiatives(allInitiatives);
      
      // 組織ごとにグループ化
      const initiativesByOrgMap = new Map<string, { orgName: string; initiatives: FocusInitiative[] }>();
      
      // 現在の組織の注力施策
      if (currentInitiatives.length > 0 || orgId === organizationId) {
        const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
          if (org.id === targetId) {
            return org.name || org.title || targetId;
          }
          if (org.children) {
            for (const child of org.children) {
              const found = findOrgName(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        
        const orgName = orgTree ? findOrgName(orgTree, orgId) : null;
        initiativesByOrgMap.set(orgId, {
          orgName: orgName || orgId,
          initiatives: currentInitiatives,
        });
      }
      
      // 子組織の注力施策
      for (const childOrgId of childOrgIds) {
        const childInitiativesForOrg = childInitiatives.filter(init => init.organizationId === childOrgId);
        if (childInitiativesForOrg.length > 0) {
          // 組織名を取得
          const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
            if (org.id === targetId) {
              return org.name || org.title || targetId;
            }
            if (org.children) {
              for (const child of org.children) {
                const found = findOrgName(child, targetId);
                if (found) return found;
              }
            }
            return null;
          };
          
          const orgName = orgTree ? findOrgName(orgTree, childOrgId) : null;
          initiativesByOrgMap.set(childOrgId, {
            orgName: orgName || childOrgId,
            initiatives: childInitiativesForOrg,
          });
        }
      }
      
      setInitiativesByOrg(initiativesByOrgMap);
      
      devLog('📋 [reloadInitiatives] 注力施策を再取得しました:', {
        currentOrg: orgId,
        currentCount: currentInitiatives.length,
        childOrgsCount: childOrgIds.length,
        childCount: childInitiatives.length,
        totalCount: allInitiatives.length,
      });
    } catch (error: any) {
      console.error('❌ [reloadInitiatives] 注力施策の再取得に失敗しました:', error);
    }
  };

  useEffect(() => {
    devLog('🚀 [useEffect] loadOrganizationData開始:', { organizationId });
    const loadOrganizationData = async () => {
      if (!organizationId) {
        devWarn('⚠️ [loadOrganizationData] 組織IDが指定されていません');
        setError('組織IDが指定されていません');
        setLoading(false);
        return;
      }

      devLog('📋 [loadOrganizationData] 関数実行開始:', { organizationId });
      try {
        setLoading(true);
        setError(null);
        
        // 組織ツリーを取得してから、指定されたIDの組織を検索
        const orgTree = await getOrgTreeFromDb();
        if (!orgTree) {
          setError('組織データが見つかりません');
          setLoading(false);
          return;
        }
        
        // デバッグ: 組織ツリーのルートノードのIDを確認
        devLog('🔍 [loadOrganizationData] デバッグ情報:', {
          organizationIdFromURL: organizationId,
          rootOrgId: orgTree.id,
          rootOrgName: orgTree.name,
        });
        
        const foundOrg = findOrganizationById(orgTree, organizationId);
        
        // デバッグ: 見つかった組織の情報を確認
        if (foundOrg) {
          devLog('✅ [loadOrganizationData] 組織が見つかりました:', {
            foundOrgId: foundOrg.id,
            foundOrgName: foundOrg.name,
          });
        } else {
          devWarn('⚠️ [loadOrganizationData] 組織が見つかりませんでした:', {
            searchId: organizationId,
            rootOrgId: orgTree.id,
          });
        }
        if (!foundOrg) {
          setError('指定された組織が見つかりません');
          setLoading(false);
          return;
        }
        
        // foundOrg.idがorganizationsテーブルに存在するか確認
        // 存在しない場合は、foundOrg.nameで組織を検索して正しいidを取得
        let validOrganizationId = foundOrg.id;
        
        // デバッグ: まず、organizationsテーブルに実際にどのようなIDが存在するか確認
        try {
          // Supabase専用（環境変数チェック不要）
          const { getDocViaDataSource } = await import('@/lib/dataSourceAdapter');
          
          // 特定のIDで検索
          try {
            const orgCheckResult = await getDocViaDataSource('organizations', validOrganizationId);
            
            if (!orgCheckResult) {
              devWarn('⚠️ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在しません:', {
                foundOrgId: validOrganizationId,
                foundOrgName: foundOrg.name,
              });
              
              // 名前で組織を検索
              const { searchOrgsByName } = await import('@/lib/orgApi');
              const searchResults = await searchOrgsByName(foundOrg.name || '');
              devLog('🔍 [loadOrganizationData] 名前で検索した結果数:', searchResults?.length || 0);
              
              if (searchResults && searchResults.length > 0) {
                // 完全一致する組織を探す
                const exactMatch = searchResults.find((org: any) => org.name === foundOrg.name);
                if (exactMatch && exactMatch.id) {
                  validOrganizationId = exactMatch.id;
                  devLog('✅ [loadOrganizationData] 名前で検索して正しいIDを取得:', validOrganizationId);
                } else if (searchResults[0] && searchResults[0].id) {
                  // 完全一致がない場合は最初の結果を使用
                  validOrganizationId = searchResults[0].id;
                  devWarn('⚠️ [loadOrganizationData] 完全一致が見つかりませんでした。最初の結果を使用:', validOrganizationId);
                }
              }
            } else {
              devLog('✅ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在します:', validOrganizationId);
            }
          } catch (docGetError: any) {
            // doc_getがエラーを返す場合（「Query returned no rows」）は、組織が存在しないことを意味する
            if (docGetError?.message?.includes('Query returned no rows') || 
                docGetError?.message?.includes('ドキュメント取得エラー')) {
              devWarn('⚠️ [loadOrganizationData] foundOrg.idがorganizationsテーブルに存在しません（doc_getが行を返さない）:', {
                foundOrgId: validOrganizationId,
                foundOrgName: foundOrg.name,
              });
              
              // 名前で組織を検索
              try {
                const { searchOrgsByName } = await import('@/lib/orgApi');
                const searchResults = await searchOrgsByName(foundOrg.name || '');
                devLog('🔍 [loadOrganizationData] 名前で検索した結果数:', searchResults?.length || 0);
                
                if (searchResults && searchResults.length > 0) {
                  // 完全一致する組織を探す
                  const exactMatch = searchResults.find((org: any) => org.name === foundOrg.name);
                  if (exactMatch && exactMatch.id) {
                    validOrganizationId = exactMatch.id;
                    devLog('✅ [loadOrganizationData] 名前で検索して正しいIDを取得:', validOrganizationId);
                  } else if (searchResults[0] && searchResults[0].id) {
                    // 完全一致がない場合は最初の結果を使用
                    validOrganizationId = searchResults[0].id;
                    devWarn('⚠️ [loadOrganizationData] 完全一致が見つかりませんでした。最初の結果を使用:', validOrganizationId);
                  }
                }
              } catch (searchError: any) {
                devWarn('⚠️ [loadOrganizationData] 名前での検索に失敗しました:', searchError);
              }
            } else {
              // その他のエラーの場合は警告のみ
              devWarn('⚠️ [loadOrganizationData] 組織IDの確認でエラーが発生しました（続行します）:', docGetError);
            }
          }
        } catch (orgCheckError: any) {
          devWarn('⚠️ [loadOrganizationData] 組織IDの確認でエラーが発生しました（続行します）:', orgCheckError);
          // エラーが発生しても続行（foundOrg.idを使用）
        }
        
        // メンバー情報を取得
        if (validOrganizationId) {
          try {
            const members = await getOrgMembers(validOrganizationId);
            devLog('✅ [loadOrganizationData] メンバーを取得:', {
              count: members?.length || 0,
            });
            const sortedMembers = sortMembersByPosition(members, foundOrg.name);
            // 正しいIDを確実に設定
            // foundOrgからmembersを削除してから新しいmembersを設定
            const { members: _, ...foundOrgWithoutMembers } = foundOrg;
            const updatedOrg: OrgNodeData = {
              ...foundOrgWithoutMembers,
              id: validOrganizationId, // 正しいIDを設定
              members: sortedMembers, // 新しく取得したメンバーを設定
            };
            setOrganization(updatedOrg);
            devLog('✅ [loadOrganizationData] organizationオブジェクトを設定:', {
              id: updatedOrg.id,
              name: updatedOrg.name,
              membersCount: updatedOrg.members?.length || 0,
            });
            
            // 組織コンテンツ、注力施策、議事録を並列取得（Supabase最適化）
            const dataLoadStartTime = performance.now();
            
            // 子組織のIDを収集（再利用可能な関数）
            const childOrgIds: string[] = [];
            const collectChildOrgIds = (org: OrgNodeData) => {
              if (org.children) {
                for (const child of org.children) {
                  if (child.id) {
                    childOrgIds.push(child.id);
                  }
                  collectChildOrgIds(child); // 再帰的に子組織を収集
                }
              }
            };
            
            if (updatedOrg) {
              collectChildOrgIds(updatedOrg);
            }
            
            devLog('📋 [loadOrganizationData] 子組織ID数:', childOrgIds.length);
            
            try {
              // 組織コンテンツ、現在の組織の注力施策、議事録を並列取得
              const [content, currentInitiatives, currentNotes] = await Promise.all([
                getOrganizationContent(validOrganizationId).catch((contentError: any) => {
                  devWarn('組織コンテンツの取得に失敗しました:', contentError);
                  return null;
                }),
                getFocusInitiatives(validOrganizationId).catch((initError: any) => {
                  devWarn('現在の組織の注力施策取得に失敗しました:', initError);
                  return [];
                }),
                getMeetingNotes(validOrganizationId).catch((notesError: any) => {
                  devWarn('現在の組織の議事録取得に失敗しました:', notesError);
                  return [];
                }),
              ]);
              
              setOrganizationContent(content);
              
              // 子組織の注力施策と議事録を並列取得（Supabase最適化）
              const childDataStartTime = performance.now();
              
              const [childInitiativesResults, childNotesResults] = await Promise.all([
                Promise.all(
                  childOrgIds.map(childOrgId =>
                    getFocusInitiatives(childOrgId).catch((error) => {
                      devWarn(`⚠️ [loadOrganizationData] 子組織 ${childOrgId} の注力施策取得に失敗:`, error);
                      return [];
                    })
                  )
                ),
                Promise.all(
                  childOrgIds.map(childOrgId =>
                    getMeetingNotes(childOrgId).catch((error) => {
                      devWarn(`⚠️ [loadOrganizationData] 子組織 ${childOrgId} の議事録取得に失敗:`, error);
                      return [];
                    })
                  )
                ),
              ]);
              
              const childDataLoadTime = performance.now() - childDataStartTime;
              devLog(`⏱️ [loadOrganizationData] 子組織データ取得時間: ${childDataLoadTime.toFixed(2)}ms (${childOrgIds.length}組織)`);
              
              // 結果をフラット化
              const childInitiatives = childInitiativesResults.flat();
              
              // すべての注力施策を設定
              const allInitiatives = [...currentInitiatives, ...childInitiatives];
              setFocusInitiatives(allInitiatives);
              
              // 組織ごとにグループ化
              const initiativesByOrgMap = new Map<string, { orgName: string; initiatives: FocusInitiative[] }>();
              
              // 組織名を取得するヘルパー関数
              const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
                if (org.id === targetId) {
                  return org.name || org.title || targetId;
                }
                if (org.children) {
                  for (const child of org.children) {
                    const found = findOrgName(child, targetId);
                    if (found) return found;
                  }
                }
                return null;
              };
              
              // 現在の組織の注力施策
              if (currentInitiatives.length > 0) {
                initiativesByOrgMap.set(validOrganizationId, {
                  orgName: updatedOrg?.name || updatedOrg?.title || validOrganizationId,
                  initiatives: currentInitiatives,
                });
              }
              
              // 子組織の注力施策
              for (const childOrgId of childOrgIds) {
                const childInitiativesForOrg = childInitiatives.filter(init => init.organizationId === childOrgId);
                if (childInitiativesForOrg.length > 0) {
                  const orgName = updatedOrg ? findOrgName(updatedOrg, childOrgId) : null;
                  initiativesByOrgMap.set(childOrgId, {
                    orgName: orgName || childOrgId,
                    initiatives: childInitiativesForOrg,
                  });
                }
              }
              
              setInitiativesByOrg(initiativesByOrgMap);
              
              // 議事録の処理（既に取得済み）
              const allNotes = [...currentNotes, ...childNotesResults.flat()];
              setMeetingNotes(allNotes);
              
              // 組織ごとにグループ化（議事録）
              const meetingNotesByOrgMap = new Map<string, { orgName: string; meetingNotes: MeetingNote[] }>();
              
              // 現在の組織の議事録
              if (currentNotes.length > 0) {
                const orgName = updatedOrg ? findOrgName(updatedOrg, validOrganizationId) : null;
                meetingNotesByOrgMap.set(validOrganizationId, {
                  orgName: orgName || validOrganizationId,
                  meetingNotes: currentNotes,
                });
              }
              
              // 子組織の議事録
              const childNotes = childNotesResults.flat();
              for (const childOrgId of childOrgIds) {
                const childNotesForOrg = childNotes.filter(n => n.organizationId === childOrgId);
                if (childNotesForOrg.length > 0) {
                  const orgName = updatedOrg ? findOrgName(updatedOrg, childOrgId) : null;
                  meetingNotesByOrgMap.set(childOrgId, {
                    orgName: orgName || childOrgId,
                    meetingNotes: childNotesForOrg,
                  });
                }
              }
              
              setMeetingNotesByOrg(meetingNotesByOrgMap);
              
              devLog('📋 [loadOrganizationData] 組織ごとの議事録:', {
                currentOrg: validOrganizationId,
                currentCount: currentNotes.length,
                childOrgsCount: childOrgIds.length,
                childCount: childNotes.length,
                totalCount: allNotes.length,
                byOrgCount: meetingNotesByOrgMap.size,
              });
              
              devLog('📋 [loadOrganizationData] 組織ごとの注力施策:', {
                currentOrg: validOrganizationId,
                currentCount: currentInitiatives.length,
                childOrgsCount: childOrgIds.length,
                childCount: childInitiatives.length,
                totalCount: allInitiatives.length,
                byOrgCount: initiativesByOrgMap.size,
              });
              
              const totalDataLoadTime = performance.now() - dataLoadStartTime;
              devLog(`⏱️ [loadOrganizationData] データ取得総時間: ${totalDataLoadTime.toFixed(2)}ms`);
            } catch (dataError: any) {
              devWarn('データ取得に失敗しました:', dataError);
            }
            
            // 制度を取得（制度タブは非表示のため、空配列を設定）
            setRegulations([]);
            setRegulationsByOrg(new Map());
            
            // スタートアップを取得（並列化）
            try {
              const startupsStartTime = performance.now();
              const [currentStartups, childStartupsResults] = await Promise.all([
                getStartups(validOrganizationId).catch((startupError: any) => {
                  devWarn('現在の組織のスタートアップ取得に失敗しました:', startupError);
                  return [];
                }),
                Promise.all(
                  childOrgIds.map(childOrgId =>
                    getStartups(childOrgId).catch((error) => {
                      devWarn(`⚠️ [loadOrganizationData] 子組織 ${childOrgId} のスタートアップ取得に失敗:`, error);
                      return [];
                    })
                  )
                ),
              ]);
              
              const startupsLoadTime = performance.now() - startupsStartTime;
              devLog(`⏱️ [loadOrganizationData] スタートアップ取得時間: ${startupsLoadTime.toFixed(2)}ms`);
              
              const childStartups = childStartupsResults.flat();
              
              // すべてのスタートアップを設定
              const allStartups = [...currentStartups, ...childStartups];
              setStartups(allStartups);
              
              // 組織ごとにグループ化
              const startupsByOrgMap = new Map<string, { orgName: string; startups: Startup[] }>();
              
              // 組織名を取得するヘルパー関数
              const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
                if (org.id === targetId) {
                  return org.name || org.title || targetId;
                }
                if (org.children) {
                  for (const child of org.children) {
                    const found = findOrgName(child, targetId);
                    if (found) return found;
                  }
                }
                return null;
              };
              
              // 現在の組織のスタートアップ
              if (currentStartups.length > 0) {
                const orgName = updatedOrg ? findOrgName(updatedOrg, validOrganizationId) : null;
                startupsByOrgMap.set(validOrganizationId, {
                  orgName: orgName || validOrganizationId,
                  startups: currentStartups,
                });
              }
              
              // 子組織のスタートアップ
              for (const childOrgId of childOrgIds) {
                const childStartupsForOrg = childStartups.filter(s => s.organizationId === childOrgId);
                if (childStartupsForOrg.length > 0) {
                  const orgName = updatedOrg ? findOrgName(updatedOrg, childOrgId) : null;
                  startupsByOrgMap.set(childOrgId, {
                    orgName: orgName || childOrgId,
                    startups: childStartupsForOrg,
                  });
                }
              }
              
              setStartupsByOrg(startupsByOrgMap);
              
              devLog('📋 [loadOrganizationData] 組織ごとのスタートアップ:', {
                currentOrg: validOrganizationId,
                currentCount: currentStartups.length,
                childOrgsCount: childOrgIds.length,
                childCount: childStartups.length,
                totalCount: allStartups.length,
                byOrgCount: startupsByOrgMap.size,
              });
            } catch (startupError: any) {
              devWarn('スタートアップの取得に失敗しました:', startupError);
            }
          } catch (memberError: any) {
            devWarn('メンバー情報の取得に失敗しました:', memberError);
            // 正しいIDを確実に設定
            const updatedOrg: OrgNodeData = {
              ...foundOrg,
              id: validOrganizationId || foundOrg.id, // 正しいIDを設定
            };
            setOrganization(updatedOrg);
            devLog('✅ [loadOrganizationData] organizationオブジェクトを設定（メンバー取得失敗時）:', {
              id: updatedOrg.id,
              name: updatedOrg.name,
            });
          }
        } else {
          // validOrganizationIdが取得できなかった場合でも、foundOrgを設定
          const updatedOrg: OrgNodeData = {
            ...foundOrg,
            id: validOrganizationId || foundOrg.id, // 可能な限り正しいIDを設定
          };
          setOrganization(updatedOrg);
          devLog('⚠️ [loadOrganizationData] validOrganizationIdが取得できませんでした。foundOrgを設定:', {
            id: updatedOrg.id,
            name: updatedOrg.name,
          });
        }
      } catch (err: any) {
        console.error('組織データの取得に失敗しました:', err);
        setError(err.message || '組織データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadOrganizationData();
    
    // 組織作成イベントをリッスンして、組織データを自動更新
    const handleOrganizationCreated = async (event: Event) => {
      const customEvent = event as CustomEvent<{ organizationId: string; organizationName: string; parentId: string | null }>;
      console.log('[useOrganizationData] 組織作成イベントを受信:', customEvent.detail);
      
      // 少し待ってからデータを再取得（データベースの更新を待つ）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 組織データを再取得
      try {
        const orgTree = await getOrgTreeFromDb();
        if (orgTree && organizationId) {
          const foundOrg = findOrganizationById(orgTree, organizationId);
          if (foundOrg) {
            setOrganization(foundOrg);
            console.log('[useOrganizationData] 組織データを更新しました');
          }
        }
      } catch (error) {
        console.error('[useOrganizationData] 組織データの更新に失敗:', error);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('organizationCreated', handleOrganizationCreated);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('organizationCreated', handleOrganizationCreated);
      }
    };
  }, [organizationId]);

  // meetingNotesが変更されたときにmeetingNotesByOrgを再計算
  useEffect(() => {
    if (!organization || (meetingNotes.length === 0 && meetingNotesByOrg.size === 0)) {
      return; // 初期化前またはデータがない場合はスキップ
    }

    devLog('🔄 [useEffect] meetingNotesが変更されたため、meetingNotesByOrgを再計算します:', {
      meetingNotesCount: meetingNotes.length,
      organizationId: organization.id,
    });

    // 組織ごとにグループ化
    const meetingNotesByOrgMap = new Map<string, { orgName: string; meetingNotes: MeetingNote[] }>();
    
    // 現在の組織とその子組織のIDを収集
    const allOrgIds: string[] = [];
    const collectOrgIds = (org: OrgNodeData) => {
      if (org.id) {
        allOrgIds.push(org.id);
      }
      if (org.children) {
        for (const child of org.children) {
          collectOrgIds(child);
        }
      }
    };
    
    if (organization) {
      collectOrgIds(organization);
    }
    
    // 各組織の議事録をグループ化
    for (const orgId of allOrgIds) {
      const orgMeetingNotes = meetingNotes.filter(n => n.organizationId === orgId);
      if (orgMeetingNotes.length > 0) {
        const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
          if (org.id === targetId) {
            return org.name || org.title || targetId;
          }
          if (org.children) {
            for (const child of org.children) {
              const found = findOrgName(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        
        const orgName = organization ? findOrgName(organization, orgId) : null;
        meetingNotesByOrgMap.set(orgId, {
          orgName: orgName || orgId,
          meetingNotes: orgMeetingNotes,
        });
      }
    }
    
    setMeetingNotesByOrg(meetingNotesByOrgMap);
    
    devLog('✅ [useEffect] meetingNotesByOrgを更新しました:', {
      byOrgCount: meetingNotesByOrgMap.size,
      totalMeetingNotes: meetingNotes.length,
    });
  }, [meetingNotes, organization]);

  // startupsが変更されたときにstartupsByOrgを再計算
  useEffect(() => {
    if (!organization || (startups.length === 0 && startupsByOrg.size === 0)) {
      return; // 初期化前またはデータがない場合はスキップ
    }

    devLog('🔄 [useEffect] startupsが変更されたため、startupsByOrgを再計算します:', {
      startupsCount: startups.length,
      organizationId: organization.id,
    });

    // 組織ごとにグループ化
    const startupsByOrgMap = new Map<string, { orgName: string; startups: Startup[] }>();
    
    // 現在の組織とその子組織のIDを収集
    const allOrgIds: string[] = [];
    const collectOrgIds = (org: OrgNodeData) => {
      if (org.id) {
        allOrgIds.push(org.id);
      }
      if (org.children) {
        for (const child of org.children) {
          collectOrgIds(child);
        }
      }
    };
    
    if (organization) {
      collectOrgIds(organization);
    }
    
    // 各組織のスタートアップをグループ化
    for (const orgId of allOrgIds) {
      const orgStartups = startups.filter(s => s.organizationId === orgId);
      if (orgStartups.length > 0) {
        const findOrgName = (org: OrgNodeData, targetId: string): string | null => {
          if (org.id === targetId) {
            return org.name || org.title || targetId;
          }
          if (org.children) {
            for (const child of org.children) {
              const found = findOrgName(child, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        
        const orgName = organization ? findOrgName(organization, orgId) : null;
        startupsByOrgMap.set(orgId, {
          orgName: orgName || orgId,
          startups: orgStartups,
        });
      }
    }
    
    setStartupsByOrg(startupsByOrgMap);
    
    devLog('✅ [useEffect] startupsByOrgを更新しました:', {
      byOrgCount: startupsByOrgMap.size,
      totalStartups: startups.length,
    });
  }, [startups, organization]);

  // スタートアップのリアルタイム同期（Supabase専用）
  useRealtimeSync({
    table: 'startups',
    enabled: !!organizationId,
    onInsert: async (payload) => {
      devLog('🆕 [RealtimeSync] 新しいスタートアップが追加されました:', payload.new);
      if (organizationId && payload.new?.organizationId === organizationId) {
        // 現在の組織のスタートアップを再取得
        try {
          const updatedStartups = await getStartups(organizationId);
          setStartups(updatedStartups);
          devLog('✅ [RealtimeSync] スタートアップリストを更新しました:', updatedStartups.length);
        } catch (error) {
          devWarn('⚠️ [RealtimeSync] スタートアップの再取得に失敗:', error);
        }
      }
    },
    onUpdate: async (payload) => {
      devLog('🔄 [RealtimeSync] スタートアップが更新されました:', payload.new);
      if (organizationId && payload.new?.organizationId === organizationId) {
        // 現在の組織のスタートアップを再取得
        try {
          const updatedStartups = await getStartups(organizationId);
          setStartups(updatedStartups);
          devLog('✅ [RealtimeSync] スタートアップリストを更新しました:', updatedStartups.length);
        } catch (error) {
          devWarn('⚠️ [RealtimeSync] スタートアップの再取得に失敗:', error);
        }
      }
    },
    onDelete: async (payload) => {
      devLog('🗑️ [RealtimeSync] スタートアップが削除されました:', payload.old);
      if (organizationId && payload.old?.organizationId === organizationId) {
        // 現在の組織のスタートアップを再取得
        try {
          const updatedStartups = await getStartups(organizationId);
          setStartups(updatedStartups);
          devLog('✅ [RealtimeSync] スタートアップリストを更新しました:', updatedStartups.length);
        } catch (error) {
          devWarn('⚠️ [RealtimeSync] スタートアップの再取得に失敗:', error);
        }
      }
    },
  });

  // 注力施策のリアルタイム同期（Supabase専用）
  useRealtimeSync({
    table: 'focusInitiatives',
    enabled: !!organizationId,
    onInsert: async (payload) => {
      devLog('🆕 [RealtimeSync] 新しい注力施策が追加されました:', payload.new);
      if (organizationId && payload.new?.organizationId === organizationId) {
        // 現在の組織の注力施策を再取得
        try {
          const orgTree = await getOrgTreeFromDb();
          await reloadInitiatives(organizationId, orgTree);
          devLog('✅ [RealtimeSync] 注力施策リストを更新しました');
        } catch (error) {
          devWarn('⚠️ [RealtimeSync] 注力施策の再取得に失敗:', error);
        }
      }
    },
    onUpdate: async (payload) => {
      devLog('🔄 [RealtimeSync] 注力施策が更新されました:', payload.new);
      if (organizationId && payload.new?.organizationId === organizationId) {
        // 現在の組織の注力施策を再取得
        try {
          const orgTree = await getOrgTreeFromDb();
          await reloadInitiatives(organizationId, orgTree);
          devLog('✅ [RealtimeSync] 注力施策リストを更新しました');
        } catch (error) {
          devWarn('⚠️ [RealtimeSync] 注力施策の再取得に失敗:', error);
        }
      }
    },
    onDelete: async (payload) => {
      devLog('🗑️ [RealtimeSync] 注力施策が削除されました:', payload.old);
      if (organizationId && payload.old?.organizationId === organizationId) {
        // 現在の組織の注力施策を再取得
        try {
          const orgTree = await getOrgTreeFromDb();
          await reloadInitiatives(organizationId, orgTree);
          devLog('✅ [RealtimeSync] 注力施策リストを更新しました');
        } catch (error) {
          devWarn('⚠️ [RealtimeSync] 注力施策の再取得に失敗:', error);
        }
      }
    },
  });

  return {
    organization,
    organizationContent,
    focusInitiatives,
    initiativesByOrg,
    meetingNotes,
    setMeetingNotes,
    meetingNotesByOrg,
    regulations,
    regulations,
    setRegulations,
    regulationsByOrg,
    startups,
    setStartups,
    startupsByOrg,
    loading,
    error,
    reloadInitiatives,
  };
}

