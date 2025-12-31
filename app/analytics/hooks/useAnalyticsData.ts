import { useState, useEffect, useCallback } from 'react';
import { getThemes, getFocusInitiatives, deleteTheme, getAllTopics, getCategories, getAllStartups, getVcs, getDepartments, getStatuses, getEngagementLevels, getBizDevPhases, type Theme, type FocusInitiative, type TopicInfo, type Category, type Startup, type VC, type Department, type Status, type EngagementLevel, type BizDevPhase } from '@/lib/orgApi';
import { getOrgTreeFromDb, type OrgNodeData } from '@/lib/orgApi';
import { devLog, devWarn } from '../utils/devLog';

export function useAnalyticsData() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vcs, setVcs] = useState<VC[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [engagementLevels, setEngagementLevels] = useState<EngagementLevel[]>([]);
  const [bizDevPhases, setBizDevPhases] = useState<BizDevPhase[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [orgData, setOrgData] = useState<OrgNodeData | null>(null);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshThemes = useCallback(async () => {
    try {
      const refreshedThemes = await getThemes();
      setThemes(refreshedThemes);
    } catch (error: any) {
      console.error('テーマリストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const refreshedCategories = await getCategories();
      setCategories(refreshedCategories);
    } catch (error: any) {
      console.error('カテゴリーリストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshVcs = useCallback(async () => {
    try {
      const refreshedVcs = await getVcs();
      setVcs(refreshedVcs);
    } catch (error: any) {
      console.error('VCリストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshDepartments = useCallback(async () => {
    try {
      const refreshedDepartments = await getDepartments();
      setDepartments(refreshedDepartments);
    } catch (error: any) {
      console.error('部署リストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshStatuses = useCallback(async () => {
    try {
      const refreshedStatuses = await getStatuses();
      setStatuses(refreshedStatuses);
    } catch (error: any) {
      console.error('ステータスリストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshEngagementLevels = useCallback(async () => {
    try {
      const refreshedEngagementLevels = await getEngagementLevels();
      setEngagementLevels(refreshedEngagementLevels);
    } catch (error: any) {
      console.error('ねじ込み注力度リストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshBizDevPhases = useCallback(async () => {
    try {
      const refreshedBizDevPhases = await getBizDevPhases();
      setBizDevPhases(refreshedBizDevPhases);
    } catch (error: any) {
      console.error('Biz-Devフェーズリストの再読み込みに失敗しました:', error);
    }
  }, []);

  const refreshTopics = useCallback(async () => {
    if (!orgData) {
      devWarn('組織データがありません。トピックリストを再取得できません。');
      return;
    }
    
    try {
      const allTopics: TopicInfo[] = [];
      const collectTopics = async (org: OrgNodeData) => {
        if (org.id) {
          const orgTopics = await getAllTopics(org.id);
          allTopics.push(...orgTopics);
        }
        
        if (org.children) {
          for (const child of org.children) {
            await collectTopics(child);
          }
        }
      };
      
      await collectTopics(orgData);
      setTopics(allTopics);
      devLog('✅ トピックリストを再取得しました:', allTopics.length, '件');
    } catch (error: any) {
      console.error('トピックリストの再取得に失敗しました:', error);
    }
  }, [orgData]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        devLog('📖 データの並列読み込みを開始...');
        
        // テーマを先に取得（重複チェックのため）
        let themesData = await getThemes();
        devLog('📖 読み込んだテーマ数:', themesData.length);
        
        const titleMap = new Map<string, Theme[]>();
        themesData.forEach(theme => {
          if (!titleMap.has(theme.title)) {
            titleMap.set(theme.title, []);
          }
          titleMap.get(theme.title)!.push(theme);
        });
        
        const duplicatesToDelete: string[] = [];
        titleMap.forEach((themes, title) => {
          if (themes.length > 1) {
            devWarn(`⚠️ 重複テーマを検出: 「${title}」 (${themes.length}件)`);
            for (let i = 1; i < themes.length; i++) {
              duplicatesToDelete.push(themes[i].id);
            }
          }
        });
        
        if (duplicatesToDelete.length > 0) {
          devLog(`🗑️ ${duplicatesToDelete.length}件の重複テーマを削除中...`);
          // 重複削除も並列化
          await Promise.all(
            duplicatesToDelete.map(async (themeId) => {
              try {
                await deleteTheme(themeId);
                devLog(`✅ 重複テーマを削除しました: ${themeId}`);
              } catch (error: any) {
                console.error(`❌ 重複テーマの削除に失敗しました (ID: ${themeId}):`, error);
              }
            })
          );
          themesData = await getThemes();
          devLog(`✅ 重複削除後のテーマ数: ${themesData.length}`);
        }
        
        devLog('📖 最終的なテーマ数:', themesData.length);
        
        // 独立したデータ取得を並列化（Supabase最適化）
        devLog('📖 独立データの並列読み込みを開始...');
        const [
          categoriesData,
          startupsData,
          vcsData,
          departmentsData,
          statusesData,
          engagementLevelsData,
          bizDevPhasesData,
          orgTree,
        ] = await Promise.all([
          getCategories().then(data => {
            devLog('📖 読み込んだカテゴリー数:', data.length);
            return data;
          }),
          getAllStartups().then(data => {
            devLog('📖 読み込んだスタートアップ数:', data.length);
            return data;
          }),
          getVcs().then(data => {
            devLog('📖 読み込んだVC数:', data.length);
            return data;
          }),
          getDepartments().then(data => {
            devLog('📖 読み込んだ部署数:', data.length);
            return data;
          }),
          getStatuses().then(data => {
            devLog('📖 読み込んだステータス数:', data.length);
            return data;
          }),
          getEngagementLevels().then(data => {
            devLog('📖 読み込んだねじ込み注力度数:', data.length);
            return data;
          }),
          getBizDevPhases().then(data => {
            devLog('📖 読み込んだBiz-Devフェーズ数:', data.length);
            return data;
          }),
          getOrgTreeFromDb().then(data => {
            devLog('📖 組織ツリーを取得しました');
            return data;
          }),
        ]);
        
        setThemes(themesData);
        setCategories(categoriesData);
        setStartups(startupsData);
        setVcs(vcsData);
        setDepartments(departmentsData);
        setStatuses(statusesData);
        setEngagementLevels(engagementLevelsData);
        setBizDevPhases(bizDevPhasesData);
        setOrgData(orgTree);
        
        if (typeof window !== 'undefined') {
          (window as any).refreshThemes = refreshThemes;
        }
        
        // 組織ツリーから取得するデータも並列化
        if (orgTree) {
          devLog('📖 組織ツリーからデータを並列取得中...');
          
          // すべての組織IDを収集
          const getAllOrgIds = (org: OrgNodeData): string[] => {
            const ids: string[] = [];
            if (org.id) {
              ids.push(org.id);
            }
            if (org.children) {
              for (const child of org.children) {
                ids.push(...getAllOrgIds(child));
              }
            }
            return ids;
          };
          
          const allOrgIds = getAllOrgIds(orgTree);
          devLog('📖 組織数:', allOrgIds.length);
          
          // すべての組織のinitiativesとtopicsを並列取得
          const [allInitiativesArrays, allTopicsArrays] = await Promise.all([
            Promise.all(
              allOrgIds.map(orgId => 
                getFocusInitiatives(orgId).catch(error => {
                  console.error(`❌ [getFocusInitiatives] エラー (orgId: ${orgId}):`, error);
                  return [];
                })
              )
            ),
            Promise.all(
              allOrgIds.map(orgId => 
                getAllTopics(orgId).catch(error => {
                  console.error(`❌ [getAllTopics] エラー (orgId: ${orgId}):`, error);
                  return [];
                })
              )
            ),
          ]);
          
          // 配列をフラット化
          const allInitiatives = allInitiativesArrays.flat();
          const allTopics = allTopicsArrays.flat();
          
          const initiativesWithTopics = allInitiatives.filter(i => i.topicIds && i.topicIds.length > 0);
          devLog('🔍 [Analytics] トピックが紐づけられた注力施策:', {
            count: initiativesWithTopics.length,
          });
          
          devLog('🔍 [Analytics] 取得したトピック:', {
            count: allTopics.length,
          });
          
          setInitiatives(allInitiatives);
          setTopics(allTopics);
        }
      } catch (error: any) {
        console.error('データの読み込みに失敗しました:', error);
        setError(`データの読み込みに失敗しました: ${error?.message || error}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [refreshThemes]);

  return {
    themes,
    setThemes,
    categories,
    setCategories,
    vcs,
    setVcs,
    departments,
    setDepartments,
    statuses,
    setStatuses,
    engagementLevels,
    setEngagementLevels,
    bizDevPhases,
    setBizDevPhases,
    startups,
    setStartups,
    initiatives,
    orgData,
    topics,
    setTopics,
    loading,
    error,
    refreshThemes,
    refreshCategories,
    refreshVcs,
    refreshDepartments,
    refreshStatuses,
    refreshEngagementLevels,
    refreshBizDevPhases,
    refreshTopics,
  };
}

