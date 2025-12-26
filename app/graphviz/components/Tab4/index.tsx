/**
 * Graphviz タブ4: 機器詳細・シーケンス
 * 個別サーバーの詳細設定、アプリケーション構成、シーケンス図を管理
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getGraphvizYamlFile, getGraphvizDotFile } from '@/lib/graphvizApi';
import { useYamlConverter } from './useYamlConverter';
import { YamlEditor } from './YamlEditor';
import { DotEditor } from './DotEditor';
import { FileManager } from './FileManager';
import { MetadataExtractor } from './MetadataExtractor';
import { DescriptionEditor } from './DescriptionEditor';
import { RelatedFilesSection } from './RelatedFilesSection';
import { SampleLoader } from './SampleLoader';
import { GraphvizViewerWithZoom } from '../GraphvizViewerWithZoom';
import { SAMPLES, SAMPLE_SERVER_DETAILS_YAML } from './samples';
import * as yaml from 'js-yaml';
import { FiServer } from 'react-icons/fi';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';
import { ViewModeSelector, type ViewMode } from '../utils/ViewModeSelector';
import { ServerDetails3DViewer } from './ServerDetails3DViewer';

interface Tab4Props {
  initialFileId?: string | null;
  organizationId?: string | null;
}

// YAMLテンプレート生成関数
function generateServerDetailsTemplate(info: { serverLabel?: string }): string {
  const timestamp = Date.now();
  return `id: server_details_${timestamp}
type: server-details
label: ${info.serverLabel || '機器詳細'}
description: ""

# ハードウェア情報
hardware:
  model: ""  # 例: Dell R650 TypeC1.3i
  serialNumber: ""  # シリアル番号
  manufacturer: ""  # メーカー名
  updated: ""  # 更新日（例: 2025/5/7更新）

# ドライブベイ・スロット情報
slots:
  - id: slot0
    label: slot0 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: empty  # empty, installed, failed
    capacity: ""
  - id: slot1
    label: slot1 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: empty
    capacity: ""
  - id: slot2
    label: slot2 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: empty
    capacity: ""
  - id: slot3
    label: slot3 NVMe CPU1
    type: NVMe
    cpu: CPU1
    status: empty
    capacity: ""
  - id: slot4
    label: slot4 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: empty
    capacity: ""
  - id: slot5
    label: slot5 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: empty
    capacity: ""
  - id: slot6
    label: slot6 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: empty
    capacity: ""
  - id: slot7
    label: slot7 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: empty
    capacity: ""
  - id: slot8
    label: slot8 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: empty
    capacity: ""
  - id: slot9
    label: slot9 NVMe CPU0
    type: NVMe
    cpu: CPU0
    status: empty
    capacity: ""

# フロントパネルポート
frontPanelPorts:
  - id: vga
    label: VGAポート
    type: VGA
    location: front
    description: "ビデオ出力ポート"
  - id: usb
    label: USBポート
    type: USB
    location: front
    description: "USB接続ポート"
  - id: power
    label: 電源ボタン
    type: button
    location: front
    description: "電源ボタン（LEDインジケーター付き）"

# ネットワークポート
ports:
  - id: eth0
    label: 管理ポート
    speed: 1Gbps
    mac: ""
    ip: ""
    vlan: ""
    description: ""
  - id: eth1
    label: サービスポート
    speed: 10Gbps
    mac: ""
    ip: ""
    vlan: ""
    description: ""

# OS情報
os:
  type: ""
  distribution: ""
  kernel: ""
  description: ""

# ミドルウェア
middleware: []

# アプリケーション
applications: []

# シーケンス図
sequences: []
`;
}

export function Tab4({ initialFileId, organizationId }: Tab4Props = {}) {
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
  } = useYamlConverter(SAMPLE_SERVER_DETAILS_YAML, 'full');

  const [currentYamlFileId, setCurrentYamlFileId] = useState<string | null>(initialFileId || null);
  const [yamlFileName, setYamlFileName] = useState<string>('未保存のYAML');
  const [yamlDescription, setYamlDescription] = useState<string>('');
  const [semanticCategory, setSemanticCategory] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [contentSummary, setContentSummary] = useState<string>('');
  
  // 3D表示モード
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [serverDetailsData, setServerDetailsData] = useState<any>(null);

  // 新規作成時の自動テンプレート生成は削除
  // 「サーバー詳細を追加」ボタンから手動で追加する方式に変更

  useEffect(() => {
    if (initialFileId) {
      const loadInitialFile = async () => {
        try {
          const file = await getGraphvizYamlFile(initialFileId);
          if (!file.yamlContent || typeof file.yamlContent !== 'string' || !file.yamlContent.trim()) {
            return;
          }
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
  }, [initialFileId, setYamlContent, setDotCodeDirectly]);

  const loadSample = useCallback((sampleType: 'server_details') => {
    setYamlContent(SAMPLES[sampleType] || '');
  }, [setYamlContent]);

  // YAMLからserver-detailsデータを取得して3D表示用に変換
  useEffect(() => {
    if (!yamlContent || yamlType !== 'server-details') {
      setServerDetailsData(null);
      return;
    }

    try {
      const parsed = yaml.load(yamlContent) as any;
      if (parsed && parsed.type === 'server-details') {
        setServerDetailsData(parsed);
      } else {
        setServerDetailsData(null);
      }
    } catch (error) {
      console.error('YAMLパースエラー:', error);
      setServerDetailsData(null);
    }
  }, [yamlContent, yamlType]);

  // サーバー詳細テンプレートをYAMLに追加
  const handleAddServerDetails = useCallback(() => {
    try {
      // 現在のYAMLをパース
      let parsed: any = {};
      let existingServerId: string | undefined = undefined;
      
      if (yamlContent && yamlContent.trim()) {
        try {
          parsed = yaml.load(yamlContent) as any;
          // 既存のserverIdを保持（上書きしないように保存）
          existingServerId = parsed.serverId;
        } catch (e) {
          console.warn('YAMLのパースに失敗しました。新しいファイルとして作成します。', e);
          parsed = {
            id: `server_details_${Date.now()}`,
            type: 'server-details',
            label: '機器詳細',
            description: '',
          };
        }
      } else {
        // YAMLが空の場合、基本構造を作成
        // serverIdはURLパラメータから取得を試みる（既存の値がない場合のみ）
        const serverIdFromUrl = searchParams?.get('serverId') || '';
        parsed = {
          id: `server_details_${Date.now()}`,
          type: 'server-details',
          label: '機器詳細',
          description: '',
        };
        // serverIdはURLパラメータから取得（既存の値がない場合のみ）
        if (serverIdFromUrl) {
          existingServerId = serverIdFromUrl;
        }
      }
      
      // 既存のserverIdがあれば保持（必ず保持する）
      if (existingServerId) {
        parsed.serverId = existingServerId;
      }
      // 既存のserverIdがない場合は、serverIdを設定しない（テンプレートには含めない）

      // サーバー詳細テンプレートのセクションを追加（既に存在する場合は上書きしない）
      if (!parsed.hardware) {
        parsed.hardware = {
          model: '',
          serialNumber: '',
          manufacturer: '',
          updated: '',
        };
      }
      if (!parsed.slots || !Array.isArray(parsed.slots) || parsed.slots.length === 0) {
        parsed.slots = [
          { id: 'slot0', label: 'slot0 NVMe CPU1', type: 'NVMe', cpu: 'CPU1', status: 'empty', capacity: '' },
          { id: 'slot1', label: 'slot1 NVMe CPU1', type: 'NVMe', cpu: 'CPU1', status: 'empty', capacity: '' },
          { id: 'slot2', label: 'slot2 NVMe CPU1', type: 'NVMe', cpu: 'CPU1', status: 'empty', capacity: '' },
          { id: 'slot3', label: 'slot3 NVMe CPU1', type: 'NVMe', cpu: 'CPU1', status: 'empty', capacity: '' },
          { id: 'slot4', label: 'slot4 NVMe CPU0', type: 'NVMe', cpu: 'CPU0', status: 'empty', capacity: '' },
          { id: 'slot5', label: 'slot5 NVMe CPU0', type: 'NVMe', cpu: 'CPU0', status: 'empty', capacity: '' },
          { id: 'slot6', label: 'slot6 NVMe CPU0', type: 'NVMe', cpu: 'CPU0', status: 'empty', capacity: '' },
          { id: 'slot7', label: 'slot7 NVMe CPU0', type: 'NVMe', cpu: 'CPU0', status: 'empty', capacity: '' },
          { id: 'slot8', label: 'slot8 NVMe CPU0', type: 'NVMe', cpu: 'CPU0', status: 'empty', capacity: '' },
          { id: 'slot9', label: 'slot9 NVMe CPU0', type: 'NVMe', cpu: 'CPU0', status: 'empty', capacity: '' },
        ];
      }
      if (!parsed.frontPanelPorts || !Array.isArray(parsed.frontPanelPorts) || parsed.frontPanelPorts.length === 0) {
        parsed.frontPanelPorts = [
          { id: 'vga', label: 'VGAポート', type: 'VGA', location: 'front', description: 'ビデオ出力ポート' },
          { id: 'usb', label: 'USBポート', type: 'USB', location: 'front', description: 'USB接続ポート' },
          { id: 'power', label: '電源ボタン', type: 'button', location: 'front', description: '電源ボタン（LEDインジケーター付き）' },
        ];
      }
      if (!parsed.ports || !Array.isArray(parsed.ports) || parsed.ports.length === 0) {
        parsed.ports = [
          { id: 'eth0', label: '管理ポート', speed: '1Gbps', mac: '', ip: '', vlan: '', description: '' },
          { id: 'eth1', label: 'サービスポート', speed: '10Gbps', mac: '', ip: '', vlan: '', description: '' },
        ];
      }

      // YAMLに変換
      const newYaml = yaml.dump(parsed, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
      setYamlContent(newYaml);
      alert('サーバー詳細テンプレートを追加しました。');
    } catch (error) {
      console.error('サーバー詳細テンプレートの追加に失敗:', error);
      alert(`サーバー詳細テンプレートの追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [yamlContent, setYamlContent, searchParams]);

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
          タブ4: 機器詳細・シーケンス
        </h2>
        <p style={{ 
          color: '#666', 
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          個別サーバーの詳細設定、アプリケーション構成、シーケンス図を管理します。
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
            <li>サーバーのOS、ミドルウェア、アプリケーション構成</li>
            <li>設定ファイル、環境変数</li>
            <li>アプリケーション間のシーケンス図</li>
            <li>監視設定、ログ設定</li>
            <li>バックアップ・復旧手順</li>
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
          <SampleLoader onLoadSample={loadSample} />
          {yamlType === 'server-details' && (
            <ViewModeSelector
              mode={viewMode}
              onModeChange={setViewMode}
            />
          )}
          <button
            onClick={handleAddServerDetails}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3B82F6';
            }}
          >
            <FiServer size={16} />
            サーバー詳細を追加
          </button>
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
              {viewMode === '2d' || yamlType !== 'server-details' ? 'Graphvizグラフ' : '3D表示'}
            </div>
            <div style={{
              flex: 1,
              minHeight: 0,
            }}>
              {viewMode === '3d' && yamlType === 'server-details' && serverDetailsData ? (
                <ServerDetails3DViewer
                  serverDetails={serverDetailsData}
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

