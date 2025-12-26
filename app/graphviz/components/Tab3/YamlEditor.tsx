/**
 * YAML入力エディタコンポーネント
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

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function YamlEditor({ value, onChange }: YamlEditorProps) {
  const editorRef = useRef<any>(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      flex: 1,
    }}>
      <div style={{
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: '#1a1a1a',
      }}>
        YAML入力
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
          language="yaml"
          value={value}
          onChange={(value) => onChange(value || '')}
          onMount={(editor: any) => {
            editorRef.current = editor;
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
            formatOnPaste: true,
            formatOnType: false,
            autoIndent: 'full',
            bracketPairColorization: { enabled: true },
            colorDecorators: true,
            insertSpaces: true,
            detectIndentation: true,
          }}
        />
      </div>
    </div>
  );
}

