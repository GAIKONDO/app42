# タブ0: 全体俯瞰UI 詳細実装計画（注意点対策版）

## 📋 実装方針

注意点を踏まえ、以下の方針で実装を進めます：

1. **段階的実装**: 最小限の機能から始めて、段階的に拡張
2. **エラーハンドリング優先**: 最初からエラーハンドリングを組み込む
3. **パフォーマンス考慮**: 遅延読み込みとキャッシュを最初から実装
4. **データ整合性チェック**: 参照整合性チェックを最初に実装
5. **テスト可能な設計**: 各機能を独立してテストできる設計

---

## 🎯 実装フェーズ

### フェーズ0: 準備と基盤整備（必須）

#### 0.1 データ整合性チェック機能の実装
**目的**: 参照関係の整合性を確認する機能を最初に実装

**実装内容**:
```typescript
// lib/graphvizHierarchyApi.ts

/**
 * 参照整合性チェック結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'missing_reference' | 'circular_reference' | 'invalid_id';
  message: string;
  data: {
    sourceType: 'site-equipment' | 'rack-servers' | 'server-details';
    sourceId: string;
    sourceLabel: string;
    missingReferenceType: 'site' | 'rack' | 'server';
    missingReferenceId: string;
  };
}

/**
 * 参照整合性をチェック
 */
export async function validateHierarchyReferences(
  organizationId?: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // 1. タブ1のデータを取得
  const sites = await getAllSiteTopologies(organizationId);
  const siteIds = new Set(sites.map(s => s.id));
  
  // 2. タブ2のデータを取得してチェック
  const allSiteEquipment = await getAllSiteEquipment(organizationId);
  for (const equipment of allSiteEquipment) {
    if (!equipment.siteId) {
      errors.push({
        type: 'missing_reference',
        message: `棟内機器構成 "${equipment.label}" にsiteIdが設定されていません`,
        data: {
          sourceType: 'site-equipment',
          sourceId: equipment.id,
          sourceLabel: equipment.label,
          missingReferenceType: 'site',
          missingReferenceId: '',
        },
      });
      continue;
    }
    
    if (!siteIds.has(equipment.siteId)) {
      errors.push({
        type: 'missing_reference',
        message: `棟内機器構成 "${equipment.label}" が参照する棟 "${equipment.siteId}" が存在しません`,
        data: {
          sourceType: 'site-equipment',
          sourceId: equipment.id,
          sourceLabel: equipment.label,
          missingReferenceType: 'site',
          missingReferenceId: equipment.siteId,
        },
      });
    }
  }
  
  // 3. タブ3のデータをチェック（同様のロジック）
  // 4. タブ4のデータをチェック（同様のロジック）
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

**実装ファイル**:
- `lib/graphvizHierarchyApi.ts` (新規作成)

**確認事項**:
- [ ] 参照整合性チェック関数の実装
- [ ] エラーメッセージの日本語化
- [ ] エラーログの記録機能

---

#### 0.2 データ取得APIの実装（遅延読み込み対応）
**目的**: 必要なデータのみを取得するAPIを実装

**実装内容**:
```typescript
// lib/graphvizHierarchyApi.ts

/**
 * 棟データのみを取得（軽量）
 */
export async function getSitesOnly(
  organizationId?: string
): Promise<SiteTopology[]> {
  const files = await getAllGraphvizYamlFiles(organizationId);
  return files
    .filter(file => {
      try {
        const parsed = yaml.load(file.yamlContent);
        return parsed?.type === 'site-topology';
      } catch {
        return false;
      }
    })
    .map(file => {
      const parsed = yaml.load(file.yamlContent);
      return {
        id: parsed.id,
        label: parsed.label,
        description: parsed.description,
        location: parsed.location,
        capacity: parsed.capacity,
        connections: parsed.connections,
        fileId: file.id,
        // 子ノードは含めない（遅延読み込み）
        racks: undefined,
      };
    });
}

/**
 * 棟の機器構成を取得（必要時のみ）
 */
export async function getSiteEquipmentBySiteId(
  siteId: string,
  organizationId?: string
): Promise<SiteEquipment | null> {
  // キャッシュをチェック
  const cacheKey = `site-equipment-${siteId}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // データを取得
  const files = await getAllGraphvizYamlFiles(organizationId);
  for (const file of files) {
    try {
      const parsed = yaml.load(file.yamlContent);
      if (parsed?.type === 'site-equipment' && parsed?.siteId === siteId) {
        const result = {
          ...parsed,
          fileId: file.id,
        };
        
        // キャッシュに保存
        setToCache(cacheKey, result, 5 * 60 * 1000); // 5分間キャッシュ
        
        return result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * ラックのサーバーを取得（必要時のみ）
 */
export async function getRackServersByRackId(
  rackId: string,
  organizationId?: string
): Promise<RackServers | null> {
  // 同様の実装
}

/**
 * サーバー詳細を取得（必要時のみ）
 */
export async function getServerDetailsByServerId(
  serverId: string,
  organizationId?: string
): Promise<ServerDetails | null> {
  // 同様の実装
}
```

**実装ファイル**:
- `lib/graphvizHierarchyApi.ts` (継続)

**確認事項**:
- [ ] 遅延読み込みの実装
- [ ] キャッシュ機能の実装
- [ ] エラーハンドリング

---

### フェーズ1: 基本的な全体表示（最小実装）

#### 1.1 タブ0の基本構造作成
**目的**: タブ0の基本的なUI構造を作成

**実装内容**:
```typescript
// app/graphviz/components/Tab0/index.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSitesOnly, validateHierarchyReferences } from '@/lib/graphvizHierarchyApi';
import { HierarchyViewer } from './HierarchyViewer';
import { ValidationBanner } from './ValidationBanner';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorDisplay } from './ErrorDisplay';

interface Tab0Props {
  organizationId?: string | null;
}

export function Tab0({ organizationId }: Tab0Props = {}) {
  const [sites, setSites] = useState<SiteTopology[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
  }, [organizationId]);
  
  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. 参照整合性チェック
      const validation = await validateHierarchyReferences(organizationId || undefined);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        // エラーがある場合でも、表示可能なデータは表示
        console.warn('参照整合性エラーがあります:', validation.errors);
      }
      
      // 2. 棟データのみを取得（軽量）
      const sitesData = await getSitesOnly(organizationId || undefined);
      setSites(sitesData);
      
    } catch (err: any) {
      setError(err.message || 'データの取得に失敗しました');
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return <LoadingIndicator />;
  }
  
  if (error) {
    return <ErrorDisplay error={error} onRetry={loadInitialData} />;
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <h2>タブ0: 全体俯瞰</h2>
      
      {/* 参照整合性エラーの表示 */}
      {validationResult && !validationResult.isValid && (
        <ValidationBanner validationResult={validationResult} />
      )}
      
      {/* 階層ビューア */}
      <HierarchyViewer
        sites={sites}
        organizationId={organizationId || undefined}
        onSiteClick={handleSiteClick}
      />
    </div>
  );
}
```

**実装ファイル**:
- `app/graphviz/components/Tab0/index.tsx` (新規作成)
- `app/graphviz/components/Tab0/ValidationBanner.tsx` (新規作成)
- `app/graphviz/components/Tab0/LoadingIndicator.tsx` (新規作成)
- `app/graphviz/components/Tab0/ErrorDisplay.tsx` (新規作成)

**確認事項**:
- [ ] 基本的なUI構造
- [ ] エラーハンドリング
- [ ] ローディング表示

---

#### 1.2 基本的なGraphviz DOT生成
**目的**: 棟レベルのDOT生成を実装

**実装内容**:
```typescript
// app/graphviz/components/Tab0/generateHierarchicalDot.ts

/**
 * 棟レベルのDOT生成（最小実装）
 */
export function generateSitesDot(sites: SiteTopology[]): string {
  let dotCode = 'digraph G {\n';
  dotCode += '  rankdir=TB;\n';  // 上から下へ
  dotCode += '  node [shape=box, style=rounded];\n';
  dotCode += '  edge [arrowhead=normal];\n\n';
  
  // ノードIDマッピング（クリックイベント用）
  const nodeIdMap = new Map<string, { type: string, id: string }>();
  
  // 棟ノードを生成
  for (const site of sites) {
    const nodeId = escapeNodeId(`site_${site.id}`);
    nodeIdMap.set(nodeId, { type: 'site', id: site.id });
    
    const label = `${site.label}\\n${site.location?.address || ''}`;
    dotCode += `  ${nodeId} [
      label="${escapeLabel(label)}",
      shape=box,
      style=rounded,
      fillcolor=lightblue,
      color=blue,
      penwidth=2
    ];\n`;
  }
  
  // 棟間の接続
  for (const site of sites) {
    if (site.connections && Array.isArray(site.connections)) {
      for (const conn of site.connections) {
        const fromId = escapeNodeId(`site_${conn.from}`);
        const toId = escapeNodeId(`site_${conn.to}`);
        
        const attributes: string[] = [];
        if (conn.bandwidth) {
          attributes.push(`label="${escapeLabel(conn.bandwidth)}"`);
        }
        if (conn.type) {
          attributes.push(`color=gray`);
          attributes.push(`style=dashed`);
        }
        
        if (attributes.length > 0) {
          dotCode += `  ${fromId} -> ${toId} [${attributes.join(', ')}];\n`;
        } else {
          dotCode += `  ${fromId} -> ${toId};\n`;
        }
      }
    }
  }
  
  dotCode += '}\n';
  
  // ノードIDマッピングを返す（クリックイベント用）
  return { dotCode, nodeIdMap };
}

function escapeNodeId(id: string): string {
  // GraphvizのノードIDをエスケープ
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
    return id;
  }
  return `"${id.replace(/"/g, '\\"')}"`;
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
```

**実装ファイル**:
- `app/graphviz/components/Tab0/generateHierarchicalDot.ts` (新規作成)

**確認事項**:
- [ ] DOT生成ロジック
- [ ] ノードIDのエスケープ処理
- [ ] ノードIDマッピングの作成

---

#### 1.3 Graphvizビューアとの統合
**目的**: GraphvizビューアにDOTを表示

**実装内容**:
```typescript
// app/graphviz/components/Tab0/HierarchyViewer.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { GraphvizViewerWithZoom } from '../GraphvizViewerWithZoom';
import { generateSitesDot } from './generateHierarchicalDot';

interface HierarchyViewerProps {
  sites: SiteTopology[];
  organizationId?: string;
  onSiteClick: (siteId: string) => void;
}

export function HierarchyViewer({
  sites,
  organizationId,
  onSiteClick,
}: HierarchyViewerProps) {
  const [dotCode, setDotCode] = useState<string>('');
  const [nodeIdMap, setNodeIdMap] = useState<Map<string, { type: string, id: string }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  
  // DOT生成
  useEffect(() => {
    const { dotCode: generatedDot, nodeIdMap: generatedMap } = generateSitesDot(sites);
    setDotCode(generatedDot);
    setNodeIdMap(generatedMap);
  }, [sites]);
  
  // クリックイベントの設定
  useEffect(() => {
    if (!dotCode || nodeIdMap.size === 0) return;
    
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;
    
    // すべてのノード要素にイベントリスナーを追加
    const attachClickHandlers = () => {
      const nodeElements = svgElement.querySelectorAll('g.node');
      
      nodeElements.forEach((nodeElement) => {
        // 既にイベントリスナーが追加されている場合はスキップ
        if ((nodeElement as any).__clickHandlerAttached) {
          return;
        }
        
        const titleElement = nodeElement.querySelector('title');
        const nodeId = titleElement?.textContent;
        
        if (nodeId && nodeIdMap.has(nodeId)) {
          const nodeInfo = nodeIdMap.get(nodeId)!;
          
          // クリック可能であることを視覚的に示す
          nodeElement.style.cursor = 'pointer';
          
          // クリックイベント
          const clickHandler = (e: MouseEvent) => {
            e.stopPropagation();
            onSiteClick(nodeInfo.id);
          };
          
          nodeElement.addEventListener('click', clickHandler);
          
          // ホバー効果
          const mouseEnterHandler = () => {
            nodeElement.style.opacity = '0.7';
          };
          const mouseLeaveHandler = () => {
            nodeElement.style.opacity = '1';
          };
          
          nodeElement.addEventListener('mouseenter', mouseEnterHandler);
          nodeElement.addEventListener('mouseleave', mouseLeaveHandler);
          
          // フラグを設定
          (nodeElement as any).__clickHandlerAttached = true;
          (nodeElement as any).__clickHandler = clickHandler;
          (nodeElement as any).__mouseEnterHandler = mouseEnterHandler;
          (nodeElement as any).__mouseLeaveHandler = mouseLeaveHandler;
        }
      });
    };
    
    // 初回設定
    attachClickHandlers();
    
    // Graphviz再レンダリングを監視
    const observer = new MutationObserver(() => {
      attachClickHandlers();
    });
    
    observer.observe(svgElement, {
      childList: true,
      subtree: true,
    });
    
    return () => {
      observer.disconnect();
      // イベントリスナーのクリーンアップ
      const nodeElements = svgElement.querySelectorAll('g.node');
      nodeElements.forEach((nodeElement) => {
        if ((nodeElement as any).__clickHandler) {
          nodeElement.removeEventListener('click', (nodeElement as any).__clickHandler);
          nodeElement.removeEventListener('mouseenter', (nodeElement as any).__mouseEnterHandler);
          nodeElement.removeEventListener('mouseleave', (nodeElement as any).__mouseLeaveHandler);
        }
      });
    };
  }, [dotCode, nodeIdMap, onSiteClick]);
  
  return (
    <div ref={containerRef}>
      <GraphvizViewerWithZoom dotCode={dotCode} />
    </div>
  );
}
```

**実装ファイル**:
- `app/graphviz/components/Tab0/HierarchyViewer.tsx` (新規作成)

**確認事項**:
- [ ] Graphvizビューアとの統合
- [ ] クリックイベントの設定
- [ ] 再レンダリング時のイベントリスナー再設定
- [ ] メモリリークの防止

---

### フェーズ2: 階層的ナビゲーション

#### 2.1 階層状態管理
**目的**: 階層的な状態を管理するカスタムフック

**実装内容**:
```typescript
// app/graphviz/components/Tab0/useHierarchyState.ts

import { useState, useCallback } from 'react';

export type HierarchyLevel = 'all' | 'sites' | 'racks' | 'equipment' | 'server-details';

export interface HierarchyState {
  currentLevel: HierarchyLevel;
  selectedSiteId?: string;
  selectedRackId?: string;
  selectedEquipmentId?: string;
  selectedServerId?: string;
  breadcrumbs: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  type: HierarchyLevel;
}

export function useHierarchyState() {
  const [state, setState] = useState<HierarchyState>({
    currentLevel: 'all',
    breadcrumbs: [],
  });
  
  const navigateToLevel = useCallback((
    level: HierarchyLevel,
    nodeId?: string,
    nodeLabel?: string
  ) => {
    setState(prev => {
      const newBreadcrumbs = [...prev.breadcrumbs];
      
      // 現在のレベルより下の階層に移動する場合、ブレッドクラムを追加
      if (level !== 'all' && nodeId && nodeLabel) {
        // 同じレベルまたは上位レベルに移動する場合、ブレッドクラムを切り詰める
        const levelOrder: HierarchyLevel[] = ['all', 'sites', 'racks', 'equipment', 'server-details'];
        const currentIndex = levelOrder.indexOf(prev.currentLevel);
        const newIndex = levelOrder.indexOf(level);
        
        if (newIndex <= currentIndex) {
          // 上位レベルに戻る場合、ブレッドクラムを切り詰める
          newBreadcrumbs.splice(newIndex);
        } else {
          // 下位レベルに進む場合、ブレッドクラムを追加
          newBreadcrumbs.push({ id: nodeId, label: nodeLabel, type: level });
        }
      } else if (level === 'all') {
        // 全体表示に戻る場合、ブレッドクラムをクリア
        newBreadcrumbs.length = 0;
      }
      
      return {
        currentLevel: level,
        selectedSiteId: level === 'sites' ? nodeId : (level === 'all' ? undefined : prev.selectedSiteId),
        selectedRackId: level === 'racks' ? nodeId : (level === 'sites' || level === 'all' ? undefined : prev.selectedRackId),
        selectedEquipmentId: level === 'equipment' ? nodeId : undefined,
        selectedServerId: level === 'server-details' ? nodeId : undefined,
        breadcrumbs: newBreadcrumbs,
      };
    });
  }, []);
  
  const navigateToBreadcrumb = useCallback((index: number) => {
    setState(prev => {
      const targetBreadcrumb = prev.breadcrumbs[index];
      if (!targetBreadcrumb) return prev;
      
      const newBreadcrumbs = prev.breadcrumbs.slice(0, index + 1);
      
      return {
        currentLevel: targetBreadcrumb.type,
        selectedSiteId: targetBreadcrumb.type === 'sites' ? targetBreadcrumb.id : prev.selectedSiteId,
        selectedRackId: targetBreadcrumb.type === 'racks' ? targetBreadcrumb.id : prev.selectedRackId,
        selectedEquipmentId: targetBreadcrumb.type === 'equipment' ? targetBreadcrumb.id : undefined,
        selectedServerId: targetBreadcrumb.type === 'server-details' ? targetBreadcrumb.id : undefined,
        breadcrumbs: newBreadcrumbs,
      };
    });
  }, []);
  
  return {
    state,
    navigateToLevel,
    navigateToBreadcrumb,
  };
}
```

**実装ファイル**:
- `app/graphviz/components/Tab0/useHierarchyState.ts` (新規作成)

**確認事項**:
- [ ] 階層状態の管理
- [ ] ブレッドクラムの更新ロジック
- [ ] 状態の一貫性

---

#### 2.2 棟クリック時の処理
**目的**: 棟をクリックしたときにラックを表示

**実装内容**:
```typescript
// app/graphviz/components/Tab0/index.tsx (更新)

const handleSiteClick = useCallback(async (siteId: string) => {
  setIsLoading(true);
  setError(null);
  
  try {
    // 棟の機器構成を取得（遅延読み込み）
    const siteEquipment = await getSiteEquipmentBySiteId(
      siteId,
      organizationId || undefined
    );
    
    if (!siteEquipment) {
      setError(`棟 "${siteId}" の機器構成が見つかりません`);
      return;
    }
    
    // 階層状態を更新
    navigateToLevel('sites', siteId, siteEquipment.label);
    
    // ラックデータを設定
    setRacks(siteEquipment.racks || []);
    
  } catch (err: any) {
    setError(`棟データの取得に失敗しました: ${err.message}`);
    console.error('棟データ取得エラー:', err);
  } finally {
    setIsLoading(false);
  }
}, [organizationId, navigateToLevel]);
```

**確認事項**:
- [ ] 遅延読み込みの実装
- [ ] エラーハンドリング
- [ ] 階層状態の更新

---

### フェーズ3: ブレッドクラムとナビゲーション

#### 3.1 ブレッドクラムコンポーネント
**目的**: 現在の階層位置を表示し、クリックで移動可能

**実装内容**:
```typescript
// app/graphviz/components/Tab0/Breadcrumb.tsx

'use client';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onItemClick: (index: number) => void;
}

export function Breadcrumb({ items, onItemClick }: BreadcrumbProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      <span style={{ fontSize: '14px', color: '#6B7280' }}>位置:</span>
      <button
        onClick={() => onItemClick(-1)}
        style={{
          padding: '4px 8px',
          fontSize: '14px',
          color: '#4262FF',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        全体
      </button>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <span style={{ color: '#9CA3AF' }}>/</span>
          <button
            onClick={() => onItemClick(index)}
            style={{
              padding: '4px 8px',
              fontSize: '14px',
              color: '#4262FF',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
```

**実装ファイル**:
- `app/graphviz/components/Tab0/Breadcrumb.tsx` (新規作成)

**確認事項**:
- [ ] ブレッドクラムの表示
- [ ] クリックでの階層移動

---

### フェーズ4: タブ間の連携

#### 4.1 URLパラメータでの状態管理
**目的**: URLパラメータでタブ間の状態を共有

**実装内容**:
```typescript
// app/graphviz/components/Tab0/index.tsx (更新)

import { useRouter } from 'next/navigation';

const router = useRouter();

const handleEquipmentClick = useCallback((equipmentId: string, equipmentType: string) => {
  if (equipmentType === 'server') {
    // サーバーの場合はタブ4に遷移
    router.push(`/graphviz?tab=tab4&serverId=${equipmentId}&organizationId=${organizationId}`);
  } else {
    // その他の機器はタブ2に遷移
    router.push(`/graphviz?tab=tab2&equipmentId=${equipmentId}&organizationId=${organizationId}`);
  }
}, [router, organizationId]);
```

**確認事項**:
- [ ] URLパラメータでの状態管理
- [ ] タブ遷移時のデータ自動読み込み

---

## 📝 実装順序のまとめ

### 第1週: 基盤整備
1. ✅ データ整合性チェック機能
2. ✅ データ取得API（遅延読み込み対応）
3. ✅ 基本的なDOT生成

### 第2週: 基本UI
1. ✅ タブ0の基本構造
2. ✅ Graphvizビューアとの統合
3. ✅ クリックイベント処理

### 第3週: 階層ナビゲーション
1. ✅ 階層状態管理
2. ✅ 棟クリック時の処理
3. ✅ ラッククリック時の処理

### 第4週: 完成度向上
1. ✅ ブレッドクラム
2. ✅ タブ間の連携
3. ✅ エラーハンドリングの強化
4. ✅ パフォーマンス最適化

---

## 🧪 テスト計画

### 単体テスト
- [ ] データ整合性チェック関数のテスト
- [ ] DOT生成関数のテスト
- [ ] 階層状態管理のテスト

### 統合テスト
- [ ] 棟クリック → ラック表示
- [ ] ラッククリック → 機器表示
- [ ] ブレッドクラムでの階層移動

### パフォーマンステスト
- [ ] 大量データ（100棟、1000ラック）での動作
- [ ] メモリ使用量の測定
- [ ] レンダリング時間の測定

---

## 🚨 リスクと対策

### リスク1: データ整合性エラーが多発
**対策**: 最初に整合性チェック機能を実装し、エラーを可視化

### リスク2: パフォーマンス問題
**対策**: 遅延読み込みとキャッシュを最初から実装

### リスク3: Graphvizのクリックイベントが動作しない
**対策**: MutationObserverで再レンダリングを監視し、イベントリスナーを再設定

### リスク4: 状態管理が複雑になる
**対策**: カスタムフックに分離し、状態の一貫性を保つ

---

## 📋 実装チェックリスト

### フェーズ0（必須）
- [ ] データ整合性チェック機能
- [ ] データ取得API（遅延読み込み）
- [ ] キャッシュ機能

### フェーズ1（基本）
- [ ] タブ0の基本UI
- [ ] Graphvizビューア統合
- [ ] クリックイベント処理

### フェーズ2（拡張）
- [ ] 階層状態管理
- [ ] 棟クリック処理
- [ ] ラッククリック処理

### フェーズ3（完成）
- [ ] ブレッドクラム
- [ ] タブ間連携
- [ ] エラーハンドリング強化

---

この計画に従って、段階的に実装を進めることで、リスクを最小限に抑えながら、堅牢な全体俯瞰UIを実現できます。

