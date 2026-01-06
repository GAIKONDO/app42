import type { Startup, Category, BizDevPhase, Status, VC } from '@/lib/orgApi';

export interface StartupLandscapeTabProps {
  // 必要に応じてpropsを追加
}

export interface ParentCategorySectionProps {
  parent: Category;
  parentStartups: Startup[];
  children: Category[];
  startupsByCategory: Record<string, Startup[]>;
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

export interface CategorySectionProps {
  category: Category;
  startups: Startup[];
  level: number;
  parentTitle?: string;
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

export interface LandscapeViewProps {
  selectedCategoryIds: Set<string>;
  filteredStartups: Startup[];
  categoryHierarchy: Array<{ parent: Category; children: Category[] }>;
  startupsByCategory: Record<string, Startup[]>;
  categories: Category[];
  viewMode: 'all' | 'parent-only';
  bizDevPhases: BizDevPhase[];
}

export interface CompactStartupItemProps {
  startup: Startup;
  bizDevPhases: BizDevPhase[];
}

export interface StartupCardProps {
  startup: Startup;
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

export interface BizDevPhaseViewProps {
  filteredStartups: Startup[];
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

export interface SearchFormProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearchSuggestions: boolean;
  setShowSearchSuggestions: (show: boolean) => void;
  searchInputFocused: boolean;
  setSearchInputFocused: (focused: boolean) => void;
  searchSuggestions: Startup[];
  startups: Startup[];
  setStartups: React.Dispatch<React.SetStateAction<Startup[]>>;
}

export interface FilterDropdownProps<T> {
  label: string;
  selectedIds: Set<string>;
  items: T[];
  getItemId: (item: T) => string;
  getItemTitle: (item: T) => string;
  onSelectionChange: (ids: Set<string>) => void;
  showFilter: boolean;
  setShowFilter: (show: boolean) => void;
}

export interface StatsCardsProps {
  parentCategoriesCount: number;
  subCategoriesCount: number;
  totalStartups: number;
  filteredStartupsCount: number;
  favoriteStartupsCount: number;
  hasFilters: boolean;
}

export interface ViewModeToggleProps {
  viewMode: 'all' | 'parent-only';
  setViewMode: (mode: 'all' | 'parent-only') => void;
  displayMode: 'box' | 'landscape' | 'bizdev';
  setDisplayMode: (mode: 'box' | 'landscape' | 'bizdev') => void;
  favoriteFilter: 'all' | 'favorite';
  setFavoriteFilter: (filter: 'all' | 'favorite') => void;
}

