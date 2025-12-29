'use client';

import { useState, useEffect } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Category, Startup, VC, Department, Status, EngagementLevel, BizDevPhase } from '@/lib/orgApi';
import { useCategoryManagement } from '../hooks/useCategoryManagement';
import { useVcManagement } from '../hooks/useVcManagement';
import { useDepartmentManagement } from '../hooks/useDepartmentManagement';
import { useStatusManagement } from '../hooks/useStatusManagement';
import { useEngagementLevelManagement } from '../hooks/useEngagementLevelManagement';
import { useBizDevPhaseManagement } from '../hooks/useBizDevPhaseManagement';
import { SectionTabBar } from './CategoryManagementTab/SectionTabBar';
import { CategorySection } from './CategoryManagementTab/CategorySection';
import { VcSection } from './CategoryManagementTab/VcSection';
import { DepartmentSection } from './CategoryManagementTab/DepartmentSection';
import { StatusSection } from './CategoryManagementTab/StatusSection';
import { EngagementLevelSection } from './CategoryManagementTab/EngagementLevelSection';
import { BizDevPhaseSection } from './CategoryManagementTab/BizDevPhaseSection';
import CategoryModal from '../modals/CategoryModal';
import DeleteCategoryModal from '../modals/DeleteCategoryModal';
import EditCategoriesModal from '../modals/EditCategoriesModal';
import ParentCategorySelectModal from '../modals/ParentCategorySelectModal';
import VcModal from '../modals/VcModal';
import DeleteVcModal from '../modals/DeleteVcModal';
import EditVcsModal from '../modals/EditVcsModal';
import DepartmentModal from '../modals/DepartmentModal';
import DeleteDepartmentModal from '../modals/DeleteDepartmentModal';
import EditDepartmentsModal from '../modals/EditDepartmentsModal';
import StatusModal from '../modals/StatusModal';
import EngagementLevelModal from '../modals/EngagementLevelModal';
import BizDevPhaseModal from '../modals/BizDevPhaseModal';
import EditStatusesModal from '../modals/EditStatusesModal';
import DeleteStatusModal from '../modals/DeleteStatusModal';
import EditEngagementLevelsModal from '../modals/EditEngagementLevelsModal';
import DeleteEngagementLevelModal from '../modals/DeleteEngagementLevelModal';
import EditBizDevPhasesModal from '../modals/EditBizDevPhasesModal';
import DeleteBizDevPhaseModal from '../modals/DeleteBizDevPhaseModal';

interface CategoryManagementTabProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  vcs: VC[];
  setVcs: React.Dispatch<React.SetStateAction<VC[]>>;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  statuses: Status[];
  setStatuses: React.Dispatch<React.SetStateAction<Status[]>>;
  engagementLevels: EngagementLevel[];
  setEngagementLevels: React.Dispatch<React.SetStateAction<EngagementLevel[]>>;
  bizDevPhases: BizDevPhase[];
  setBizDevPhases: React.Dispatch<React.SetStateAction<BizDevPhase[]>>;
  startups: Startup[];
  refreshCategories: () => Promise<void>;
  refreshVcs: () => Promise<void>;
  refreshDepartments: () => Promise<void>;
  refreshStatuses: () => Promise<void>;
  refreshEngagementLevels: () => Promise<void>;
  refreshBizDevPhases: () => Promise<void>;
}

export function CategoryManagementTab({
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
  refreshCategories,
  refreshVcs,
  refreshDepartments,
  refreshStatuses,
  refreshEngagementLevels,
  refreshBizDevPhases,
}: CategoryManagementTabProps) {
  const categoryManagement = useCategoryManagement(categories, setCategories);
  const vcManagement = useVcManagement(vcs, setVcs);
  const departmentManagement = useDepartmentManagement(departments, setDepartments);
  const statusManagement = useStatusManagement(statuses, setStatuses);
  const engagementLevelManagement = useEngagementLevelManagement(engagementLevels, setEngagementLevels);
  const bizDevPhaseManagement = useBizDevPhaseManagement(bizDevPhases, setBizDevPhases);
  const [activeSection, setActiveSection] = useState<'categories' | 'vcs' | 'departments' | 'statuses' | 'engagementLevels' | 'bizDevPhases'>('categories');

  useEffect(() => {
    if (categories.length > 0) {
      categoryManagement.initializeOrderedCategories(categories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (vcs.length > 0) {
      vcManagement.initializeOrderedVcs(vcs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcs]);

  useEffect(() => {
    if (departments.length > 0) {
      departmentManagement.initializeOrderedDepartments(departments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments]);

  useEffect(() => {
    if (statuses && statuses.length > 0) {
      statusManagement.initializeOrderedStatuses(statuses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses]);

  useEffect(() => {
    if (engagementLevels && engagementLevels.length > 0) {
      engagementLevelManagement.initializeOrderedEngagementLevels(engagementLevels);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementLevels]);

  useEffect(() => {
    if (bizDevPhases && bizDevPhases.length > 0) {
      bizDevPhaseManagement.initializeOrderedBizDevPhases(bizDevPhases);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizDevPhases]);

  return (
    <div>
      <SectionTabBar activeSection={activeSection} onSectionChange={setActiveSection} />

      {activeSection === 'categories' && (
        <CategorySection
          categories={categories}
          setCategories={setCategories}
          startups={startups}
          categoryManagement={categoryManagement}
        />
      )}

      {activeSection === 'vcs' && (
        <VcSection
          vcs={vcs}
          setVcs={setVcs}
          startups={startups}
          vcManagement={vcManagement}
        />
      )}

      {activeSection === 'departments' && (
        <DepartmentSection
          departments={departments}
          setDepartments={setDepartments}
          startups={startups}
          departmentManagement={departmentManagement}
        />
      )}

      {activeSection === 'statuses' && (
        <StatusSection
          statuses={statuses}
          setStatuses={setStatuses}
          startups={startups}
          statusManagement={statusManagement}
        />
      )}

      {activeSection === 'engagementLevels' && (
        <EngagementLevelSection
          engagementLevels={engagementLevels}
          setEngagementLevels={setEngagementLevels}
          startups={startups}
          engagementLevelManagement={engagementLevelManagement}
        />
      )}

      {activeSection === 'bizDevPhases' && (
        <BizDevPhaseSection
          bizDevPhases={bizDevPhases}
          setBizDevPhases={setBizDevPhases}
          startups={startups}
          bizDevPhaseManagement={bizDevPhaseManagement}
        />
      )}

      <StatusModal
        isOpen={statusManagement.showStatusModal}
        editingStatus={statusManagement.editingStatus}
        statusFormTitle={statusManagement.statusFormTitle}
        statusFormDescription={statusManagement.statusFormDescription}
        showEditStatusesModal={statusManagement.showEditStatusesModal}
        onClose={() => {
          statusManagement.setShowStatusModal(false);
          statusManagement.setEditingStatus(null);
          statusManagement.setStatusFormTitle('');
          statusManagement.setStatusFormDescription('');
        }}
        onTitleChange={statusManagement.setStatusFormTitle}
        onDescriptionChange={statusManagement.setStatusFormDescription}
        onStatusSaved={(refreshedStatuses) => {
          setStatuses(refreshedStatuses);
          statusManagement.initializeOrderedStatuses(refreshedStatuses);
        }}
        onEditStatusesModalReopen={() => statusManagement.setShowEditStatusesModal(true)}
      />

      <EngagementLevelModal
        isOpen={engagementLevelManagement.showEngagementLevelModal}
        editingEngagementLevel={engagementLevelManagement.editingEngagementLevel}
        engagementLevelFormTitle={engagementLevelManagement.engagementLevelFormTitle}
        engagementLevelFormDescription={engagementLevelManagement.engagementLevelFormDescription}
        showEditEngagementLevelsModal={engagementLevelManagement.showEditEngagementLevelsModal}
        onClose={() => {
          engagementLevelManagement.setShowEngagementLevelModal(false);
          engagementLevelManagement.setEditingEngagementLevel(null);
          engagementLevelManagement.setEngagementLevelFormTitle('');
          engagementLevelManagement.setEngagementLevelFormDescription('');
        }}
        onTitleChange={engagementLevelManagement.setEngagementLevelFormTitle}
        onDescriptionChange={engagementLevelManagement.setEngagementLevelFormDescription}
        onEngagementLevelSaved={(refreshedEngagementLevels) => {
          setEngagementLevels(refreshedEngagementLevels);
          engagementLevelManagement.initializeOrderedEngagementLevels(refreshedEngagementLevels);
        }}
        onEditEngagementLevelsModalReopen={() => engagementLevelManagement.setShowEditEngagementLevelsModal(true)}
      />

      <BizDevPhaseModal
        isOpen={bizDevPhaseManagement.showBizDevPhaseModal}
        editingBizDevPhase={bizDevPhaseManagement.editingBizDevPhase}
        bizDevPhaseFormTitle={bizDevPhaseManagement.bizDevPhaseFormTitle}
        bizDevPhaseFormDescription={bizDevPhaseManagement.bizDevPhaseFormDescription}
        showEditBizDevPhasesModal={bizDevPhaseManagement.showEditBizDevPhasesModal}
        onClose={() => {
          bizDevPhaseManagement.setShowBizDevPhaseModal(false);
          bizDevPhaseManagement.setEditingBizDevPhase(null);
          bizDevPhaseManagement.setBizDevPhaseFormTitle('');
          bizDevPhaseManagement.setBizDevPhaseFormDescription('');
        }}
        onTitleChange={bizDevPhaseManagement.setBizDevPhaseFormTitle}
        onDescriptionChange={bizDevPhaseManagement.setBizDevPhaseFormDescription}
        onBizDevPhaseSaved={(refreshedBizDevPhases) => {
          setBizDevPhases(refreshedBizDevPhases);
          bizDevPhaseManagement.initializeOrderedBizDevPhases(refreshedBizDevPhases);
        }}
        onEditBizDevPhasesModalReopen={() => bizDevPhaseManagement.setShowEditBizDevPhasesModal(true)}
      />

      <ParentCategorySelectModal
        isOpen={categoryManagement.showParentCategorySelectModal}
        categories={categories}
        onClose={() => {
          categoryManagement.setShowParentCategorySelectModal(false);
        }}
        onSelect={(parentId) => {
          categoryManagement.setEditingCategory(null);
          categoryManagement.setCategoryFormTitle('');
          categoryManagement.setCategoryFormDescription('');
          categoryManagement.setCategoryFormParentId(parentId);
          categoryManagement.setShowCategoryModal(true);
        }}
      />

      <CategoryModal
        isOpen={categoryManagement.showCategoryModal}
        editingCategory={categoryManagement.editingCategory}
        categoryFormTitle={categoryManagement.categoryFormTitle}
        categoryFormDescription={categoryManagement.categoryFormDescription}
        categoryFormParentId={categoryManagement.categoryFormParentId}
        categories={categories}
        showEditCategoriesModal={categoryManagement.showEditCategoriesModal}
        onClose={() => {
          categoryManagement.setShowCategoryModal(false);
          categoryManagement.setEditingCategory(null);
          categoryManagement.setCategoryFormTitle('');
          categoryManagement.setCategoryFormDescription('');
          categoryManagement.setCategoryFormParentId(null);
        }}
        onTitleChange={categoryManagement.setCategoryFormTitle}
        onDescriptionChange={categoryManagement.setCategoryFormDescription}
        onParentIdChange={categoryManagement.setCategoryFormParentId}
        onCategorySaved={(categories) => {
          setCategories(categories);
          categoryManagement.initializeOrderedCategories(categories);
        }}
        onEditCategoriesModalReopen={() => categoryManagement.setShowEditCategoriesModal(true)}
      />

      <DeleteCategoryModal
        isOpen={categoryManagement.showDeleteModal}
        categoryToDelete={categoryManagement.categoryToDelete}
        onClose={() => {
          categoryManagement.setShowDeleteModal(false);
          categoryManagement.setCategoryToDelete(null);
        }}
        onDelete={async () => {
          await categoryManagement.refreshCategories();
        }}
      />

      <EditCategoriesModal
        isOpen={categoryManagement.showEditCategoriesModal}
        orderedCategories={categoryManagement.orderedCategories}
        sensors={sensors}
        onClose={() => categoryManagement.setShowEditCategoriesModal(false)}
        onDragEnd={categoryManagement.handleDragEnd}
        onEdit={(category) => {
          categoryManagement.setEditingCategory(category);
          categoryManagement.setCategoryFormTitle(category.title);
          categoryManagement.setCategoryFormDescription(category.description || '');
          categoryManagement.setCategoryFormParentId(category.parentCategoryId || null);
          categoryManagement.setShowEditCategoriesModal(false);
          categoryManagement.setShowCategoryModal(true);
        }}
        onDelete={(category) => {
          categoryManagement.setCategoryToDelete(category);
          categoryManagement.setShowDeleteModal(true);
        }}
      />

      {/* VCモーダル */}
      <VcModal
        isOpen={vcManagement.showVcModal}
        editingVc={vcManagement.editingVc}
        vcFormTitle={vcManagement.vcFormTitle}
        vcFormDescription={vcManagement.vcFormDescription}
        showEditVcsModal={vcManagement.showEditVcsModal}
        onClose={() => {
          vcManagement.setShowVcModal(false);
          vcManagement.setEditingVc(null);
          vcManagement.setVcFormTitle('');
          vcManagement.setVcFormDescription('');
        }}
        onTitleChange={vcManagement.setVcFormTitle}
        onDescriptionChange={vcManagement.setVcFormDescription}
        onVcSaved={(vcs) => {
          setVcs(vcs);
          vcManagement.initializeOrderedVcs(vcs);
        }}
        onEditVcsModalReopen={() => vcManagement.setShowEditVcsModal(true)}
      />

      <DeleteVcModal
        isOpen={vcManagement.showDeleteModal}
        vcToDelete={vcManagement.vcToDelete}
        onClose={() => {
          vcManagement.setShowDeleteModal(false);
          vcManagement.setVcToDelete(null);
        }}
        onDelete={async () => {
          await vcManagement.refreshVcs();
        }}
      />

      <EditVcsModal
        isOpen={vcManagement.showEditVcsModal}
        orderedVcs={vcManagement.orderedVcs}
        sensors={sensors}
        onClose={() => vcManagement.setShowEditVcsModal(false)}
        onDragEnd={vcManagement.handleDragEnd}
        onEdit={(vc) => {
          vcManagement.setEditingVc(vc);
          vcManagement.setVcFormTitle(vc.title);
          vcManagement.setVcFormDescription(vc.description || '');
          vcManagement.setShowEditVcsModal(false);
          vcManagement.setShowVcModal(true);
        }}
        onDelete={(vc) => {
          vcManagement.setVcToDelete(vc);
          vcManagement.setShowDeleteModal(true);
        }}
      />

      {/* 部署モーダル */}
      <DepartmentModal
        isOpen={departmentManagement.showDepartmentModal}
        editingDepartment={departmentManagement.editingDepartment}
        departmentFormTitle={departmentManagement.departmentFormTitle}
        departmentFormDescription={departmentManagement.departmentFormDescription}
        showEditDepartmentsModal={departmentManagement.showEditDepartmentsModal}
        onClose={() => {
          departmentManagement.setShowDepartmentModal(false);
          departmentManagement.setEditingDepartment(null);
          departmentManagement.setDepartmentFormTitle('');
          departmentManagement.setDepartmentFormDescription('');
        }}
        onTitleChange={departmentManagement.setDepartmentFormTitle}
        onDescriptionChange={departmentManagement.setDepartmentFormDescription}
        onDepartmentSaved={(departments) => {
          setDepartments(departments);
          departmentManagement.initializeOrderedDepartments(departments);
        }}
        onEditDepartmentsModalReopen={() => departmentManagement.setShowEditDepartmentsModal(true)}
      />

      <DeleteDepartmentModal
        isOpen={departmentManagement.showDeleteModal}
        departmentToDelete={departmentManagement.departmentToDelete}
        onClose={() => {
          departmentManagement.setShowDeleteModal(false);
          departmentManagement.setDepartmentToDelete(null);
        }}
        onDelete={async () => {
          await departmentManagement.refreshDepartments();
        }}
      />

      <EditDepartmentsModal
        isOpen={departmentManagement.showEditDepartmentsModal}
        orderedDepartments={departmentManagement.orderedDepartments}
        sensors={sensors}
        onClose={() => departmentManagement.setShowEditDepartmentsModal(false)}
        onDragEnd={departmentManagement.handleDragEnd}
        onEdit={(dept) => {
          departmentManagement.setEditingDepartment(dept);
          departmentManagement.setDepartmentFormTitle(dept.title);
          departmentManagement.setDepartmentFormDescription(dept.description || '');
          departmentManagement.setShowEditDepartmentsModal(false);
          departmentManagement.setShowDepartmentModal(true);
        }}
        onDelete={(dept) => {
          departmentManagement.setDepartmentToDelete(dept);
          departmentManagement.setShowDeleteModal(true);
        }}
      />

      <EditStatusesModal
        isOpen={statusManagement.showEditStatusesModal}
        orderedStatuses={statusManagement.orderedStatuses}
        sensors={sensors}
        onClose={() => statusManagement.setShowEditStatusesModal(false)}
        onDragEnd={statusManagement.handleDragEnd}
        onEdit={(status) => {
          statusManagement.setEditingStatus(status);
          statusManagement.setStatusFormTitle(status.title);
          statusManagement.setStatusFormDescription(status.description || '');
          statusManagement.setShowEditStatusesModal(false);
          statusManagement.setShowStatusModal(true);
        }}
        onDelete={(status) => {
          statusManagement.setStatusToDelete(status);
          statusManagement.setShowDeleteModal(true);
        }}
      />

      <DeleteStatusModal
        isOpen={statusManagement.showDeleteModal}
        statusToDelete={statusManagement.statusToDelete}
        onClose={() => {
          statusManagement.setShowDeleteModal(false);
          statusManagement.setStatusToDelete(null);
        }}
        onDelete={async () => {
          await refreshStatuses();
        }}
      />

      <EditEngagementLevelsModal
        isOpen={engagementLevelManagement.showEditEngagementLevelsModal}
        orderedEngagementLevels={engagementLevelManagement.orderedEngagementLevels}
        sensors={sensors}
        onClose={() => engagementLevelManagement.setShowEditEngagementLevelsModal(false)}
        onDragEnd={engagementLevelManagement.handleDragEnd}
        onEdit={(engagementLevel) => {
          engagementLevelManagement.setEditingEngagementLevel(engagementLevel);
          engagementLevelManagement.setEngagementLevelFormTitle(engagementLevel.title);
          engagementLevelManagement.setEngagementLevelFormDescription(engagementLevel.description || '');
          engagementLevelManagement.setShowEditEngagementLevelsModal(false);
          engagementLevelManagement.setShowEngagementLevelModal(true);
        }}
        onDelete={(engagementLevel) => {
          engagementLevelManagement.setEngagementLevelToDelete(engagementLevel);
          engagementLevelManagement.setShowDeleteModal(true);
        }}
      />

      <DeleteEngagementLevelModal
        isOpen={engagementLevelManagement.showDeleteModal}
        engagementLevelToDelete={engagementLevelManagement.engagementLevelToDelete}
        onClose={() => {
          engagementLevelManagement.setShowDeleteModal(false);
          engagementLevelManagement.setEngagementLevelToDelete(null);
        }}
        onDelete={async () => {
          await refreshEngagementLevels();
        }}
      />

      <EditBizDevPhasesModal
        isOpen={bizDevPhaseManagement.showEditBizDevPhasesModal}
        orderedBizDevPhases={bizDevPhaseManagement.orderedBizDevPhases}
        sensors={sensors}
        onClose={() => bizDevPhaseManagement.setShowEditBizDevPhasesModal(false)}
        onDragEnd={bizDevPhaseManagement.handleDragEnd}
        onEdit={(bizDevPhase) => {
          bizDevPhaseManagement.setEditingBizDevPhase(bizDevPhase);
          bizDevPhaseManagement.setBizDevPhaseFormTitle(bizDevPhase.title);
          bizDevPhaseManagement.setBizDevPhaseFormDescription(bizDevPhase.description || '');
          bizDevPhaseManagement.setShowEditBizDevPhasesModal(false);
          bizDevPhaseManagement.setShowBizDevPhaseModal(true);
        }}
        onDelete={(bizDevPhase) => {
          bizDevPhaseManagement.setBizDevPhaseToDelete(bizDevPhase);
          bizDevPhaseManagement.setShowDeleteModal(true);
        }}
      />

      <DeleteBizDevPhaseModal
        isOpen={bizDevPhaseManagement.showDeleteModal}
        bizDevPhaseToDelete={bizDevPhaseManagement.bizDevPhaseToDelete}
        onClose={() => {
          bizDevPhaseManagement.setShowDeleteModal(false);
          bizDevPhaseManagement.setBizDevPhaseToDelete(null);
        }}
        onDelete={async () => {
          await refreshBizDevPhases();
        }}
      />
    </div>
  );
}

