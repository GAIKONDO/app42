'use client';

import React from 'react';
import OverviewTab from './tabs/OverviewTab';
import DetailsTab from './tabs/DetailsTab';
import DeepsearchTab from './tabs/DeepsearchTab';
import CompetitorComparisonTab from './tabs/CompetitorComparisonTab';
import PeriodsTab from './tabs/PeriodsTab';
import RelationsTab from './tabs/RelationsTab';
import MonetizationTab from './tabs/MonetizationTab';
import RelationTab from './tabs/RelationTab';
import type { StartupTab } from './StartupTabBar';
import type { Startup, Category, VC, Department, Status, EngagementLevel, BizDevPhase } from '@/lib/orgApi';

interface StartupTabContentProps {
  activeTab: StartupTab;
  organizationId: string;
  startup: Startup | null;
  startupId: string;
  // Overview Tab
  localAssignee: string[];
  setLocalAssignee: (assignee: string[]) => void;
  assigneeInputRef: React.RefObject<HTMLInputElement>;
  assigneeDropdownRef: React.RefObject<HTMLDivElement>;
  assigneeSearchQuery: string;
  setAssigneeSearchQuery: (query: string) => void;
  isAssigneeDropdownOpen: boolean;
  setIsAssigneeDropdownOpen: (open: boolean) => void;
  orgMembers: Array<{ id: string; name: string; position?: string }>;
  allOrgMembers: Array<{ id: string; name: string; position?: string; organizationId?: string }>;
  manualAssigneeInput: string;
  setManualAssigneeInput: (input: string) => void;
  localDescription: string;
  setLocalDescription: (description: string) => void;
  descriptionTextareaId: string;
  isEditingDescription: boolean;
  setIsEditingDescription: (editing: boolean) => void;
  setAIGenerationTarget: (target: 'description' | 'objective' | 'evaluation' | null) => void;
  setAIGenerationInput: (input: string) => void;
  setSelectedTopicIdsForAI: (ids: string[]) => void;
  setAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  setAiSummaryLength: (length: number) => void;
  setAiCustomPrompt: (prompt: string) => void;
  setIsAIGenerationModalOpen: (open: boolean) => void;
  isAIGenerationModalOpen: boolean;
  aiGeneratedTarget: 'description' | 'objective' | 'evaluation' | null;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  setAiGeneratedContent: (content: string | null) => void;
  setAiGeneratedTarget: (target: 'description' | 'objective' | 'evaluation' | null) => void;
  setOriginalContent: (content: string | null) => void;
  localObjective: string;
  setLocalObjective: (objective: string) => void;
  objectiveTextareaId: string;
  isEditingObjective: boolean;
  setIsEditingObjective: (editing: boolean) => void;
  localEvaluation: string;
  setLocalEvaluation: (evaluation: string) => void;
  evaluationTextareaId: string;
  isEditingEvaluation: boolean;
  setIsEditingEvaluation: (editing: boolean) => void;
  localEvaluationChart: any;
  setLocalEvaluationChart: (chart: any) => void;
  localEvaluationChartSnapshots: any[];
  setLocalEvaluationChartSnapshots: (snapshots: any[]) => void;
  isEditingChart: boolean;
  setIsEditingChart: (editing: boolean) => void;
  // Details Tab
  isEditing: boolean;
  editingContent: string;
  setEditingContent: (content: string) => void;
  localCategory: string[];
  setLocalCategory: (category: string[]) => void;
  localStatus: string;
  setLocalStatus: (status: string) => void;
  localAgencyContractMonth: string;
  setLocalAgencyContractMonth: (month: string) => void;
  localEngagementLevel: string;
  setLocalEngagementLevel: (level: string) => void;
  localBizDevPhase: string;
  setLocalBizDevPhase: (phase: string) => void;
  localRelatedVCs: string[];
  setLocalRelatedVCs: (vcs: string[]) => void;
  localResponsibleDepts: string[];
  setLocalResponsibleDepts: (depts: string[]) => void;
  localHpUrl: string;
  setLocalHpUrl: (url: string) => void;
  localAsanaUrl: string;
  setLocalAsanaUrl: (url: string) => void;
  localBoxUrl: string;
  setLocalBoxUrl: (url: string) => void;
  categories: Category[];
  vcs: VC[];
  departments: Department[];
  statuses: Status[];
  engagementLevels: EngagementLevel[];
  bizDevPhases: BizDevPhase[];
  // Periods Tab
  localConsiderationStartPeriod: string;
  setLocalConsiderationStartPeriod: (period: string) => void;
  localConsiderationEndPeriod: string;
  setLocalConsiderationEndPeriod: (period: string) => void;
  localExecutionStartPeriod: string;
  setLocalExecutionStartPeriod: (period: string) => void;
  localExecutionEndPeriod: string;
  setLocalExecutionEndPeriod: (period: string) => void;
  localMonetizationStartPeriod: string;
  setLocalMonetizationStartPeriod: (period: string) => void;
  localMonetizationEndPeriod: string;
  setLocalMonetizationEndPeriod: (period: string) => void;
  localMonetizationRenewalNotRequired: boolean;
  setLocalMonetizationRenewalNotRequired: (value: boolean) => void;
  // Relations Tab
  localCauseEffectCode: string;
  setLocalCauseEffectCode: (code: string) => void;
  localMethodForDiagram: string[];
  localMeansForDiagram: string[];
  localObjectiveForDiagram: string;
  isEditingCauseEffect: boolean;
  setIsEditingCauseEffect: (editing: boolean) => void;
  setIsUpdateModalOpen: (open: boolean) => void;
  // Monetization Tab
  setStartup: (startup: Startup) => void;
  localMonetizationDiagram: string;
  setLocalMonetizationDiagram: (diagram: string) => void;
  isEditingMonetization: boolean;
  setIsEditingMonetization: (editing: boolean) => void;
  setIsMonetizationUpdateModalOpen: (open: boolean) => void;
  // Relation Tab
  localRelationDiagram: string;
  setLocalRelationDiagram: (diagram: string) => void;
  isEditingRelation: boolean;
  setIsEditingRelation: (editing: boolean) => void;
  setIsRelationUpdateModalOpen: (open: boolean) => void;
}

export default function StartupTabContent({
  activeTab,
  organizationId,
  startup,
  startupId,
  localAssignee,
  setLocalAssignee,
  assigneeInputRef,
  assigneeDropdownRef,
  assigneeSearchQuery,
  setAssigneeSearchQuery,
  isAssigneeDropdownOpen,
  setIsAssigneeDropdownOpen,
  orgMembers,
  allOrgMembers,
  manualAssigneeInput,
  setManualAssigneeInput,
  localDescription,
  setLocalDescription,
  descriptionTextareaId,
  isEditingDescription,
  setIsEditingDescription,
  setAIGenerationTarget,
  setAIGenerationInput,
  setSelectedTopicIdsForAI,
  setAiSummaryFormat,
  setAiSummaryLength,
  setAiCustomPrompt,
  setIsAIGenerationModalOpen,
  isAIGenerationModalOpen,
  aiGeneratedTarget,
  aiGeneratedContent,
  originalContent,
  setAiGeneratedContent,
  setAiGeneratedTarget,
  setOriginalContent,
  localObjective,
  setLocalObjective,
  objectiveTextareaId,
  isEditingObjective,
  setIsEditingObjective,
  localEvaluation,
  setLocalEvaluation,
  evaluationTextareaId,
  isEditingEvaluation,
  setIsEditingEvaluation,
  localEvaluationChart,
  setLocalEvaluationChart,
  localEvaluationChartSnapshots,
  setLocalEvaluationChartSnapshots,
  isEditingChart,
  setIsEditingChart,
  isEditing,
  editingContent,
  setEditingContent,
  localCategory,
  setLocalCategory,
  localStatus,
  setLocalStatus,
  localAgencyContractMonth,
  setLocalAgencyContractMonth,
  localEngagementLevel,
  setLocalEngagementLevel,
  localBizDevPhase,
  setLocalBizDevPhase,
  localRelatedVCs,
  setLocalRelatedVCs,
  localResponsibleDepts,
  setLocalResponsibleDepts,
  localHpUrl,
  setLocalHpUrl,
  localAsanaUrl,
  setLocalAsanaUrl,
  localBoxUrl,
  setLocalBoxUrl,
  categories,
  vcs,
  departments,
  statuses,
  engagementLevels,
  bizDevPhases,
  localConsiderationStartPeriod,
  setLocalConsiderationStartPeriod,
  localConsiderationEndPeriod,
  setLocalConsiderationEndPeriod,
  localExecutionStartPeriod,
  setLocalExecutionStartPeriod,
  localExecutionEndPeriod,
  setLocalExecutionEndPeriod,
  localMonetizationStartPeriod,
  setLocalMonetizationStartPeriod,
  localMonetizationEndPeriod,
  setLocalMonetizationEndPeriod,
  localMonetizationRenewalNotRequired,
  setLocalMonetizationRenewalNotRequired,
  localCauseEffectCode,
  setLocalCauseEffectCode,
  localMethodForDiagram,
  localMeansForDiagram,
  localObjectiveForDiagram,
  isEditingCauseEffect,
  setIsEditingCauseEffect,
  setIsUpdateModalOpen,
  setStartup,
  localMonetizationDiagram,
  setLocalMonetizationDiagram,
  isEditingMonetization,
  setIsEditingMonetization,
  setIsMonetizationUpdateModalOpen,
  localRelationDiagram,
  setLocalRelationDiagram,
  isEditingRelation,
  setIsEditingRelation,
  setIsRelationUpdateModalOpen,
}: StartupTabContentProps) {
  switch (activeTab) {
    case 'overview':
      return (
        <OverviewTab
          organizationId={organizationId}
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
        />
      );
      
    case 'details':
      return (
        <DetailsTab
          isEditing={isEditing}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          startup={startup}
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
        />
      );
      
    case 'deepsearch':
      return (
        <DeepsearchTab
          startup={startup}
          organizationId={organizationId}
          setStartup={setStartup}
        />
      );
      
    case 'competitor-comparison':
      return (
        <CompetitorComparisonTab
          startup={startup}
          organizationId={organizationId}
          setStartup={setStartup}
        />
      );
      
    case 'periods':
      return (
        <PeriodsTab
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
        />
      );
      
    case 'relations':
      if (!startup) return null;
      return (
        <RelationsTab
          startup={startup}
          localCauseEffectCode={localCauseEffectCode}
          setLocalCauseEffectCode={setLocalCauseEffectCode}
          localMethod={localMethodForDiagram}
          localMeans={localMeansForDiagram}
          localObjective={localObjectiveForDiagram}
          isEditingCauseEffect={isEditingCauseEffect}
          setIsEditingCauseEffect={setIsEditingCauseEffect}
          setIsUpdateModalOpen={setIsUpdateModalOpen}
        />
      );
      
    case 'monetization':
      return (
        <MonetizationTab
          startup={startup}
          setStartup={setStartup}
          startupId={startupId}
          localMonetizationDiagram={localMonetizationDiagram}
          setLocalMonetizationDiagram={setLocalMonetizationDiagram}
          isEditingMonetization={isEditingMonetization}
          setIsEditingMonetization={setIsEditingMonetization}
          setIsMonetizationUpdateModalOpen={setIsMonetizationUpdateModalOpen}
        />
      );
      
    case 'relation':
      return (
        <RelationTab
          startup={startup}
          setStartup={setStartup}
          startupId={startupId}
          localRelationDiagram={localRelationDiagram}
          setLocalRelationDiagram={setLocalRelationDiagram}
          isEditingRelation={isEditingRelation}
          setIsEditingRelation={setIsEditingRelation}
          setIsRelationUpdateModalOpen={setIsRelationUpdateModalOpen}
        />
      );
      
    default:
      return null;
  }
}

