/**
 * Graphviz タブ2: 棟内機器構成
 * 棟内のラック配置、機器構成、機器間の接続を管理
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getGraphvizYamlFile, getGraphvizDotFile, createGraphvizYamlFile, getAllGraphvizYamlFiles } from '@/lib/graphvizApi';
import * as yaml from 'js-yaml';
import { useYamlConverter } from './useYamlConverter';
import { YamlEditor } from './YamlEditor';
import { DotEditor } from './DotEditor';
import { FileManager } from './FileManager';
import { MetadataExtractor } from './MetadataExtractor';
import { DescriptionEditor } from './DescriptionEditor';
import { RelatedFilesSection } from './RelatedFilesSection';
import { SampleLoader } from './SampleLoader';
import { GraphvizViewerWithZoom } from '../GraphvizViewerWithZoom';
import { SAMPLES, SAMPLE_SITE_EQUIPMENT_YAML } from './samples';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { ViewModeSelector, type ViewMode } from '../utils/ViewModeSelector';
import { SiteEquipment3DViewer } from './SiteEquipment3DViewer';

interface Tab2Props {
  initialFileId?: string | null;
  organizationId?: string | null;
}

// YAMLテンプレート生成関数
function generateSiteEquipmentTemplate(info: { siteId: string; siteLabel?: string }): string {
  return `id: site_equipment_${Date.now()}
type: site-equipment
label: ${info.siteLabel || '棟内機器構成'}
description: ""
siteId: ${info.siteId}
racks: []
connections: []
`;
}

export function Tab2({ initialFileId, organizationId }: Tab2Props = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
  } = useYamlConverter(SAMPLE_SITE_EQUIPMENT_YAML, 'full');

  // 現在のYAMLファイルID（保存済みの場合）
  const [currentYamlFileId, setCurrentYamlFileId] = useState<string | null>(initialFileId || null);
  const [yamlFileName, setYamlFileName] = useState<string>('未保存のYAML');
  const [yamlDescription, setYamlDescription] = useState<string>('');
  
  // メタデータ（セマンティックカテゴリ、キーワード、要約）
  const [semanticCategory, setSemanticCategory] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [contentSummary, setContentSummary] = useState<string>('');
  
  // ラック追加モーダルの状態
  const [showAddRackModal, setShowAddRackModal] = useState(false);
  const [equipmentCountInput, setEquipmentCountInput] = useState<string>('1');
  
  // 3D表示モード
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [siteEquipmentData, setSiteEquipmentData] = useState<any>(null);

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
  }, [initialFileId]);

  // サンプルファイル読み込み
  const loadSample = useCallback((sampleType: 'site_equipment') => {
    setYamlContent(SAMPLES[sampleType] || '');
  }, [setYamlContent]);

  // YAMLからsite-equipmentデータを取得して3D表示用に変換
  useEffect(() => {
    if (!yamlContent || yamlType !== 'site-equipment') {
      setSiteEquipmentData(null);
      return;
    }

    try {
      const parsed = yaml.load(yamlContent) as any;
      if (parsed && parsed.type === 'site-equipment') {
        setSiteEquipmentData(parsed);
      } else {
        setSiteEquipmentData(null);
      }
    } catch (error) {
      console.error('YAMLパースエラー:', error);
      setSiteEquipmentData(null);
    }
  }, [yamlContent, yamlType]);

  // ラックを追加するテンプレートを挿入
  const handleAddRack = useCallback(() => {
    console.log('🔄 [Tab2] ラック追加ボタンがクリックされました');
    console.log('🔄 [Tab2] 現在のyamlContent:', yamlContent ? 'exists' : 'empty', yamlContent?.substring(0, 100));
    try {
      let parsed: any = {};
      let isNewFile = false;

      // 現在のYAMLをパース
      if (yamlContent && yamlContent.trim()) {
        try {
          parsed = yaml.load(yamlContent) as any;
          console.log('✅ [Tab2] YAMLパース成功:', parsed?.type);
        } catch (e) {
          console.warn('⚠️ [Tab2] YAMLのパースに失敗しました。新しいファイルとして作成します。', e);
          isNewFile = true;
        }
      } else {
        console.log('ℹ️ [Tab2] YAMLコンテンツが空です。新しいファイルとして作成します。');
        isNewFile = true;
      }

      // site-equipment形式でない、または空の場合は基本構造を作成
      if (isNewFile || !parsed.type || parsed.type !== 'site-equipment') {
        console.log('ℹ️ [Tab2] site-equipment形式ではないため、基本構造を作成します');
        parsed = {
          id: `site_equipment_${Date.now()}`,
          type: 'site-equipment',
          label: '棟内機器構成',
          description: '',
          siteId: '',
          racks: [],
          connections: [],
        };
      }

      // racks配列が存在しない場合は作成
      if (!parsed.racks || !Array.isArray(parsed.racks)) {
        console.log('ℹ️ [Tab2] racks配列が存在しないため、作成します');
        parsed.racks = [];
      }

      console.log('🔄 [Tab2] 現在のracks数:', parsed.racks.length);

      // モーダルを表示して機器数の入力を待つ
      console.log('🔄 [Tab2] ラック追加モーダルを表示します');
      setEquipmentCountInput('1');
      setShowAddRackModal(true);
      return; // モーダルで入力待ち

      // 新しいラックのテンプレートを作成
      const rackNumber = parsed.racks.length + 1;
      const rackId = `rack_${Date.now()}`;
      const newRack = {
        id: rackId,
        label: `ラック${rackNumber}`,
        location: {
          floor: 1,
          row: 'A',
          position: rackNumber,
        },
        capacity: {
          units: 42,
          power: 10,
        },
        equipment: [] as any[],
      };

      // 指定された機器数分のequipmentを追加
      for (let i = 1; i <= equipmentCount; i++) {
        const equipmentId = `${rackId}_server_${i}`;
        newRack.equipment.push({
          id: equipmentId,
          type: 'server',
          label: `サーバー${i}`,
          model: '',
          position: {
            unit: `${(i - 1) * 4 + 1}-${i * 4}`,
          },
          ports: [],
        });
      }

      // racks配列に追加
      parsed.racks.push(newRack);

      // YAMLに変換
      const newYaml = yaml.dump(parsed, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });

      setYamlContent(newYaml);
    } catch (error) {
      console.error('ラックの追加に失敗:', error);
      alert(`ラックの追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [yamlContent, setYamlContent]);

  // ラック追加の実行（モーダルから呼び出される）
  const executeAddRack = useCallback(() => {
    console.log('🔄 [Tab2] executeAddRack 実行開始');
    try {
      const equipmentCount = parseInt(equipmentCountInput, 10);
      console.log('🔄 [Tab2] 解析された機器数:', equipmentCount);
      if (isNaN(equipmentCount) || equipmentCount < 1 || equipmentCount > 100) {
        alert('機器数は1から100の間で入力してください');
        return;
      }
      
      console.log('✅ [Tab2] 機器数検証完了:', equipmentCount);
      
      let parsed: any = {};
      let isNewFile = false;

      // 現在のYAMLをパース
      if (yamlContent && yamlContent.trim()) {
        try {
          parsed = yaml.load(yamlContent) as any;
          console.log('✅ [Tab2] YAMLパース成功:', parsed?.type);
        } catch (e) {
          console.warn('⚠️ [Tab2] YAMLのパースに失敗しました。新しいファイルとして作成します。', e);
          isNewFile = true;
        }
      } else {
        console.log('ℹ️ [Tab2] YAMLコンテンツが空です。新しいファイルとして作成します。');
        isNewFile = true;
      }

      // site-equipment形式でない、または空の場合は基本構造を作成
      if (isNewFile || !parsed.type || parsed.type !== 'site-equipment') {
        console.log('ℹ️ [Tab2] site-equipment形式ではないため、基本構造を作成します');
        parsed = {
          id: `site_equipment_${Date.now()}`,
          type: 'site-equipment',
          label: '棟内機器構成',
          description: '',
          siteId: '',
          racks: [],
          connections: [],
        };
      }

      // racks配列が存在しない場合は作成
      if (!parsed.racks || !Array.isArray(parsed.racks)) {
        console.log('ℹ️ [Tab2] racks配列が存在しないため、作成します');
        parsed.racks = [];
      }

      console.log('🔄 [Tab2] 現在のracks数:', parsed.racks.length);

      // 新しいラックのテンプレートを作成
      console.log('🔄 [Tab2] 新しいラックを作成します...');
      const rackNumber = parsed.racks.length + 1;
      const rackId = `rack_${Date.now()}`;
      console.log('🔄 [Tab2] ラックID:', rackId, 'ラック番号:', rackNumber);
      const newRack = {
        id: rackId,
        label: `ラック${rackNumber}`,
        location: {
          floor: 1,
          row: 'A',
          position: rackNumber,
        },
        capacity: {
          units: 42,
          power: 10,
        },
        equipment: [] as any[],
      };

      // 指定された機器数分のequipmentを追加
      console.log('🔄 [Tab2] 機器を追加します。機器数:', equipmentCount);
      for (let i = 1; i <= equipmentCount; i++) {
        const equipmentId = `${rackId}_server_${i}`;
        newRack.equipment.push({
          id: equipmentId,
          type: 'server',
          label: `サーバー${i}`,
          model: '',
          position: {
            unit: `${(i - 1) * 4 + 1}-${i * 4}`,
          },
          ports: [],
        });
      }
      console.log('✅ [Tab2] 機器追加完了。追加された機器数:', newRack.equipment.length);

      // racks配列に追加
      parsed.racks.push(newRack);
      console.log('✅ [Tab2] ラックをracks配列に追加しました。現在のracks数:', parsed.racks.length);

      // YAMLに変換
      console.log('🔄 [Tab2] YAMLに変換します...');
      let newYaml: string;
      try {
        newYaml = yaml.dump(parsed, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        });
        console.log('✅ [Tab2] YAML変換成功。長さ:', newYaml.length);
      } catch (e) {
        console.error('❌ [Tab2] YAML変換エラー:', e);
        throw new Error(`YAML変換に失敗しました: ${e instanceof Error ? e.message : '不明なエラー'}`);
      }

      console.log('🔄 [Tab2] setYamlContentを呼び出します...');
      setYamlContent(newYaml);
      console.log('✅ [Tab2] setYamlContent呼び出し完了');
      console.log('✅ [Tab2] ラック追加処理完了');
      
      // モーダルを閉じる
      setShowAddRackModal(false);
      setEquipmentCountInput('1');
    } catch (error) {
      console.error('❌ [Tab2] ラックの追加に失敗:', error);
      console.error('❌ [Tab2] エラー詳細:', error instanceof Error ? error.stack : error);
      alert(`ラックの追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [yamlContent, setYamlContent, equipmentCountInput]);

  const availableViews: typeof viewType[] = ['full'];

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
          タブ2: 棟内機器構成
        </h2>
        <p style={{ 
          color: '#666', 
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          1つの棟内の機器構成、ラック配置、機器間の接続を管理します。
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
            <li>ラック（Rack）の定義と配置</li>
            <li>ラック内の機器（サーバー、スイッチ、ルーター等）の配置</li>
            <li>機器間の接続（LAN、管理ネットワーク等）</li>
            <li>機器の物理的な配置情報（ラック番号、ユニット位置等）</li>
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
        
        {/* サンプル読み込みとファイル管理 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '8px',
        }}>
          <ViewModeSelector
            mode={viewMode}
            onModeChange={setViewMode}
          />
          <SampleLoader onLoadSample={loadSample} />
          {/* ラック追加ボタン（常に表示） */}
          {(
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 [Tab2] ラック追加ボタン onClick イベント発火');
                handleAddRack();
              }}
              style={{
                padding: '8px 16px',
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
              title="新しいラックのテンプレートをYAMLに追加"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10 4V16M4 10H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              ラックを追加
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
                setDotCodeDirectly(dot);
              }
            }}
            onFileSaved={async (fileId, fileName) => {
              setCurrentYamlFileId(fileId);
              setYamlFileName(fileName);
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
                
                // site-equipmentタイプの場合、各ラックと機器に対してカードを自動生成
                if (file.yamlType === 'site-equipment' && file.yamlContent) {
                  try {
                    const parsed = yaml.load(file.yamlContent) as any;
                    if (parsed && parsed.racks && Array.isArray(parsed.racks)) {
                      // 既存のカードを取得
                      const allFiles = await getAllGraphvizYamlFiles();
                      const existingRackServersFiles = allFiles.filter(
                        f => f.yamlType === 'rack-servers' && f.organizationId === organizationId
                      );
                      const existingServerDetailsFiles = allFiles.filter(
                        f => f.yamlType === 'server-details' && f.organizationId === organizationId
                      );
                      
                      // siteIdから棟名を取得
                      let siteName = '';
                      if (parsed.siteId) {
                        try {
                          const siteTopologyFiles = allFiles.filter(
                            f => f.yamlType === 'site-topology' && f.organizationId === organizationId
                          );
                          for (const siteTopologyFile of siteTopologyFiles) {
                            if (!siteTopologyFile.yamlContent) continue;
                            try {
                              const siteTopologyParsed = yaml.load(siteTopologyFile.yamlContent) as any;
                              if (siteTopologyParsed?.sites && Array.isArray(siteTopologyParsed.sites)) {
                                const site = siteTopologyParsed.sites.find((s: any) => s.id === parsed.siteId);
                                if (site && site.label) {
                                  siteName = site.label;
                                  break;
                                }
                              }
                            } catch {
                              continue;
                            }
                          }
                        } catch (error) {
                          console.warn('棟名の取得に失敗:', error);
                        }
                      }
                      
                      // 各ラックに対してrack-serversカードを作成
                      for (const rack of parsed.racks) {
                        if (!rack.id || !rack.label) continue;
                        
                        // 既存のrack-serversカードがあるかチェック（rackIdで検索）
                        const existingRackFile = existingRackServersFiles.find(f => {
                          if (!f.yamlContent) return false;
                          try {
                            const rackServersParsed = yaml.load(f.yamlContent) as any;
                            return rackServersParsed?.rackId === rack.id;
                          } catch {
                            return false;
                          }
                        });
                        
                        // 既存のカードがない場合のみ作成
                        if (!existingRackFile) {
                          // カード名: 「棟 - ラック名」
                          const cardName = siteName ? `${siteName} - ${rack.label}` : `${rack.label} - ラック内サーバー`;
                          const rackServersYaml = `id: ${rack.id}_servers
type: rack-servers
label: ${cardName}
description: ${rack.label}のラック内サーバー詳細
rackId: "${rack.id}"
servers: []
`;
                          
                          await createGraphvizYamlFile(
                            cardName,
                            rackServersYaml,
                            {
                              yamlType: 'rack-servers',
                              organizationId: organizationId || undefined,
                              description: `${rack.label}のラック内サーバー詳細`,
                            }
                          );
                          console.log(`✅ ラック内サーバーカードを作成しました: ${cardName}`);
                        }
                        
                        // 各ラック内の各機器（equipment）に対してserver-detailsカードを作成
                        if (rack.equipment && Array.isArray(rack.equipment)) {
                          for (const equipment of rack.equipment) {
                            if (!equipment.id || !equipment.label) continue;
                            
                            // 既存のserver-detailsカードがあるかチェック（serverIdで検索）
                            const existingServerFile = existingServerDetailsFiles.find(f => {
                              if (!f.yamlContent) return false;
                              try {
                                const serverDetailsParsed = yaml.load(f.yamlContent) as any;
                                return serverDetailsParsed?.serverId === equipment.id;
                              } catch {
                                return false;
                              }
                            });
                            
                            // 既存のカードがない場合のみ作成
                            if (!existingServerFile) {
                              // カード名: 「ラック名 - サーバー名」
                              const cardName = `${rack.label} - ${equipment.label}`;
                              const serverDetailsYaml = `id: ${equipment.id}_details
type: server-details
label: ${cardName}
description: ${equipment.label}の機器詳細情報
serverId: "${equipment.id}"
os: {}
middleware: []
applications: []
sequences: []
`;
                              
                              await createGraphvizYamlFile(
                                cardName,
                                serverDetailsYaml,
                                {
                                  yamlType: 'server-details',
                                  organizationId: organizationId || undefined,
                                  description: `${equipment.label}の機器詳細情報`,
                                }
                              );
                              console.log(`✅ 機器詳細カードを作成しました: ${cardName}`);
                            }
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.error('ラック・サーバーカードの自動生成に失敗:', error);
                  }
                }
              } catch (error) {
                console.error('ファイル情報の取得に失敗:', error);
              }
            }}
            onFileLoaded={async (fileId, fileName) => {
              setCurrentYamlFileId(fileId);
              setYamlFileName(fileName);
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

        {/* AIメタデータ抽出 */}
        <MetadataExtractor
          yamlFileId={currentYamlFileId}
          yamlName={yamlFileName}
          yamlContent={yamlContent}
          dotContent={dotCode}
          organizationId={organizationId || undefined}
          semanticCategory={semanticCategory}
          keywords={keywords}
          contentSummary={contentSummary}
          onMetadataExtracted={async (entities, relations) => {
            console.log('✅ メタデータ抽出完了:', {
              entities: entities.length,
              relations: relations.length,
            });
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
        minHeight: '600px',
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

          {/* Graphviz表示 */}
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
              {viewMode === '2d' ? 'Graphvizグラフ' : '3D表示'}
            </div>
            <div style={{
              flex: 1,
              minHeight: 0,
            }}>
              {viewMode === '3d' && siteEquipmentData ? (
                <SiteEquipment3DViewer
                  siteEquipment={siteEquipmentData}
                  onRackClick={(rackId) => {
                    console.log('ラックがクリックされました:', rackId);
                    // 必要に応じてラック詳細ページに遷移
                  }}
                  onEquipmentClick={(equipmentId) => {
                    console.log('機器がクリックされました:', equipmentId);
                    // 必要に応じて機器詳細ページに遷移
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

      {/* ラック追加モーダル */}
      {showAddRackModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddRackModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
              ラックを追加
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                搭載する機器数（1-100）
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={equipmentCountInput}
                onChange={(e) => setEquipmentCountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executeAddRack();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddRackModal(false);
                  setEquipmentCountInput('1');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={executeAddRack}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

