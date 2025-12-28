/**
 * BM25ハイブリッド検索の動作確認スクリプト
 * 
 * 使用方法:
 * npx tsx scripts/test-bm25-search.ts
 * 
 * 注意: このスクリプトはブラウザ環境で実行する必要があります
 * Tauriアプリ内で実行してください
 */

import { BM25Index } from '../lib/bm25Search';

/**
 * BM25インデックスの基本動作確認
 */
function testBM25Index() {
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

// 実行
if (typeof window === 'undefined') {
  // Node.js環境の場合
  console.log('このスクリプトはブラウザ環境で実行してください');
  console.log('Tauriアプリ内で実行するか、ブラウザの開発者ツールのコンソールで実行してください');
} else {
  // ブラウザ環境の場合
  testBM25Index();
}

