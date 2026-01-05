'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import type { Startup } from '@/lib/orgApi';
import { saveStartup } from '@/lib/orgApi';
import MermaidLoader from '@/components/MermaidLoader';
import { generateUniqueId } from '@/lib/orgApi';
import { StartupTabBar } from './components/StartupTabBar';
import AIGenerationModal from './components/modals/AIGenerationModal';
import { useStartupData } from './hooks/useStartupData';
import StartupPageHeader from './components/StartupPageHeader';
import ThemeSelectionSection from './components/ThemeSelectionSection';
import TopicSelectionSection from './components/TopicSelectionSection';
import StartupIdLinks from './components/StartupIdLinks';
import TopicSelectModal from './components/modals/TopicSelectModal';
import { useStartupSave } from './hooks/useStartupSave';
import StartupTabContent from './components/StartupTabContent';
import StartupModals from './components/StartupModals';
import { LoadingState, ErrorState } from './components/LoadingAndErrorStates';

import type { StartupTab } from './components/StartupTabBar';

function StartupDetailPageContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams?.get('organizationId') as string;
  const startupId = searchParams?.get('startupId') as string;
  
  // データ取得カスタムフック
  const router = useRouter();
  const {
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
    setTopics,
    setOrgMembers,
    setAllOrgMembers,
    setAllOrganizations,
    setAllMeetingNotes,
    setOrgTreeForModal,
    setError,
  } = useStartupData(organizationId, startupId);
  
  const [activeTab, setActiveTab] = useState<StartupTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(initialLocalState.content);
  
  // 編集用のローカル状態（初期値はカスタムフックから取得）
  const [localAssignee, setLocalAssignee] = useState<string[]>(initialLocalState.assignee);
  const [localDescription, setLocalDescription] = useState(initialLocalState.description);
  const [localMethod, setLocalMethod] = useState<string[]>(initialLocalState.method);
  const [localMethodOther, setLocalMethodOther] = useState(initialLocalState.methodOther);
  const [localMeans, setLocalMeans] = useState<string[]>(initialLocalState.means);
  const [localMeansOther, setLocalMeansOther] = useState(initialLocalState.meansOther);
  const [localObjective, setLocalObjective] = useState(initialLocalState.objective);
  const [localEvaluation, setLocalEvaluation] = useState(initialLocalState.evaluation);
  const [localEvaluationChart, setLocalEvaluationChart] = useState<any>(null);
  const [localEvaluationChartSnapshots, setLocalEvaluationChartSnapshots] = useState<any[]>([]);
  const [isEditingChart, setIsEditingChart] = useState(false);
  const [localConsiderationStartPeriod, setLocalConsiderationStartPeriod] = useState(initialLocalState.considerationStartPeriod);
  const [localConsiderationEndPeriod, setLocalConsiderationEndPeriod] = useState(initialLocalState.considerationEndPeriod);
  const [localExecutionStartPeriod, setLocalExecutionStartPeriod] = useState(initialLocalState.executionStartPeriod);
  const [localExecutionEndPeriod, setLocalExecutionEndPeriod] = useState(initialLocalState.executionEndPeriod);
  const [localMonetizationStartPeriod, setLocalMonetizationStartPeriod] = useState(initialLocalState.monetizationStartPeriod);
  const [localMonetizationEndPeriod, setLocalMonetizationEndPeriod] = useState(initialLocalState.monetizationEndPeriod);
  const [localMonetizationRenewalNotRequired, setLocalMonetizationRenewalNotRequired] = useState(initialLocalState.monetizationRenewalNotRequired);
  const [localRelatedOrganizations, setLocalRelatedOrganizations] = useState<string[]>(initialLocalState.relatedOrganizations);
  const [localRelatedGroupCompanies, setLocalRelatedGroupCompanies] = useState<string[]>(initialLocalState.relatedGroupCompanies);
  const [localMonetizationDiagram, setLocalMonetizationDiagram] = useState(initialLocalState.monetizationDiagram);
  const [localRelationDiagram, setLocalRelationDiagram] = useState(initialLocalState.relationDiagram);
  const [isEditingMonetization, setIsEditingMonetization] = useState(false);
  const [isEditingRelation, setIsEditingRelation] = useState(false);
  const [isEditingCauseEffect, setIsEditingCauseEffect] = useState(false);
  const [localCauseEffectCode, setLocalCauseEffectCode] = useState(initialLocalState.causeEffectCode);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [localThemeIds, setLocalThemeIds] = useState<string[]>(initialLocalState.themeIds);
  const [localTopicIds, setLocalTopicIds] = useState<string[]>(initialLocalState.topicIds);
  const [localCategory, setLocalCategory] = useState<string[]>(initialLocalState.categoryIds || []);
  const [localRelatedVCs, setLocalRelatedVCs] = useState<string[]>(initialLocalState.relatedVCS || []);
  const [localResponsibleDepts, setLocalResponsibleDepts] = useState<string[]>(initialLocalState.responsibleDepartments || []);
  const [localStatus, setLocalStatus] = useState<string>(initialLocalState.status || '');
  const [localAgencyContractMonth, setLocalAgencyContractMonth] = useState<string>(initialLocalState.agencyContractMonth || '');
  const [localEngagementLevel, setLocalEngagementLevel] = useState<string>(initialLocalState.engagementLevel || '');
  const [localBizDevPhase, setLocalBizDevPhase] = useState<string>(initialLocalState.bizDevPhase || '');
  const [localHpUrl, setLocalHpUrl] = useState<string>(initialLocalState.hpUrl || '');
  const [localAsanaUrl, setLocalAsanaUrl] = useState<string>(initialLocalState.asanaUrl || '');
  const [localBoxUrl, setLocalBoxUrl] = useState<string>(initialLocalState.boxUrl || '');
  const [isThemesExpanded, setIsThemesExpanded] = useState(false);
  const [isTopicsExpanded, setIsTopicsExpanded] = useState(false);
  const [isAssigneeSectionExpanded, setIsAssigneeSectionExpanded] = useState(() => {
    // 1人でも設定されていたら閉じる、誰も登録されていない場合は開く
    return initialLocalState.assignee.length === 0;
  });

  // localAssigneeが変更された時に、開閉状態を更新
  useEffect(() => {
    // 1人でも設定されていたら閉じる、誰も登録されていない場合は開く
    setIsAssigneeSectionExpanded(localAssignee.length === 0);
  }, [localAssignee]);
  const [isTopicSelectModalOpen, setIsTopicSelectModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isMonetizationUpdateModalOpen, setIsMonetizationUpdateModalOpen] = useState(false);
  const [isRelationUpdateModalOpen, setIsRelationUpdateModalOpen] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [manualAssigneeInput, setManualAssigneeInput] = useState('');
  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  
  // initialLocalStateが更新されたらローカル状態を更新
  // ただし、categoryIdsは初回ロード時またはcategoryIdsが実際に変更された場合のみ更新
  const prevCategoryIdsRef = useRef<string[]>([]);
  const prevStatusRef = useRef<string>('');
  const prevEngagementLevelRef = useRef<string>('');
  const prevBizDevPhaseRef = useRef<string>('');
  const prevAgencyContractMonthRef = useRef<string>('');
  const prevHpUrlRef = useRef<string>('');
  const prevAsanaUrlRef = useRef<string>('');
  const prevBoxUrlRef = useRef<string>('');
  useEffect(() => {
    setEditingContent(initialLocalState.content || '');
    setLocalAssignee(initialLocalState.assignee);
    setLocalDescription(initialLocalState.description);
    setLocalMethod(initialLocalState.method);
    setLocalMethodOther(initialLocalState.methodOther);
    setLocalMeans(initialLocalState.means);
    setLocalMeansOther(initialLocalState.meansOther);
    setLocalObjective(initialLocalState.objective);
    setLocalEvaluation(initialLocalState.evaluation);
    if (initialLocalState.evaluationChart) {
      setLocalEvaluationChart(initialLocalState.evaluationChart);
    } else {
      setLocalEvaluationChart(null);
    }
    if (initialLocalState.evaluationChartSnapshots && initialLocalState.evaluationChartSnapshots.length > 0) {
      setLocalEvaluationChartSnapshots(initialLocalState.evaluationChartSnapshots);
    } else {
      setLocalEvaluationChartSnapshots([]);
    }
    setLocalConsiderationStartPeriod(initialLocalState.considerationStartPeriod);
    setLocalConsiderationEndPeriod(initialLocalState.considerationEndPeriod);
    setLocalExecutionStartPeriod(initialLocalState.executionStartPeriod);
    setLocalExecutionEndPeriod(initialLocalState.executionEndPeriod);
    setLocalMonetizationStartPeriod(initialLocalState.monetizationStartPeriod);
    setLocalMonetizationEndPeriod(initialLocalState.monetizationEndPeriod);
    setLocalMonetizationRenewalNotRequired(initialLocalState.monetizationRenewalNotRequired);
    setLocalRelatedOrganizations(initialLocalState.relatedOrganizations);
    setLocalRelatedGroupCompanies(initialLocalState.relatedGroupCompanies);
    setLocalMonetizationDiagram(initialLocalState.monetizationDiagram);
    setLocalRelationDiagram(initialLocalState.relationDiagram);
    setLocalCauseEffectCode(initialLocalState.causeEffectCode);
    setLocalThemeIds(initialLocalState.themeIds);
    setLocalTopicIds(initialLocalState.topicIds);
    
    // categoryIdsは初回ロード時またはcategoryIdsが実際に変更された場合のみ更新
    const currentCategoryIds = initialLocalState.categoryIds || [];
    const prevCategoryIds = prevCategoryIdsRef.current;
    const categoryIdsChanged = JSON.stringify(currentCategoryIds) !== JSON.stringify(prevCategoryIds);
    const isInitialLoad = prevCategoryIds.length === 0 && currentCategoryIds.length > 0;
    const shouldUpdateCategory = isInitialLoad || (categoryIdsChanged && currentCategoryIds.length > 0);
    
    if (shouldUpdateCategory) {
      console.log('🔄 [page] categoryIds更新:', {
        isInitialLoad,
        categoryIdsChanged,
        currentCategoryIds,
        prevCategoryIds,
      });
      setLocalCategory(currentCategoryIds);
      prevCategoryIdsRef.current = currentCategoryIds;
    } else {
      console.log('⏭️ [page] categoryIdsの更新をスキップ:', {
        isInitialLoad,
        categoryIdsChanged,
        currentCategoryIds,
        prevCategoryIds,
      });
    }
    
    // relatedVCSとresponsibleDepartmentsも同様に初期化
    setLocalRelatedVCs(initialLocalState.relatedVCS || []);
    setLocalResponsibleDepts(initialLocalState.responsibleDepartments || []);
    
    // status, engagementLevel, bizDevPhaseは初回ロード時または実際に変更された場合のみ更新
    const currentStatus = initialLocalState.status || '';
    const currentEngagementLevel = initialLocalState.engagementLevel || '';
    const currentBizDevPhase = initialLocalState.bizDevPhase || '';
    const currentAgencyContractMonth = initialLocalState.agencyContractMonth || '';
    const currentHpUrl = initialLocalState.hpUrl || '';
    const currentAsanaUrl = initialLocalState.asanaUrl || '';
    const currentBoxUrl = initialLocalState.boxUrl || '';
    
    const prevStatus = prevStatusRef.current;
    const prevEngagementLevel = prevEngagementLevelRef.current;
    const prevBizDevPhase = prevBizDevPhaseRef.current;
    const prevAgencyContractMonth = prevAgencyContractMonthRef.current;
    const prevHpUrl = prevHpUrlRef.current;
    const prevAsanaUrl = prevAsanaUrlRef.current;
    const prevBoxUrl = prevBoxUrlRef.current;
    
    // 初回ロード時（前の値が空で、新しい値が存在する場合）または値が実際に変更された場合のみ更新
    const isInitialStatusLoad = !prevStatus && currentStatus;
    const isStatusChanged = prevStatus !== currentStatus && currentStatus;
    if (isInitialStatusLoad || isStatusChanged) {
      setLocalStatus(currentStatus);
      prevStatusRef.current = currentStatus;
    }
    
    const isInitialEngagementLevelLoad = !prevEngagementLevel && currentEngagementLevel;
    const isEngagementLevelChanged = prevEngagementLevel !== currentEngagementLevel && currentEngagementLevel;
    if (isInitialEngagementLevelLoad || isEngagementLevelChanged) {
      setLocalEngagementLevel(currentEngagementLevel);
      prevEngagementLevelRef.current = currentEngagementLevel;
    }
    
    const isInitialBizDevPhaseLoad = !prevBizDevPhase && currentBizDevPhase;
    const isBizDevPhaseChanged = prevBizDevPhase !== currentBizDevPhase && currentBizDevPhase;
    if (isInitialBizDevPhaseLoad || isBizDevPhaseChanged) {
      setLocalBizDevPhase(currentBizDevPhase);
      prevBizDevPhaseRef.current = currentBizDevPhase;
    }
    
    const isInitialAgencyContractMonthLoad = !prevAgencyContractMonth && currentAgencyContractMonth;
    const isAgencyContractMonthChanged = prevAgencyContractMonth !== currentAgencyContractMonth && currentAgencyContractMonth;
    if (isInitialAgencyContractMonthLoad || isAgencyContractMonthChanged) {
      setLocalAgencyContractMonth(currentAgencyContractMonth);
      prevAgencyContractMonthRef.current = currentAgencyContractMonth;
    }
    
    const isInitialHpUrlLoad = !prevHpUrl && currentHpUrl;
    const isHpUrlChanged = prevHpUrl !== currentHpUrl && currentHpUrl;
    if (isInitialHpUrlLoad || isHpUrlChanged) {
      setLocalHpUrl(currentHpUrl);
      prevHpUrlRef.current = currentHpUrl;
    }
    
    const isInitialAsanaUrlLoad = !prevAsanaUrl && currentAsanaUrl;
    const isAsanaUrlChanged = prevAsanaUrl !== currentAsanaUrl && currentAsanaUrl;
    if (isInitialAsanaUrlLoad || isAsanaUrlChanged) {
      setLocalAsanaUrl(currentAsanaUrl);
      prevAsanaUrlRef.current = currentAsanaUrl;
    }
    
    const isInitialBoxUrlLoad = !prevBoxUrl && currentBoxUrl;
    const isBoxUrlChanged = prevBoxUrl !== currentBoxUrl && currentBoxUrl;
    if (isInitialBoxUrlLoad || isBoxUrlChanged) {
      setLocalBoxUrl(currentBoxUrl);
      prevBoxUrlRef.current = currentBoxUrl;
    }
  }, [initialLocalState]);
  
  // AI作文モーダル関連
  const [isAIGenerationModalOpen, setIsAIGenerationModalOpen] = useState(false);
  const [aiGenerationTarget, setAIGenerationTarget] = useState<'description' | 'objective' | 'evaluation' | null>(null);
  const [aiGenerationInput, setAIGenerationInput] = useState('');
  const [selectedTopicIdsForAI, setSelectedTopicIdsForAI] = useState<string[]>([]);
  const [aiSummaryFormat, setAiSummaryFormat] = useState<'auto' | 'bullet' | 'paragraph' | 'custom'>('auto');
  const [aiSummaryLength, setAiSummaryLength] = useState<number>(500);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [descriptionTextareaId] = useState(() => generateUniqueId());
  const [objectiveTextareaId] = useState(() => generateUniqueId());
  const [evaluationTextareaId] = useState(() => generateUniqueId());
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [isEditingEvaluation, setIsEditingEvaluation] = useState(false);
  
  // AI生成結果の比較用
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [aiGeneratedTarget, setAiGeneratedTarget] = useState<'description' | 'objective' | 'evaluation' | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  
  // 組織変更ハンドラー
  const handleOrganizationChange = async (newOrganizationId: string) => {
    if (!startup || !startupId) {
      throw new Error('スタートアップデータが読み込まれていません');
    }

    // スタートアップのorganizationIdを更新
    const updatedStartup = {
      ...startup,
      organizationId: newOrganizationId,
    };

    // データベースに保存
    await saveStartup(updatedStartup);

    // 新しい組織のページに遷移
    router.push(`/organization/startup?organizationId=${newOrganizationId}&startupId=${startupId}`);
  };
  
  // 保存とダウンロードのカスタムフック
  const { handleManualSave, handleDownloadJson } = useStartupSave({
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
  });

  // 選択肢はデータベースから取得（categories, vcs, departments, statuses, engagementLevels, bizDevPhases）

  
  // 担当者ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        assigneeInputRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node) &&
        !assigneeInputRef.current.contains(event.target as Node)
      ) {
        setIsAssigneeDropdownOpen(false);
        setAssigneeSearchQuery('');
      }
    };

    if (isAssigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssigneeDropdownOpen]);
  

  if (loading) {
    return <LoadingState />;
  }

  const shouldShowError = error || !startup || !orgData;
  
  if (shouldShowError) {
    return <ErrorState error={error} organizationId={organizationId} />;
  }


  return (
    <Layout>
      <MermaidLoader />
      <div className="card" style={{ padding: '24px' }}>
        <StartupPageHeader
          orgData={orgData}
          startup={startup}
          organizationId={organizationId}
          allOrganizations={allOrganizations}
          savingStatus={savingStatus}
          onSave={handleManualSave}
          onDownloadJson={handleDownloadJson}
          onOrganizationChange={handleOrganizationChange}
          activeTab={activeTab}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
        />

        {/* 関連テーマセクション（タイトルの下に常に表示） */}
        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <ThemeSelectionSection
            themes={themes}
            localThemeIds={localThemeIds}
            setLocalThemeIds={setLocalThemeIds}
            isThemesExpanded={isThemesExpanded}
            setIsThemesExpanded={setIsThemesExpanded}
          />
          
          {/* 個別トピックセクション */}
          <TopicSelectionSection
            localTopicIds={localTopicIds}
            setLocalTopicIds={setLocalTopicIds}
            topics={topics}
            organizationId={organizationId}
            orgData={orgData}
            isTopicsExpanded={isTopicsExpanded}
            setIsTopicsExpanded={setIsTopicsExpanded}
            onOpenModal={() => setIsTopicSelectModalOpen(true)}
          />
          
          {/* スタートアップIDと特性要因図IDのリンク */}
          <StartupIdLinks
            startup={startup}
            organizationId={organizationId}
            startupId={startupId}
          />
        </div>

        {/* タブナビゲーション */}
        <StartupTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* タブコンテンツ */}
        <StartupTabContent
          activeTab={activeTab}
          organizationId={organizationId}
          startup={startup}
          startupId={startupId}
          localAssignee={localAssignee}
          setLocalAssignee={setLocalAssignee}
          assigneeInputRef={assigneeInputRef}
          assigneeDropdownRef={assigneeDropdownRef}
          assigneeSearchQuery={assigneeSearchQuery}
          setAssigneeSearchQuery={setAssigneeSearchQuery}
          isAssigneeDropdownOpen={isAssigneeDropdownOpen}
          setIsAssigneeDropdownOpen={setIsAssigneeDropdownOpen}
          isAssigneeSectionExpanded={isAssigneeSectionExpanded}
          setIsAssigneeSectionExpanded={setIsAssigneeSectionExpanded}
          orgMembers={orgMembers}
          allOrgMembers={allOrgMembers}
          manualAssigneeInput={manualAssigneeInput}
          setManualAssigneeInput={setManualAssigneeInput}
          localDescription={localDescription}
          setLocalDescription={setLocalDescription}
          descriptionTextareaId={descriptionTextareaId}
          isEditingDescription={isEditingDescription}
          setIsEditingDescription={setIsEditingDescription}
          setAIGenerationTarget={setAIGenerationTarget}
          setAIGenerationInput={setAIGenerationInput}
          setSelectedTopicIdsForAI={setSelectedTopicIdsForAI}
          setAiSummaryFormat={setAiSummaryFormat}
          setAiSummaryLength={setAiSummaryLength}
          setAiCustomPrompt={setAiCustomPrompt}
          setIsAIGenerationModalOpen={setIsAIGenerationModalOpen}
          isAIGenerationModalOpen={isAIGenerationModalOpen}
          aiGeneratedTarget={aiGeneratedTarget}
          aiGeneratedContent={aiGeneratedContent}
          originalContent={originalContent}
          setAiGeneratedContent={setAiGeneratedContent}
          setAiGeneratedTarget={setAiGeneratedTarget}
          setOriginalContent={setOriginalContent}
          localObjective={localObjective}
          setLocalObjective={setLocalObjective}
          objectiveTextareaId={objectiveTextareaId}
          isEditingObjective={isEditingObjective}
          setIsEditingObjective={setIsEditingObjective}
          localEvaluation={localEvaluation}
          setLocalEvaluation={setLocalEvaluation}
          evaluationTextareaId={evaluationTextareaId}
          isEditingEvaluation={isEditingEvaluation}
          setIsEditingEvaluation={setIsEditingEvaluation}
          localEvaluationChart={localEvaluationChart}
          setLocalEvaluationChart={setLocalEvaluationChart}
          localEvaluationChartSnapshots={localEvaluationChartSnapshots}
          setLocalEvaluationChartSnapshots={setLocalEvaluationChartSnapshots}
          isEditingChart={isEditingChart}
          setIsEditingChart={setIsEditingChart}
          isEditing={isEditing}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          localCategory={localCategory}
          setLocalCategory={setLocalCategory}
          localStatus={localStatus}
          setLocalStatus={setLocalStatus}
          localAgencyContractMonth={localAgencyContractMonth}
          setLocalAgencyContractMonth={setLocalAgencyContractMonth}
          localEngagementLevel={localEngagementLevel}
          setLocalEngagementLevel={setLocalEngagementLevel}
          localBizDevPhase={localBizDevPhase}
          setLocalBizDevPhase={setLocalBizDevPhase}
          localRelatedVCs={localRelatedVCs}
          setLocalRelatedVCs={setLocalRelatedVCs}
          localResponsibleDepts={localResponsibleDepts}
          setLocalResponsibleDepts={setLocalResponsibleDepts}
          localHpUrl={localHpUrl}
          setLocalHpUrl={setLocalHpUrl}
          localAsanaUrl={localAsanaUrl}
          setLocalAsanaUrl={setLocalAsanaUrl}
          localBoxUrl={localBoxUrl}
          setLocalBoxUrl={setLocalBoxUrl}
          categories={categories}
          vcs={vcs}
          departments={departments}
          statuses={statuses}
          engagementLevels={engagementLevels}
          bizDevPhases={bizDevPhases}
          localConsiderationStartPeriod={localConsiderationStartPeriod}
          setLocalConsiderationStartPeriod={setLocalConsiderationStartPeriod}
          localConsiderationEndPeriod={localConsiderationEndPeriod}
          setLocalConsiderationEndPeriod={setLocalConsiderationEndPeriod}
          localExecutionStartPeriod={localExecutionStartPeriod}
          setLocalExecutionStartPeriod={setLocalExecutionStartPeriod}
          localExecutionEndPeriod={localExecutionEndPeriod}
          setLocalExecutionEndPeriod={setLocalExecutionEndPeriod}
          localMonetizationStartPeriod={localMonetizationStartPeriod}
          setLocalMonetizationStartPeriod={setLocalMonetizationStartPeriod}
          localMonetizationEndPeriod={localMonetizationEndPeriod}
          setLocalMonetizationEndPeriod={setLocalMonetizationEndPeriod}
          localMonetizationRenewalNotRequired={localMonetizationRenewalNotRequired}
          setLocalMonetizationRenewalNotRequired={setLocalMonetizationRenewalNotRequired}
          setStartup={setStartup}
          localRelationDiagram={localRelationDiagram}
          setLocalRelationDiagram={setLocalRelationDiagram}
          isEditingRelation={isEditingRelation}
          setIsEditingRelation={setIsEditingRelation}
          setIsRelationUpdateModalOpen={setIsRelationUpdateModalOpen}
        />
      </div>

      {/* モーダル群 */}
      <StartupModals
        startup={startup}
        startupId={startupId}
        isUpdateModalOpen={isUpdateModalOpen}
        setIsUpdateModalOpen={setIsUpdateModalOpen}
        isMonetizationUpdateModalOpen={isMonetizationUpdateModalOpen}
        setIsMonetizationUpdateModalOpen={setIsMonetizationUpdateModalOpen}
        isRelationUpdateModalOpen={isRelationUpdateModalOpen}
        setIsRelationUpdateModalOpen={setIsRelationUpdateModalOpen}
        setStartup={setStartup}
        setLocalMethod={setLocalMethod}
        setLocalMeans={setLocalMeans}
        setLocalObjective={setLocalObjective}
        setLocalMonetizationDiagram={setLocalMonetizationDiagram}
        setLocalRelationDiagram={setLocalRelationDiagram}
      />

      {/* 個別トピック選択モーダル */}
      <TopicSelectModal
        isOpen={isTopicSelectModalOpen}
        onClose={() => setIsTopicSelectModalOpen(false)}
        localTopicIds={localTopicIds}
        setLocalTopicIds={setLocalTopicIds}
        organizationId={organizationId}
        startupId={startupId}
        allOrganizations={allOrganizations}
        allMeetingNotes={allMeetingNotes}
        orgTreeForModal={orgTreeForModal}
        onSave={handleManualSave}
        savingStatus={savingStatus}
        setSavingStatus={setSavingStatus}
        setStartup={setStartup}
      />
      
      {/* AI作文モーダル */}
      <AIGenerationModal
        isOpen={isAIGenerationModalOpen}
        onClose={() => setIsAIGenerationModalOpen(false)}
        target={aiGenerationTarget}
        topics={topics}
        localTopicIds={localTopicIds}
        selectedTopicIdsForAI={selectedTopicIdsForAI}
        setSelectedTopicIdsForAI={setSelectedTopicIdsForAI}
        aiGenerationInput={aiGenerationInput}
        setAIGenerationInput={setAIGenerationInput}
        aiSummaryFormat={aiSummaryFormat}
        setAiSummaryFormat={setAiSummaryFormat}
        aiSummaryLength={aiSummaryLength}
        setAiSummaryLength={setAiSummaryLength}
        aiCustomPrompt={aiCustomPrompt}
        setAiCustomPrompt={setAiCustomPrompt}
        aiGeneratedContent={aiGeneratedContent}
        originalContent={originalContent}
        setAiGeneratedContent={setAiGeneratedContent}
        setAiGeneratedTarget={setAiGeneratedTarget}
        setOriginalContent={setOriginalContent}
        localDescription={localDescription}
        localObjective={localObjective}
        localEvaluation={localEvaluation}
        setLocalDescription={setLocalDescription}
        setLocalObjective={setLocalObjective}
        setLocalEvaluation={setLocalEvaluation}
        setIsEditingDescription={setIsEditingDescription}
        setIsEditingObjective={setIsEditingObjective}
        setIsEditingEvaluation={setIsEditingEvaluation}
        startup={startup}
        categories={categories}
        vcs={vcs}
        departments={departments}
        statuses={statuses}
        engagementLevels={engagementLevels}
        bizDevPhases={bizDevPhases}
      />
    </Layout>
  );
}

export default function StartupDetailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    }>
      <StartupDetailPageContent />
    </Suspense>
  );
}
