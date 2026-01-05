// 型定義を再エクスポート
export type * from './types';

// 共通ユーティリティ関数を再エクスポート
export {
  retryDbOperation,
  tauriConfirm,
  tauriAlert,
  generateUniqueId,
  generateUniqueInitiativeId,
  generateUniqueMeetingNoteId,
  generateUniqueRegulationId,
  generateUniqueStartupId,
  generateUniqueThemeId,
  generateUniqueCategoryId,
  generateUniqueVcId,
  generateUniqueDepartmentId,
  generateUniqueStatusId,
  generateUniqueEngagementLevelId,
  generateUniqueBizDevPhaseId,
} from './utils';

// 各機能モジュールから関数を再エクスポート
// 注意: 一部のモジュールはまだ作成中です
// 作成済みのモジュールからは直接再エクスポートし、未作成のものは元のorgApi.tsから再エクスポートします

// 組織関連
export {
  getOrgTreeFromDb,
  getAllOrganizationsFromTree,
  findOrganizationById,
  createOrg,
  updateOrg,
  updateOrgParent,
  searchOrgsByName,
  getDeletionTargets,
  deleteOrg,
  getOrganizationContent,
  saveOrganizationContent,
} from './organizations';

// メンバー関連
export {
  addOrgMember,
  updateOrgMember,
  deleteOrgMember,
  getOrgMembers,
  getAllMembersBatch,
} from './members';

// 注力施策関連
export {
  getFocusInitiatives,
  getFocusInitiativeByCauseEffectDiagramId,
  getFocusInitiativeById,
  saveFocusInitiative,
  deleteFocusInitiative,
} from './focusInitiatives';

// 議事録関連
export {
  getAllMeetingNotes,
  getMeetingNotes,
  saveMeetingNote,
  getMeetingNoteById,
  deleteMeetingNote,
} from './meetingNotes';

// 制度関連
export {
  getRegulations,
  saveRegulation,
  getRegulationById,
  deleteRegulation,
} from './regulations';

// スタートアップ関連
export {
  getStartups,
  getAllStartups,
  saveStartup,
  getStartupById,
  deleteStartup,
  toggleStartupFavorite,
} from './startups';

// テーマ関連
export {
  getThemes,
  getThemeById,
  saveTheme,
  deleteTheme,
  updateThemePositions,
} from './themes';

// カテゴリー関連
export {
  getCategories,
  getCategoryById,
  saveCategory,
  deleteCategory,
  updateCategoryPositions,
} from './categories';

// VC関連
export {
  getVcs,
  saveVc,
  deleteVc,
  updateVcPositions,
} from './vcs';

// 部署関連
export {
  getDepartments,
  saveDepartment,
  deleteDepartment,
  updateDepartmentPositions,
} from './departments';

// ステータス関連
export {
  getStatuses,
  getStatusById,
  saveStatus,
  deleteStatus,
  updateStatusPositions,
} from './statuses';

// ねじ込み注力度関連
export {
  getEngagementLevels,
  getEngagementLevelById,
  saveEngagementLevel,
  deleteEngagementLevel,
  updateEngagementLevelPositions,
} from './engagementLevels';

// Biz-Devフェーズ関連
export {
  getBizDevPhases,
  getBizDevPhaseById,
  saveBizDevPhase,
  deleteBizDevPhase,
  updateBizDevPhasePositions,
} from './bizDevPhases';

// カテゴリー・Biz-Devフェーズスナップショット関連
export {
  calculateCurrentCounts,
  saveCategoryBizDevPhaseSnapshot,
  getAllCategoryBizDevPhaseSnapshots,
  getCategoryBizDevPhaseSnapshotByDate,
  deleteCategoryBizDevPhaseSnapshot,
} from './categoryBizDevPhaseSnapshots';
export type { CategoryBizDevPhaseSnapshot } from './categoryBizDevPhaseSnapshots';

// トピック関連
export {
  getTopicsByMeetingNote,
  getTopicsByRegulation,
  getAllTopics,
  getAllTopicsBatch,
} from './topics';

// TopicInfo型も再エクスポート
export type { TopicInfo } from './types';

