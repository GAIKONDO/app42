/**
 * DOTコード表示エディタコンポーネント（読み取り専用）
 */

'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #E5E7EB',
      borderRadius: '6px',
      backgroundColor: '#f9fafb',
      color: '#6B7280',
    }}>
      エディターを読み込み中...
    </div>
  ),
});

interface DotEditorProps {
  value: string;
}

export function DotEditor({ value }: DotEditorProps) {
  const editorRef = useRef<any>(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: '0 0 300px', // 最小高さ300px、必要に応じて拡張可能
      minHeight: 0,
    }}>
      <div style={{
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: '#1a1a1a',
      }}>
        Graphviz DOTコード
      </div>
      <div style={{
        flex: 1,
        border: '1px solid #E5E7EB',
        borderRadius: '6px',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <MonacoEditor
          height="100%"
          language="dot"
          value={value}
          onChange={() => {}} // 読み取り専用
          onMount={(editor: any) => {
            editorRef.current = editor;
            editor.updateOptions({ readOnly: true });
          }}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            readOnly: true,
            bracketPairColorization: { enabled: true },
            colorDecorators: true,
          }}
        />
      </div>
    </div>
  );
}

