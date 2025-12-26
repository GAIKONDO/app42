/**
 * サーバー詳細の3D表示コンポーネント
 * サーバーの物理構造（スロット、ポート、内部構造）を3Dで表示
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { ThreeScene } from '../utils/3d/ThreeScene';

interface ServerDetails {
  id: string;
  label: string;
  type: 'server-details';
  serverId?: string;
  hardware?: {
    model?: string;
    serialNumber?: string;
    manufacturer?: string;
    updated?: string;
  };
  slots?: Array<{
    id: string;
    label: string;
    type: string;
    cpu?: string;
    status?: 'empty' | 'installed' | 'failed';
    capacity?: string;
  }>;
  frontPanelPorts?: Array<{
    id: string;
    label: string;
    type: string;
    location?: string;
    description?: string;
  }>;
  ports?: Array<{
    id: string;
    label: string;
    speed?: string;
    mac?: string;
    ip?: string;
    vlan?: string;
    description?: string;
  }>;
  os?: {
    type?: string;
    distribution?: string;
    kernel?: string;
    description?: string;
  };
  middleware?: Array<any>;
  applications?: Array<any>;
  sequences?: Array<any>;
}

interface ServerDetails3DViewerProps {
  serverDetails: ServerDetails | null | any;
  width?: number;
  height?: number;
}

// サーバーの基本寸法（1Uラックマウントサーバー想定）
const SERVER_DIMENSIONS = {
  width: 0.48, // 19インチ = 約0.48m
  height: 0.044, // 1U = 約0.044m
  depth: 0.7, // 約0.7m
};

export function ServerDetails3DViewer({
  serverDetails,
  width,
  height = 600,
}: ServerDetails3DViewerProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const handleSceneReady = (
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    if (!serverDetails) return;

    // サーバーの本体
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

    // フロントパネル（前面）
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

    // フロントパネルポートを配置
    const frontPorts = serverDetails.frontPanelPorts || [];
    frontPorts.forEach((port: any, index: number) => {
      const portSize = 0.01;
      const portGeometry = new THREE.CylinderGeometry(portSize, portSize, 0.002, 16);
      const portColor = port.type === 'button' ? 0xff0000 : port.type === 'VGA' ? 0x0000ff : 0x00ff00;
      const portMaterial = new THREE.MeshStandardMaterial({
        color: portColor,
        metalness: 0.8,
        roughness: 0.2,
      });
      const portMesh = new THREE.Mesh(portGeometry, portMaterial);
      portMesh.rotation.x = Math.PI / 2;
      portMesh.position.set(
        -SERVER_DIMENSIONS.width * 0.3 + (index * SERVER_DIMENSIONS.width * 0.2),
        SERVER_DIMENSIONS.height / 2,
        SERVER_DIMENSIONS.depth / 2 + 0.002
      );
      scene.add(portMesh);

      // ポートラベル
      const portLabel = new Text();
      portLabel.text = port.label || port.id;
      portLabel.fontSize = 0.008;
      portLabel.color = 0xffffff;
      portLabel.anchorX = 'center';
      portLabel.anchorY = 'middle';
      portLabel.position.set(
        portMesh.position.x,
        portMesh.position.y - 0.015,
        portMesh.position.z
      );
      portLabel.sync();
      scene.add(portLabel);
    });

    // スロットを配置（前面に表示）
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

      // スロットラベル
      const slotLabel = new Text();
      slotLabel.text = slot.label || slot.id;
      slotLabel.fontSize = 0.006;
      slotLabel.color = 0xffffff;
      slotLabel.anchorX = 'center';
      slotLabel.anchorY = 'middle';
      slotLabel.position.set(
        slotMesh.position.x,
        slotMesh.position.y,
        slotMesh.position.z + 0.001
      );
      slotLabel.sync();
      scene.add(slotLabel);
    });

    // ネットワークポートを配置（サーバー内部、背面側）
    const ports = serverDetails.ports || [];
    const portsPerRow = 5; // 1行あたりのポート数
    const portSpacing = SERVER_DIMENSIONS.width / (portsPerRow + 1); // ポート間の間隔
    const portRowHeight = SERVER_DIMENSIONS.height / 3; // 行の高さ
    
    ports.forEach((port: any, index: number) => {
      const row = Math.floor(index / portsPerRow);
      const col = index % portsPerRow;
      const portSize = 0.008;
      const portGeometry = new THREE.BoxGeometry(portSize, portSize * 0.5, 0.01);
      
      // ポートのroleに応じて色を変更
      let portColor = 0x4299e1; // デフォルト（青）
      if (port.role === 'management') {
        portColor = 0x48bb78; // 緑（管理）
      } else if (port.role === 'public') {
        portColor = 0xed8936; // オレンジ（パブリック）
      } else if (port.role === 'internal') {
        portColor = 0x4299e1; // 青（内部）
      } else if (port.role === 'storage') {
        portColor = 0x9f7aea; // 紫（ストレージ）
      } else if (port.role === 'backup') {
        portColor = 0xf56565; // 赤（バックアップ）
      } else if (port.role === 'unused') {
        portColor = 0x718096; // グレー（未使用）
      }
      
      const portMaterial = new THREE.MeshStandardMaterial({
        color: portColor,
        metalness: 0.8,
        roughness: 0.2,
      });
      const portMesh = new THREE.Mesh(portGeometry, portMaterial);
      
      // サーバーの内部（背面側）に配置
      portMesh.position.set(
        -SERVER_DIMENSIONS.width / 2 + portSpacing * (col + 1),
        SERVER_DIMENSIONS.height / 2 - portRowHeight * row,
        -SERVER_DIMENSIONS.depth / 2 + 0.01 // サーバーの内部（背面側の内側）
      );
      scene.add(portMesh);

      // ポートラベル（type、speed、roleを含む）
      const portLabel = new Text();
      let labelText = port.label || port.id;
      const labelParts: string[] = [];
      
      if (port.type) {
        labelParts.push(port.type);
      }
      if (port.speed) {
        labelParts.push(port.speed);
      }
      if (port.role) {
        labelParts.push(`[${port.role}]`);
      }
      
      if (labelParts.length > 0) {
        labelText += '\n' + labelParts.join(' ');
      }
      
      portLabel.text = labelText;
      portLabel.fontSize = 0.004;
      portLabel.color = 0xffffff;
      portLabel.anchorX = 'center';
      portLabel.anchorY = 'middle';
      portLabel.position.set(
        portMesh.position.x,
        portMesh.position.y,
        portMesh.position.z - 0.005 // ポートの少し前
      );
      portLabel.sync();
      scene.add(portLabel);
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

    // ハードウェア情報
    if (serverDetails.hardware?.model) {
      const modelLabel = new Text();
      modelLabel.text = serverDetails.hardware.model;
      modelLabel.fontSize = 0.015;
      modelLabel.color = 0x4a5568;
      modelLabel.anchorX = 'center';
      modelLabel.anchorY = 'top';
      modelLabel.position.set(0, SERVER_DIMENSIONS.height + 0.08, SERVER_DIMENSIONS.depth / 2);
      modelLabel.sync();
      scene.add(modelLabel);
    }

    // カメラ位置を調整
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(1, 0.5, 1.5);
      camera.lookAt(0, SERVER_DIMENSIONS.height / 2, 0);
    }

    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, 3, -5);
    scene.add(directionalLight2);
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
          {serverDetails?.label || 'サーバー詳細'}
        </div>
        <div style={{ color: '#666' }}>
          {serverDetails?.hardware?.model && `モデル: ${serverDetails.hardware.model}`}
          {serverDetails?.slots && ` | スロット数: ${serverDetails.slots.length}`}
          {serverDetails?.ports && ` | ポート数: ${serverDetails.ports.length}`}
        </div>
      </div>
    </div>
  );
}

