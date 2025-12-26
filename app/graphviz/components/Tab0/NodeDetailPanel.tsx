/**
 * ノード詳細パネル（右側ポップアップ）
 * クリックされたノードの情報を表示し、「詳細を見る」ボタンで次の階層に進む
 */

'use client';

import { SiteEquipment, RackServers } from '@/lib/graphvizHierarchyApi';

export interface NodeDetail {
  type: 'site' | 'rack' | 'equipment' | 'server';
  id: string;
  label: string;
  description?: string;
  // 棟の場合
  location?: {
    lat?: number;
    lon?: number;
    address?: string;
  };
  capacity?: {
    racks?: number;
    power?: number;
  };
  // ラックの場合
  rackLocation?: {
    floor?: number;
    row?: string;
    position?: number;
  };
  rackCapacity?: {
    units?: number;
    power?: number;
  };
  // 機器/サーバーの場合
  equipmentType?: string;
  model?: string;
  position?: {
    unit?: string;
  };
  // データ参照用
  siteEquipment?: SiteEquipment | null;
  rackServers?: RackServers | null;
}

interface NodeDetailPanelProps {
  nodeDetail: NodeDetail | null;
  onClose: () => void;
  onViewDetails: () => void;
  isLoading?: boolean;
}

export function NodeDetailPanel({
  nodeDetail,
  onClose,
  onViewDetails,
  isLoading = false,
}: NodeDetailPanelProps) {
  if (!nodeDetail) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F9FAFB',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1F2937',
            margin: 0,
          }}
        >
          {nodeDetail.label}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6B7280',
            padding: '0',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>
      </div>

      {/* コンテンツ */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {/* タイプ表示 */}
        <div
          style={{
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: '#EFF6FF',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1E40AF',
            fontWeight: 500,
          }}
        >
          {nodeDetail.type === 'site' && '棟'}
          {nodeDetail.type === 'rack' && 'ラック'}
          {nodeDetail.type === 'equipment' && '機器'}
          {nodeDetail.type === 'server' && 'サーバー'}
        </div>

        {/* 説明 */}
        {nodeDetail.description && (
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              説明
            </h4>
            <p
              style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: 0,
                lineHeight: '1.6',
              }}
            >
              {nodeDetail.description}
            </p>
          </div>
        )}

        {/* 棟の詳細情報 */}
        {nodeDetail.type === 'site' && (
          <>
            {nodeDetail.location && (
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  所在地
                </h4>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {nodeDetail.location.address && (
                    <div>{nodeDetail.location.address}</div>
                  )}
                  {nodeDetail.location.lat && nodeDetail.location.lon && (
                    <div style={{ marginTop: '4px', color: '#9CA3AF' }}>
                      ({nodeDetail.location.lat}, {nodeDetail.location.lon})
                    </div>
                  )}
                </div>
              </div>
            )}
            {nodeDetail.capacity && (
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  容量
                </h4>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {nodeDetail.capacity.racks && (
                    <div>ラック数: {nodeDetail.capacity.racks}台</div>
                  )}
                  {nodeDetail.capacity.power && (
                    <div>電力: {nodeDetail.capacity.power}kW</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ラックの詳細情報 */}
        {nodeDetail.type === 'rack' && (
          <>
            {nodeDetail.rackLocation && (
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  配置
                </h4>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {nodeDetail.rackLocation.floor && (
                    <div>{nodeDetail.rackLocation.floor}F</div>
                  )}
                  {nodeDetail.rackLocation.row && (
                    <div>Row {nodeDetail.rackLocation.row}</div>
                  )}
                  {nodeDetail.rackLocation.position && (
                    <div>Position {nodeDetail.rackLocation.position}</div>
                  )}
                </div>
              </div>
            )}
            {nodeDetail.rackCapacity && (
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  容量
                </h4>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {nodeDetail.rackCapacity.units && (
                    <div>{nodeDetail.rackCapacity.units}U</div>
                  )}
                  {nodeDetail.rackCapacity.power && (
                    <div>{nodeDetail.rackCapacity.power}kW</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* 機器/サーバーの詳細情報 */}
        {(nodeDetail.type === 'equipment' || nodeDetail.type === 'server') && (
          <>
            {nodeDetail.equipmentType && (
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  タイプ
                </h4>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {nodeDetail.equipmentType}
                </div>
              </div>
            )}
            {nodeDetail.model && (
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  モデル
                </h4>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {nodeDetail.model}
                </div>
              </div>
            )}
            {nodeDetail.position && (
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  配置
                </h4>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {nodeDetail.position.unit && (
                    <div>ユニット: {nodeDetail.position.unit}</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ID表示（デバッグ用） */}
        <div
          style={{
            marginTop: '16px',
            padding: '8px 12px',
            backgroundColor: '#F3F4F6',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#6B7280',
            fontFamily: 'monospace',
          }}
        >
          ID: {nodeDetail.id}
        </div>
      </div>

      {/* フッター（詳細を見るボタン） */}
      <div
        style={{
          padding: '20px',
          borderTop: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
        }}
      >
        <button
          onClick={onViewDetails}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: isLoading ? '#9CA3AF' : '#3B82F6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#3B82F6';
            }
          }}
        >
          {isLoading ? '読み込み中...' : '詳細を見る'}
        </button>
      </div>
    </div>
  );
}

