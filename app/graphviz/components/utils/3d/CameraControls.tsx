/**
 * 3D表示のカメラ操作UIコンポーネント
 * カメラリセット、プリセット視点、操作説明を提供
 */

'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface CameraControlsProps {
  camera: THREE.Camera | null;
  controls: any; // OrbitControls
  target?: THREE.Vector3;
  onReset?: () => void;
  style?: React.CSSProperties;
}

export function CameraControls({
  camera,
  controls,
  target = new THREE.Vector3(0, 0, 0),
  onReset,
  style,
}: CameraControlsProps) {
  const handleReset = () => {
    if (!camera || !controls) return;

    // カメラ位置をリセット
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(5, 5, 5);
      camera.lookAt(target);
    }

    // コントロールのターゲットをリセット
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }

    if (onReset) {
      onReset();
    }
  };

  const handleViewFront = () => {
    if (!camera || !controls) return;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 0, 5);
      camera.lookAt(target);
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
    }
  };

  const handleViewTop = () => {
    if (!camera || !controls) return;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 5, 0);
      camera.lookAt(target);
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
    }
  };

  const handleViewSide = () => {
    if (!camera || !controls) return;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(5, 0, 0);
      camera.lookAt(target);
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10,
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          リセット
        </button>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button
            onClick={handleViewFront}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#E5E7EB',
              color: '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="前面"
          >
            前
          </button>
          <button
            onClick={handleViewTop}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#E5E7EB',
              color: '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="上面"
          >
            上
          </button>
          <button
            onClick={handleViewSide}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: '#E5E7EB',
              color: '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="側面"
          >
            横
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 操作説明コンポーネント
 */
export function CameraInstructions({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#6B7280',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '200px',
        ...style,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '4px', color: '#374151' }}>
        操作方法
      </div>
      <div>左ドラッグ: 回転</div>
      <div>右ドラッグ: パン</div>
      <div>ホイール: ズーム</div>
      <div>クリック: 選択</div>
    </div>
  );
}

