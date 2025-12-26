/**
 * Graphviz 機能1タブコンポーネント（メイン）
 * YAML→Graphviz DOT変換機能（新設計対応）
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { getGraphvizYamlFile, getGraphvizDotFile, updateGraphvizYamlFile, createGraphvizYamlFile, getAllGraphvizYamlFiles } from '@/lib/graphvizApi';
import { VIEW_CONFIGS, type ViewType } from '../utils/viewTypes';
import { useYamlConverter } from './useYamlConverter';
import { YamlEditor } from './YamlEditor';
import { DotEditor } from './DotEditor';
import { ViewSelector } from './ViewSelector';
import { SampleLoader } from './SampleLoader';
import { FileManager } from './FileManager';
import { MetadataExtractor } from './MetadataExtractor';
import { DescriptionEditor } from './DescriptionEditor';
import { RelatedFilesSection } from './RelatedFilesSection';
import { GraphvizViewerWithZoom } from '../GraphvizViewerWithZoom';
import { SAMPLES, SAMPLE_TOPOLOGY_YAML } from './samples';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import * as yaml from 'js-yaml';
import { ViewModeSelector, type ViewMode } from '../utils/ViewModeSelector';
import { SiteTopology3DViewer } from './SiteTopology3DViewer';

interface Tab1Props {
  initialFileId?: string | null; // クエリパラメータから渡されるファイルID
  organizationId?: string | null; // クエリパラメータから渡される組織ID
}

export function Tab1({ initialFileId, organizationId }: Tab1Props = {}) {
  const {
    yamlContent,
    setYamlContent,
    dotCode,
    setDotCodeDirectly,
    error,
    isConverting,
    yamlType,
    viewType,
    setViewType,
  } = useYamlConverter(SAMPLE_TOPOLOGY_YAML, 'full');

  // 現在のYAMLファイルID（保存済みの場合）
  const [currentYamlFileId, setCurrentYamlFileId] = useState<string | null>(initialFileId || null);
  const [yamlFileName, setYamlFileName] = useState<string>('未保存のYAML');
  const [yamlDescription, setYamlDescription] = useState<string>('');
  
  // メタデータ（セマンティックカテゴリ、キーワード、要約）
  const [semanticCategory, setSemanticCategory] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [contentSummary, setContentSummary] = useState<string>('');
  
  // 3D表示モード
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [siteTopologyData, setSiteTopologyData] = useState<any>(null);

  // 初期ファイルIDが指定されている場合、自動的に読み込む
  useEffect(() => {
    if (initialFileId) {
      const loadInitialFile = async () => {
        try {
          const file = await getGraphvizYamlFile(initialFileId);
          
          if (!file.yamlContent || typeof file.yamlContent !== 'string' || !file.yamlContent.trim()) {
            console.warn('初期ファイルのYAMLコンテンツが無効です');
            return;
          }

          // 保存されたDOTファイルを取得（あれば）
          let savedDotCode: string | undefined;
          try {
            const dotFile = await getGraphvizDotFile(initialFileId);
            if (dotFile && dotFile.dotContent && typeof dotFile.dotContent === 'string' && dotFile.dotContent.trim()) {
              savedDotCode = dotFile.dotContent;
            }
          } catch (dotError) {
            // DOTファイルが存在しない場合は無視
            console.log('DOTファイルが見つかりません。YAMLから再変換します。');
          }

          setYamlContent(file.yamlContent);
          if (savedDotCode) {
            setDotCodeDirectly(savedDotCode);
          }
          setCurrentYamlFileId(file.id);
          setYamlFileName(file.name);
          setYamlDescription(file.description || '');
          // メタデータを読み込む
          setSemanticCategory(file.semanticCategory || '');
          try {
            setKeywords(file.keywords && file.keywords.trim() ? JSON.parse(file.keywords) : []);
          } catch (e) {
            setKeywords([]);
          }
          setContentSummary(file.contentSummary || '');
        } catch (error: any) {
          console.error('初期ファイルの読み込みに失敗:', error);
        }
      };

      loadInitialFile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFileId]); // initialFileIdが変更されたときのみ実行

  // サンプルファイル読み込み
  const loadSample = useCallback((sampleType: 'topology' | 'device' | 'links' | 'intent' | 'complex_topology' | 'complex_links' | 'site_topology') => {
    setYamlContent(SAMPLES[sampleType] || '');
  }, [setYamlContent]);

  // YAMLからsite-topologyデータを取得して3D表示用に変換
  useEffect(() => {
    if (!yamlContent || yamlType !== 'site-topology') {
      setSiteTopologyData(null);
      return;
    }

    try {
      const parsed = yaml.load(yamlContent) as any;
      if (parsed && parsed.type === 'site-topology') {
        setSiteTopologyData(parsed);
      } else {
        setSiteTopologyData(null);
      }
    } catch (error) {
      console.error('YAMLパースエラー:', error);
      setSiteTopologyData(null);
    }
  }, [yamlContent, yamlType]);

  // 棟を追加するテンプレートを挿入
  const handleAddSite = useCallback(() => {
    try {
      let parsed: any = {};
      let isNewFile = false;

      // 現在のYAMLをパース
      if (yamlContent && yamlContent.trim()) {
        try {
          parsed = yaml.load(yamlContent) as any;
        } catch (e) {
          console.warn('YAMLのパースに失敗しました。新しいファイルとして作成します。', e);
          isNewFile = true;
        }
      } else {
        isNewFile = true;
      }

      // site-topology形式でない、または空の場合は基本構造を作成
      if (isNewFile || !parsed.type || parsed.type !== 'site-topology') {
        parsed = {
          id: `site_network_${Date.now()}`,
          type: 'site-topology',
          label: '棟間ネットワーク',
          description: '',
          sites: [],
          connections: [],
        };
      }

      // sites配列が存在しない場合は作成
      if (!parsed.sites || !Array.isArray(parsed.sites)) {
        parsed.sites = [];
      }

      // 新しい棟のテンプレートを作成
      const siteNumber = parsed.sites.length + 1;
      const newSite = {
        id: `site_${Date.now()}`,
        label: `棟${siteNumber}`,
        location: {
          lat: 0,
          lon: 0,
          address: '',
        },
        capacity: {
          racks: 0,
          power: 0,
        },
      };

      // sites配列に追加
      parsed.sites.push(newSite);

      // YAMLに変換
      const newYaml = yaml.dump(parsed, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });

      setYamlContent(newYaml);
    } catch (error) {
      console.error('棟の追加に失敗:', error);
      alert(`棟の追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [yamlContent, setYamlContent]);

  // Viewタイプに応じた利用可能なViewを取得
  const getAvailableViews = useCallback((): ViewType[] => {
    if (yamlType === 'topology') {
      return ['topology', 'full'];
    } else if (yamlType === 'device') {
      return ['device', 'full'];
    } else if (yamlType === 'links') {
      return ['connection', 'full'];
    } else if (yamlType === 'intent') {
      return ['intent', 'full'];
    }
    return ['full'];
  }, [yamlType]);

  const availableViews = getAvailableViews();


  return (
    <div style={{ 
      padding: '24px',
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 600, 
          color: '#1a1a1a', 
          marginBottom: '8px' 
        }}>
          タブ1: 棟間ネットワーク
        </h2>
        <p style={{ 
          color: '#666', 
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          複数の棟（データセンター、拠点）間のネットワーク接続関係を管理します。
          <br />
          <strong>階層:</strong> タブ1（棟間） → タブ2（棟内） → タブ3（ラック内） → タブ4（機器詳細）
        </p>
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0369A1',
          marginBottom: '16px',
        }}>
          <strong>管理内容:</strong>
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>棟（Site/DataCenter）の定義</li>
            <li>棟間のネットワーク接続（WAN、専用線、VPN等）</li>
            <li>ネットワークレイヤー（物理層、論理層等）</li>
            <li>棟間の帯域幅、遅延、可用性情報</li>
          </ul>
        </div>
        <p style={{ 
          color: '#666', 
          fontSize: '14px',
          marginBottom: '8px',
        }}>
          YAMLコードを入力すると、自動的にGraphviz DOTコードに変換され、グラフとして表示されます。
        </p>

        {/* 説明文表示・編集 */}
        <DescriptionEditor
          yamlFileId={currentYamlFileId}
          description={yamlDescription}
          onDescriptionUpdated={setYamlDescription}
        />

        {/* 関連ファイル */}
        <RelatedFilesSection
          yamlFileId={currentYamlFileId}
          organizationId={organizationId || null}
        />
        
        {/* View切替とサンプル読み込み */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '8px',
        }}>
          {yamlType === 'site-topology' && (
            <ViewModeSelector
              mode={viewMode}
              onModeChange={setViewMode}
            />
          )}
          <ViewSelector
            viewType={viewType}
            onViewChange={setViewType}
            availableViews={availableViews}
          />
          <SampleLoader onLoadSample={loadSample} />
          {/* 棟追加ボタン（site-topologyタイプの場合のみ表示） */}
          {(yamlType === 'site-topology' || !yamlContent || yamlContent.trim() === '') && (
            <button
              onClick={handleAddSite}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10B981';
              }}
              title="新しい棟のテンプレートをYAMLに追加"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10 4V16M4 10H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              棟を追加
            </button>
          )}
          <FileManager
            yamlContent={yamlContent}
            dotCode={dotCode}
            viewType={viewType}
            organizationId={organizationId || undefined}
            currentFileId={currentYamlFileId}
            onLoadFile={(yaml, dot) => {
              setYamlContent(yaml);
              if (dot) {
                // 保存されたDOTファイルがある場合は直接設定
                setDotCodeDirectly(dot);
              }
              // DOTファイルがない場合は、YAMLから自動変換される
            }}
            onFileSaved={async (fileId, fileName) => {
              // ファイル保存時にIDと名前を更新
              setCurrentYamlFileId(fileId);
              setYamlFileName(fileName);
              // 説明文とメタデータも取得
              try {
                const file = await getGraphvizYamlFile(fileId);
                setYamlDescription(file.description || '');
                setSemanticCategory(file.semanticCategory || '');
                try {
                  setKeywords(file.keywords && file.keywords.trim() ? JSON.parse(file.keywords) : []);
                } catch (e) {
                  setKeywords([]);
                }
                setContentSummary(file.contentSummary || '');
                
                // site-topologyタイプの場合、各棟に対してsite-equipmentカードを自動生成
                if (file.yamlType === 'site-topology' && file.yamlContent) {
                  try {
                    const parsed = yaml.load(file.yamlContent) as any;
                    if (parsed && parsed.sites && Array.isArray(parsed.sites)) {
                      // 既存のsite-equipmentカードを取得
                      const allFiles = await getAllGraphvizYamlFiles();
                      const existingSiteEquipmentFiles = allFiles.filter(
                        f => f.yamlType === 'site-equipment' && f.organizationId === organizationId
                      );
                      
                      // 各棟に対してsite-equipmentカードを作成
                      for (const site of parsed.sites) {
                        if (!site.id || !site.label) continue;
                        
                        // 既存のsite-equipmentカードがあるかチェック（siteIdで検索）
                        const existingFile = existingSiteEquipmentFiles.find(f => {
                          if (!f.yamlContent) return false;
                          try {
                            const siteEqParsed = yaml.load(f.yamlContent) as any;
                            return siteEqParsed?.siteId === site.id;
                          } catch {
                            return false;
                          }
                        });
                        
                        // 既存のカードがない場合のみ作成
                        if (!existingFile) {
                          const siteEquipmentYaml = `id: ${site.id}_equipment
type: site-equipment
label: ${site.label} - 棟内機器
description: ${site.label}の棟内機器構成
siteId: "${site.id}"
racks: []
connections: []
`;
                          
                          await createGraphvizYamlFile(
                            `${site.label} - 棟内機器`,
                            siteEquipmentYaml,
                            {
                              yamlType: 'site-equipment',
                              organizationId: organizationId || undefined,
                              description: `${site.label}の棟内機器構成`,
                            }
                          );
                          console.log(`✅ 棟内カードを作成しました: ${site.label} - 棟内機器`);
                        }
                      }
                    }
                  } catch (error) {
                    console.error('棟内カードの自動生成に失敗:', error);
                  }
                }
              } catch (error) {
                console.error('ファイル情報の取得に失敗:', error);
              }
            }}
            onFileLoaded={async (fileId, fileName) => {
              // ファイル読み込み時にIDと名前を更新
              setCurrentYamlFileId(fileId);
              setYamlFileName(fileName);
              // 説明文とメタデータも取得
              try {
                const file = await getGraphvizYamlFile(fileId);
                setYamlDescription(file.description || '');
                setSemanticCategory(file.semanticCategory || '');
                try {
                  setKeywords(file.keywords && file.keywords.trim() ? JSON.parse(file.keywords) : []);
                } catch (e) {
                  setKeywords([]);
                }
                setContentSummary(file.contentSummary || '');
              } catch (error) {
                console.error('ファイル情報の取得に失敗:', error);
              }
            }}
          />
        </div>

        {/* AIメタデータ抽出（メタデータ表示も統合） */}
        <MetadataExtractor
          yamlFileId={currentYamlFileId}
          yamlName={yamlFileName}
          yamlContent={yamlContent}
          dotContent={dotCode} // DOTコードも渡す
          organizationId={organizationId || undefined}
          semanticCategory={semanticCategory}
          keywords={keywords}
          contentSummary={contentSummary}
          onMetadataExtracted={async (entities, relations) => {
            console.log('✅ メタデータ抽出完了:', {
              entities: entities.length,
              relations: relations.length,
            });
            // メタデータ抽出後、ファイルを再読み込みしてメタデータを取得
            if (currentYamlFileId) {
              try {
                const file = await getGraphvizYamlFile(currentYamlFileId);
                setSemanticCategory(file.semanticCategory || '');
                try {
                  setKeywords(file.keywords && file.keywords.trim() ? JSON.parse(file.keywords) : []);
                } catch (e) {
                  setKeywords([]);
                }
                setContentSummary(file.contentSummary || '');
              } catch (error) {
                console.error('メタデータの取得に失敗:', error);
              }
            }
          }}
          onMetadataUpdated={async () => {
            // メタデータ更新後、ファイルを再読み込み
            if (currentYamlFileId) {
              try {
                const file = await getGraphvizYamlFile(currentYamlFileId);
                setSemanticCategory(file.semanticCategory || '');
                try {
                  setKeywords(file.keywords && file.keywords.trim() ? JSON.parse(file.keywords) : []);
                } catch (e) {
                  setKeywords([]);
                }
                setContentSummary(file.contentSummary || '');
              } catch (error) {
                console.error('メタデータの取得に失敗:', error);
              }
            }
          }}
        />

        {/* YAMLタイプ表示 */}
        {yamlType !== 'unknown' && (
          <div style={{
            display: 'inline-block',
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#E0E7FF',
            color: '#3730A3',
            borderRadius: '4px',
            marginBottom: '8px',
          }}>
            タイプ: {yamlType}
          </div>
        )}

        {isConverting && (
          <div style={{
            color: '#4262FF',
            fontSize: '12px',
            marginTop: '4px',
          }}>
            変換中...
          </div>
        )}
      </div>

      {/* 2カラムレイアウト */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        flex: 1,
        minHeight: '600px', // 最小高さを確保
      }}>
        {/* 左側: YAML入力 */}
        <YamlEditor
          value={yamlContent}
          onChange={setYamlContent}
        />

        {/* 右側: DOTコード表示とGraphviz表示 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: 0,
        }}>
          {/* DOTコード表示 */}
          <DotEditor value={dotCode} />

          {/* Graphviz表示 / 3D表示 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          }}>
            <div style={{
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#1a1a1a',
            }}>
              {viewMode === '2d' || yamlType !== 'site-topology' ? 'Graphvizグラフ' : '3D表示'}
            </div>
            <div style={{
              flex: 1,
              minHeight: 0,
            }}>
              {viewMode === '3d' && yamlType === 'site-topology' && siteTopologyData ? (
                <SiteTopology3DViewer
                  siteTopology={siteTopologyData}
                  onSiteClick={(siteId) => {
                    console.log('棟がクリックされました:', siteId);
                    // 必要に応じて棟詳細ページに遷移
                  }}
                  height={600}
                />
              ) : (
                <GraphvizViewerWithZoom dotCode={dotCode} error={error || undefined} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

