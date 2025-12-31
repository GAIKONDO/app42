'use client';

import { useState, useEffect, useRef } from 'react';
import { getFocusInitiativeById, saveFocusInitiative, getOrgTreeFromDb, getThemes, type Theme, getAllTopicsBatch, type TopicInfo, getAllMeetingNotes, getOrgMembers, getAllOrganizationsFromTree, generateUniqueId, type FocusInitiative, type OrgNodeData } from '@/lib/orgApi';
import type { MeetingNote } from '@/lib/orgApi';

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

interface UseInitiativeDataReturn {
  // データ
  initiative: FocusInitiative | null;
  orgData: OrgNodeData | null;
  themes: Theme[];
  topics: TopicInfo[];
  orgMembers: Array<{ id: string; name: string; position?: string }>;
  allOrgMembers: Array<{ id: string; name: string; position?: string; organizationId?: string }>;
  allOrganizations: Array<{ id: string; name: string; title?: string }>;
  allMeetingNotes: MeetingNote[];
  orgTreeForModal: OrgNodeData | null;
  
  // 状態
  loading: boolean;
  error: string | null;
  
  // ローカル状態の初期値
  initialLocalState: {
    assignee: string[];
    description: string;
    method: string[];
    methodOther: string;
    means: string[];
    meansOther: string;
    objective: string;
    considerationPeriod: string;
    executionPeriod: string;
    monetizationPeriod: string;
    relatedOrganizations: string[];
    relatedGroupCompanies: string[];
    monetizationDiagram: string;
    relationDiagram: string;
    causeEffectCode: string;
    themeIds: string[];
    topicIds: string[];
    content: string;
  };
  
  // セッター
  setInitiative: (initiative: FocusInitiative | null) => void;
  setOrgData: (orgData: OrgNodeData | null) => void;
  setThemes: (themes: Theme[]) => void;
  setTopics: (topics: TopicInfo[]) => void;
  setOrgMembers: (members: Array<{ id: string; name: string; position?: string }>) => void;
  setAllOrgMembers: (members: Array<{ id: string; name: string; position?: string; organizationId?: string }>) => void;
  setAllOrganizations: (orgs: Array<{ id: string; name: string; title?: string }>) => void;
  setAllMeetingNotes: (notes: MeetingNote[]) => void;
  setOrgTreeForModal: (tree: OrgNodeData | null) => void;
  setError: (error: string | null) => void;
}

export function useInitiativeData(
  organizationId: string | null,
  initiativeId: string | null
): UseInitiativeDataReturn {
  const [initiative, setInitiative] = useState<FocusInitiative | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; name: string; position?: string }>>([]);
  const [allOrgMembers, setAllOrgMembers] = useState<Array<{ id: string; name: string; position?: string; organizationId?: string }>>([]);
  const [allOrganizations, setAllOrganizations] = useState<Array<{ id: string; name: string; title?: string }>>([]);
  const [allMeetingNotes, setAllMeetingNotes] = useState<MeetingNote[]>([]);
  const [orgTreeForModal, setOrgTreeForModal] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLocalState, setInitialLocalState] = useState<UseInitiativeDataReturn['initialLocalState']>({
    assignee: [],
    description: '',
    method: [],
    methodOther: '',
    means: [],
    meansOther: '',
    objective: '',
    considerationPeriod: '',
    executionPeriod: '',
    monetizationPeriod: '',
    relatedOrganizations: [],
    relatedGroupCompanies: [],
    monetizationDiagram: '',
    relationDiagram: '',
    causeEffectCode: '',
    themeIds: [],
    topicIds: [],
    content: '',
  });
  
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId || !initiativeId) {
        setError('組織IDまたは事業会社ID、または施策IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // パフォーマンス最適化: 注力施策を最初に取得（最重要データ）
        const initiativePromise = getFocusInitiativeById(initiativeId);
        
        // パフォーマンス最適化: 並列でデータを取得
        const [initiativeData, orgTree, themesData, allNotes] = await Promise.all([
          initiativePromise,
          organizationId ? getOrgTreeFromDb() : Promise.resolve(null),
          getThemes(),
          getAllMeetingNotes(),
        ]);
        
        // 注力施策の検証
        if (!initiativeData) {
          setError('注力施策が見つかりませんでした');
          setLoading(false);
          return;
        }
        
        // organizationIdが指定されている場合、取得したデータのorganizationIdと一致するか確認
        if (organizationId) {
          devLog('🔍 [ページ] organizationId検証:', {
            urlOrganizationId: organizationId,
            dataOrganizationId: initiativeData.organizationId,
            hasOrganizationId: !!initiativeData.organizationId,
            match: initiativeData.organizationId === organizationId,
          });
          if (!initiativeData.organizationId || initiativeData.organizationId !== organizationId) {
            setError('注力施策が見つかりませんでした（組織IDが一致しません）');
            setLoading(false);
            return;
          }
        }
        
        // 組織データの処理
        let modalOrgTree: OrgNodeData | null = null;
        if (organizationId && orgTree) {
          const findOrganization = (node: OrgNodeData): OrgNodeData | null => {
            if (node.id === organizationId) {
              return node;
            }
            if (node.children) {
              for (const child of node.children) {
                const found = findOrganization(child);
                if (found) return found;
              }
            }
            return null;
          };
          const foundOrg = findOrganization(orgTree);
          setOrgData(foundOrg);
          modalOrgTree = orgTree;
        } else {
          setOrgData(null);
          if (!orgTree && organizationId) {
            try {
              modalOrgTree = await getOrgTreeFromDb();
            } catch (treeError: any) {
              devWarn('⚠️ [ページ] モーダル用組織ツリー取得に失敗:', treeError);
            }
          } else {
            modalOrgTree = orgTree;
          }
        }
        
        if (modalOrgTree) {
          const allOrgs = getAllOrganizationsFromTree(modalOrgTree);
          setAllOrganizations(allOrgs);
          setOrgTreeForModal(modalOrgTree);
        } else {
          setAllOrganizations([]);
          setOrgTreeForModal(null);
        }
        
        setThemes(themesData);
        setAllMeetingNotes(allNotes);
        
        // 組織のメンバーを取得（並列化）
        if (organizationId) {
          const memberPromises: Promise<void>[] = [];
          
          // 現在の組織のメンバーを取得
          memberPromises.push(
            getOrgMembers(organizationId)
              .then(membersData => {
                const membersList = membersData.map((member: any) => ({
                  id: member.id,
                  name: member.name,
                  position: member.position || undefined,
                }));
                setOrgMembers(membersList);
                devLog('✅ [ページ] メンバー取得完了:', { count: membersList.length });
              })
              .catch(memberError => {
                console.warn('⚠️ [ページ] メンバー取得に失敗:', memberError);
                setOrgMembers([]);
              })
          );
          
          // 全組織のメンバーを取得（並列化でN+1問題を解決）
          if (modalOrgTree) {
            memberPromises.push(
              (async () => {
                try {
                  const allOrgsForMembers = getAllOrganizationsFromTree(modalOrgTree!);
                  const orgIds = allOrgsForMembers.map(org => org.id);
                  
                  // パフォーマンス最適化: すべての組織のメンバーを並列で取得
                  const allMemberPromises = orgIds.map(orgId =>
                    getOrgMembers(orgId)
                      .then(membersData => membersData.map((member: any) => ({
                        id: member.id,
                        name: member.name,
                        position: member.position || undefined,
                        organizationId: orgId,
                      })))
                      .catch(err => {
                        devWarn(`⚠️ [ページ] 組織 ${orgId} のメンバー取得に失敗:`, err);
                        return [];
                      })
                  );
                  
                  const allMembersArrays = await Promise.all(allMemberPromises);
                  const allMembersList = allMembersArrays.flat();
                  
                  const uniqueMembers = new Map<string, { id: string; name: string; position?: string; organizationId?: string }>();
                  allMembersList.forEach(member => {
                    if (!uniqueMembers.has(member.name) || !uniqueMembers.get(member.name)?.position) {
                      uniqueMembers.set(member.name, member);
                    }
                  });
                  
                  setAllOrgMembers(Array.from(uniqueMembers.values()));
                  devLog('✅ [ページ] 全組織メンバー取得完了:', { count: Array.from(uniqueMembers.values()).length });
                } catch (allMemberError: any) {
                  devWarn('⚠️ [ページ] 全組織メンバー取得に失敗:', allMemberError);
                  setAllOrgMembers([]);
                }
              })()
            );
          }
          
          // メンバー取得は非同期で続行（ブロックしない）
          Promise.all(memberPromises).catch(err => {
            devWarn('⚠️ [ページ] メンバー取得でエラー:', err);
          });
        } else {
          setOrgMembers([]);
          setAllOrgMembers([]);
        }
        if (!initiativeData) {
          setError('注力施策が見つかりませんでした');
          setLoading(false);
          return;
        }
        
        // organizationIdが指定されている場合、取得したデータのorganizationIdと一致するか確認
        if (organizationId) {
          devLog('🔍 [ページ] organizationId検証:', {
            urlOrganizationId: organizationId,
            dataOrganizationId: initiativeData.organizationId,
            hasOrganizationId: !!initiativeData.organizationId,
            match: initiativeData.organizationId === organizationId,
          });
          if (!initiativeData.organizationId || initiativeData.organizationId !== organizationId) {
            setError('注力施策が見つかりませんでした（組織IDが一致しません）');
            setLoading(false);
            return;
          }
        }
        
        devLog('📖 [ページ] データ読み込み:', {
          id: initiativeData.id,
          title: initiativeData.title,
          contentLength: initiativeData.content?.length || 0,
        });
        
        // monetizationDiagramIdが存在しない場合は生成
        if (!initiativeData.monetizationDiagramId && initiativeData.monetizationDiagram) {
          initiativeData.monetizationDiagramId = `md_${generateUniqueId()}`;
          try {
            await saveFocusInitiative({
              ...initiativeData,
              monetizationDiagramId: initiativeData.monetizationDiagramId,
            });
          } catch (saveError: any) {
            devWarn('⚠️ [ページ] monetizationDiagramId保存エラー（続行します）:', saveError);
          }
        }
        
        // relationDiagramIdが存在しない場合は生成
        if (!initiativeData.relationDiagramId && initiativeData.relationDiagram) {
          initiativeData.relationDiagramId = `rd_${generateUniqueId()}`;
          try {
            await saveFocusInitiative({
              ...initiativeData,
              relationDiagramId: initiativeData.relationDiagramId,
            });
          } catch (saveError: any) {
            devWarn('⚠️ [ページ] relationDiagramId保存エラー（続行します）:', saveError);
          }
        }
        
        devLog('✅ [ページ] setInitiative呼び出し前:', {
          initiativeId: initiativeData.id,
          title: initiativeData.title,
        });
        setInitiative(initiativeData);
        console.log('✅ [ページ] setInitiative呼び出し後');
        
        // ローカル状態を初期化
        const assigneeValue = initiativeData.assignee
          ? (Array.isArray(initiativeData.assignee) 
              ? initiativeData.assignee 
              : initiativeData.assignee.split(',').map(s => s.trim()).filter(s => s.length > 0))
          : [];
        const descriptionValue = initiativeData.description || '';
        const methodValue = Array.isArray(initiativeData.method) ? initiativeData.method : (initiativeData.method ? [initiativeData.method] : []);
        const meansValue = Array.isArray(initiativeData.means) ? initiativeData.means : (initiativeData.means ? [initiativeData.means] : []);
        const objectiveValue = initiativeData.objective || '';
        const considerationPeriodValue = initiativeData.considerationPeriod || '';
        const executionPeriodValue = initiativeData.executionPeriod || '';
        const monetizationPeriodValue = initiativeData.monetizationPeriod || '';
        const monetizationDiagramValue = initiativeData.monetizationDiagram || '';
        const relationDiagramValue = initiativeData.relationDiagram || '';
        
        // 特性要因図のコードを生成
        const generateCauseEffectCode = (init: FocusInitiative): string => {
          try {
            return JSON.stringify({
              spine: {
                id: 'spine',
                label: init.title || '特性要因図',
                type: 'spine',
              },
              method: init.method || [],
              means: init.means || [],
              objective: init.objective || '',
              title: init.title || '',
              description: init.description || '',
            }, null, 2);
          } catch (error) {
            return JSON.stringify({
              spine: { id: 'spine', label: '特性要因図', type: 'spine' },
              method: [],
              means: [],
              objective: '',
              title: '',
              description: '',
            }, null, 2);
          }
        };
        const causeEffectCodeValue = generateCauseEffectCode(initiativeData);
        
        // themeIdsを優先し、なければthemeIdから変換
        const themeIdsValue = Array.isArray(initiativeData.themeIds) && initiativeData.themeIds.length > 0
          ? initiativeData.themeIds
          : (initiativeData.themeId ? [initiativeData.themeId] : []);
        
        // 個別トピックを取得
        const topicsData = await getAllTopicsBatch();
        setTopics(topicsData);
        
        devLog('📖 [ページ] 取得したトピック:', {
          count: topicsData.length,
          topicIdsFromInitiativeCount: Array.isArray(initiativeData.topicIds) ? initiativeData.topicIds.length : 0,
        });
        
        const topicIdsValue = Array.isArray(initiativeData.topicIds) ? initiativeData.topicIds : [];
        
        // 初期ローカル状態を設定
        setInitialLocalState({
          assignee: assigneeValue,
          description: descriptionValue,
          method: methodValue,
          methodOther: initiativeData.methodOther || '',
          means: meansValue,
          meansOther: initiativeData.meansOther || '',
          objective: objectiveValue,
          considerationPeriod: considerationPeriodValue,
          executionPeriod: executionPeriodValue,
          monetizationPeriod: monetizationPeriodValue,
          relatedOrganizations: Array.isArray(initiativeData.relatedOrganizations) ? initiativeData.relatedOrganizations : [],
          relatedGroupCompanies: Array.isArray(initiativeData.relatedGroupCompanies) ? initiativeData.relatedGroupCompanies : [],
          monetizationDiagram: monetizationDiagramValue,
          relationDiagram: relationDiagramValue,
          causeEffectCode: causeEffectCodeValue,
          themeIds: themeIdsValue,
          topicIds: topicIdsValue,
          content: initiativeData.content || '',
        });
        
        devLog('📖 [ページ] ローカル状態設定完了');
        
        setError(null);
        isInitialLoadRef.current = false;
      } catch (err: any) {
        console.error('データの読み込みエラー:', err);
        setError(err.message || 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, initiativeId]);

  return {
    initiative,
    orgData,
    themes,
    topics,
    orgMembers,
    allOrgMembers,
    allOrganizations,
    allMeetingNotes,
    orgTreeForModal,
    loading,
    error,
    initialLocalState,
    setInitiative,
    setOrgData,
    setThemes,
    setTopics,
    setOrgMembers,
    setAllOrgMembers,
    setAllOrganizations,
    setAllMeetingNotes,
    setOrgTreeForModal,
    setError,
  };
}

