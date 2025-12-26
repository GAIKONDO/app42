/**
 * Graphviz タブ3: ラック内サーバー・ポート
 * ラック内のサーバーや機器の詳細、ポート構成、接続詳細を管理
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getGraphvizYamlFile, getGraphvizDotFile, getAllGraphvizYamlFiles } from '@/lib/graphvizApi';
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
import { SAMPLES, SAMPLE_RACK_SERVERS_YAML } from './samples';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { ViewModeSelector, type ViewMode } from '../utils/ViewModeSelector';
import { Rack3DViewer } from './Rack3DViewer';

interface Tab3Props {
  initialFileId?: string | null;
  organizationId?: string | null;
}

// YAMLテンプレート生成関数（Tab2のサーバー情報を自動反映）
async function generateRackServersTemplate(
  info: { rackId: string; rackLabel?: string; organizationId?: string | null }
): Promise<string> {
  const rackId = info.rackId;
  let servers: any[] = [];
  
  // Tab2（site-equipment）から該当ラックのサーバー情報を取得
  try {
    console.log('🔄 [Tab3] Tab2からサーバー情報を取得中...', { rackId });
    const allFiles = await getAllGraphvizYamlFiles(info.organizationId || undefined);
    
    // site-equipmentファイルを検索
    for (const file of allFiles) {
      if (file.yamlType !== 'site-equipment' || !file.yamlContent) continue;
      
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        if (parsed?.racks && Array.isArray(parsed.racks)) {
          const rack = parsed.racks.find((r: any) => r.id === rackId);
          if (rack && rack.equipment && Array.isArray(rack.equipment)) {
            console.log('✅ [Tab3] ラックが見つかりました。サーバー情報を変換中...', {
              rackId,
              equipmentCount: rack.equipment.length
            });
            
            // equipment配列をservers配列に変換
            servers = rack.equipment
              .filter((eq: any) => eq.type === 'server') // サーバーのみ
              .map((eq: any) => ({
                id: eq.id,
                label: eq.label || eq.id,
                model: eq.model || '',
                position: eq.position || {},
                ports: eq.ports || [],
                connections: eq.connections || [],
              }));
            
            console.log('✅ [Tab3] サーバー情報を変換しました', { serversCount: servers.length });
            break;
          }
        }
      } catch (e) {
        console.warn('⚠️ [Tab3] YAMLパースエラー:', e);
        continue;
      }
    }
  } catch (error) {
    console.error('❌ [Tab3] サーバー情報の取得に失敗:', error);
  }
  
  // YAMLテンプレートを生成
  let serversYaml = 'servers: []\n';
  if (servers.length > 0) {
    serversYaml = 'servers:\n';
    for (const server of servers) {
      serversYaml += `  - id: ${server.id}\n`;
      serversYaml += `    label: ${server.label || server.id}\n`;
      if (server.model) {
        serversYaml += `    model: ${server.model}\n`;
      }
      if (server.position && Object.keys(server.position).length > 0) {
        if (server.position.unit) {
          serversYaml += `    position:\n`;
          serversYaml += `      unit: "${server.position.unit}"\n`;
        }
      }
      if (server.ports && Array.isArray(server.ports) && server.ports.length > 0) {
        serversYaml += `    ports:\n`;
        for (const port of server.ports) {
          serversYaml += `      - id: ${port.id}\n`;
          if (port.label) {
            serversYaml += `        label: ${port.label}\n`;
          }
          if (port.speed) {
            serversYaml += `        speed: ${port.speed}\n`;
          }
        }
      } else {
        serversYaml += `    ports: []\n`;
      }
      if (server.connections && Array.isArray(server.connections) && server.connections.length > 0) {
        serversYaml += `    connections: []\n`; // 接続は後で手動で追加
      }
    }
  }
  
  return `id: rack_servers_${Date.now()}
type: rack-servers
label: ${info.rackLabel || 'ラック内サーバー'}
description: ""
rackId: ${rackId}
${serversYaml}`;
}

export function Tab3({ initialFileId, organizationId }: Tab3Props = {}) {
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
  } = useYamlConverter(SAMPLE_RACK_SERVERS_YAML, 'full');

  const [currentYamlFileId, setCurrentYamlFileId] = useState<string | null>(initialFileId || null);
  const [yamlFileName, setYamlFileName] = useState<string>('未保存のYAML');
  const [yamlDescription, setYamlDescription] = useState<string>('');
  const [semanticCategory, setSemanticCategory] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [contentSummary, setContentSummary] = useState<string>('');
  const [lastFileUpdatedAt, setLastFileUpdatedAt] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [rackServersData, setRackServersData] = useState<any>(null);
  const [rackData, setRackData] = useState<any>(null);

  // URLパラメータから階層情報を取得してYAMLテンプレートを生成
  useEffect(() => {
    const rackId = searchParams?.get('rackId');
    const rackLabel = searchParams?.get('rackLabel');
    const createMode = searchParams?.get('create') === 'true';
    
    // 新規作成モードの場合、YAMLテンプレートを生成（Tab2のサーバー情報を自動反映）
    if (createMode && rackId && !initialFileId) {
      console.log('🔄 [Tab3] 新規作成モード: 階層情報からYAMLテンプレートを生成', { rackId, rackLabel });
      
      generateRackServersTemplate({
        rackId: rackId,
        rackLabel: rackLabel ? decodeURIComponent(rackLabel) : undefined,
        organizationId: organizationId,
      }).then((template) => {
        console.log('✅ [Tab3] YAMLテンプレート生成完了', { templateLength: template.length });
        setYamlContent(template);
        
        // URLパラメータからcreateフラグを削除（一度だけ実行）
        const newParams = new URLSearchParams(searchParams?.toString() || '');
        newParams.delete('create');
        const newUrl = newParams.toString() ? `?${newParams.toString()}` : '';
        router.replace(`/graphviz${newUrl}`);
      }).catch((error) => {
        console.error('❌ [Tab3] YAMLテンプレート生成エラー:', error);
        // エラー時は空のテンプレートを使用
        const fallbackTemplate = `id: rack_servers_${Date.now()}
type: rack-servers
label: ${rackLabel ? decodeURIComponent(rackLabel) : 'ラック内サーバー'}
description: ""
rackId: ${rackId}
servers: []
`;
        setYamlContent(fallbackTemplate);
      });
    }
  }, [searchParams, router, setYamlContent, initialFileId, organizationId]);

  // ファイル読み込み関数
  const loadFile = useCallback(async (fileId: string, useSavedDot: boolean = true) => {
    try {
      const file = await getGraphvizYamlFile(fileId);
      if (!file.yamlContent || typeof file.yamlContent !== 'string' || !file.yamlContent.trim()) {
        return;
      }
      
      // ファイルが更新されたかどうかをチェック
      const fileUpdated = file.updatedAt && lastFileUpdatedAt && file.updatedAt !== lastFileUpdatedAt;
      if (fileUpdated) {
        console.log('🔄 [Tab3] ファイルが更新されました。YAMLコンテンツを再読み込みします');
      }
      
      // YAMLをパースしてrackIdを取得
      let parsed: any = null;
      let rackId: string | null = null;
      try {
        parsed = yaml.load(file.yamlContent) as any;
        rackId = parsed?.rackId || null;
      } catch (e) {
        console.warn('⚠️ [Tab3] YAMLパースエラー:', e);
      }
      
      // サーバー情報が空の場合、Tab2から取得して反映
      let yamlContentToSet = file.yamlContent;
      if (rackId && parsed && (!parsed.servers || parsed.servers.length === 0)) {
        console.log('🔄 [Tab3] サーバー情報が空のため、Tab2から取得します', { rackId });
        try {
          const allFiles = await getAllGraphvizYamlFiles(organizationId || undefined);
          
          // site-equipmentファイルを検索
          for (const siteFile of allFiles) {
            if (siteFile.yamlType !== 'site-equipment' || !siteFile.yamlContent) continue;
            
            try {
              const siteParsed = yaml.load(siteFile.yamlContent) as any;
              if (siteParsed?.racks && Array.isArray(siteParsed.racks)) {
                const rack = siteParsed.racks.find((r: any) => r.id === rackId);
                if (rack && rack.equipment && Array.isArray(rack.equipment)) {
                  const servers = rack.equipment
                    .filter((eq: any) => eq.type === 'server')
                    .map((eq: any) => ({
                      id: eq.id,
                      label: eq.label || eq.id,
                      model: eq.model || '',
                      position: eq.position || {},
                      ports: eq.ports || [],
                      connections: eq.connections || [],
                    }));
                  
                  if (servers.length > 0) {
                    console.log('✅ [Tab3] Tab2からサーバー情報を取得しました', { serversCount: servers.length });
                    // YAMLにserversを追加
                    parsed.servers = servers;
                    yamlContentToSet = yaml.dump(parsed, { indent: 2, lineWidth: -1 });
                    console.log('✅ [Tab3] YAMLにサーバー情報を反映しました');
                  }
                  break;
                }
              }
            } catch (e) {
              console.warn('⚠️ [Tab3] site-equipment YAMLパースエラー:', e);
              continue;
            }
          }
        } catch (error) {
          console.error('❌ [Tab3] Tab2からのサーバー情報取得に失敗:', error);
        }
      }
      
      // 保存されたDOTファイルを取得（あれば）
      let savedDotCode: string | undefined;
      if (useSavedDot) {
        try {
          const dotFile = await getGraphvizDotFile(fileId);
          if (dotFile && dotFile.dotContent && typeof dotFile.dotContent === 'string' && dotFile.dotContent.trim()) {
            savedDotCode = dotFile.dotContent;
          }
        } catch (dotError) {
          // DOTファイルが存在しない場合は無視
          console.log('DOTファイルが見つかりません。YAMLから再変換します。');
        }
      }
      
      console.log('🔄 [Tab3] loadFile: YAMLコンテンツを設定', { 
        yamlContentLength: yamlContentToSet?.length,
        hasSavedDotCode: !!savedDotCode 
      });
      
      // まずYAMLコンテンツを設定（これによりuseYamlConverterが自動変換を開始）
      setYamlContent(yamlContentToSet);
      
      // 保存されたDOTコードがある場合、一時的にそれを使用
      // ただし、useYamlConverterが自動変換を開始するため、すぐに上書きされる可能性がある
      // そのため、保存されたDOTコードは使用せず、常にYAMLから変換する
      // if (savedDotCode) {
      //   setDotCodeDirectly(savedDotCode);
      // }
      
      // useYamlConverterが自動的にYAMLからDOTコードに変換する
      setCurrentYamlFileId(file.id);
      setYamlFileName(file.name);
      setYamlDescription(file.description || '');
      setSemanticCategory(file.semanticCategory || '');
      try {
        setKeywords(file.keywords && file.keywords.trim() ? JSON.parse(file.keywords) : []);
      } catch (e) {
        setKeywords([]);
      }
      setContentSummary(file.contentSummary || '');
      
      if (file.updatedAt) {
        setLastFileUpdatedAt(file.updatedAt);
      }
    } catch (error: any) {
      console.error('ファイルの読み込みに失敗:', error);
    }
  }, [setYamlContent, setDotCodeDirectly, lastFileUpdatedAt, organizationId]);

  // 初期ファイル読み込み
  useEffect(() => {
    if (initialFileId) {
      loadFile(initialFileId, true);
    }
  }, [initialFileId, loadFile]);

  // ファイル更新を定期的にチェック（5秒ごと）
  useEffect(() => {
    if (!currentYamlFileId) return;
    
    const checkFileUpdate = async () => {
      try {
        const file = await getGraphvizYamlFile(currentYamlFileId);
        if (file.updatedAt && lastFileUpdatedAt && file.updatedAt !== lastFileUpdatedAt) {
          console.log('🔄 [Tab3] ファイルが更新されました。YAMLコンテンツを再読み込みします');
          // ファイルを再読み込み（保存されたDOTコードは使用しない）
          await loadFile(currentYamlFileId, false);
        }
      } catch (error) {
        console.error('❌ [Tab3] ファイル更新チェックに失敗:', error);
      }
    };
    
    const intervalId = setInterval(checkFileUpdate, 5000); // 5秒ごとにチェック
    
    return () => {
      clearInterval(intervalId);
    };
  }, [currentYamlFileId, lastFileUpdatedAt, loadFile]);

  const loadSample = useCallback((sampleType: 'rack_servers') => {
    setYamlContent(SAMPLES[sampleType] || '');
  }, [setYamlContent]);

  const availableViews: typeof viewType[] = ['full'];

  // YAMLからrack-serversデータを取得して3D表示用に変換
  useEffect(() => {
    const loadRackServersData = async () => {
      if (!yamlContent || yamlType !== 'rack-servers') {
        setRackServersData(null);
        setRackData(null);
        return;
      }

      try {
        const parsed = yaml.load(yamlContent) as any;
        if (parsed && parsed.type === 'rack-servers') {
          setRackServersData(parsed);

          // rackIdからラック情報を取得
          if (parsed.rackId && organizationId) {
            try {
              // site-equipmentからラック情報を取得
              const allFiles = await getAllGraphvizYamlFiles(organizationId);
              for (const file of allFiles) {
                if (file.yamlType !== 'site-equipment' || !file.yamlContent) continue;
                try {
                  const siteParsed = yaml.load(file.yamlContent) as any;
                  if (siteParsed?.racks && Array.isArray(siteParsed.racks)) {
                    const rack = siteParsed.racks.find((r: any) => r.id === parsed.rackId);
                    if (rack) {
                      setRackData(rack);
                      break;
                    }
                  }
                } catch (e) {
                  console.warn('site-equipment YAMLパースエラー:', e);
                }
              }
            } catch (error) {
              console.error('ラック情報の取得に失敗:', error);
            }
          }
        } else {
          setRackServersData(null);
          setRackData(null);
        }
      } catch (error) {
        console.error('YAMLパースエラー:', error);
        setRackServersData(null);
        setRackData(null);
      }
    };

    loadRackServersData();
  }, [yamlContent, yamlType, organizationId]);

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
          タブ3: ラック内サーバー・ポート
        </h2>
        <p style={{ 
          color: '#666', 
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          1つのラック内のサーバーや機器の詳細、ポート構成、接続詳細を管理します。
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
            <li>サーバーの詳細仕様（CPU、メモリ、ストレージ等）</li>
            <li>ポートの詳細情報（速度、VLAN、IPアドレス等）</li>
            <li>ポート間の接続詳細</li>
            <li>ネットワーク設定（VLAN、サブネット等）</li>
          </ul>
        </div>
        <p style={{ 
          color: '#666', 
          fontSize: '14px',
          marginBottom: '8px',
        }}>
          YAMLコードを入力すると、自動的にGraphviz DOTコードに変換され、グラフとして表示されます。
        </p>

        <DescriptionEditor
          yamlFileId={currentYamlFileId}
          description={yamlDescription}
          onDescriptionUpdated={setYamlDescription}
        />

        <RelatedFilesSection
          yamlFileId={currentYamlFileId}
          organizationId={organizationId || null}
        />
        
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
          <FileManager
            yamlContent={yamlContent}
            dotCode={dotCode}
            viewType={viewType}
            organizationId={organizationId || undefined}
            currentFileId={currentYamlFileId}
            onLoadFile={(yaml, dot) => {
              console.log('🔄 [Tab3] FileManager onLoadFile', { 
                yamlLength: yaml?.length,
                hasDot: !!dot 
              });
              // YAMLコンテンツを設定（useYamlConverterが自動変換を開始）
              setYamlContent(yaml);
              // 保存されたDOTコードは使用せず、常にYAMLから変換する
              // if (dot) {
              //   setDotCodeDirectly(dot);
              // }
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        flex: 1,
        minHeight: '600px',
      }}>
        <YamlEditor
          value={yamlContent}
          onChange={setYamlContent}
        />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: 0,
        }}>
          <DotEditor value={dotCode} />

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
              {viewMode === '3d' && rackServersData ? (
                <Rack3DViewer
                  rackServers={rackServersData}
                  rack={rackData}
                  onServerClick={(serverId) => {
                    console.log('サーバーがクリックされました:', serverId);
                    // 必要に応じてサーバー詳細ページに遷移
                  }}
                  height={600}
                />
              ) : (
                (() => {
                  console.log('🔄 [Tab3] GraphvizViewerWithZoom レンダリング', { 
                    dotCodeLength: dotCode?.length,
                    hasDotCode: !!dotCode,
                    error: error,
                    isConverting: isConverting,
                    yamlType: yamlType
                  });
                  return <GraphvizViewerWithZoom dotCode={dotCode} error={error || undefined} />;
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

