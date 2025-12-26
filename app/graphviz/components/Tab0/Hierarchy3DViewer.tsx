/**
 * 階層全体の3D表示コンポーネント
 * 棟、ラック、機器を階層的に統合表示
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { ThreeScene } from '../utils/3d/ThreeScene';
import {
  parseUnitPosition,
  unitTo3DHeight,
  rackLocationTo3D,
  equipmentTo3DPosition,
  calculateFreeUs,
  RACK_DIMENSIONS,
  RACK_SPACING,
  U_HEIGHT_M,
} from '../utils/3d';
import type { 
  SiteTopology,
  SiteEquipment,
  RackServers,
  ServerDetails,
} from '@/lib/graphvizHierarchyApi';
import type { HierarchyState } from './useHierarchyState';

interface Hierarchy3DViewerProps {
  hierarchyState: HierarchyState;
  sites: SiteTopology[];
  siteEquipment: SiteEquipment | null;
  rackServers: RackServers | null;
  rackServersMap: Map<string, RackServers>;
  serverDetails: ServerDetails | null;
  onSiteClick?: (siteId: string, siteLabel: string) => void;
  onRackClick?: (rackId: string, rackLabel: string) => void;
  onEquipmentClick?: (equipmentId: string, equipmentType: string, equipmentLabel: string) => void;
  width?: number;
  height?: number;
}

// 地理的位置を3D座標に変換（緯度経度をメートル単位に変換）
function latLonTo3D(lat: number, lon: number, centerLat: number, centerLon: number): THREE.Vector3 {
  // 簡易的な変換（小規模な範囲用）
  // 1度の緯度 ≈ 111km, 1度の経度 ≈ 111km * cos(緯度)
  const latMeters = (lat - centerLat) * 111000;
  const lonMeters = (lon - centerLon) * 111000 * Math.cos((centerLat * Math.PI) / 180);
  return new THREE.Vector3(lonMeters / 1000, 0, -latMeters / 1000); // km単位、Y軸は高さ
}

// 帯域幅を数値に変換（Gbps単位）
function parseBandwidth(bandwidth?: string): number {
  if (!bandwidth) return 1;
  const match = bandwidth.match(/(\d+(?:\.\d+)?)\s*(Gbps|Mbps|Kbps)/i);
  if (!match) return 1;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'gbps') return value;
  if (unit === 'mbps') return value / 1000;
  if (unit === 'kbps') return value / 1000000;
  return 1;
}

// 遅延を数値に変換（ms単位）
function parseLatency(latency?: string): number {
  if (!latency) return 0;
  const match = latency.match(/(\d+(?:\.\d+)?)\s*(ms|s)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'ms') return value;
  if (unit === 's') return value * 1000;
  return 0;
}

export function Hierarchy3DViewer({
  hierarchyState,
  sites,
  siteEquipment,
  rackServers,
  rackServersMap,
  serverDetails,
  onSiteClick,
  onRackClick,
  onEquipmentClick,
  width,
  height = 600,
}: Hierarchy3DViewerProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // 棟を建物風で表示（Tab1のデザインを参考）
  const renderSites = (scene: THREE.Scene, sites: SiteTopology[], camera: THREE.Camera) => {
    if (sites.length === 0) return;

    const siteTopology = sites[0];
    const siteList = siteTopology.sites || [];
    const connections = siteTopology.connections || [];

    if (siteList.length === 0) return;

    const hasGeoLocation = siteList.some((site: any) => site.location?.lat && site.location?.lon);
    
    let centerLat = 0;
    let centerLon = 0;
    if (hasGeoLocation) {
      const validSites = siteList.filter((site: any) => site.location?.lat && site.location?.lon);
      centerLat = validSites.reduce((sum: number, site: any) => sum + (site.location!.lat || 0), 0) / validSites.length;
      centerLon = validSites.reduce((sum: number, site: any) => sum + (site.location!.lon || 0), 0) / validSites.length;
    }

    // 棟の位置を計算
    const sitePositions = new Map<string, THREE.Vector3>();
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    let hasPositions = false;

    siteList.forEach((site: any, index: number) => {
      let position: THREE.Vector3;

      if (hasGeoLocation && site.location?.lat && site.location?.lon) {
        // 地理的位置を使用
        position = latLonTo3D(site.location.lat, site.location.lon, centerLat, centerLon);
      } else {
        // 論理的位置（グリッド配置）
        const cols = Math.ceil(Math.sqrt(siteList.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        position = new THREE.Vector3(col * 2, 0, row * 2);
      }

      sitePositions.set(site.id, position);

      // 境界を更新
      if (!hasPositions) {
        minX = maxX = position.x;
        minY = maxY = position.y;
        minZ = maxZ = position.z;
        hasPositions = true;
      } else {
        minX = Math.min(minX, position.x);
        maxX = Math.max(maxX, position.x);
        minY = Math.min(minY, position.y);
        maxY = Math.max(maxY, position.y);
        minZ = Math.min(minZ, position.z);
        maxZ = Math.max(maxZ, position.z);
      }

      // 棟の3Dモデル（建物風の箱型）
      const racks = site.capacity?.racks || 10;
      // 地理的位置を使用している場合、建物を大きく表示（km単位なので）
      // 論理的位置の場合も、より見やすいサイズに調整
      const sizeMultiplier = hasGeoLocation ? 5 : 1;
      const baseSize = Math.max(0.5, Math.min(2.0, racks / 50)) * sizeMultiplier;
      const height = Math.max(0.4, Math.min(1.5, racks / 80)) * sizeMultiplier; // 建物の高さ
      
      // 建物の本体（箱型）
      const buildingGeometry = new THREE.BoxGeometry(baseSize, height, baseSize);
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x4b5563, // ダークグレー（建物の外壁）
        metalness: 0.1,
        roughness: 0.9,
      });
      
      const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
      buildingMesh.position.set(position.x, position.y + height / 2, position.z);
      buildingMesh.userData = {
        type: 'site',
        siteId: site.id,
        siteLabel: site.label,
      };
      
      scene.add(buildingMesh);
      meshRefs.current.set(site.id, buildingMesh);

      // 建物の屋根（ピラミッド型）
      const roofHeight = height * 0.3;
      const roofGeometry = new THREE.ConeGeometry(baseSize * 0.7, roofHeight, 4);
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0x1f2937, // より濃いグレー
        metalness: 0.2,
        roughness: 0.8,
      });
      
      const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
      roofMesh.rotation.y = Math.PI / 4; // 45度回転
      roofMesh.position.set(position.x, position.y + height + roofHeight / 2, position.z);
      scene.add(roofMesh);

      // 建物の窓（前面に小さな窓を配置）
      const windowCount = Math.min(6, Math.max(2, Math.floor(racks / 10)));
      for (let i = 0; i < windowCount; i++) {
        const windowGeometry = new THREE.PlaneGeometry(baseSize * 0.1, baseSize * 0.1);
        const windowMaterial = new THREE.MeshBasicMaterial({
          color: 0x60a5fa, // 明るい青（窓の光）
          transparent: true,
          opacity: 0.6,
        });
        
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        const row = Math.floor(i / 3);
        const col = i % 3;
        windowMesh.position.set(
          position.x - baseSize * 0.25 + col * baseSize * 0.25,
          position.y + height * 0.3 + row * baseSize * 0.2,
          position.z + baseSize / 2 + 0.01
        );
        scene.add(windowMesh);
      }

      // 建物の輪郭線（エッジ）
      const buildingEdges = new THREE.EdgesGeometry(buildingGeometry);
      const buildingEdgeLine = new THREE.LineSegments(
        buildingEdges,
        new THREE.LineBasicMaterial({ 
          color: 0x1f2937, 
          linewidth: 2,
          opacity: 0.5,
          transparent: true,
        })
      );
      buildingEdgeLine.position.copy(buildingMesh.position);
      scene.add(buildingEdgeLine);

      // 棟ラベル（建物の上に配置）
      const siteLabel = new Text();
      siteLabel.text = site.label || site.id;
      siteLabel.fontSize = 0.08;
      siteLabel.color = 0x1f2937;
      siteLabel.anchorX = 'center';
      siteLabel.anchorY = 'bottom';
      siteLabel.position.set(position.x, position.y + height + roofHeight + 0.1, position.z);
      siteLabel.sync();
      scene.add(siteLabel);

      // 棟情報（ラック数、電力）- 建物の側面に配置
      if (site.capacity) {
        const infoText = new Text();
        const info = [
          site.capacity.racks ? `${site.capacity.racks}ラック` : '',
          site.capacity.power ? `${site.capacity.power}kW` : '',
        ].filter(Boolean).join(' / ');
        infoText.text = info;
        infoText.fontSize = 0.05;
        infoText.color = 0x6b7280;
        infoText.anchorX = 'center';
        infoText.anchorY = 'middle';
        infoText.position.set(position.x, position.y + height / 2, position.z + baseSize / 2 + 0.15);
        infoText.sync();
        scene.add(infoText);
      }
    });

    // 接続をグループ化（同じfrom/toの接続をまとめる）
    const connectionGroups = new Map<string, Array<{ connection: any; count: number }>>();
    
    connections.forEach((connection: any) => {
      const key = `${connection.from}-${connection.to}`;
      if (!connectionGroups.has(key)) {
        connectionGroups.set(key, []);
      }
      connectionGroups.get(key)!.push({ connection, count: 1 });
    });

    // グループ化された接続を表示（接続数に応じて複数のリンクを並べて表示）
    connectionGroups.forEach((group, key) => {
      // 同じ接続の数をカウント（2D表示と同じように、接続の数だけリンクを表示）
      const linkCount = group.length; // 同じ接続が複数ある場合は、その数だけリンクを表示
      
      // 最初の接続の情報を使用（帯域幅、遅延など）
      const firstConnection = group[0].connection;
      const fromPos = sitePositions.get(firstConnection.from);
      const toPos = sitePositions.get(firstConnection.to);

      if (!fromPos || !toPos) return;

      // 帯域幅から追加のリンク数を推測（10Gbps単位で1本のリンク）
      // ただし、実際の接続数（linkCount）を優先
      const bandwidth = parseBandwidth(firstConnection.bandwidth);
      const bandwidthLinkCount = Math.max(1, Math.min(10, Math.ceil(bandwidth / 10))); // 1-10本の範囲
      
      // 実際の接続数と帯域幅から推測した接続数の大きい方を使用
      const totalLinkCount = Math.max(linkCount, bandwidthLinkCount);

      // 遅延に応じて色を決定
      const latency = parseLatency(firstConnection.latency);
      let lineColor = 0x10b981; // 緑（低遅延）
      if (latency > 50) lineColor = 0xf59e0b; // オレンジ（中遅延）
      if (latency > 100) lineColor = 0xef4444; // 赤（高遅延）

      // 接続線の方向ベクトルを計算（オフセット用）
      const direction = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
      const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize(); // 水平面での垂直ベクトル

      // 複数のリンクを並べて表示
      const linkSpacing = 0.1; // リンク間の間隔
      const startOffset = -(totalLinkCount - 1) * linkSpacing / 2; // 中央揃えのための開始オフセット

      for (let i = 0; i < totalLinkCount; i++) {
        const offset = startOffset + i * linkSpacing;
        const offsetVector = perpendicular.clone().multiplyScalar(offset);

        // オフセットを適用した位置
        const fromPosOffset = fromPos.clone().add(offsetVector);
        const toPosOffset = toPos.clone().add(offsetVector);

        // 接続線を作成
        const curve = new THREE.CatmullRomCurve3([
          fromPosOffset,
          new THREE.Vector3(
            (fromPosOffset.x + toPosOffset.x) / 2,
            Math.max(fromPosOffset.y, toPosOffset.y) + 0.5 + i * 0.05, // アーク状に、高さも少しずつ変える
            (fromPosOffset.z + toPosOffset.z) / 2
          ),
          toPosOffset,
        ]);

        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: lineColor,
          linewidth: 2,
          transparent: true,
          opacity: 0.7,
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      }

      // 帯域幅ラベル（中央点、最初のリンクの上に表示）
      if (firstConnection.bandwidth) {
        const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
        midPoint.y += 0.5 + 0.1; // アークの高さ + ラベルの高さ
        const bandwidthLabel = new Text();
        bandwidthLabel.text = firstConnection.bandwidth;
        bandwidthLabel.fontSize = 0.05;
        bandwidthLabel.color = lineColor;
        bandwidthLabel.anchorX = 'center';
        bandwidthLabel.anchorY = 'middle';
        bandwidthLabel.position.set(midPoint.x, midPoint.y, midPoint.z);
        bandwidthLabel.sync();
        scene.add(bandwidthLabel);
      }
    });

    // カメラ位置を調整（Tab1と同じロジック）
    if (camera instanceof THREE.PerspectiveCamera && hasPositions) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;

      const maxSize = Math.max(sizeX, sizeY, sizeZ, 5);
      
      // 地理的位置を使用している場合、座標がkm単位なので距離を調整
      // 論理的位置の場合も、より近い距離に調整
      const baseDistance = hasGeoLocation ? maxSize * 0.15 : maxSize * 0.5;
      const distance = Math.max(baseDistance, 1.5); // 最小距離を1.5に設定

      // カメラをより近い位置に配置（角度も調整）
      camera.position.set(
        centerX + distance * 0.4,
        centerY + distance * 0.2,
        centerZ + distance * 0.4
      );
      camera.lookAt(centerX, centerY, centerZ);
    }
  };

  // 棟内機器構成を表示
  const renderSiteEquipment = (
    scene: THREE.Scene,
    siteEquipment: SiteEquipment,
    rackServersMap: Map<string, RackServers>,
    camera: THREE.Camera
  ) => {
    const racks = siteEquipment.racks || [];
    if (racks.length === 0) return;

    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    let hasPositions = false;

    racks.forEach((rack: any) => {
      const rackCapacity = rack.capacity?.units || 42;
      const rackHeight = rackCapacity * U_HEIGHT_M;
      const rackPos = rackLocationTo3D(rack.location || {});

      const rackGeometry = new THREE.BoxGeometry(
        RACK_DIMENSIONS.width,
        rackHeight,
        RACK_DIMENSIONS.depth
      );
      const rackEdges = new THREE.EdgesGeometry(rackGeometry);
      const rackLine = new THREE.LineSegments(
        rackEdges,
        new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 })
      );
      rackLine.position.set(rackPos.x, rackPos.y + rackHeight / 2, rackPos.z);
      rackLine.userData = {
        type: 'rack',
        rackId: rack.id,
        rackLabel: rack.label,
      };
      scene.add(rackLine);
      meshRefs.current.set(rack.id, rackLine);

      const equipment = rack.equipment || [];
      equipment.forEach((eq: any) => {
        const devicePos = equipmentTo3DPosition(eq, rackCapacity);
        if (!devicePos) return;

        const equipmentColors: Record<string, number> = {
          server: 0x2563eb,
          switch: 0x16a34a,
          router: 0xdc2626,
          firewall: 0xea580c,
          storage: 0x9333ea,
        };
        const equipmentColor = equipmentColors[eq.type] || 0x6b7280;

        const equipmentGeometry = new THREE.BoxGeometry(
          RACK_DIMENSIONS.width * 0.92,
          devicePos.height * 0.98,
          RACK_DIMENSIONS.depth * 0.7
        );
        const equipmentMaterial = new THREE.MeshStandardMaterial({
          color: equipmentColor,
          metalness: 0.2,
          roughness: 0.8,
          emissive: equipmentColor,
          emissiveIntensity: 0.1,
        });

        const equipmentMesh = new THREE.Mesh(equipmentGeometry, equipmentMaterial);
        equipmentMesh.position.set(
          rackPos.x,
          rackPos.y + devicePos.y + devicePos.height / 2,
          rackPos.z + RACK_DIMENSIONS.depth * 0.15
        );
        
        // 機器の輪郭線（エッジ）を追加
        const equipmentEdges = new THREE.EdgesGeometry(equipmentGeometry);
        const equipmentEdgeLine = new THREE.LineSegments(
          equipmentEdges,
          new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2,
            opacity: 0.8,
            transparent: true,
          })
        );
        equipmentEdgeLine.position.copy(equipmentMesh.position);
        scene.add(equipmentEdgeLine);
        
        // 機器ラベル
        const equipmentLabel = new Text();
        equipmentLabel.text = eq.label || eq.id;
        equipmentLabel.fontSize = Math.min(devicePos.height * 0.15, 0.015);
        equipmentLabel.color = 0xffffff;
        equipmentLabel.anchorX = 'center';
        equipmentLabel.anchorY = 'middle';
        equipmentLabel.maxWidth = RACK_DIMENSIONS.width * 0.8;
        equipmentLabel.position.set(
          rackPos.x,
          rackPos.y + devicePos.y + devicePos.height / 2,
          rackPos.z + RACK_DIMENSIONS.depth * 0.5
        );
        equipmentLabel.sync();
        scene.add(equipmentLabel);
        
        equipmentMesh.userData = {
          type: 'equipment',
          equipmentId: eq.id,
          equipmentLabel: eq.label,
          equipmentType: eq.type,
          rackId: rack.id,
        };
        equipmentLabel.userData = equipmentMesh.userData; // ラベルもクリック可能にする
        
        scene.add(equipmentMesh);
        meshRefs.current.set(eq.id, equipmentMesh);
      });

      if (!hasPositions) {
        minX = maxX = rackPos.x;
        minY = maxY = rackPos.y + rackHeight;
        minZ = maxZ = rackPos.z;
        hasPositions = true;
      } else {
        minX = Math.min(minX, rackPos.x);
        maxX = Math.max(maxX, rackPos.x);
        minY = Math.min(minY, rackPos.y);
        maxY = Math.max(maxY, rackPos.y + rackHeight);
        minZ = Math.min(minZ, rackPos.z);
        maxZ = Math.max(maxZ, rackPos.z);
      }
    });

    // 接続を表示するための準備
    const rackPositions = new Map<string, THREE.Vector3>();
    const deviceToRackMap = new Map<string, string>(); // 機器ID -> ラックID
    const devicePositions = new Map<string, THREE.Vector3>(); // 機器ID -> 3D位置

    // ラックの位置と機器のラックマッピング、機器の3D位置を作成
    racks.forEach((rack: any) => {
      const rackCapacity = rack.capacity?.units || 42;
      const rackHeight = rackCapacity * U_HEIGHT_M;
      const rackPos = rackLocationTo3D(rack.location || {});
      rackPositions.set(rack.id, new THREE.Vector3(rackPos.x, rackPos.y + rackHeight / 2, rackPos.z));

      // 機器のラックマッピングと3D位置
      const equipment = rack.equipment || [];
      equipment.forEach((eq: any) => {
        deviceToRackMap.set(eq.id, rack.id);
        
        // 機器の3D位置を計算
        const devicePos = equipmentTo3DPosition(eq, rackCapacity);
        if (devicePos) {
          devicePositions.set(eq.id, new THREE.Vector3(
            rackPos.x,
            rackPos.y + devicePos.y + devicePos.height / 2,
            rackPos.z + RACK_DIMENSIONS.depth * 0.15
          ));
        }
      });
      
      // サーバーの位置も追加（rackServersMapから）
      if (rackServersMap && rackServersMap.has(rack.id)) {
        const rackServers = rackServersMap.get(rack.id)!;
        if (rackServers.servers && Array.isArray(rackServers.servers)) {
          rackServers.servers.forEach((server: any) => {
            deviceToRackMap.set(server.id, rack.id);
            
            // サーバーの3D位置を計算
            if (server.position?.unit) {
              const uPosition = parseUnitPosition(server.position.unit);
              if (uPosition) {
                const devicePos = unitTo3DHeight(uPosition.uStart, uPosition.uHeight, rackCapacity);
                devicePositions.set(server.id, new THREE.Vector3(
                  rackPos.x,
                  rackPos.y + devicePos.y + devicePos.height / 2,
                  rackPos.z + RACK_DIMENSIONS.depth * 0.15
                ));
              }
            }
          });
        }
      }
    });

    // すべての接続を処理（ラック間とラック内の両方）
    const rackConnections = new Map<string, Array<{ connection: any; count: number }>>(); // ラック間接続
    const intraRackConnections: Array<{ connection: any; fromDevice: string; toDevice: string }> = []; // ラック内接続
    
    console.log('🔍 [renderSiteEquipment] 接続処理開始', {
      connectionsCount: siteEquipment.connections?.length || 0,
      deviceToRackMapSize: deviceToRackMap.size,
      devicePositionsSize: devicePositions.size,
      deviceToRackMapKeys: Array.from(deviceToRackMap.keys()).slice(0, 10),
    });
    
    if (siteEquipment.connections && Array.isArray(siteEquipment.connections)) {
      siteEquipment.connections.forEach((connection: any) => {
        // 接続形式の判定：from/toが文字列か、オブジェクトか
        let fromDevice: string | undefined;
        let toDevice: string | undefined;
        
        if (typeof connection.from === 'string') {
          // 新しい形式: from/toが直接文字列
          fromDevice = connection.from;
          toDevice = connection.to as string;
        } else if (connection.from && typeof connection.from === 'object' && 'device' in connection.from) {
          // 既存の形式: from/toがオブジェクト（device, port）
          fromDevice = connection.from.device;
          toDevice = connection.to?.device;
        }
        
        if (!fromDevice || !toDevice) {
          console.warn('⚠️ [renderSiteEquipment] 接続の形式が不正です:', connection);
          return;
        }

        let fromRack = deviceToRackMap.get(fromDevice);
        let toRack = deviceToRackMap.get(toDevice);

        // 機器が見つからない場合、機器IDからラックIDを推測（例: rack_1766706843939_tor_1 -> rack_1766706843939）
        if (!fromRack) {
          const rackMatch = fromDevice.match(/^rack_([^_]+)/);
          if (rackMatch) {
            const possibleRackId = `rack_${rackMatch[1]}`;
            if (racks.some((r: any) => r.id === possibleRackId)) {
              fromRack = possibleRackId;
              // 推測したラックIDをマッピングに追加
              deviceToRackMap.set(fromDevice, fromRack);
            }
          }
        }
        if (!toRack) {
          const rackMatch = toDevice.match(/^rack_([^_]+)/);
          if (rackMatch) {
            const possibleRackId = `rack_${rackMatch[1]}`;
            if (racks.some((r: any) => r.id === possibleRackId)) {
              toRack = possibleRackId;
              // 推測したラックIDをマッピングに追加
              deviceToRackMap.set(toDevice, toRack);
            }
          }
        }

        if (!fromRack || !toRack) {
          // 機器が見つからない場合のデバッグ情報
          console.warn('⚠️ [renderSiteEquipment] 機器が見つかりません:', {
            fromDevice,
            toDevice,
            fromRack,
            toRack,
            deviceToRackMapKeys: Array.from(deviceToRackMap.keys()).slice(0, 10),
            rackIds: racks.map((r: any) => r.id),
          });
          return;
        }

        if (fromRack !== toRack) {
          // 異なるラックに属する機器間の接続（ラック間接続）
          const key = `${fromRack}-${toRack}`;
          if (!rackConnections.has(key)) {
            rackConnections.set(key, []);
          }
          rackConnections.get(key)!.push({ connection, count: 1 });
        } else {
          // 同一ラック内の接続（ラック内接続）
          intraRackConnections.push({ connection, fromDevice, toDevice });
        }
      });
    }
    
    console.log('🔍 [renderSiteEquipment] 接続処理結果', {
      rackConnectionsCount: rackConnections.size,
      intraRackConnectionsCount: intraRackConnections.length,
    });

    // ラック間の接続を表示（接続数に応じて複数のリンクを並べて表示）
    rackConnections.forEach((group, key) => {
      const linkCount = group.length; // 同じラック間の接続数
      const firstConnection = group[0].connection;
      
      // 接続形式の判定：from/toが文字列か、オブジェクトか
      let fromDevice: string | undefined;
      let toDevice: string | undefined;
      
      if (typeof firstConnection.from === 'string') {
        // 新しい形式: from/toが直接文字列
        fromDevice = firstConnection.from;
        toDevice = firstConnection.to as string;
      } else if (firstConnection.from && typeof firstConnection.from === 'object' && 'device' in firstConnection.from) {
        // 既存の形式: from/toがオブジェクト（device, port）
        fromDevice = firstConnection.from.device;
        toDevice = firstConnection.to?.device;
      }
      
      if (!fromDevice || !toDevice) return;

      const fromRack = deviceToRackMap.get(fromDevice);
      const toRack = deviceToRackMap.get(toDevice);
      if (!fromRack || !toRack) return;

      const fromRackPos = rackPositions.get(fromRack);
      const toRackPos = rackPositions.get(toRack);
      if (!fromRackPos || !toRackPos) return;

      // 接続線の方向ベクトルを計算（オフセット用）
      const direction = new THREE.Vector3().subVectors(toRackPos, fromRackPos).normalize();
      const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize(); // 水平面での垂直ベクトル

      // 複数のリンクを並べて表示
      const linkSpacing = 0.1; // リンク間の間隔
      const startOffset = -(linkCount - 1) * linkSpacing / 2; // 中央揃えのための開始オフセット

      for (let i = 0; i < linkCount; i++) {
        const offset = startOffset + i * linkSpacing;
        const offsetVector = perpendicular.clone().multiplyScalar(offset);

        // オフセットを適用した位置
        const fromPosOffset = fromRackPos.clone().add(offsetVector);
        const toPosOffset = toRackPos.clone().add(offsetVector);

        // 接続線を作成（ラックの上部から上部へ）
        const curve = new THREE.CatmullRomCurve3([
          fromPosOffset,
          new THREE.Vector3(
            (fromPosOffset.x + toPosOffset.x) / 2,
            Math.max(fromPosOffset.y, toPosOffset.y) + 0.3 + i * 0.05, // アーク状に、高さも少しずつ変える
            (fromPosOffset.z + toPosOffset.z) / 2
          ),
          toPosOffset,
        ]);

        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0x3b82f6, // 青（ラック間接続）
          linewidth: 2,
          transparent: true,
          opacity: 0.7,
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      }

      // 接続情報ラベル（中央点）
      const labelParts: string[] = [];
      if (firstConnection.type) {
        labelParts.push(firstConnection.type);
      }
      if (firstConnection.bandwidth) {
        labelParts.push(firstConnection.bandwidth);
      }
      if (firstConnection.network) {
        labelParts.push(firstConnection.network);
      }
      if (firstConnection.description) {
        labelParts.push(firstConnection.description);
      }
      
      if (labelParts.length > 0) {
        const midPoint = new THREE.Vector3().addVectors(fromRackPos, toRackPos).multiplyScalar(0.5);
        midPoint.y += 0.3 + 0.1; // アークの高さ + ラベルの高さ
        const connectionLabel = new Text();
        connectionLabel.text = labelParts.join(' / ');
        connectionLabel.fontSize = 0.04;
        connectionLabel.color = 0x3b82f6;
        connectionLabel.anchorX = 'center';
        connectionLabel.anchorY = 'middle';
        connectionLabel.position.set(midPoint.x, midPoint.y, midPoint.z);
        connectionLabel.sync();
        scene.add(connectionLabel);
      }
    });

    // ラック内の接続を表示（同一ラック内の機器間接続）
    console.log('🔍 [renderSiteEquipment] ラック内接続を表示', {
      intraRackConnectionsCount: intraRackConnections.length,
    });
    
    intraRackConnections.forEach(({ connection, fromDevice, toDevice }) => {
      let fromPos = devicePositions.get(fromDevice);
      let toPos = devicePositions.get(toDevice);

      // 機器の位置が見つからない場合、ラックの位置を使用（機器がequipmentリストにない場合）
      if (!fromPos) {
        const fromRack = deviceToRackMap.get(fromDevice);
        if (fromRack) {
          const rackPos = rackPositions.get(fromRack);
          if (rackPos) {
            fromPos = rackPos.clone();
            fromPos.y += 0.1; // ラックの上部から少し上
            console.log('📍 [renderSiteEquipment] fromDeviceの位置を推測:', { fromDevice, fromRack, fromPos });
          }
        }
      }
      if (!toPos) {
        const toRack = deviceToRackMap.get(toDevice);
        if (toRack) {
          const rackPos = rackPositions.get(toRack);
          if (rackPos) {
            toPos = rackPos.clone();
            toPos.y += 0.1; // ラックの上部から少し上
            console.log('📍 [renderSiteEquipment] toDeviceの位置を推測:', { toDevice, toRack, toPos });
          }
        }
      }

      if (!fromPos || !toPos) {
        console.warn('⚠️ [renderSiteEquipment] ラック内接続: 機器の位置が見つかりません:', {
          fromDevice,
          toDevice,
          fromPos: fromPos ? 'found' : 'not found',
          toPos: toPos ? 'found' : 'not found',
          devicePositionsKeys: Array.from(devicePositions.keys()).slice(0, 10),
        });
        return; // 機器の位置が見つからない場合はスキップ
      }
      
      console.log('✅ [renderSiteEquipment] ラック内接続を描画:', {
        fromDevice,
        toDevice,
        fromPos,
        toPos,
      });

      // 接続線を作成（機器間を直接接続）
      const curve = new THREE.CatmullRomCurve3([
        fromPos,
        new THREE.Vector3(
          (fromPos.x + toPos.x) / 2,
          Math.max(fromPos.y, toPos.y) + 0.1, // 少し上にアーク
          (fromPos.z + toPos.z) / 2
        ),
        toPos,
      ]);

      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // 接続タイプに応じて色を変更
      const connAny = connection as any;
      let lineColor = 0x3b82f6; // デフォルトは青
      if (connAny.type === 'fiber') {
        lineColor = 0xf97316; // オレンジ
      } else if (connAny.type === 'ethernet') {
        lineColor = 0x3b82f6; // 青
      }
      
      const material = new THREE.LineBasicMaterial({
        color: lineColor,
        linewidth: 2,
        transparent: true,
        opacity: 0.7,
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    });

    if (camera instanceof THREE.PerspectiveCamera && hasPositions) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const maxSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 5);
      const distance = maxSize * 1.5; // Tab2を参考に距離を調整
      // 斜め上から見る（Tab2と同じ角度）
      camera.position.set(
        centerX + distance * 0.7,
        centerY + distance * 0.5,
        centerZ + distance * 0.7
      );
      camera.lookAt(centerX, centerY, centerZ);
    }
  };

  // ラック内サーバーを表示
  const renderRackServers = (scene: THREE.Scene, rackServers: RackServers, camera: THREE.Camera, siteEquipmentData?: SiteEquipment | null) => {
    let servers = rackServers.servers || [];
    const rackCapacity = 42;

    console.log('🔄 [renderRackServers] 開始', {
      rackId: rackServers.rackId,
      serversCount: servers.length,
      servers: servers.map(s => ({ id: s.id, label: s.label, hasPosition: !!s.position?.unit })),
      hasSiteEquipment: !!siteEquipmentData
    });

    // サーバーが空の場合、siteEquipmentから取得
    if (servers.length === 0 && siteEquipmentData && rackServers.rackId) {
      console.log('🔄 [renderRackServers] サーバーが空のため、siteEquipmentから取得します');
      const rack = siteEquipmentData.racks?.find((r: any) => r.id === rackServers.rackId);
      if (rack && rack.equipment) {
        servers = rack.equipment
          .filter((eq: any) => eq.type === 'server')
          .map((eq: any) => ({
            id: eq.id,
            label: eq.label || eq.id,
            model: eq.model || '',
            position: eq.position || {},
            ports: eq.ports || [],
          }));
        console.log('✅ [renderRackServers] siteEquipmentからサーバー情報を取得:', {
          serversCount: servers.length,
          servers: servers.map(s => ({ id: s.id, label: s.label, hasPosition: !!s.position?.unit }))
        });
      }
    }

    // サーバーのposition.unitがない場合、siteEquipmentから取得
    if (siteEquipmentData && rackServers.rackId && servers.length > 0) {
      const rack = siteEquipmentData.racks?.find((r: any) => r.id === rackServers.rackId);
      if (rack && rack.equipment) {
        servers.forEach((server: any) => {
          if (!server.position?.unit) {
            const equipment = rack.equipment.find((eq: any) => eq.id === server.id);
            if (equipment && equipment.position?.unit) {
              console.log('✅ [renderRackServers] siteEquipmentからpositionを取得:', {
                serverId: server.id,
                position: equipment.position
              });
              server.position = equipment.position;
            }
          }
        });
      }
    }

    const rackHeight = rackCapacity * U_HEIGHT_M;
    const rackGeometry = new THREE.BoxGeometry(
      RACK_DIMENSIONS.width,
      rackHeight,
      RACK_DIMENSIONS.depth
    );
    const rackEdges = new THREE.EdgesGeometry(rackGeometry);
    const rackLine = new THREE.LineSegments(
      rackEdges,
      new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 })
    );
    rackLine.position.y = rackHeight / 2;
    scene.add(rackLine);

    servers.forEach((server: any, index: number) => {
      if (!server.position?.unit) {
        console.warn('⚠️ [renderRackServers] サーバーにposition.unitが設定されていません:', server.id, server.label);
        return;
      }

      const uPosition = parseUnitPosition(server.position.unit);
      if (!uPosition) {
        console.warn('⚠️ [renderRackServers] U位置のパースに失敗しました:', server.position.unit);
        return;
      }

      const devicePos = unitTo3DHeight(uPosition.uStart, uPosition.uHeight, rackCapacity);
      const colors = [0x2563eb, 0xdc2626, 0x16a34a, 0xea580c, 0x9333ea, 0x0891b2];
      const serverColor = colors[index % colors.length];

      const serverGeometry = new THREE.BoxGeometry(
        RACK_DIMENSIONS.width * 0.92,
        devicePos.height * 0.98,
        RACK_DIMENSIONS.depth * 0.7
      );
      const serverMaterial = new THREE.MeshStandardMaterial({
        color: serverColor,
        metalness: 0.2,
        roughness: 0.8,
        emissive: serverColor,
        emissiveIntensity: 0.1,
      });

      const serverMesh = new THREE.Mesh(serverGeometry, serverMaterial);
      serverMesh.position.set(0, devicePos.y + devicePos.height / 2, RACK_DIMENSIONS.depth * 0.15);
      
      // サーバーの輪郭線（エッジ）を追加
      const serverEdges = new THREE.EdgesGeometry(serverGeometry);
      const serverEdgeLine = new THREE.LineSegments(
        serverEdges,
        new THREE.LineBasicMaterial({ 
          color: 0x000000, 
          linewidth: 2,
          opacity: 0.8,
          transparent: true,
        })
      );
      serverEdgeLine.position.copy(serverMesh.position);
      scene.add(serverEdgeLine);
      
      // サーバーにテキストラベルを追加
      const label = new Text();
      label.text = server.label || server.id;
      label.fontSize = Math.min(devicePos.height * 0.15, 0.02);
      label.color = 0xffffff;
      label.anchorX = 'center';
      label.anchorY = 'middle';
      label.maxWidth = RACK_DIMENSIONS.width * 0.8;
      label.position.set(
        0,
        devicePos.y + devicePos.height / 2,
        RACK_DIMENSIONS.depth * 0.5 // 前面に配置
      );
      label.sync();
      scene.add(label);
      
      scene.add(serverMesh);
      
      console.log('✅ [renderRackServers] サーバーを表示:', {
        serverId: server.id,
        serverLabel: server.label,
        uPosition,
        devicePos,
        meshPosition: serverMesh.position
      });
    });

    if (camera instanceof THREE.PerspectiveCamera) {
      // 正面方向から見る（Z軸方向から）
      camera.position.set(0, rackHeight * 0.5, 2);
      camera.lookAt(0, rackHeight * 0.5, 0);
    }
  };

  // サーバー詳細を表示
  const renderServerDetails = (scene: THREE.Scene, serverDetails: ServerDetails, camera: THREE.Camera) => {
    if (!serverDetails) return;

    // Tab4のServerDetails3DViewerと同じロジックを使用
    // サーバーの本体
    const SERVER_DIMENSIONS = {
      width: 0.48,
      height: 0.044,
      depth: 0.7,
    };

    const serverGeometry = new THREE.BoxGeometry(
      SERVER_DIMENSIONS.width,
      SERVER_DIMENSIONS.height,
      SERVER_DIMENSIONS.depth
    );
    const serverMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      metalness: 0.3,
      roughness: 0.7,
    });
    const serverMesh = new THREE.Mesh(serverGeometry, serverMaterial);
    serverMesh.position.set(0, SERVER_DIMENSIONS.height / 2, 0);
    scene.add(serverMesh);

    // サーバーの輪郭線
    const serverEdges = new THREE.EdgesGeometry(serverGeometry);
    const serverEdgeLine = new THREE.LineSegments(
      serverEdges,
      new THREE.LineBasicMaterial({ color: 0x1a202c, linewidth: 2 })
    );
    serverEdgeLine.position.copy(serverMesh.position);
    scene.add(serverEdgeLine);

    // フロントパネル
    const frontPanelGeometry = new THREE.PlaneGeometry(
      SERVER_DIMENSIONS.width * 0.95,
      SERVER_DIMENSIONS.height * 0.9
    );
    const frontPanelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      metalness: 0.5,
      roughness: 0.5,
    });
    const frontPanel = new THREE.Mesh(frontPanelGeometry, frontPanelMaterial);
    frontPanel.position.set(0, SERVER_DIMENSIONS.height / 2, SERVER_DIMENSIONS.depth / 2 + 0.001);
    scene.add(frontPanel);

    // スロットを配置
    const slots = serverDetails.slots || [];
    const slotsPerRow = 5;
    slots.forEach((slot: any, index: number) => {
      const row = Math.floor(index / slotsPerRow);
      const col = index % slotsPerRow;
      const slotWidth = SERVER_DIMENSIONS.width * 0.15;
      const slotHeight = SERVER_DIMENSIONS.height * 0.6;
      const slotDepth = 0.01;

      const slotGeometry = new THREE.BoxGeometry(slotWidth, slotHeight, slotDepth);
      let slotColor = 0x4a5568; // empty
      if (slot.status === 'installed') slotColor = 0x48bb78; // 緑
      if (slot.status === 'failed') slotColor = 0xf56565; // 赤

      const slotMaterial = new THREE.MeshStandardMaterial({
        color: slotColor,
        metalness: 0.2,
        roughness: 0.8,
        transparent: slot.status === 'empty',
        opacity: slot.status === 'empty' ? 0.3 : 1.0,
      });

      const slotMesh = new THREE.Mesh(slotGeometry, slotMaterial);
      slotMesh.position.set(
        -SERVER_DIMENSIONS.width * 0.35 + col * (SERVER_DIMENSIONS.width * 0.18),
        SERVER_DIMENSIONS.height / 2 - row * (SERVER_DIMENSIONS.height * 0.5),
        SERVER_DIMENSIONS.depth / 2 + 0.005
      );
      scene.add(slotMesh);
    });

    // サーバーラベル
    const serverLabel = new Text();
    serverLabel.text = serverDetails.label || serverDetails.id;
    serverLabel.fontSize = 0.02;
    serverLabel.color = 0x1a202c;
    serverLabel.anchorX = 'center';
    serverLabel.anchorY = 'bottom';
    serverLabel.position.set(0, SERVER_DIMENSIONS.height + 0.05, SERVER_DIMENSIONS.depth / 2);
    serverLabel.sync();
    scene.add(serverLabel);

    // カメラ位置を調整
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 0.5, 1.5);
      camera.lookAt(0, SERVER_DIMENSIONS.height / 2, 0);
    }
  };

  const handleSceneReady = (
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    raycasterRef.current = new THREE.Raycaster();

    // 階層レベルに応じて表示を切り替え
    if (hierarchyState.currentLevel === 'all') {
      renderSites(scene, sites, camera);
    } else if (hierarchyState.currentLevel === 'sites' && siteEquipment) {
      renderSiteEquipment(scene, siteEquipment, rackServersMap, camera);
    } else if (hierarchyState.currentLevel === 'racks' && rackServers) {
      renderRackServers(scene, rackServers, camera, siteEquipment);
    } else if (hierarchyState.currentLevel === 'server-details' && serverDetails) {
      renderServerDetails(scene, serverDetails, camera);
    }

    // マウスクリックイベント
    const handleClick = (event: MouseEvent) => {
      if (!raycasterRef.current || !camera || !renderer) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const allObjects: THREE.Object3D[] = Array.from(meshRefs.current.values());
      scene.traverse((object) => {
        if (object.userData && object.userData.type) {
          if (!allObjects.includes(object)) {
            allObjects.push(object);
          }
        }
      });

      const intersects = raycasterRef.current.intersectObjects(allObjects);

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object as THREE.Mesh;
        const userData = clickedObject.userData;

        if (userData.type === 'site' && userData.siteId && onSiteClick) {
          onSiteClick(userData.siteId, userData.siteLabel);
        } else if (userData.type === 'rack' && userData.rackId && onRackClick) {
          onRackClick(userData.rackId, userData.rackLabel);
        } else if (userData.type === 'equipment' && userData.equipmentId && onEquipmentClick) {
          onEquipmentClick(userData.equipmentId, userData.equipmentType, userData.equipmentLabel);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      renderer.domElement.removeEventListener('click', handleClick);
    };
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ThreeScene
        width={width}
        height={height}
        backgroundColor="#f5f5f5"
        enableOrbitControls={true}
        showControls={true}
        showInstructions={true}
        onSceneReady={handleSceneReady}
        style={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}
      />
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
          階層: {hierarchyState.currentLevel}
        </div>
        <div style={{ color: '#666' }}>
          {hierarchyState.currentLevel === 'all' && `棟数: ${sites.reduce((sum, s) => sum + (s.sites?.length || 0), 0)}`}
          {hierarchyState.currentLevel === 'sites' && siteEquipment && `ラック数: ${siteEquipment.racks?.length || 0}`}
          {hierarchyState.currentLevel === 'racks' && rackServers && `サーバー数: ${rackServers.servers?.length || 0}`}
          {hierarchyState.currentLevel === 'server-details' && serverDetails && `サーバー: ${serverDetails.label || serverDetails.id}`}
        </div>
      </div>
    </div>
  );
}

