/**
 * BM25検索の動作確認用テスト
 * 
 * 使用方法:
 * 1. このファイルを実行してBM25検索の動作を確認
 * 2. 実際のデータで検索を実行して結果を確認
 */

import { BM25Index } from '@/lib/bm25Search';
import { searchEntitiesBM25 } from '../bm25Search';

/**
 * BM25インデックスの基本動作確認
 */
export async function testBM25Index() {
  console.log('=== BM25インデックスの基本動作確認 ===');
  
  const index = new BM25Index();
  
  // テストドキュメントを追加
  const testDocuments = [
    { id: '1', text: 'トヨタ自動車は日本の自動車メーカーです' },
    { id: '2', text: 'トヨタは世界最大の自動車メーカーの一つです' },
    { id: '3', text: 'ホンダも日本の自動車メーカーです' },
    { id: '4', text: '日産自動車はトヨタと競合しています' },
    { id: '5', text: '自動車産業は日本の主要産業です' },
  ];
  
  console.log('テストドキュメントを追加中...');
  for (const doc of testDocuments) {
    index.addDocument(doc.id, doc.text);
  }
  
  const stats = index.getStats();
  console.log('インデックス統計:', stats);
  
  // 検索テスト
  const testQueries = [
    'トヨタ',
    '自動車',
    'トヨタ自動車',
    '日本の自動車',
  ];
  
  for (const query of testQueries) {
    console.log(`\n--- クエリ: "${query}" ---`);
    const results = index.search(query, 5);
    console.log(`検索結果数: ${results.length}`);
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. ID: ${result.id}, スコア: ${result.score.toFixed(4)}, マッチした用語: [${result.matchedTerms.join(', ')}]`);
    });
  }
  
  console.log('\n=== BM25インデックスの基本動作確認完了 ===');
}

/**
 * エンティティBM25検索の動作確認
 */
export async function testEntityBM25Search() {
  console.log('=== エンティティBM25検索の動作確認 ===');
  
  const testQueries = [
    'トヨタ',
    '自動車',
    '組織',
  ];
  
  for (const query of testQueries) {
    console.log(`\n--- クエリ: "${query}" ---`);
    try {
      const results = await searchEntitiesBM25(query, 10);
      console.log(`検索結果数: ${results.length}`);
      results.slice(0, 5).forEach((result, index) => {
        console.log(`  ${index + 1}. ID: ${result.entityId}, BM25スコア: ${result.bm25Score.toFixed(4)}, マッチした用語: [${result.matchedTerms.join(', ')}]`);
      });
    } catch (error) {
      console.error(`検索エラー:`, error);
    }
  }
  
  console.log('\n=== エンティティBM25検索の動作確認完了 ===');
}

/**
 * ハイブリッド検索の動作確認
 */
export async function testHybridSearch() {
  console.log('=== ハイブリッド検索の動作確認 ===');
  
  // このテストは実際の検索関数を使用するため、
  // ブラウザ環境で実行する必要があります
  if (typeof window === 'undefined') {
    console.log('ブラウザ環境で実行してください');
    return;
  }
  
  const { searchKnowledgeGraph, DEFAULT_HYBRID_CONFIG } = await import('@/lib/knowledgeGraphRAG');
  
  const testQueries = [
    'トヨタ',
    '自動車',
    '組織',
  ];
  
  for (const query of testQueries) {
    console.log(`\n--- クエリ: "${query}" ---`);
    
    // ベクトル検索のみ
    console.log('ベクトル検索のみ:');
    try {
      const vectorResults = await searchKnowledgeGraph(query, 5);
      console.log(`  結果数: ${vectorResults.length}`);
      vectorResults.slice(0, 3).forEach((result, index) => {
        console.log(`    ${index + 1}. ${result.type}: ${result.id}, スコア: ${result.score.toFixed(4)}, 類似度: ${result.similarity.toFixed(4)}`);
      });
    } catch (error) {
      console.error(`  検索エラー:`, error);
    }
    
    // ハイブリッド検索
    console.log('ハイブリッド検索:');
    try {
      const hybridResults = await searchKnowledgeGraph(query, 5, undefined, true, 10000, DEFAULT_HYBRID_CONFIG);
      console.log(`  結果数: ${hybridResults.length}`);
      hybridResults.slice(0, 3).forEach((result, index) => {
        console.log(`    ${index + 1}. ${result.type}: ${result.id}, スコア: ${result.score.toFixed(4)}, 類似度: ${result.similarity.toFixed(4)}`);
      });
    } catch (error) {
      console.error(`  検索エラー:`, error);
    }
  }
  
  console.log('\n=== ハイブリッド検索の動作確認完了 ===');
}

/**
 * パフォーマンステスト
 */
export async function testPerformance() {
  console.log('=== パフォーマンステスト ===');
  
  if (typeof window === 'undefined') {
    console.log('ブラウザ環境で実行してください');
    return;
  }
  
  const { searchKnowledgeGraph, DEFAULT_HYBRID_CONFIG } = await import('@/lib/knowledgeGraphRAG');
  
  const query = 'トヨタ';
  const iterations = 3;
  
  // ベクトル検索のみのパフォーマンス
  console.log('ベクトル検索のみのパフォーマンス:');
  const vectorTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await searchKnowledgeGraph(query, 10);
    const end = performance.now();
    const time = end - start;
    vectorTimes.push(time);
    console.log(`  試行 ${i + 1}: ${time.toFixed(2)}ms`);
  }
  const avgVectorTime = vectorTimes.reduce((a, b) => a + b, 0) / vectorTimes.length;
  console.log(`  平均: ${avgVectorTime.toFixed(2)}ms`);
  
  // ハイブリッド検索のパフォーマンス
  console.log('ハイブリッド検索のパフォーマンス:');
  const hybridTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await searchKnowledgeGraph(query, 10, undefined, true, 10000, DEFAULT_HYBRID_CONFIG);
    const end = performance.now();
    const time = end - start;
    hybridTimes.push(time);
    console.log(`  試行 ${i + 1}: ${time.toFixed(2)}ms`);
  }
  const avgHybridTime = hybridTimes.reduce((a, b) => a + b, 0) / hybridTimes.length;
  console.log(`  平均: ${avgHybridTime.toFixed(2)}ms`);
  
  console.log(`\nパフォーマンス比較:`);
  console.log(`  ベクトル検索のみ: ${avgVectorTime.toFixed(2)}ms`);
  console.log(`  ハイブリッド検索: ${avgHybridTime.toFixed(2)}ms`);
  console.log(`  オーバーヘッド: ${(avgHybridTime - avgVectorTime).toFixed(2)}ms (${((avgHybridTime / avgVectorTime - 1) * 100).toFixed(1)}%)`);
  
  console.log('\n=== パフォーマンステスト完了 ===');
}

/**
 * すべてのテストを実行
 */
export async function runAllTests() {
  console.log('========================================');
  console.log('BM25ハイブリッド検索の動作確認テスト');
  console.log('========================================\n');
  
  try {
    await testBM25Index();
    await testEntityBM25Search();
    await testHybridSearch();
    await testPerformance();
  } catch (error) {
    console.error('テスト実行エラー:', error);
  }
  
  console.log('\n========================================');
  console.log('すべてのテスト完了');
  console.log('========================================');
}

