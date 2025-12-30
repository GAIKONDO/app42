'use client';

import { useCallback } from 'react';
import { saveStartup, getStartupById, type Startup } from '@/lib/orgApi';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

interface UseStartupSaveProps {
  startup: Startup | null;
  startupId: string;
  editingContent: string;
  localAssignee: string[];
  localDescription: string;
  localMethod: string[];
  localMethodOther: string;
  localMeans: string[];
  localMeansOther: string;
  localObjective: string;
  localEvaluation: string;
  localEvaluationChart: any;
  localEvaluationChartSnapshots: any[];
  localConsiderationStartPeriod: string;
  localConsiderationEndPeriod: string;
  localExecutionStartPeriod: string;
  localExecutionEndPeriod: string;
  localMonetizationStartPeriod: string;
  localMonetizationEndPeriod: string;
  localMonetizationRenewalNotRequired: boolean;
  localRelatedOrganizations: string[];
  localRelatedGroupCompanies: string[];
  localMonetizationDiagram: string;
  localRelationDiagram: string;
  localCauseEffectCode: string;
  localThemeIds: string[];
  localTopicIds: string[];
  localCategory: string[];
  localRelatedVCs: string[];
  localResponsibleDepts: string[];
  localStatus: string;
  localAgencyContractMonth: string;
  localEngagementLevel: string;
  localBizDevPhase: string;
  localHpUrl: string;
  localAsanaUrl: string;
  localBoxUrl: string;
  setStartup: (startup: Startup) => void;
  setEditingContent: (content: string) => void;
  setLocalAssignee: (assignee: string[]) => void;
  setLocalDescription: (description: string) => void;
  setLocalMethod: (method: string[]) => void;
  setLocalMethodOther: (methodOther: string) => void;
  setLocalMeans: (means: string[]) => void;
  setLocalMeansOther: (meansOther: string) => void;
  setLocalObjective: (objective: string) => void;
  setLocalEvaluation: (evaluation: string) => void;
  setLocalEvaluationChart: (chart: any) => void;
  setLocalEvaluationChartSnapshots: (snapshots: any[]) => void;
  setLocalConsiderationStartPeriod: (period: string) => void;
  setLocalConsiderationEndPeriod: (period: string) => void;
  setLocalExecutionStartPeriod: (period: string) => void;
  setLocalExecutionEndPeriod: (period: string) => void;
  setLocalMonetizationStartPeriod: (period: string) => void;
  setLocalMonetizationEndPeriod: (period: string) => void;
  setLocalMonetizationRenewalNotRequired: (value: boolean) => void;
  setLocalRelatedOrganizations: (orgs: string[]) => void;
  setLocalRelatedGroupCompanies: (companies: string[]) => void;
  setLocalMonetizationDiagram: (diagram: string) => void;
  setLocalRelationDiagram: (diagram: string) => void;
  setLocalThemeIds: (ids: string[]) => void;
  setLocalTopicIds: (ids: string[]) => void;
  setLocalCategory: (categoryIds: string[]) => void;
  setLocalRelatedVCs: (vcs: string[]) => void;
  setLocalResponsibleDepts: (depts: string[]) => void;
  setLocalStatus: (status: string) => void;
  setLocalAgencyContractMonth: (month: string) => void;
  setLocalEngagementLevel: (level: string) => void;
  setLocalBizDevPhase: (phase: string) => void;
  setLocalHpUrl: (url: string) => void;
  setLocalAsanaUrl: (url: string) => void;
  setLocalBoxUrl: (url: string) => void;
  setSavingStatus: (status: 'idle' | 'saving' | 'saved') => void;
}

export function useStartupSave({
  startup,
  startupId,
  editingContent,
  localAssignee,
  localDescription,
  localMethod,
  localMethodOther,
  localMeans,
  localMeansOther,
  localObjective,
  localEvaluation,
  localEvaluationChart,
  localEvaluationChartSnapshots,
  localConsiderationStartPeriod,
  localConsiderationEndPeriod,
  localExecutionStartPeriod,
  localExecutionEndPeriod,
  localMonetizationStartPeriod,
  localMonetizationEndPeriod,
  localMonetizationRenewalNotRequired,
  localRelatedOrganizations,
  localRelatedGroupCompanies,
  localMonetizationDiagram,
  localRelationDiagram,
  localCauseEffectCode,
  localThemeIds,
  localTopicIds,
  localCategory,
  localRelatedVCs,
  localResponsibleDepts,
  localStatus,
  localAgencyContractMonth,
  localEngagementLevel,
  localBizDevPhase,
  localHpUrl,
  localAsanaUrl,
  localBoxUrl,
  setStartup,
  setEditingContent,
  setLocalAssignee,
  setLocalDescription,
  setLocalMethod,
  setLocalMethodOther,
  setLocalMeans,
  setLocalMeansOther,
  setLocalObjective,
  setLocalEvaluation,
  setLocalEvaluationChart,
  setLocalEvaluationChartSnapshots,
  setLocalConsiderationStartPeriod,
  setLocalConsiderationEndPeriod,
  setLocalExecutionStartPeriod,
  setLocalExecutionEndPeriod,
  setLocalMonetizationStartPeriod,
  setLocalMonetizationEndPeriod,
  setLocalMonetizationRenewalNotRequired,
  setLocalRelatedOrganizations,
  setLocalRelatedGroupCompanies,
  setLocalMonetizationDiagram,
  setLocalRelationDiagram,
  setLocalThemeIds,
  setLocalTopicIds,
  setLocalCategory,
  setLocalRelatedVCs,
  setLocalResponsibleDepts,
  setLocalStatus,
  setLocalAgencyContractMonth,
  setLocalEngagementLevel,
  setLocalBizDevPhase,
  setLocalHpUrl,
  setLocalAsanaUrl,
  setLocalBoxUrl,
  setSavingStatus,
}: UseStartupSaveProps) {
  const handleManualSave = useCallback(async () => {
    if (!startup) return;
    
    // デバッグ: 保存前のlocalCategoryの状態を確認
    devLog('💾 [handleManualSave] 保存前のlocalCategory:', {
      localCategory,
      localCategoryLength: localCategory?.length || 0,
      localCategoryType: typeof localCategory,
      isArray: Array.isArray(localCategory),
    });
    
    devLog('💾 [handleManualSave] 保存前のlocalRelatedVCs:', {
      localRelatedVCs,
      localRelatedVCsLength: localRelatedVCs?.length || 0,
      localRelatedVCsType: typeof localRelatedVCs,
      isArray: Array.isArray(localRelatedVCs),
    });
    
    devLog('💾 [handleManualSave] 保存前のlocalResponsibleDepts:', {
      localResponsibleDepts,
      localResponsibleDeptsLength: localResponsibleDepts?.length || 0,
      localResponsibleDeptsType: typeof localResponsibleDepts,
      isArray: Array.isArray(localResponsibleDepts),
    });
    
    // 保存するデータを構築
    const categoryIdsToSave = Array.isArray(localCategory) ? localCategory : [];
    devLog('💾 [handleManualSave] categoryIdsToSave:', {
      categoryIdsToSave,
      categoryIdsToSaveLength: categoryIdsToSave.length,
    });
    
    const relatedVCsToSave = Array.isArray(localRelatedVCs) ? localRelatedVCs : [];
    devLog('💾 [handleManualSave] relatedVCsToSave:', {
      relatedVCsToSave,
      relatedVCsToSaveLength: relatedVCsToSave.length,
    });
    
    const responsibleDeptsToSave = Array.isArray(localResponsibleDepts) ? localResponsibleDepts : [];
    devLog('💾 [handleManualSave] responsibleDeptsToSave:', {
      responsibleDeptsToSave,
      responsibleDeptsToSaveLength: responsibleDeptsToSave.length,
    });
    
    devLog('💾 [handleManualSave] 保存前のlocalStatus:', {
      localStatus,
      localStatusType: typeof localStatus,
      localStatusLength: localStatus?.length || 0,
    });
    
    devLog('💾 [handleManualSave] 保存前のlocalEngagementLevel:', {
      localEngagementLevel,
      localEngagementLevelType: typeof localEngagementLevel,
      localEngagementLevelLength: localEngagementLevel?.length || 0,
    });
    
    devLog('💾 [handleManualSave] 保存前のlocalBizDevPhase:', {
      localBizDevPhase,
      localBizDevPhaseType: typeof localBizDevPhase,
      localBizDevPhaseLength: localBizDevPhase?.length || 0,
    });
    
    const dataToSave = {
      ...startup,
      content: editingContent,
      assignee: localAssignee.length > 0 ? localAssignee.join(', ') : undefined,
      description: localDescription,
      method: localMethod,
      methodOther: localMethodOther,
      means: localMeans,
      meansOther: localMeansOther,
      objective: localObjective,
      evaluation: localEvaluation,
      evaluationChart: localEvaluationChart,
      evaluationChartSnapshots: localEvaluationChartSnapshots,
      // 開始期間と終了期間を結合して保存
      // 年月日形式（YYYY-MM-DD）で保存
      considerationPeriod: localConsiderationStartPeriod && localConsiderationEndPeriod
        ? `${localConsiderationStartPeriod}/${localConsiderationEndPeriod}`
        : localConsiderationStartPeriod || localConsiderationEndPeriod || undefined,
      executionPeriod: localExecutionStartPeriod && localExecutionEndPeriod
        ? `${localExecutionStartPeriod}/${localExecutionEndPeriod}`
        : localExecutionStartPeriod || localExecutionEndPeriod || undefined,
      // NDA更新予定日は開始予定日のみ（終了期間は不要）
      monetizationPeriod: localMonetizationStartPeriod || undefined,
      monetizationRenewalNotRequired: (() => {
        const value = localMonetizationRenewalNotRequired;
        console.log('💾 [handleManualSave] monetizationRenewalNotRequired保存前:', {
          rawValue: value,
          type: typeof value,
          isUndefined: value === undefined,
          isNull: value === null,
          isTrue: value === true,
          isFalse: value === false,
          result: value !== undefined ? value : undefined
        });
        return value !== undefined ? value : undefined;
      })(),
      relatedOrganizations: localRelatedOrganizations,
      relatedGroupCompanies: localRelatedGroupCompanies,
      monetizationDiagram: localMonetizationDiagram,
      relationDiagram: localRelationDiagram,
      themeIds: Array.isArray(localThemeIds) ? localThemeIds : (localThemeIds ? [localThemeIds] : []),
      topicIds: Array.isArray(localTopicIds) ? localTopicIds : (localTopicIds ? [localTopicIds] : []),
      categoryIds: categoryIdsToSave,
      relatedVCS: relatedVCsToSave,
      responsibleDepartments: responsibleDeptsToSave,
      status: localStatus || undefined,
      agencyContractMonth: localAgencyContractMonth || undefined,
      engagementLevel: localEngagementLevel || undefined,
      bizDevPhase: localBizDevPhase || undefined,
      hpUrl: localHpUrl || undefined,
      asanaUrl: localAsanaUrl || undefined,
      boxUrl: localBoxUrl || undefined,
      // competitorComparisonを保持（競合比較タブで保存されたデータを維持）
      competitorComparison: startup.competitorComparison || undefined,
      // deepSearchを保持（Deepsearchタブで保存されたデータを維持）
      deepSearch: startup.deepSearch || undefined,
      // 特性要因図のコードからデータを更新
      ...(() => {
        try {
          if (localCauseEffectCode) {
            const parsed = JSON.parse(localCauseEffectCode);
            return {
              method: parsed.method || localMethod,
              means: parsed.means || localMeans,
              objective: parsed.objective || localObjective,
            };
          }
        } catch (e) {
          // パースエラーの場合は既存のデータを使用
        }
        return {};
      })(),
    };
    
    devLog('💾 [handleManualSave] dataToSave構築後:', {
      status: dataToSave.status,
      engagementLevel: dataToSave.engagementLevel,
      bizDevPhase: dataToSave.bizDevPhase,
      localStatus,
      localEngagementLevel,
      localBizDevPhase,
    });
    
      devLog('💾 [handleManualSave] 保存開始:', {
      startupId,
      contentLength: dataToSave.content?.length || 0,
      themeIdsCount: Array.isArray(dataToSave.themeIds) ? dataToSave.themeIds.length : 0,
      topicIdsCount: Array.isArray(dataToSave.topicIds) ? dataToSave.topicIds.length : 0,
      categoryIdsCount: Array.isArray(dataToSave.categoryIds) ? dataToSave.categoryIds.length : 0,
      categoryIds: dataToSave.categoryIds,
      relatedVCSCount: Array.isArray(dataToSave.relatedVCS) ? dataToSave.relatedVCS.length : 0,
      relatedVCS: dataToSave.relatedVCS,
      responsibleDepartmentsCount: Array.isArray(dataToSave.responsibleDepartments) ? dataToSave.responsibleDepartments.length : 0,
      responsibleDepartments: dataToSave.responsibleDepartments,
      status: dataToSave.status,
      engagementLevel: dataToSave.engagementLevel,
      bizDevPhase: dataToSave.bizDevPhase,
      agencyContractMonth: dataToSave.agencyContractMonth,
      hpUrl: dataToSave.hpUrl,
      asanaUrl: dataToSave.asanaUrl,
      boxUrl: dataToSave.boxUrl,
      hasEvaluationChart: !!dataToSave.evaluationChart,
      evaluationChartAxesCount: dataToSave.evaluationChart?.axes?.length || 0,
      evaluationChartSnapshotsCount: Array.isArray(dataToSave.evaluationChartSnapshots) ? dataToSave.evaluationChartSnapshots.length : 0,
      evaluationChart: dataToSave.evaluationChart,
      evaluationChartSnapshots: dataToSave.evaluationChartSnapshots,
    });
    
    try {
      setSavingStatus('saving');
      
      // データを保存
      await saveStartup(dataToSave);
      
      devLog('✅ [handleManualSave] 保存成功');
      
      // 保存したデータでstartup状態を更新（再取得せずに保存したデータを使用）
      const updatedStartup: Startup = {
        ...startup,
        ...dataToSave,
      } as Startup;
      
      devLog('💾 [handleManualSave] updatedStartup確認:', {
        hasCompetitorComparison: !!updatedStartup.competitorComparison,
        competitorComparisonId: updatedStartup.competitorComparison?.id,
        competitorComparisonAxesCount: updatedStartup.competitorComparison?.axes?.length || 0,
        dataToSaveHasCompetitorComparison: !!dataToSave.competitorComparison,
        startupHasCompetitorComparison: !!startup.competitorComparison,
      });
      
      setStartup(updatedStartup);
      
      // ローカル状態も保存したデータで更新
      setEditingContent(dataToSave.content || '');
      setLocalAssignee(Array.isArray(dataToSave.assignee) ? dataToSave.assignee : (dataToSave.assignee ? [dataToSave.assignee] : []));
      setLocalDescription(dataToSave.description || '');
      setLocalMethod(Array.isArray(dataToSave.method) ? dataToSave.method : (dataToSave.method ? [dataToSave.method] : []));
      setLocalMethodOther(dataToSave.methodOther || '');
      setLocalMeans(Array.isArray(dataToSave.means) ? dataToSave.means : (dataToSave.means ? [dataToSave.means] : []));
      setLocalMeansOther(dataToSave.meansOther || '');
      setLocalObjective(dataToSave.objective || '');
      setLocalEvaluation(dataToSave.evaluation || '');
      setLocalEvaluationChart(dataToSave.evaluationChart || null);
      setLocalEvaluationChartSnapshots(Array.isArray(dataToSave.evaluationChartSnapshots) ? dataToSave.evaluationChartSnapshots : []);
      // 保存したデータを開始期間と終了期間に分割
      // 既存データが「YYYY-MM」形式の場合は「YYYY-MM-01」に変換
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
        // 単一の値の場合（NDA更新予定日など）
        let single = period.trim();
        if (single.match(/^\d{4}-\d{2}$/)) {
          single = `${single}-01`;
        }
        return { start: single, end: '' };
      };
      
      const savedConsiderationPeriod = parsePeriod(dataToSave.considerationPeriod || '');
      const savedExecutionPeriod = parsePeriod(dataToSave.executionPeriod || '');
      const savedMonetizationPeriod = parsePeriod(dataToSave.monetizationPeriod || '');
      
      setLocalConsiderationStartPeriod(savedConsiderationPeriod.start);
      setLocalConsiderationEndPeriod(savedConsiderationPeriod.end);
      setLocalExecutionStartPeriod(savedExecutionPeriod.start);
      setLocalExecutionEndPeriod(savedExecutionPeriod.end);
      setLocalMonetizationStartPeriod(savedMonetizationPeriod.start);
      setLocalMonetizationEndPeriod(savedMonetizationPeriod.end);
      setLocalMonetizationRenewalNotRequired(dataToSave.monetizationRenewalNotRequired || false);
      setLocalRelatedOrganizations(Array.isArray(dataToSave.relatedOrganizations) ? dataToSave.relatedOrganizations : []);
      setLocalRelatedGroupCompanies(Array.isArray(dataToSave.relatedGroupCompanies) ? dataToSave.relatedGroupCompanies : []);
      setLocalMonetizationDiagram(dataToSave.monetizationDiagram || '');
      setLocalRelationDiagram(dataToSave.relationDiagram || '');
      setLocalThemeIds(Array.isArray(dataToSave.themeIds) ? dataToSave.themeIds : (dataToSave.themeId ? [dataToSave.themeId] : []));
      setLocalTopicIds(Array.isArray(dataToSave.topicIds) ? dataToSave.topicIds : []);
      
      const savedCategoryIds = Array.isArray(dataToSave.categoryIds) ? dataToSave.categoryIds : [];
      devLog('💾 [handleManualSave] categoryIds保存:', {
        savedCategoryIds,
        savedCategoryIdsLength: savedCategoryIds.length,
        dataToSaveCategoryIds: dataToSave.categoryIds,
      });
      setLocalCategory(savedCategoryIds);
      
      const savedRelatedVCs = Array.isArray(dataToSave.relatedVCS) ? dataToSave.relatedVCS : [];
      devLog('💾 [handleManualSave] relatedVCS保存:', {
        savedRelatedVCs,
        savedRelatedVCsLength: savedRelatedVCs.length,
        dataToSaveRelatedVCS: dataToSave.relatedVCS,
      });
      setLocalRelatedVCs(savedRelatedVCs);
      
      const savedResponsibleDepts = Array.isArray(dataToSave.responsibleDepartments) ? dataToSave.responsibleDepartments : [];
      devLog('💾 [handleManualSave] responsibleDepartments保存:', {
        savedResponsibleDepts,
        savedResponsibleDeptsLength: savedResponsibleDepts.length,
        dataToSaveResponsibleDepartments: dataToSave.responsibleDepartments,
      });
      setLocalResponsibleDepts(savedResponsibleDepts);
      
      devLog('💾 [handleManualSave] status保存:', {
        savedStatus: dataToSave.status,
        dataToSaveStatus: dataToSave.status,
      });
      setLocalStatus(dataToSave.status || '');
      
      devLog('💾 [handleManualSave] engagementLevel保存:', {
        savedEngagementLevel: dataToSave.engagementLevel,
        dataToSaveEngagementLevel: dataToSave.engagementLevel,
      });
      setLocalEngagementLevel(dataToSave.engagementLevel || '');
      
      devLog('💾 [handleManualSave] bizDevPhase保存:', {
        savedBizDevPhase: dataToSave.bizDevPhase,
        dataToSaveBizDevPhase: dataToSave.bizDevPhase,
      });
      setLocalBizDevPhase(dataToSave.bizDevPhase || '');
      
      setLocalAgencyContractMonth(dataToSave.agencyContractMonth || '');
      setLocalHpUrl(dataToSave.hpUrl || '');
      setLocalAsanaUrl(dataToSave.asanaUrl || '');
      setLocalBoxUrl(dataToSave.boxUrl || '');
      
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error: any) {
      console.error('❌ [handleManualSave] 保存に失敗しました:', error);
      alert(`保存に失敗しました: ${error?.message || '不明なエラー'}`);
      setSavingStatus('idle');
    }
  }, [
    startup,
    startupId,
    editingContent,
    localAssignee,
    localDescription,
    localMethod,
    localMethodOther,
    localMeans,
    localMeansOther,
    localObjective,
    localEvaluation,
    localEvaluationChart,
    localEvaluationChartSnapshots,
    localConsiderationStartPeriod,
    localConsiderationEndPeriod,
    localExecutionStartPeriod,
    localExecutionEndPeriod,
    localMonetizationStartPeriod,
    localMonetizationEndPeriod,
    localRelatedOrganizations,
    localRelatedGroupCompanies,
    localMonetizationDiagram,
    localRelationDiagram,
    localCauseEffectCode,
    localThemeIds,
    localTopicIds,
    setStartup,
    setEditingContent,
    setLocalAssignee,
    setLocalDescription,
    setLocalMethod,
    setLocalMethodOther,
    setLocalMeans,
    setLocalMeansOther,
    setLocalObjective,
    setLocalEvaluation,
    setLocalConsiderationStartPeriod,
    setLocalConsiderationEndPeriod,
    setLocalExecutionStartPeriod,
    setLocalExecutionEndPeriod,
    setLocalMonetizationStartPeriod,
    setLocalMonetizationEndPeriod,
    setLocalMonetizationRenewalNotRequired,
    setLocalRelatedOrganizations,
    setLocalRelatedGroupCompanies,
    setLocalMonetizationDiagram,
    setLocalRelationDiagram,
    setLocalThemeIds,
    setLocalTopicIds,
    localCategory,
    localRelatedVCs,
    localResponsibleDepts,
    localStatus,
    localAgencyContractMonth,
    localEngagementLevel,
    localBizDevPhase,
    localHpUrl,
    localAsanaUrl,
    localBoxUrl,
    setLocalCategory,
    setLocalRelatedVCs,
    setLocalResponsibleDepts,
    setLocalStatus,
    setLocalAgencyContractMonth,
    setLocalEngagementLevel,
    setLocalBizDevPhase,
    setLocalHpUrl,
    setLocalAsanaUrl,
    setLocalBoxUrl,
    setSavingStatus,
  ]);

  const handleDownloadJson = useCallback(async () => {
    if (!startup) return;
    
    try {
      // 現在の編集内容を含む完全なデータを構築
      const dataToDownload: Startup = {
        ...startup,
        content: editingContent,
        assignee: localAssignee.length > 0 ? localAssignee.join(', ') : undefined,
        description: localDescription,
        method: localMethod,
        methodOther: localMethodOther,
        means: localMeans,
        meansOther: localMeansOther,
        objective: localObjective,
        // 開始期間と終了期間を結合して保存
        // 年月日形式（YYYY-MM-DD）で保存
        considerationPeriod: localConsiderationStartPeriod && localConsiderationEndPeriod
          ? `${localConsiderationStartPeriod}/${localConsiderationEndPeriod}`
          : localConsiderationStartPeriod || localConsiderationEndPeriod || undefined,
        executionPeriod: localExecutionStartPeriod && localExecutionEndPeriod
          ? `${localExecutionStartPeriod}/${localExecutionEndPeriod}`
          : localExecutionStartPeriod || localExecutionEndPeriod || undefined,
        // NDA更新予定日は開始予定日のみ（終了期間は不要）
        monetizationPeriod: localMonetizationStartPeriod || undefined,
        monetizationRenewalNotRequired: localMonetizationRenewalNotRequired !== undefined ? localMonetizationRenewalNotRequired : undefined,
        relatedOrganizations: localRelatedOrganizations,
        relatedGroupCompanies: localRelatedGroupCompanies,
        monetizationDiagram: localMonetizationDiagram,
        relationDiagram: localRelationDiagram,
        themeIds: Array.isArray(localThemeIds) ? localThemeIds : (localThemeIds ? [localThemeIds] : []),
        topicIds: Array.isArray(localTopicIds) ? localTopicIds : [],
        categoryIds: Array.isArray(localCategory) ? localCategory : [],
      } as Startup;
      
      // JSON文字列に変換
      const jsonString = JSON.stringify(dataToDownload, null, 2);
      
      // Blobオブジェクトを作成
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // ダウンロード用のURLを作成
      const url = URL.createObjectURL(blob);
      
      // ダウンロードリンクを作成してクリック
      const link = document.createElement('a');
      link.href = url;
      link.download = `${startup.id || 'startup'}.json`;
      document.body.appendChild(link);
      link.click();
      
      // クリーンアップ
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      devLog('✅ [handleDownloadJson] JSONファイルのダウンロード成功:', startup.id);
    } catch (error: any) {
      console.error('❌ [handleDownloadJson] JSONファイルのダウンロードに失敗しました:', error);
      alert(`JSONファイルのダウンロードに失敗しました: ${error?.message || '不明なエラー'}`);
    }
  }, [
    startup,
    editingContent,
    localAssignee,
    localDescription,
    localMethod,
    localMethodOther,
    localMeans,
    localMeansOther,
    localObjective,
    localConsiderationStartPeriod,
    localConsiderationEndPeriod,
    localExecutionStartPeriod,
    localExecutionEndPeriod,
    localMonetizationStartPeriod,
    localMonetizationEndPeriod,
    localRelatedOrganizations,
    localRelatedGroupCompanies,
    localMonetizationDiagram,
    localRelationDiagram,
  ]);

  return {
    handleManualSave,
    handleDownloadJson,
  };
}

