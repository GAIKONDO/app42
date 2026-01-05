'use client';

import { useState } from 'react';
import type { MemberInfo } from '@/components/OrgChart';
import { tauriAlert } from '@/lib/orgApi';

interface MemberEditFormProps {
  member: MemberInfo & { id?: string };
  onSave: (updated: MemberInfo & { id?: string }) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export default function MemberEditForm({
  member,
  onSave,
  onCancel,
  onDelete,
}: MemberEditFormProps) {
  const [editedMember, setEditedMember] = useState<MemberInfo & { id?: string }>({ ...member });

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#FFFFFF',
    color: '#111827',
    transition: 'all 0.2s ease',
    outline: 'none',
  } as React.CSSProperties;

  const inputFocusStyle = {
    borderColor: '#3B82F6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    letterSpacing: '0.01em',
  } as React.CSSProperties;

  const sectionStyle = {
    marginBottom: '24px',
  } as React.CSSProperties;

  const sectionTitleStyle = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #E5E7EB',
    letterSpacing: '0.02em',
  } as React.CSSProperties;

  const buttonBaseStyle = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 基本情報セクション */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>基本情報</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              名前 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={editedMember.name}
              onChange={(e) => setEditedMember({ ...editedMember, name: e.target.value })}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>役職</label>
            <input
              type="text"
              value={editedMember.title || ''}
              onChange={(e) => setEditedMember({ ...editedMember, title: e.target.value })}
              style={inputStyle}
              placeholder="例: 部長"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>名前（ローマ字）</label>
            <input
              type="text"
              value={editedMember.nameRomaji || ''}
              onChange={(e) => setEditedMember({ ...editedMember, nameRomaji: e.target.value })}
              style={inputStyle}
              placeholder="例: Taro Yamada"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>部署</label>
            <input
              type="text"
              value={editedMember.department || ''}
              onChange={(e) => setEditedMember({ ...editedMember, department: e.target.value })}
              style={inputStyle}
              placeholder="例: 営業部"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>従業員タイプ</label>
            <input
              type="text"
              value={editedMember.employeeType || ''}
              onChange={(e) => setEditedMember({ ...editedMember, employeeType: e.target.value })}
              style={inputStyle}
              placeholder="例: 正社員"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>役割名</label>
            <input
              type="text"
              value={editedMember.roleName || ''}
              onChange={(e) => setEditedMember({ ...editedMember, roleName: e.target.value })}
              style={inputStyle}
              placeholder="例: プロジェクトマネージャー"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* 連絡先セクション */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>連絡先</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>内線番号</label>
            <input
              type="text"
              value={editedMember.extension || ''}
              onChange={(e) => setEditedMember({ ...editedMember, extension: e.target.value })}
              style={inputStyle}
              placeholder="例: 1234"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>会社電話番号</label>
            <input
              type="tel"
              value={editedMember.companyPhone || ''}
              onChange={(e) => setEditedMember({ ...editedMember, companyPhone: e.target.value })}
              style={inputStyle}
              placeholder="例: 03-1234-5678"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>携帯電話番号</label>
            <input
              type="tel"
              value={editedMember.mobilePhone || ''}
              onChange={(e) => setEditedMember({ ...editedMember, mobilePhone: e.target.value })}
              style={inputStyle}
              placeholder="例: 090-1234-5678"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>メールアドレス</label>
            <input
              type="email"
              value={editedMember.email || ''}
              onChange={(e) => setEditedMember({ ...editedMember, email: e.target.value })}
              style={inputStyle}
              placeholder="例: taro@example.com"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>伊藤忠メールアドレス</label>
            <input
              type="email"
              value={editedMember.itochuEmail || ''}
              onChange={(e) => setEditedMember({ ...editedMember, itochuEmail: e.target.value })}
              style={inputStyle}
              placeholder="例: taro@itochu.co.jp"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>Teams情報</label>
            <input
              type="text"
              value={editedMember.teams || ''}
              onChange={(e) => setEditedMember({ ...editedMember, teams: e.target.value })}
              style={inputStyle}
              placeholder="例: @taro.yamada"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* その他セクション */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>その他</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>所在地</label>
            <input
              type="text"
              value={editedMember.location || ''}
              onChange={(e) => setEditedMember({ ...editedMember, location: e.target.value })}
              style={inputStyle}
              placeholder="例: 東京都千代田区"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>階・ドア番号</label>
            <input
              type="text"
              value={editedMember.floorDoorNo || ''}
              onChange={(e) => setEditedMember({ ...editedMember, floorDoorNo: e.target.value })}
              style={inputStyle}
              placeholder="例: 5F-501"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>インジケーター</label>
            <input
              type="text"
              value={editedMember.indicator || ''}
              onChange={(e) => setEditedMember({ ...editedMember, indicator: e.target.value })}
              style={inputStyle}
              placeholder="例: 重要"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>以前の名前</label>
            <input
              type="text"
              value={editedMember.previousName || ''}
              onChange={(e) => setEditedMember({ ...editedMember, previousName: e.target.value })}
              style={inputStyle}
              placeholder="例: 旧姓"
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end', 
        paddingTop: '20px',
        borderTop: '1px solid #E5E7EB',
        marginTop: '8px'
      }}>
        <button
          onClick={onCancel}
          style={{
            ...buttonBaseStyle,
            backgroundColor: '#6B7280',
            color: '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4B5563';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6B7280';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }}
        >
          キャンセル
        </button>
        <button
          onClick={onDelete}
          style={{
            ...buttonBaseStyle,
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#DC2626';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#EF4444';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }}
        >
          削除
        </button>
        <button
          onClick={async () => {
            if (!editedMember.name.trim()) {
              await tauriAlert('名前は必須です');
              return;
            }
            onSave(editedMember);
          }}
          style={{
            ...buttonBaseStyle,
            backgroundColor: '#10B981',
            color: '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#10B981';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
