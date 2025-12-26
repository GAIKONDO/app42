# タブ0実装前の注意点

## ⚠️ 重要な注意事項

### 1. データの整合性と参照関係

#### 問題点
- タブ1-4のデータは独立して保存されている
- 参照関係（`siteId`, `rackId`, `serverId`）が正しく設定されていない可能性がある
- 参照先のデータが存在しない場合の処理が必要

#### 対策
```typescript
// 参照整合性チェック関数を実装
async function validateReferences(data: HierarchicalData): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // タブ2のsiteIdがタブ1に存在するかチェック
  for (const siteEquipment of allSiteEquipment) {
    const siteExists = data.sites.some(s => s.id === siteEquipment.siteId);
    if (!siteExists) {
      errors.push(`棟ID "${siteEquipment.siteId}" が存在しません`);
    }
  }
  
  // タブ3のrackIdがタブ2に存在するかチェック
  // タブ4のserverIdがタブ3に存在するかチェック
  // ...
  
  return { isValid: errors.length === 0, errors };
}
```

#### 実装時の確認事項
- [ ] 参照先が存在しない場合のエラーメッセージ表示
- [ ] 参照先が削除された場合の処理
- [ ] 循環参照の検出と防止

---

### 2. パフォーマンスの問題

#### 問題点
- 大量の棟・ラック・機器がある場合、全データを一度に読み込むと重い
- Graphvizのレンダリングが遅くなる可能性
- メモリ使用量の増加

#### 対策
```typescript
// 遅延読み込みの実装
const [loadedData, setLoadedData] = useState<Partial<HierarchicalData>>({
  sites: [], // 初期は棟のみ
});

// クリック時に子ノードを読み込む
const handleSiteClick = async (siteId: string) => {
  if (!loadedData.sites.find(s => s.id === siteId)?.racks) {
    // まだ読み込んでいない場合のみ読み込む
    const racks = await loadRacksForSite(siteId);
    setLoadedData(prev => ({
      ...prev,
      sites: prev.sites.map(s => 
        s.id === siteId ? { ...s, racks } : s
      ),
    }));
  }
};
```

#### 実装時の確認事項
- [ ] 初期表示は棟レベルまでに制限
- [ ] クリック時に必要なデータのみ読み込む
- [ ] 読み込み中のインジケーター表示
- [ ] 大量ノード時の簡略化表示オプション

---

### 3. Graphvizの制約と制限

#### 問題点
- Graphvizは大量のノード（1000以上）でレンダリングが遅くなる
- SVG要素への直接イベントリスナー追加は、Graphvizの再レンダリング時に失われる可能性
- ノードIDの命名規則に制約がある

#### 対策
```typescript
// Graphviz再レンダリング時のイベントリスナー再設定
useEffect(() => {
  const svgElement = document.querySelector('#graphviz-container svg');
  if (!svgElement) return;
  
  // MutationObserverでSVGの変更を監視
  const observer = new MutationObserver(() => {
    // SVGが再レンダリングされたらイベントリスナーを再設定
    attachNodeClickHandlers();
  });
  
  observer.observe(svgElement, { childList: true, subtree: true });
  
  return () => {
    observer.disconnect();
  };
}, [dotCode]);
```

#### 実装時の確認事項
- [ ] ノードIDに特殊文字が含まれないようにエスケープ
- [ ] Graphviz再レンダリング時のイベントリスナー再設定
- [ ] 大量ノード時のパフォーマンステスト
- [ ] ズーム・パン機能の動作確認

---

### 4. 状態管理の複雑さ

#### 問題点
- 階層的な状態（選択された棟、ラック、機器）の管理が複雑
- ブレッドクラムの状態同期
- タブ間の状態共有

#### 対策
```typescript
// 状態管理をカスタムフックに分離
function useHierarchyState() {
  const [state, setState] = useState<HierarchyState>({
    currentLevel: 'all',
    selectedSiteId: undefined,
    selectedRackId: undefined,
    breadcrumbs: [],
  });
  
  const navigateToLevel = useCallback((level: string, nodeId?: string) => {
    setState(prev => {
      const newBreadcrumbs = [...prev.breadcrumbs];
      // ブレッドクラムの更新ロジック
      return {
        ...prev,
        currentLevel: level,
        selectedSiteId: level === 'sites' ? nodeId : prev.selectedSiteId,
        breadcrumbs: newBreadcrumbs,
      };
    });
  }, []);
  
  return { state, navigateToLevel };
}
```

#### 実装時の確認事項
- [ ] 状態の一貫性を保つ
- [ ] ブレッドクラムと現在の表示レベルの同期
- [ ] 戻るボタンの動作確認
- [ ] URLパラメータとの状態同期

---

### 5. タブ間の連携

#### 問題点
- タブ0からタブ1-4への遷移時に、該当データを自動的に読み込む必要がある
- URLパラメータでの状態管理
- タブ1-4でデータを更新した場合、タブ0の表示も更新する必要がある

#### 対策
```typescript
// URLパラメータで状態を管理
const router = useRouter();
const searchParams = useSearchParams();

// タブ0からタブ2への遷移
const navigateToTab2 = (siteId: string) => {
  router.push(`/graphviz?tab=tab2&siteId=${siteId}&organizationId=${organizationId}`);
};

// タブ2でsiteIdパラメータを読み込む
useEffect(() => {
  const siteId = searchParams?.get('siteId');
  if (siteId && activeTab === 'tab2') {
    loadSiteEquipment(siteId);
  }
}, [searchParams, activeTab]);
```

#### 実装時の確認事項
- [ ] URLパラメータでの状態管理
- [ ] タブ遷移時のデータ自動読み込み
- [ ] ブラウザの戻る/進むボタンの動作
- [ ] データ更新時のタブ0の再読み込み

---

### 6. エラーハンドリング

#### 問題点
- データ取得時のエラー
- 参照先が存在しない場合のエラー
- Graphvizレンダリングエラー

#### 対策
```typescript
// エラーハンドリングの実装
try {
  const data = await getHierarchicalData(organizationId);
  setHierarchicalData(data);
} catch (error) {
  if (error instanceof ReferenceError) {
    // 参照エラーの場合
    setError(`参照エラー: ${error.message}`);
  } else if (error instanceof NetworkError) {
    // ネットワークエラーの場合
    setError('データの取得に失敗しました。ネットワーク接続を確認してください。');
  } else {
    // その他のエラー
    setError(`予期しないエラーが発生しました: ${error.message}`);
  }
}
```

#### 実装時の確認事項
- [ ] 各エラーケースの適切な処理
- [ ] ユーザーフレンドリーなエラーメッセージ
- [ ] エラー時のリトライ機能
- [ ] エラーログの記録

---

### 7. データの不整合時の処理

#### 問題点
- タブ1で棟を削除したが、タブ2にその棟を参照するデータが残っている
- タブ2でラックを削除したが、タブ3にそのラックを参照するデータが残っている

#### 対策
```typescript
// 孤立データの検出と表示
function findOrphanedData(data: HierarchicalData): OrphanedData[] {
  const orphaned: OrphanedData[] = [];
  
  // タブ2のデータで、参照先の棟が存在しないもの
  for (const siteEquipment of allSiteEquipment) {
    const siteExists = data.sites.some(s => s.id === siteEquipment.siteId);
    if (!siteExists) {
      orphaned.push({
        type: 'site-equipment',
        id: siteEquipment.id,
        label: siteEquipment.label,
        missingReference: {
          type: 'site',
          id: siteEquipment.siteId,
        },
      });
    }
  }
  
  return orphaned;
}

// 孤立データを警告表示
if (orphanedData.length > 0) {
  // 警告バナーを表示
  showWarningBanner(`参照先が存在しないデータが ${orphanedData.length} 件あります`);
}
```

#### 実装時の確認事項
- [ ] 孤立データの検出機能
- [ ] 孤立データの警告表示
- [ ] 孤立データの修正オプション
- [ ] データ整合性チェック機能

---

### 8. UI/UXの一貫性

#### 問題点
- タブ0のUIがタブ1-4と異なる見た目になる可能性
- クリック可能なノードが分かりにくい
- 階層の深さが分かりにくい

#### 対策
```typescript
// 一貫したUIコンポーネントの使用
// タブ1-4と同じスタイルシステムを使用
const nodeStyles = {
  site: {
    shape: 'box',
    style: 'rounded',
    fillcolor: 'lightblue',
    color: 'blue',
    penwidth: 2,
  },
  rack: {
    shape: 'box',
    fillcolor: 'lightgreen',
    color: 'green',
  },
  equipment: {
    shape: 'box',
    fillcolor: 'lightyellow',
    color: 'orange',
  },
};

// ホバー効果でクリック可能であることを示す
const nodeElement = svgElement.querySelector(`g.node[data-node-id="${nodeId}"]`);
nodeElement.style.cursor = 'pointer';
nodeElement.addEventListener('mouseenter', () => {
  nodeElement.style.opacity = '0.7';
  nodeElement.style.transform = 'scale(1.05)';
});
```

#### 実装時の確認事項
- [ ] タブ1-4と一貫したデザイン
- [ ] クリック可能なノードの視覚的フィードバック
- [ ] 階層の深さを視覚的に表現
- [ ] アクセシビリティの考慮（キーボード操作等）

---

### 9. テストの重要性

#### 問題点
- 複雑な階層構造のため、手動テストが困難
- エッジケース（参照先が存在しない、大量データ等）のテストが必要

#### 対策
```typescript
// テストケースの例
describe('Tab0 Hierarchy Navigation', () => {
  it('棟をクリックするとラックが表示される', async () => {
    // テスト実装
  });
  
  it('参照先が存在しない場合、エラーメッセージが表示される', async () => {
    // テスト実装
  });
  
  it('大量のデータでもパフォーマンスが許容範囲内', async () => {
    // パフォーマンステスト
  });
});
```

#### 実装時の確認事項
- [ ] 各階層レベルの表示テスト
- [ ] クリックイベントのテスト
- [ ] エラーハンドリングのテスト
- [ ] パフォーマンステスト

---

### 10. データベースクエリの最適化

#### 問題点
- 全データを取得する際のクエリが重い可能性
- 不要なデータまで取得してしまう

#### 対策
```typescript
// 必要なデータのみ取得するクエリ
async function getHierarchicalDataOptimized(
  organizationId?: string,
  level: 'sites' | 'racks' | 'equipment' = 'sites'
): Promise<HierarchicalData> {
  // レベルに応じて必要なデータのみ取得
  switch (level) {
    case 'sites':
      // 棟データのみ取得
      return { sites: await getAllSiteTopologies(organizationId) };
    case 'racks':
      // 棟 + ラックデータを取得
      // ...
  }
}
```

#### 実装時の確認事項
- [ ] 必要なデータのみ取得するクエリ設計
- [ ] インデックスの最適化
- [ ] クエリのパフォーマンス測定

---

## 📋 実装前チェックリスト

### データ整合性
- [ ] 参照整合性チェック機能の実装
- [ ] 孤立データの検出機能
- [ ] エラーハンドリングの実装

### パフォーマンス
- [ ] 遅延読み込みの実装
- [ ] 大量データ時の簡略化表示
- [ ] キャッシュ機能の実装

### Graphviz
- [ ] クリックイベント処理の実装
- [ ] 再レンダリング時のイベントリスナー再設定
- [ ] ノードIDのエスケープ処理

### 状態管理
- [ ] 階層状態の管理
- [ ] ブレッドクラムの実装
- [ ] URLパラメータとの同期

### UI/UX
- [ ] タブ1-4との一貫性
- [ ] クリック可能なノードの視覚的フィードバック
- [ ] アクセシビリティの考慮

### テスト
- [ ] 各機能のテスト
- [ ] エッジケースのテスト
- [ ] パフォーマンステスト

---

## 🚨 特に注意すべき点

1. **データの整合性**: 参照関係が正しく設定されていないと、タブ0が正しく動作しない
2. **パフォーマンス**: 大量データ時の処理速度とメモリ使用量
3. **Graphvizの制約**: SVG要素へのイベントリスナー追加のタイミング
4. **状態管理**: 複雑な階層状態の一貫性を保つ
5. **エラーハンドリング**: 参照先が存在しない場合の適切な処理

これらの注意点を考慮しながら、段階的に実装を進めることをお勧めします。

