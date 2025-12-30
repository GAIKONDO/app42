'use client';

import { useState, useEffect, useRef } from 'react';
import { getStartupById, saveStartup, getOrgTreeFromDb, getThemes, type Theme, getAllTopicsBatch, type TopicInfo, getAllMeetingNotes, getOrgMembers, getAllOrganizationsFromTree, generateUniqueId, type Startup, type OrgNodeData, getCategories, type Category, getVcs, type VC, getDepartments, type Department, getStatuses, type Status, getEngagementLevels, type EngagementLevel, getBizDevPhases, type BizDevPhase } from '@/lib/orgApi';
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

interface UseStartupDataReturn {
  // データ
  startup: Startup | null;
  orgData: OrgNodeData | null;
  themes: Theme[];
  categories: Category[];
  vcs: VC[];
  departments: Department[];
  statuses: Status[];
  engagementLevels: EngagementLevel[];
  bizDevPhases: BizDevPhase[];
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
    evaluation: string;
    evaluationChart: any;
    evaluationChartSnapshots: any[];
    considerationStartPeriod: string;
    considerationEndPeriod: string;
    executionStartPeriod: string;
    executionEndPeriod: string;
    monetizationStartPeriod: string;
    monetizationEndPeriod: string;
    monetizationRenewalNotRequired: boolean;
    relatedOrganizations: string[];
    relatedGroupCompanies: string[];
    monetizationDiagram: string;
    relationDiagram: string;
    causeEffectCode: string;
    themeIds: string[];
    topicIds: string[];
    categoryIds: string[];
    relatedVCS: string[];
    responsibleDepartments: string[];
    status: string;
    agencyContractMonth: string;
    engagementLevel: string;
    bizDevPhase: string;
    hpUrl: string;
    asanaUrl: string;
    boxUrl: string;
    content: string;
  };
  
  // セッター
  setStartup: (startup: Startup | null) => void;
  setOrgData: (orgData: OrgNodeData | null) => void;
  setThemes: (themes: Theme[]) => void;
  setCategories: (categories: Category[]) => void;
  setVcs: (vcs: VC[]) => void;
  setDepartments: (departments: Department[]) => void;
  setStatuses: (statuses: Status[]) => void;
  setEngagementLevels: (engagementLevels: EngagementLevel[]) => void;
  setBizDevPhases: (bizDevPhases: BizDevPhase[]) => void;
  setTopics: (topics: TopicInfo[]) => void;
  setOrgMembers: (members: Array<{ id: string; name: string; position?: string }>) => void;
  setAllOrgMembers: (members: Array<{ id: string; name: string; position?: string; organizationId?: string }>) => void;
  setAllOrganizations: (orgs: Array<{ id: string; name: string; title?: string }>) => void;
  setAllMeetingNotes: (notes: MeetingNote[]) => void;
  setOrgTreeForModal: (tree: OrgNodeData | null) => void;
  setError: (error: string | null) => void;
}

export function useStartupData(
  organizationId: string | null,
  startupId: string | null
): UseStartupDataReturn {
  const [startup, setStartup] = useState<Startup | null>(null);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vcs, setVcs] = useState<VC[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [engagementLevels, setEngagementLevels] = useState<EngagementLevel[]>([]);
  const [bizDevPhases, setBizDevPhases] = useState<BizDevPhase[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; name: string; position?: string }>>([]);
  const [allOrgMembers, setAllOrgMembers] = useState<Array<{ id: string; name: string; position?: string; organizationId?: string }>>([]);
  const [allOrganizations, setAllOrganizations] = useState<Array<{ id: string; name: string; title?: string }>>([]);
  const [allMeetingNotes, setAllMeetingNotes] = useState<MeetingNote[]>([]);
  const [orgTreeForModal, setOrgTreeForModal] = useState<OrgNodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLocalState, setInitialLocalState] = useState<UseStartupDataReturn['initialLocalState']>({
    assignee: [],
    description: '',
    method: [],
    methodOther: '',
    means: [],
    meansOther: '',
    objective: '',
    evaluation: '',
    evaluationChart: null,
    evaluationChartSnapshots: [],
    considerationStartPeriod: '',
    considerationEndPeriod: '',
    executionStartPeriod: '',
    executionEndPeriod: '',
    monetizationStartPeriod: '',
    monetizationEndPeriod: '',
    monetizationRenewalNotRequired: false,
    relatedOrganizations: [],
    relatedGroupCompanies: [],
    monetizationDiagram: '',
    relationDiagram: '',
    causeEffectCode: '',
    themeIds: [],
    topicIds: [],
    categoryIds: [],
    relatedVCS: [],
    responsibleDepartments: [],
    status: '',
    agencyContractMonth: '',
    engagementLevel: '',
    bizDevPhase: '',
    hpUrl: '',
    asanaUrl: '',
    boxUrl: '',
    content: '',
  });
  
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId || !startupId) {
        setError('組織IDまたはスタートアップIDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 組織データを取得
        let orgTree: OrgNodeData | null = null;
        if (organizationId) {
          orgTree = await getOrgTreeFromDb();
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
          const foundOrg = orgTree ? findOrganization(orgTree) : null;
          setOrgData(foundOrg);
        } else {
          setOrgData(null);
        }
        
        // テーマを取得
        const themesData = await getThemes();
        setThemes(themesData);
        
        // カテゴリーを取得
        try {
          const categoriesData = await getCategories();
          setCategories(categoriesData);
          devLog('✅ [ページ] カテゴリー取得完了:', { count: categoriesData.length });
        } catch (categoryError: any) {
          console.warn('⚠️ [ページ] カテゴリー取得に失敗:', categoryError);
          setCategories([]);
        }

        let vcsData: VC[] = [];
        try {
          vcsData = await getVcs();
          setVcs(vcsData);
          devLog('✅ [ページ] VC取得完了:', { count: vcsData.length });
        } catch (vcError: any) {
          console.warn('⚠️ [ページ] VC取得に失敗:', vcError);
          setVcs([]);
        }

        let departmentsData: Department[] = [];
        try {
          departmentsData = await getDepartments();
          setDepartments(departmentsData);
          devLog('✅ [ページ] 部署取得完了:', { count: departmentsData.length });
        } catch (deptError: any) {
          console.warn('⚠️ [ページ] 部署取得に失敗:', deptError);
          setDepartments([]);
        }

        let statusesData: Status[] = [];
        try {
          statusesData = await getStatuses();
          setStatuses(statusesData);
          devLog('✅ [ページ] ステータス取得完了:', { count: statusesData.length });
        } catch (statusError: any) {
          console.warn('⚠️ [ページ] ステータス取得に失敗:', statusError);
          setStatuses([]);
        }

        let engagementLevelsData: EngagementLevel[] = [];
        try {
          engagementLevelsData = await getEngagementLevels();
          setEngagementLevels(engagementLevelsData);
          devLog('✅ [ページ] ねじ込み注力度取得完了:', { count: engagementLevelsData.length });
        } catch (engagementError: any) {
          console.warn('⚠️ [ページ] ねじ込み注力度取得に失敗:', engagementError);
          setEngagementLevels([]);
        }

        let bizDevPhasesData: BizDevPhase[] = [];
        try {
          bizDevPhasesData = await getBizDevPhases();
          setBizDevPhases(bizDevPhasesData);
          devLog('✅ [ページ] Biz-Devフェーズ取得完了:', { count: bizDevPhasesData.length });
        } catch (bizDevError: any) {
          console.warn('⚠️ [ページ] Biz-Devフェーズ取得に失敗:', bizDevError);
          setBizDevPhases([]);
        }
        
        // すべての組織を取得（モーダル用）
        let modalOrgTree: OrgNodeData | null = null;
        if (orgTree) {
          modalOrgTree = orgTree;
        } else {
          try {
            modalOrgTree = await getOrgTreeFromDb();
          } catch (treeError: any) {
            devWarn('⚠️ [ページ] モーダル用組織ツリー取得に失敗:', treeError);
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
        
        // 組織のメンバーを取得
        if (organizationId) {
          try {
            const membersData = await getOrgMembers(organizationId);
            const membersList = membersData.map((member: any) => ({
              id: member.id,
              name: member.name,
              position: member.position || undefined,
            }));
            setOrgMembers(membersList);
            devLog('✅ [ページ] メンバー取得完了:', { count: membersList.length });
          } catch (memberError: any) {
            console.warn('⚠️ [ページ] メンバー取得に失敗:', memberError);
            setOrgMembers([]);
          }
          
          // 全組織のメンバーを取得
          if (modalOrgTree) {
            try {
              const allOrgsForMembers = getAllOrganizationsFromTree(modalOrgTree);
              const allMembersList: Array<{ id: string; name: string; position?: string; organizationId?: string }> = [];
              
              for (const org of allOrgsForMembers) {
                try {
                  const orgMembersData = await getOrgMembers(org.id);
                  const orgMembersList = orgMembersData.map((member: any) => ({
                    id: member.id,
                    name: member.name,
                    position: member.position || undefined,
                    organizationId: org.id,
                  }));
                  allMembersList.push(...orgMembersList);
                } catch (err) {
                  devWarn(`⚠️ [ページ] 組織 ${org.id} のメンバー取得に失敗:`, err);
                }
              }
              
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
          }
        } else {
          setOrgMembers([]);
          setAllOrgMembers([]);
        }
        
        // すべての議事録を取得
        const allNotes = await getAllMeetingNotes();
        setAllMeetingNotes(allNotes);
        
        // スタートアップを取得
        const startupData = await getStartupById(startupId);
        if (!startupData) {
          setError('スタートアップが見つかりませんでした');
          setLoading(false);
          return;
        }
        
        // organizationIdが指定されている場合、取得したデータのorganizationIdと一致するか確認
        if (organizationId) {
          devLog('🔍 [ページ] organizationId検証:', {
            urlOrganizationId: organizationId,
            dataOrganizationId: startupData.organizationId,
            hasOrganizationId: !!startupData.organizationId,
            match: startupData.organizationId === organizationId,
          });
          if (!startupData.organizationId || startupData.organizationId !== organizationId) {
            setError('スタートアップが見つかりませんでした（組織IDが一致しません）');
            setLoading(false);
            return;
          }
        }
        
        devLog('📖 [ページ] データ読み込み:', {
          id: startupData.id,
          title: startupData.title,
          contentLength: startupData.content?.length || 0,
        });
        
        // monetizationDiagramIdが存在しない場合は生成
        if (!startupData.monetizationDiagramId && startupData.monetizationDiagram) {
          startupData.monetizationDiagramId = `md_${generateUniqueId()}`;
          try {
            await saveStartup({
              ...startupData,
              monetizationDiagramId: startupData.monetizationDiagramId,
            });
          } catch (saveError: any) {
            devWarn('⚠️ [ページ] monetizationDiagramId保存エラー（続行します）:', saveError);
          }
        }
        
        // relationDiagramIdが存在しない場合は生成
        if (!startupData.relationDiagramId && startupData.relationDiagram) {
          startupData.relationDiagramId = `rd_${generateUniqueId()}`;
          try {
            await saveStartup({
              ...startupData,
              relationDiagramId: startupData.relationDiagramId,
            });
          } catch (saveError: any) {
            devWarn('⚠️ [ページ] relationDiagramId保存エラー（続行します）:', saveError);
          }
        }
        
        devLog('✅ [ページ] setStartup呼び出し前:', {
          startupId: startupData.id,
          title: startupData.title,
        });
        setStartup(startupData);
        console.log('✅ [ページ] setStartup呼び出し後:', {
          startupId: startupData.id,
          hasCompetitorComparison: !!startupData.competitorComparison,
          competitorComparisonId: startupData.competitorComparison?.id,
          competitorComparisonAxesCount: startupData.competitorComparison?.axes?.length || 0,
        });
        
        // ローカル状態を初期化
        const assigneeValue = startupData.assignee
          ? (Array.isArray(startupData.assignee) 
              ? startupData.assignee 
              : startupData.assignee.split(',').map(s => s.trim()).filter(s => s.length > 0))
          : [];
        const descriptionValue = startupData.description || '';
        const methodValue = Array.isArray(startupData.method) ? startupData.method : (startupData.method ? [startupData.method] : []);
        const meansValue = Array.isArray(startupData.means) ? startupData.means : (startupData.means ? [startupData.means] : []);
        const objectiveValue = startupData.objective || '';
        const evaluationValue = startupData.evaluation || '';
        const evaluationChartValue = startupData.evaluationChart || null;
        const evaluationChartSnapshotsValue = Array.isArray(startupData.evaluationChartSnapshots) ? startupData.evaluationChartSnapshots : [];
        // 期間データを開始期間と終了期間に分割
        // 既存データが「2024-01/2024-12」または「2024-01-01/2024-12-31」形式の場合、スラッシュで分割
        // 「YYYY-MM」形式の場合は「YYYY-MM-01」に変換（既存データとの互換性のため）
        const parsePeriod = (period: string): { start: string; end: string } => {
          if (!period) return { start: '', end: '' };
          const parts = period.split('/');
          if (parts.length === 2) {
            let start = parts[0].trim();
            let end = parts[1].trim();
            
            // 「YYYY-MM」形式を「YYYY-MM-01」に変換
            if (start.match(/^\d{4}-\d{2}$/)) {
              start = `${start}-01`;
            }
            if (end.match(/^\d{4}-\d{2}$/)) {
              end = `${end}-01`;
            }
            
            return { start, end };
          }
          // 単一の値の場合
          let single = period.trim();
          if (single.match(/^\d{4}-\d{2}$/)) {
            single = `${single}-01`;
          }
          return { start: single, end: '' };
        };
        
        const considerationPeriod = parsePeriod(startupData.considerationPeriod || '');
        const executionPeriod = parsePeriod(startupData.executionPeriod || '');
        const monetizationPeriod = parsePeriod(startupData.monetizationPeriod || '');
        
        const considerationStartPeriodValue = considerationPeriod.start;
        const considerationEndPeriodValue = considerationPeriod.end;
        const executionStartPeriodValue = executionPeriod.start;
        const executionEndPeriodValue = executionPeriod.end;
        const monetizationStartPeriodValue = monetizationPeriod.start;
        const monetizationEndPeriodValue = monetizationPeriod.end;
        const monetizationRenewalNotRequiredValue = startupData.monetizationRenewalNotRequired !== undefined ? startupData.monetizationRenewalNotRequired : false;
        const monetizationDiagramValue = startupData.monetizationDiagram || '';
        const relationDiagramValue = startupData.relationDiagram || '';
        
        // 特性要因図のコードを生成
        const generateCauseEffectCode = (startup: Startup): string => {
          try {
            return JSON.stringify({
              spine: {
                id: 'spine',
                label: startup.title || '特性要因図',
                type: 'spine',
              },
              method: startup.method || [],
              means: startup.means || [],
              objective: startup.objective || '',
              title: startup.title || '',
              description: startup.description || '',
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
        const causeEffectCodeValue = generateCauseEffectCode(startupData);
        
        // themeIdsを優先し、なければthemeIdから変換
        const themeIdsValue = Array.isArray(startupData.themeIds) && startupData.themeIds.length > 0
          ? startupData.themeIds
          : (startupData.themeId ? [startupData.themeId] : []);
        
        // categoryIdsを取得
        const categoryIdsValue = Array.isArray(startupData.categoryIds) && startupData.categoryIds.length > 0
          ? startupData.categoryIds
          : [];
        
        devLog('📖 [ページ] categoryIds取得:', {
          categoryIdsFromStartup: startupData.categoryIds,
          categoryIdsValue,
          categoryIdsValueLength: categoryIdsValue.length,
          isArray: Array.isArray(startupData.categoryIds),
        });

        // relatedVCSとresponsibleDepartmentsを取得
        // 既存データが名前で保存されている可能性があるため、名前→IDの変換を試みる
        // vcsDataとdepartmentsDataは既に取得済み
        let relatedVCSValue: string[] = [];
        if (Array.isArray(startupData.relatedVCS) && startupData.relatedVCS.length > 0) {
          // データベースから取得したvcsDataを使用して名前→ID変換
          relatedVCSValue = startupData.relatedVCS.map((vcValue: string) => {
            // 既にIDの形式（vc_で始まる）の場合はそのまま使用
            if (vcValue.startsWith('vc_')) {
              return vcValue;
            }
            // 名前の場合は、vcsDataからIDを検索
            const foundVc = vcsData.find(vc => vc.title === vcValue);
            return foundVc ? foundVc.id : vcValue; // 見つからない場合は元の値を保持
          });
        }
        
        let responsibleDepartmentsValue: string[] = [];
        if (Array.isArray(startupData.responsibleDepartments) && startupData.responsibleDepartments.length > 0) {
          responsibleDepartmentsValue = startupData.responsibleDepartments.map((deptValue: string) => {
            // 既にIDの形式（dept_で始まる）の場合はそのまま使用
            if (deptValue.startsWith('dept_')) {
              return deptValue;
            }
            // 名前の場合は、departmentsDataからIDを検索
            const foundDept = departmentsData.find(dept => dept.title === deptValue);
            return foundDept ? foundDept.id : deptValue; // 見つからない場合は元の値を保持
          });
        }
        
        // 個別トピックを取得
        const topicsData = await getAllTopicsBatch();
        setTopics(topicsData);
        
        devLog('📖 [ページ] 取得したトピック:', {
          count: topicsData.length,
          topicIdsFromStartupCount: Array.isArray(startupData.topicIds) ? startupData.topicIds.length : 0,
        });
        
        const topicIdsValue = Array.isArray(startupData.topicIds) ? startupData.topicIds : [];
        
        // 初期ローカル状態を設定
        setInitialLocalState({
          assignee: assigneeValue,
          description: descriptionValue,
          method: methodValue,
          methodOther: startupData.methodOther || '',
          means: meansValue,
          meansOther: startupData.meansOther || '',
          objective: objectiveValue,
          evaluation: evaluationValue,
          evaluationChart: evaluationChartValue,
          evaluationChartSnapshots: evaluationChartSnapshotsValue,
          considerationStartPeriod: considerationStartPeriodValue,
          considerationEndPeriod: considerationEndPeriodValue,
          executionStartPeriod: executionStartPeriodValue,
          executionEndPeriod: executionEndPeriodValue,
          monetizationStartPeriod: monetizationStartPeriodValue,
          monetizationEndPeriod: monetizationEndPeriodValue,
          monetizationRenewalNotRequired: monetizationRenewalNotRequiredValue,
          relatedOrganizations: Array.isArray(startupData.relatedOrganizations) ? startupData.relatedOrganizations : [],
          relatedGroupCompanies: Array.isArray(startupData.relatedGroupCompanies) ? startupData.relatedGroupCompanies : [],
          monetizationDiagram: monetizationDiagramValue,
          relationDiagram: relationDiagramValue,
          causeEffectCode: causeEffectCodeValue,
          themeIds: themeIdsValue,
          topicIds: topicIdsValue,
          categoryIds: categoryIdsValue,
          relatedVCS: relatedVCSValue,
          responsibleDepartments: responsibleDepartmentsValue,
          status: startupData.status || '',
          agencyContractMonth: startupData.agencyContractMonth || '',
          engagementLevel: startupData.engagementLevel || '',
          bizDevPhase: startupData.bizDevPhase || '',
          hpUrl: startupData.hpUrl || '',
          asanaUrl: startupData.asanaUrl || '',
          boxUrl: startupData.boxUrl || '',
          content: startupData.content || '',
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
  }, [organizationId, startupId]);

  return {
    startup,
    orgData,
    themes,
    categories,
    vcs,
    departments,
    statuses,
    engagementLevels,
    bizDevPhases,
    topics,
    orgMembers,
    allOrgMembers,
    allOrganizations,
    allMeetingNotes,
    orgTreeForModal,
    loading,
    error,
    initialLocalState,
    setStartup,
    setOrgData,
    setThemes,
    setCategories,
    setVcs,
    setDepartments,
    setStatuses,
    setEngagementLevels,
    setBizDevPhases,
    setTopics,
    setOrgMembers,
    setAllOrgMembers,
    setAllOrganizations,
    setAllMeetingNotes,
    setOrgTreeForModal,
    setError,
  };
}

