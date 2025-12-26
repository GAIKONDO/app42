/**
 * 棟間ネットワークの3D表示コンポーネント
 * 複数棟を3D空間に配置し、棟間の接続を表示
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { ThreeScene } from '../utils/3d/ThreeScene';

interface Site {
  id: string;
  label: string;
  location?: {
    lat?: number;
    lon?: number;
    address?: string;
  };
  capacity?: {
    racks?: number;
    power?: number;
  };
}

interface Connection {
  id: string;
  from: string; // site ID
  to: string; // site ID
  type?: string;
  bandwidth?: string;
  latency?: string;
  provider?: string;
  description?: string;
}

interface SiteTopology {
  id: string;
  label: string;
  type: 'site-topology';
  sites?: Site[];
  connections?: Connection[];
}

interface SiteTopology3DViewerProps {
  siteTopology: SiteTopology | null | any; // YAMLから読み込んだデータも受け入れる
  onSiteClick?: (siteId: string) => void;
  width?: number;
  height?: number;
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

// 地理的位置を3D座標に変換（緯度経度をメートル単位に変換）
function latLonTo3D(lat: number, lon: number, centerLat: number, centerLon: number): THREE.Vector3 {
  // 簡易的な変換（小規模な範囲用）
  // 1度の緯度 ≈ 111km, 1度の経度 ≈ 111km * cos(緯度)
  const latMeters = (lat - centerLat) * 111000;
  const lonMeters = (lon - centerLon) * 111000 * Math.cos((centerLat * Math.PI) / 180);
  return new THREE.Vector3(lonMeters / 1000, 0, -latMeters / 1000); // km単位、Y軸は高さ
}

export function SiteTopology3DViewer({
  siteTopology,
  onSiteClick,
  width,
  height = 600,
}: SiteTopology3DViewerProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // 棟リストと接続リストを取得
  const sites = siteTopology?.sites || [];
  const connections = siteTopology?.connections || [];

  const handleSceneReady = (
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    controls?: any
  ) => {
    // レイキャスターを初期化
    raycasterRef.current = new THREE.Raycaster();

    if (sites.length === 0) {
      return;
    }

    // 地理的位置を使用するかどうかを判定
    const hasGeoLocation = sites.some((site: Site) => site.location?.lat && site.location?.lon);
    
    // 中心位置を計算（地理的位置がある場合）
    let centerLat = 0;
    let centerLon = 0;
    if (hasGeoLocation) {
      const validSites = sites.filter((site: Site) => site.location?.lat && site.location?.lon);
      centerLat = validSites.reduce((sum: number, site: Site) => sum + (site.location!.lat || 0), 0) / validSites.length;
      centerLon = validSites.reduce((sum: number, site: Site) => sum + (site.location!.lon || 0), 0) / validSites.length;
    }

    // 棟の位置を計算
    const sitePositions = new Map<string, THREE.Vector3>();
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    let hasPositions = false;

    sites.forEach((site: Site, index: number) => {
      let position: THREE.Vector3;

      if (hasGeoLocation && site.location?.lat && site.location?.lon) {
        // 地理的位置を使用
        position = latLonTo3D(site.location.lat, site.location.lon, centerLat, centerLon);
      } else {
        // 論理的位置（グリッド配置）
        const cols = Math.ceil(Math.sqrt(sites.length));
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
    const connectionGroups = new Map<string, Array<{ connection: Connection; count: number }>>();
    
    connections.forEach((connection: Connection) => {
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

    // カメラ位置を調整
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
      
      // OrbitControlsのターゲットも設定（controlsが利用可能な場合）
      if (controls) {
        controls.target.set(centerX, centerY, centerZ);
        controls.update();
      }
    }

    // マウスクリックイベント
    const handleClick = (event: MouseEvent) => {
      if (!raycasterRef.current || !camera || !renderer) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const intersects = raycasterRef.current.intersectObjects(
        Array.from(meshRefs.current.values())
      );

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const siteId = clickedMesh.userData.siteId;
        if (siteId && onSiteClick) {
          onSiteClick(siteId);
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
          {siteTopology?.label || '棟間ネットワーク'}
        </div>
        <div style={{ color: '#666' }}>
          棟数: {sites.length} | 接続数: {connections.length}
        </div>
      </div>
    </div>
  );
}

