# BM25とルーター実装計画

> **📋 ステータス**: 計画中  
> **📅 作成日**: 2025-12-11  
> **👤 用途**: BM25とクエリルーターの実装計画、メリット・デメリット・リスク分析

## 概要

現在のRAG検索システムはChromaDBによるベクトル検索のみを使用しています。データが膨大になった際の対策として、BM25（キーワード検索）とクエリルーターを導入する計画です。

---

## 現状分析

### 現在の実装

1. **検索方式**: ChromaDBによるベクトル類似度検索のみ
2. **スコアリング**: ベクトル類似度 + メタデータ + 新しさ + 重要度
3. **検索対象**: エンティティ、リレーション、トピックを並列検索
4. **既存の準備**: `searchableText`カラムとインデックスが存在

### 課題

- 固有名詞や専門用語の完全一致が弱い
- キーワードマッチングがない
- クエリタイプに応じた最適化がない

---

## 実装計画

### フェーズ1: BM25実装（優先度: 高）

#### 1.1 TypeScript側BM25ライブラリの選定と実装

**選択肢**:
- **オプションA**: `node-bm25`や`bm25`などのnpmパッケージを使用
- **オプションB**: 自前実装（軽量、カスタマイズ可能）

**推奨**: オプションB（自前実装）
- 依存関係を最小化
- 日本語対応のカスタマイズが容易
- 既存のスコアリングシステムと統合しやすい

**実装内容**:
```typescript
// lib/bm25Search.ts (新規作成)

/**
 * BM25アルゴリズムによるキーワード検索
 * 
 * BM25スコア計算式:
 * score(D, Q) = Σ IDF(qi) * f(qi, D) * (k1 + 1) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))
 * 
 * パラメータ:
 * - k1: 1.2-2.0（デフォルト: 1.5）
 * - b: 0.0-1.0（デフォルト: 0.75）
 */
export interface BM25Config {
  k1: number;  // 用語頻度の飽和パラメータ
  b: number;    // 文書長正規化パラメータ
}

export interface BM25SearchResult {
  id: string;
  score: number;
  matchedTerms: string[];
}

/**
 * ドキュメントコーパスからBM25インデックスを構築
 */
export class BM25Index {
  private documents: Map<string, string> = new Map();
  private termFreq: Map<string, Map<string, number>> = new Map();
  private docFreq: Map<string, number> = new Map();
  private avgDocLength: number = 0;
  private config: BM25Config;

  constructor(config: BM25Config = { k1: 1.5, b: 0.75 }) {
    this.config = config;
  }

  /**
   * ドキュメントを追加
   */
  addDocument(id: string, text: string): void {
    this.documents.set(id, text);
    const terms = this.tokenize(text);
    const termCounts = new Map<string, number>();
    
    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
    
    this.termFreq.set(id, termCounts);
    
    // ドキュメント頻度を更新
    for (const term of termCounts.keys()) {
      this.docFreq.set(term, (this.docFreq.get(term) || 0) + 1);
    }
    
    // 平均文書長を再計算
    this.updateAvgDocLength();
  }

  /**
   * クエリで検索
   */
  search(query: string, limit: number = 10): BM25SearchResult[] {
    const queryTerms = this.tokenize(query);
    const scores = new Map<string, number>();
    const matchedTermsMap = new Map<string, Set<string>>();

    for (const docId of this.documents.keys()) {
      let score = 0;
      const matchedTerms = new Set<string>();
      
      for (const term of queryTerms) {
        const tf = this.termFreq.get(docId)?.get(term) || 0;
        if (tf > 0) {
          matchedTerms.add(term);
          const idf = this.calculateIDF(term);
          const docLength = this.termFreq.get(docId)?.size || 1;
          const normalizedTf = (this.config.k1 + 1) * tf / 
            (tf + this.config.k1 * (1 - this.config.b + this.config.b * docLength / this.avgDocLength));
          score += idf * normalizedTf;
        }
      }
      
      if (score > 0) {
        scores.set(docId, score);
        matchedTermsMap.set(docId, matchedTerms);
      }
    }

    // スコアでソート
    const results: BM25SearchResult[] = Array.from(scores.entries())
      .map(([id, score]) => ({
        id,
        score,
        matchedTerms: Array.from(matchedTermsMap.get(id) || [])
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * テキストをトークン化（日本語対応）
   */
  private tokenize(text: string): string[] {
    // 簡易的なトークン化（日本語と英語を分離）
    const normalized = text.toLowerCase().trim();
    // 日本語文字（ひらがな、カタカナ、漢字）と英語を分離
    const tokens: string[] = [];
    let currentToken = '';
    
    for (const char of normalized) {
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) {
        // 日本語文字
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        tokens.push(char);
      } else if (/[a-zA-Z0-9]/.test(char)) {
        // 英数字
        currentToken += char;
      } else {
        // 区切り文字
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      }
    }
    
    if (currentToken) {
      tokens.push(currentToken);
    }
    
    return tokens.filter(t => t.length > 0);
  }

  /**
   * IDF（逆文書頻度）を計算
   */
  private calculateIDF(term: string): number {
    const df = this.docFreq.get(term) || 0;
    const N = this.documents.size;
    if (df === 0 || N === 0) return 0;
    return Math.log((N - df + 0.5) / (df + 0.5));
  }

  /**
   * 平均文書長を更新
   */
  private updateAvgDocLength(): void {
    if (this.documents.size === 0) {
      this.avgDocLength = 0;
      return;
    }
    
    let totalLength = 0;
    for (const termCounts of this.termFreq.values()) {
      totalLength += termCounts.size;
    }
    
    this.avgDocLength = totalLength / this.documents.size;
  }
}
```

#### 1.2 SQLiteからのデータ取得とBM25インデックス構築

**実装内容**:
```typescript
// lib/knowledgeGraphRAG/bm25Search.ts (新規作成)

import { BM25Index, BM25SearchResult } from '@/lib/bm25Search';
import { callTauriCommand } from '@/lib/tauri';

/**
 * エンティティのBM25検索
 */
export async function searchEntitiesBM25(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<Array<{ entityId: string; bm25Score: number; matchedTerms: string[] }>> {
  // SQLiteからエンティティデータを取得
  const entities = await callTauriCommand('query_get', {
    collectionName: 'entities',
    conditions: {
      ...(filters?.organizationId && { organizationId: filters.organizationId }),
      ...(filters?.entityType && { type: filters.entityType }),
    },
  }) as Array<{ id: string; data: any }>;

  // BM25インデックスを構築
  const index = new BM25Index();
  for (const entity of entities) {
    const searchableText = entity.data.searchableText || 
      `${entity.data.name} ${entity.data.aliases?.join(' ') || ''}`;
    index.addDocument(entity.id, searchableText);
  }

  // 検索実行
  const results = index.search(queryText, limit * 2); // フィルタリングで減る可能性があるため多めに取得

  // 結果を変換
  return results.map(r => ({
    entityId: r.id,
    bm25Score: r.score,
    matchedTerms: r.matchedTerms,
  }));
}
```

#### 1.3 ハイブリッド検索の実装

**実装内容**:
```typescript
// lib/knowledgeGraphRAG/searchEntities.ts を拡張

import { searchEntitiesBM25 } from './bm25Search';
import { findSimilarEntitiesChroma } from '../entityEmbeddingsChroma';

/**
 * ハイブリッド検索: ベクトル検索 + BM25検索
 */
export async function searchEntitiesHybrid(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  hybridWeights: { vector: number; bm25: number } = { vector: 0.6, bm25: 0.4 }
): Promise<KnowledgeGraphSearchResult[]> {
  // 並列でベクトル検索とBM25検索を実行
  const [vectorResults, bm25Results] = await Promise.all([
    findSimilarEntitiesChroma(queryText, limit * 2, filters?.organizationId)
      .catch(() => []),
    searchEntitiesBM25(queryText, limit * 2, filters)
      .catch(() => []),
  ]);

  // 結果を統合（Reciprocal Rank Fusion）
  const combinedResults = combineSearchResults(
    vectorResults,
    bm25Results,
    hybridWeights
  );

  // エンティティ詳細を取得
  const entityIds = combinedResults.map(r => r.entityId);
  const entities = await getEntitiesByIds(entityIds);
  const entityMap = new Map(entities.map(e => [e.id, e]));

  // 最終結果を構築
  const results: KnowledgeGraphSearchResult[] = [];
  for (const { entityId, score, similarity } of combinedResults) {
    const entity = entityMap.get(entityId);
    if (!entity) continue;

    // フィルタリング
    if (filters?.entityType && entity.type !== filters.entityType) {
      continue;
    }

    // スコア計算（既存のロジックを使用）
    const finalScore = calculateEntityScore(
      similarity || 0,
      entity,
      weights,
      filters,
      undefined,
      queryText
    );

    results.push({
      type: 'entity',
      id: entityId,
      score: finalScore,
      similarity: similarity || 0,
      entity,
    });
  }

  // スコアでソート
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * 検索結果を統合（Reciprocal Rank Fusion）
 */
function combineSearchResults(
  vectorResults: Array<{ entityId: string; similarity: number }>,
  bm25Results: Array<{ entityId: string; bm25Score: number }>,
  weights: { vector: number; bm25: number }
): Array<{ entityId: string; score: number; similarity: number }> {
  const combined = new Map<string, { score: number; similarity: number }>();
  const k = 60; // RRFパラメータ

  // ベクトル検索結果を追加
  vectorResults.forEach((result, index) => {
    const rrfScore = weights.vector / (k + index + 1);
    const existing = combined.get(result.entityId);
    if (existing) {
      existing.score += rrfScore;
      existing.similarity = Math.max(existing.similarity, result.similarity);
    } else {
      combined.set(result.entityId, {
        score: rrfScore,
        similarity: result.similarity,
      });
    }
  });

  // BM25検索結果を追加
  bm25Results.forEach((result, index) => {
    const rrfScore = weights.bm25 / (k + index + 1);
    const existing = combined.get(result.entityId);
    if (existing) {
      existing.score += rrfScore;
    } else {
      combined.set(result.entityId, {
        score: rrfScore,
        similarity: 0, // BM25には類似度の概念がない
      });
    }
  });

  // 配列に変換してソート
  return Array.from(combined.entries())
    .map(([entityId, data]) => ({
      entityId,
      score: data.score,
      similarity: data.similarity,
    }))
    .sort((a, b) => b.score - a.score);
}
```

#### 1.4 リレーション・トピック検索への拡張

同様の実装を`searchRelations.ts`と`searchTopics.ts`にも適用。

---

### フェーズ2: クエリルーター実装（優先度: 中）

#### 2.1 クエリタイプの判定

**実装内容**:
```typescript
// lib/knowledgeGraphRAG/queryRouter.ts (新規作成)

export type QueryType = 'factual' | 'relational' | 'conceptual' | 'keyword' | 'mixed';

export interface QueryAnalysis {
  type: QueryType;
  confidence: number;
  keywords: string[];
  entities: string[];
}

/**
 * クエリを分析してタイプを判定
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const queryLower = query.toLowerCase();
  const keywords: string[] = [];
  const entities: string[] = [];
  
  // 事実確認型のパターン
  const factualPatterns = [
    /とは[？?]?$/, /の定義/, /what is/i, /define/i,
    /誰[？?]?$/, /who is/i, /where is/i, /when is/i,
  ];
  
  // 関係性検索型のパターン
  const relationalPatterns = [
    /の関係/, /に関連/, /related to/i, /connection/i,
    /と.*の/, /between.*and/i,
  ];
  
  // キーワード検索型のパターン（固有名詞が多い）
  const keywordPatterns = [
    /[A-Z][a-z]+ [A-Z][a-z]+/, // 固有名詞（英語）
    /[一-龠]{2,}/, // 漢字2文字以上（固有名詞の可能性）
  ];
  
  let factualScore = 0;
  let relationalScore = 0;
  let keywordScore = 0;
  
  // パターンマッチング
  for (const pattern of factualPatterns) {
    if (pattern.test(query)) {
      factualScore += 1;
    }
  }
  
  for (const pattern of relationalPatterns) {
    if (pattern.test(query)) {
      relationalScore += 1;
    }
  }
  
  for (const pattern of keywordPatterns) {
    if (pattern.test(query)) {
      keywordScore += 1;
    }
  }
  
  // キーワード抽出（簡易版）
  const words = query.split(/\s+/).filter(w => w.length > 1);
  keywords.push(...words);
  
  // タイプ判定
  let type: QueryType = 'conceptual'; // デフォルト
  let confidence = 0.5;
  
  if (factualScore > 0 && factualScore >= relationalScore && factualScore >= keywordScore) {
    type = 'factual';
    confidence = Math.min(0.9, 0.5 + factualScore * 0.2);
  } else if (relationalScore > 0 && relationalScore >= keywordScore) {
    type = 'relational';
    confidence = Math.min(0.9, 0.5 + relationalScore * 0.2);
  } else if (keywordScore > 0) {
    type = 'keyword';
    confidence = Math.min(0.9, 0.5 + keywordScore * 0.2);
  } else if (factualScore > 0 || relationalScore > 0) {
    type = 'mixed';
    confidence = 0.6;
  }
  
  return {
    type,
    confidence,
    keywords,
    entities,
  };
}
```

#### 2.2 ルーターによる検索戦略の切り替え

**実装内容**:
```typescript
// lib/knowledgeGraphRAG/searchKnowledgeGraph.ts を拡張

import { analyzeQuery, QueryType } from './queryRouter';
import { searchEntitiesHybrid } from './searchEntities';

/**
 * クエリルーターを使用した検索
 */
export async function searchKnowledgeGraphWithRouter(
  queryText: string,
  limit: number = 10,
  filters?: SearchFilters,
  useCache: boolean = true,
  timeoutMs: number = 10000
): Promise<KnowledgeGraphSearchResult[]> {
  // クエリを分析
  const analysis = analyzeQuery(queryText);
  console.log('[searchKnowledgeGraphWithRouter] クエリ分析:', analysis);
  
  // クエリタイプに応じて検索戦略を決定
  const searchStrategy = getSearchStrategy(analysis.type);
  
  // 検索を実行
  const perTypeLimit = Math.max(1, Math.ceil(limit / 3));
  
  const [entityResults, relationResults, topicResults] = await Promise.all([
    searchEntitiesWithStrategy(
      queryText,
      perTypeLimit,
      filters,
      searchStrategy.entity
    ).catch(() => []),
    searchRelationsWithStrategy(
      queryText,
      perTypeLimit,
      filters,
      searchStrategy.relation
    ).catch(() => []),
    searchTopicsWithStrategy(
      queryText,
      perTypeLimit,
      filters,
      searchStrategy.topic
    ).catch(() => []),
  ]);
  
  // 結果を統合
  const allResults = [
    ...entityResults,
    ...relationResults,
    ...topicResults,
  ];
  
  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, limit);
}

/**
 * 検索戦略を取得
 */
function getSearchStrategy(queryType: QueryType): {
  entity: { useBM25: boolean; useVector: boolean; bm25Weight: number; vectorWeight: number };
  relation: { useBM25: boolean; useVector: boolean; bm25Weight: number; vectorWeight: number };
  topic: { useBM25: boolean; useVector: boolean; bm25Weight: number; vectorWeight: number };
} {
  switch (queryType) {
    case 'factual':
      // 事実確認型: BM25を重視（固有名詞マッチング）
      return {
        entity: { useBM25: true, useVector: true, bm25Weight: 0.7, vectorWeight: 0.3 },
        relation: { useBM25: true, useVector: true, bm25Weight: 0.6, vectorWeight: 0.4 },
        topic: { useBM25: true, useVector: true, bm25Weight: 0.7, vectorWeight: 0.3 },
      };
    case 'relational':
      // 関係性検索型: ベクトル検索を重視（意味的類似性）
      return {
        entity: { useBM25: true, useVector: true, bm25Weight: 0.3, vectorWeight: 0.7 },
        relation: { useBM25: true, useVector: true, bm25Weight: 0.2, vectorWeight: 0.8 },
        topic: { useBM25: true, useVector: true, bm25Weight: 0.3, vectorWeight: 0.7 },
      };
    case 'keyword':
      // キーワード検索型: BM25のみ
      return {
        entity: { useBM25: true, useVector: false, bm25Weight: 1.0, vectorWeight: 0.0 },
        relation: { useBM25: true, useVector: false, bm25Weight: 1.0, vectorWeight: 0.0 },
        topic: { useBM25: true, useVector: false, bm25Weight: 1.0, vectorWeight: 0.0 },
      };
    case 'conceptual':
      // 概念検索型: ベクトル検索のみ
      return {
        entity: { useBM25: false, useVector: true, bm25Weight: 0.0, vectorWeight: 1.0 },
        relation: { useBM25: false, useVector: true, bm25Weight: 0.0, vectorWeight: 1.0 },
        topic: { useBM25: false, useVector: true, bm25Weight: 0.0, vectorWeight: 1.0 },
      };
    default: // 'mixed'
      // 混合型: バランス型
      return {
        entity: { useBM25: true, useVector: true, bm25Weight: 0.5, vectorWeight: 0.5 },
        relation: { useBM25: true, useVector: true, bm25Weight: 0.5, vectorWeight: 0.5 },
        topic: { useBM25: true, useVector: true, bm25Weight: 0.5, vectorWeight: 0.5 },
      };
  }
}
```

---

## 実装スケジュール

### フェーズ1: BM25実装（2-3週間）

**Week 1**:
- [ ] BM25ライブラリの実装（`lib/bm25Search.ts`）
- [ ] エンティティBM25検索の実装（`lib/knowledgeGraphRAG/bm25Search.ts`）
- [ ] 単体テストの作成

**Week 2**:
- [ ] ハイブリッド検索の実装（`searchEntitiesHybrid`）
- [ ] リレーション・トピック検索への拡張
- [ ] 統合テスト

**Week 3**:
- [ ] パフォーマンステスト
- [ ] パラメータ調整（k1, b, 重み）
- [ ] ドキュメント作成

### フェーズ2: ルーター実装（1-2週間）

**Week 1**:
- [ ] クエリ分析機能の実装（`queryRouter.ts`）
- [ ] ルーターによる検索戦略の切り替え
- [ ] 単体テスト

**Week 2**:
- [ ] 統合テスト
- [ ] パラメータ調整
- [ ] ドキュメント作成

---

## メリット・デメリット・リスク分析

### メリット

#### BM25実装

1. **検索精度の向上**
   - 固有名詞や専門用語の完全一致が可能
   - キーワードマッチングによる高精度な検索
   - ベクトル検索と組み合わせることで、両方の長所を活用

2. **パフォーマンスの改善**
   - 大量データでも高速なキーワード検索
   - インデックスによる高速化
   - ベクトル検索と並列実行可能

3. **ユーザー体験の向上**
   - 期待する結果が上位に表示される
   - 検索結果の説明可能性が向上（マッチしたキーワードを表示可能）

#### ルーター実装

1. **リソース効率の向上**
   - クエリタイプに応じて最適な検索戦略を選択
   - 不要な検索をスキップ（例: キーワード検索型ではベクトル検索をスキップ）

2. **検索精度の向上**
   - クエリタイプに最適化された検索結果
   - ユーザーの意図に合った結果を返す

3. **拡張性**
   - 新しいクエリタイプの追加が容易
   - 検索戦略のカスタマイズが可能

---

### デメリット

#### BM25実装

1. **実装コスト**
   - BM25アルゴリズムの実装が必要
   - インデックス構築のオーバーヘッド
   - メモリ使用量の増加（インデックス保持）

2. **メンテナンスコスト**
   - パラメータ（k1, b）の調整が必要
   - 日本語トークナイザーの改善が必要な場合がある
   - インデックスの更新管理

3. **パフォーマンスへの影響**
   - インデックス構築に時間がかかる（初回検索時）
   - メモリ使用量の増加
   - 検索結果の統合処理が複雑になる

#### ルーター実装

1. **実装コスト**
   - クエリ分析ロジックの実装
   - パターンマッチングの精度向上が必要
   - テストケースの増加

2. **誤判定のリスク**
   - クエリタイプの誤判定により、不適切な検索戦略が選択される
   - ユーザーの意図と異なる結果が返される可能性

3. **複雑性の増加**
   - コードの複雑性が増加
   - デバッグが困難になる
   - パフォーマンスの予測が難しくなる

---

### リスク

#### 技術的リスク

1. **パフォーマンスリスク**
   - **リスク**: BM25インデックス構築が遅い、メモリ不足
   - **対策**: 
     - インデックスのキャッシュ
     - バッチ処理による段階的なインデックス構築
     - メモリ使用量の監視

2. **精度リスク**
   - **リスク**: BM25のパラメータが不適切、日本語トークナイザーの精度不足
   - **対策**:
     - パラメータの自動調整機能
     - 日本語形態素解析ライブラリの検討（MeCab, kuromoji.jsなど）
     - A/Bテストによる最適化

3. **統合リスク**
   - **リスク**: 既存の検索システムとの統合が困難
   - **対策**:
     - 段階的な実装（フェーズ1→フェーズ2）
     - 既存システムとの互換性を保つ
     - フォールバック機能の実装

#### 運用リスク

1. **データ整合性リスク**
   - **リスク**: BM25インデックスとSQLiteデータの不整合
   - **対策**:
     - インデックスの自動更新機能
     - データ更新時のインデックス再構築
     - 整合性チェック機能

2. **スケーラビリティリスク**
   - **リスク**: データ量が増加した際のパフォーマンス低下
   - **対策**:
     - インデックスの分割（組織ごとなど）
     - 非同期インデックス構築
     - パフォーマンス監視とアラート

3. **ユーザー体験リスク**
   - **リスク**: 検索結果の品質低下、検索速度の低下
   - **対策**:
     - 段階的なロールアウト
     - ユーザーフィードバックの収集
     - パフォーマンスメトリクスの監視

---

## 推奨事項

### 実装順序

1. **フェーズ1（BM25）を優先**: 検索精度向上の効果が大きい
2. **段階的な実装**: エンティティ→リレーション→トピックの順
3. **A/Bテスト**: 既存システムと並行運用して効果を検証

### パラメータ調整

1. **BM25パラメータ**: k1=1.5, b=0.75（デフォルト）から開始し、データに応じて調整
2. **ハイブリッド重み**: ベクトル:BM25 = 6:4（デフォルト）から開始
3. **ルーター閾値**: クエリタイプ判定の信頼度閾値を調整可能にする

### モニタリング

1. **パフォーマンスメトリクス**: 検索速度、メモリ使用量、CPU使用率
2. **品質メトリクス**: 検索精度、ユーザーフィードバック、クリック率
3. **エラーメトリクス**: エラー率、タイムアウト率、フォールバック率

---

## まとめ

BM25とルーターの実装は、データが膨大になった際の対策として有効です。特にBM25は優先度が高く、固有名詞や専門用語の検索精度を大幅に向上させます。ルーターは、リソース効率と検索精度の両方を改善しますが、実装の複雑性が増加します。

段階的な実装と十分なテストにより、リスクを最小化しながら効果を最大化できます。

