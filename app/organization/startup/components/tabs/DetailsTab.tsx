'use client';

import React from 'react';
import type { Category, Startup, VC, Department, Status, EngagementLevel, BizDevPhase } from '@/lib/orgApi';
import StatusSection from './sections/StatusSection';
import EngagementLevelSection from './sections/EngagementLevelSection';
import BizDevPhaseSection from './sections/BizDevPhaseSection';
import RelatedVCSection from './sections/RelatedVCSection';
import ResponsibleDeptSection from './sections/ResponsibleDeptSection';
import AgencyContractSection from './sections/AgencyContractSection';
import UrlSection from './sections/UrlSection';
import ContentSection from './sections/ContentSection';
import CategorySection from './sections/CategorySection';

interface DetailsTabProps {
  isEditing: boolean;
  editingContent: string;
  setEditingContent: (content: string) => void;
  // 新しいフィールド
  startup: Startup | null;
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
  // 選択肢のオプション
  categories: Category[];
  vcs: VC[];
  departments: Department[];
  statuses: Status[];
  engagementLevels: EngagementLevel[];
  bizDevPhases: BizDevPhase[];
}

export default function DetailsTab({
  isEditing,
  editingContent,
  setEditingContent,
  startup,
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
}: DetailsTabProps) {


  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>

      {/* カテゴリー */}
      <CategorySection
        localCategory={localCategory}
        setLocalCategory={setLocalCategory}
        categories={categories}
        startup={startup}
        editingContent={editingContent}
        localHpUrl={localHpUrl}
        localAsanaUrl={localAsanaUrl}
        localBoxUrl={localBoxUrl}
      />

      {/* ステータス */}
      <StatusSection
        localStatus={localStatus}
        setLocalStatus={setLocalStatus}
        statuses={statuses}
      />

      {/* 代理店契約締結月 */}
      <AgencyContractSection
        localAgencyContractMonth={localAgencyContractMonth}
        setLocalAgencyContractMonth={setLocalAgencyContractMonth}
      />

      {/* ねじ込み注力度 */}
      <EngagementLevelSection
        localEngagementLevel={localEngagementLevel}
        setLocalEngagementLevel={setLocalEngagementLevel}
        engagementLevels={engagementLevels}
      />

      {/* Biz-Devフェーズ */}
      <BizDevPhaseSection
        localBizDevPhase={localBizDevPhase}
        setLocalBizDevPhase={setLocalBizDevPhase}
        bizDevPhases={bizDevPhases}
      />

      {/* 関連VC */}
      <RelatedVCSection
        localRelatedVCs={localRelatedVCs}
        setLocalRelatedVCs={setLocalRelatedVCs}
        vcs={vcs}
      />

      {/* 主管事業部署 */}
      <ResponsibleDeptSection
        localResponsibleDepts={localResponsibleDepts}
        setLocalResponsibleDepts={setLocalResponsibleDepts}
        departments={departments}
      />

      {/* URLセクション */}
      <UrlSection
        isEditing={isEditing}
        localHpUrl={localHpUrl}
        setLocalHpUrl={setLocalHpUrl}
        localAsanaUrl={localAsanaUrl}
        setLocalAsanaUrl={setLocalAsanaUrl}
        localBoxUrl={localBoxUrl}
        setLocalBoxUrl={setLocalBoxUrl}
      />

      {/* 詳細コンテンツ */}
      <ContentSection
        isEditing={isEditing}
        editingContent={editingContent}
        setEditingContent={setEditingContent}
      />
    </div>
  );
}
