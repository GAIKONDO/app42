'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import type { FocusInitiative } from '@/lib/orgApi';
import MermaidLoader from '@/components/MermaidLoader';
import { generateUniqueId, saveFocusInitiative } from '@/lib/orgApi';
import { InitiativeTabBar } from './components/InitiativeTabBar';
import AIGenerationModal from './components/modals/AIGenerationModal';
import { useInitiativeData } from './hooks/useInitiativeData';
import InitiativePageHeader from './components/InitiativePageHeader';
import ThemeSelectionSection from './components/ThemeSelectionSection';
import TopicSelectionSection from './components/TopicSelectionSection';
import InitiativeIdLinks from './components/InitiativeIdLinks';
import TopicSelectModal from './components/modals/TopicSelectModal';
import { useInitiativeSave } from './hooks/useInitiativeSave';
import InitiativeTabContent from './components/InitiativeTabContent';
import InitiativeModals from './components/InitiativeModals';
import { LoadingState, ErrorState } from './components/LoadingAndErrorStates';

import type { InitiativeTab } from './components/InitiativeTabBar';

function FocusInitiativeDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizationId = searchParams?.get('organizationId') as string;
  const initiativeId = searchParams?.get('initiativeId') as string;
  
  // データ取得カスタムフック
  const {
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
  } = useInitiativeData(organizationId, initiativeId);
  
  const [activeTab, setActiveTab] = useState<InitiativeTab>('overview');
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
  const [localConsiderationPeriod, setLocalConsiderationPeriod] = useState(initialLocalState.considerationPeriod);
  const [localExecutionPeriod, setLocalExecutionPeriod] = useState(initialLocalState.executionPeriod);
  const [localMonetizationPeriod, setLocalMonetizationPeriod] = useState(initialLocalState.monetizationPeriod);
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
  const [isTopicsExpanded, setIsTopicsExpanded] = useState(false);
  const [isTopicSelectModalOpen, setIsTopicSelectModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isMonetizationUpdateModalOpen, setIsMonetizationUpdateModalOpen] = useState(false);
  const [isRelationUpdateModalOpen, setIsRelationUpdateModalOpen] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [manualAssigneeInput, setManualAssigneeInput] = useState('');
  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // 組織変更ハンドラー
  const handleOrganizationChange = async (newOrganizationId: string) => {
    if (!initiative || !initiativeId) {
      console.error('❌ [ページ] 注力施策データがありません');
      return;
    }

    try {
      console.log('🔄 [ページ] 組織変更を開始:', {
        initiativeId,
        currentOrganizationId: organizationId,
        newOrganizationId,
      });

      // 注力施策のorganizationIdを更新
      await saveFocusInitiative({
        ...initiative,
        organizationId: newOrganizationId,
      });

      console.log('✅ [ページ] 組織変更が完了しました。ページを遷移します。');

      // 新しい組織の注力施策ページに遷移
      router.push(`/organization/initiative?organizationId=${newOrganizationId}&initiativeId=${initiativeId}`);
    } catch (error: any) {
      console.error('❌ [ページ] 組織変更エラー:', error);
      throw error;
    }
  };
  
  // initialLocalStateが更新されたらローカル状態を更新
  useEffect(() => {
    if (initialLocalState.content) {
      setEditingContent(initialLocalState.content);
      setLocalAssignee(initialLocalState.assignee);
      setLocalDescription(initialLocalState.description);
      setLocalMethod(initialLocalState.method);
      setLocalMethodOther(initialLocalState.methodOther);
      setLocalMeans(initialLocalState.means);
      setLocalMeansOther(initialLocalState.meansOther);
      setLocalObjective(initialLocalState.objective);
      setLocalConsiderationPeriod(initialLocalState.considerationPeriod);
      setLocalExecutionPeriod(initialLocalState.executionPeriod);
      setLocalMonetizationPeriod(initialLocalState.monetizationPeriod);
      setLocalRelatedOrganizations(initialLocalState.relatedOrganizations);
      setLocalRelatedGroupCompanies(initialLocalState.relatedGroupCompanies);
      setLocalMonetizationDiagram(initialLocalState.monetizationDiagram);
      setLocalRelationDiagram(initialLocalState.relationDiagram);
      setLocalCauseEffectCode(initialLocalState.causeEffectCode);
      setLocalThemeIds(initialLocalState.themeIds);
      setLocalTopicIds(initialLocalState.topicIds);
    }
  }, [initialLocalState]);
  
  // AI作文モーダル関連
  const [isAIGenerationModalOpen, setIsAIGenerationModalOpen] = useState(false);
  const [aiGenerationTarget, setAIGenerationTarget] = useState<'description' | 'objective' | null>(null);
  const [aiGenerationInput, setAIGenerationInput] = useState('');
  const [selectedTopicIdsForAI, setSelectedTopicIdsForAI] = useState<string[]>([]);
  const [aiSummaryFormat, setAiSummaryFormat] = useState<'auto' | 'bullet' | 'paragraph' | 'custom'>('auto');
  const [aiSummaryLength, setAiSummaryLength] = useState<number>(500);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [descriptionTextareaId] = useState(() => generateUniqueId());
  const [objectiveTextareaId] = useState(() => generateUniqueId());
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  
  // AI生成結果の比較用
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [aiGeneratedTarget, setAiGeneratedTarget] = useState<'description' | 'objective' | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  
  // 保存とダウンロードのカスタムフック
  const { handleManualSave, handleDownloadJson } = useInitiativeSave({
    initiative,
    initiativeId,
    editingContent,
    localAssignee,
    localDescription,
    localMethod,
    localMethodOther,
    localMeans,
    localMeansOther,
    localObjective,
    localConsiderationPeriod,
    localExecutionPeriod,
    localMonetizationPeriod,
    localRelatedOrganizations,
    localRelatedGroupCompanies,
    localMonetizationDiagram,
    localRelationDiagram,
    localCauseEffectCode,
    localThemeIds,
    localTopicIds,
    setInitiative,
    setEditingContent,
    setLocalAssignee,
    setLocalDescription,
    setLocalMethod,
    setLocalMethodOther,
    setLocalMeans,
    setLocalMeansOther,
    setLocalObjective,
    setLocalConsiderationPeriod,
    setLocalExecutionPeriod,
    setLocalMonetizationPeriod,
    setLocalRelatedOrganizations,
    setLocalRelatedGroupCompanies,
    setLocalMonetizationDiagram,
    setLocalRelationDiagram,
    setLocalThemeIds,
    setLocalTopicIds,
    setSavingStatus,
  });
  
  // 選択肢のマスターデータ（デフォルト値）
  const [methodOptions] = useState(['協業・連携', 'ベンチャー投資', '一般投資', '投資・関連会社化', '投資・子会社化', '投資・完全子会社化', 'JV設立', '組織再編', '人材育成', '新会社設立', 'その他']);
  const [meansOptions] = useState(['技術開発', '事業開発', 'マーケティング', '営業', 'その他']);

  
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

  const shouldShowError = error || !initiative || !orgData;
  
  if (shouldShowError) {
    return <ErrorState error={error} organizationId={organizationId} />;
  }


  return (
    <Layout>
      <MermaidLoader />
      <div className="card" style={{ padding: '24px' }}>
        <InitiativePageHeader
          orgData={orgData}
          initiative={initiative}
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
          
          {/* 注力施策IDと特性要因図IDのリンク */}
          <InitiativeIdLinks
            initiative={initiative}
            organizationId={organizationId}
            initiativeId={initiativeId}
          />
        </div>

        {/* タブナビゲーション */}
        <InitiativeTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* タブコンテンツ */}
        <InitiativeTabContent
          activeTab={activeTab}
          organizationId={organizationId}
          initiative={initiative}
          initiativeId={initiativeId}
          localAssignee={localAssignee}
          setLocalAssignee={setLocalAssignee}
          assigneeInputRef={assigneeInputRef}
          assigneeDropdownRef={assigneeDropdownRef}
          assigneeSearchQuery={assigneeSearchQuery}
          setAssigneeSearchQuery={setAssigneeSearchQuery}
          isAssigneeDropdownOpen={isAssigneeDropdownOpen}
          setIsAssigneeDropdownOpen={setIsAssigneeDropdownOpen}
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
          methodOptions={methodOptions}
          localMethod={localMethod}
          setLocalMethod={setLocalMethod}
          localMethodOther={localMethodOther}
          setLocalMethodOther={setLocalMethodOther}
          meansOptions={meansOptions}
          localMeans={localMeans}
          setLocalMeans={setLocalMeans}
          localMeansOther={localMeansOther}
          setLocalMeansOther={setLocalMeansOther}
          isEditing={isEditing}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          localConsiderationPeriod={localConsiderationPeriod}
          setLocalConsiderationPeriod={setLocalConsiderationPeriod}
          localExecutionPeriod={localExecutionPeriod}
          setLocalExecutionPeriod={setLocalExecutionPeriod}
          localMonetizationPeriod={localMonetizationPeriod}
          setLocalMonetizationPeriod={setLocalMonetizationPeriod}
          localCauseEffectCode={localCauseEffectCode}
          setLocalCauseEffectCode={setLocalCauseEffectCode}
          localMethodForDiagram={localMethod}
          localMeansForDiagram={localMeans}
          localObjectiveForDiagram={localObjective}
          isEditingCauseEffect={isEditingCauseEffect}
          setIsEditingCauseEffect={setIsEditingCauseEffect}
          setIsUpdateModalOpen={setIsUpdateModalOpen}
          setInitiative={setInitiative}
          localMonetizationDiagram={localMonetizationDiagram}
          setLocalMonetizationDiagram={setLocalMonetizationDiagram}
          isEditingMonetization={isEditingMonetization}
          setIsEditingMonetization={setIsEditingMonetization}
          setIsMonetizationUpdateModalOpen={setIsMonetizationUpdateModalOpen}
          localRelationDiagram={localRelationDiagram}
          setLocalRelationDiagram={setLocalRelationDiagram}
          isEditingRelation={isEditingRelation}
          setIsEditingRelation={setIsEditingRelation}
          setIsRelationUpdateModalOpen={setIsRelationUpdateModalOpen}
        />
      </div>

      {/* モーダル群 */}
      <InitiativeModals
        initiative={initiative}
        initiativeId={initiativeId}
        isUpdateModalOpen={isUpdateModalOpen}
        setIsUpdateModalOpen={setIsUpdateModalOpen}
        isMonetizationUpdateModalOpen={isMonetizationUpdateModalOpen}
        setIsMonetizationUpdateModalOpen={setIsMonetizationUpdateModalOpen}
        isRelationUpdateModalOpen={isRelationUpdateModalOpen}
        setIsRelationUpdateModalOpen={setIsRelationUpdateModalOpen}
        setInitiative={setInitiative}
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
        initiativeId={initiativeId}
        allOrganizations={allOrganizations}
        allMeetingNotes={allMeetingNotes}
        orgTreeForModal={orgTreeForModal}
        onSave={handleManualSave}
        savingStatus={savingStatus}
        setSavingStatus={setSavingStatus}
        setInitiative={setInitiative}
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
        setLocalDescription={setLocalDescription}
        setLocalObjective={setLocalObjective}
        setIsEditingDescription={setIsEditingDescription}
        setIsEditingObjective={setIsEditingObjective}
      />
    </Layout>
  );
}

export default function FocusInitiativeDetailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p>データを読み込み中...</p>
        </div>
      </Layout>
    }>
      <FocusInitiativeDetailPageContent />
    </Suspense>
  );
}
