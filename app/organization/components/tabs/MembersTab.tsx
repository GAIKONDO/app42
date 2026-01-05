'use client';

import { useState } from 'react';
import type { MemberInfo } from '@/components/OrgChart';
import { tauriAlert } from '@/lib/orgApi';
import MemberEditForm from './MemberEditForm';

interface MembersTabProps {
  editingMembers: (MemberInfo & { id?: string })[];
  setEditingMembers: (members: (MemberInfo & { id?: string })[]) => void;
  editingMemberIndex: number | null;
  setEditingMemberIndex: (index: number | null) => void;
  onDeleteMember: (index: number) => Promise<void>;
}

export default function MembersTab({
  editingMembers,
  setEditingMembers,
  editingMemberIndex,
  setEditingMemberIndex,
  onDeleteMember,
}: MembersTabProps) {
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMember, setNewMember] = useState<MemberInfo>({
    name: '',
    title: '',
    nameRomaji: '',
    department: '',
    extension: '',
    companyPhone: '',
    mobilePhone: '',
    email: '',
    itochuEmail: '',
    teams: '',
    employeeType: '',
    roleName: '',
    indicator: '',
    location: '',
    floorDoorNo: '',
    previousName: '',
  });

  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      await tauriAlert('名前は必須です');
      return;
    }
    setEditingMembers([...editingMembers, { ...newMember }]);
    setNewMember({
      name: '',
      title: '',
      nameRomaji: '',
      department: '',
      extension: '',
      companyPhone: '',
      mobilePhone: '',
      email: '',
      itochuEmail: '',
      teams: '',
      employeeType: '',
      roleName: '',
      indicator: '',
      location: '',
      floorDoorNo: '',
      previousName: '',
    });
    setShowAddMemberForm(false);
  };

  const handleUpdateMember = (index: number, updatedMember: MemberInfo & { id?: string }) => {
    const updated = [...editingMembers];
    // IDを保持
    updated[index] = { ...updatedMember, id: editingMembers[index]?.id };
    setEditingMembers(updated);
    setEditingMemberIndex(null);
  };

  const handleMoveMember = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return; // 最初のメンバーは上に移動できない
    if (direction === 'down' && index === editingMembers.length - 1) return; // 最後のメンバーは下に移動できない

    const updated = [...editingMembers];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // メンバーを入れ替え
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    // displayOrderを更新
    updated.forEach((member, i) => {
      (member as any).displayOrder = i;
    });
    
    setEditingMembers(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>メンバー一覧</h3>
        <button
          onClick={() => setShowAddMemberForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
          + メンバーを追加
        </button>
      </div>

      {/* メンバー追加フォーム */}
      {showAddMemberForm && (
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#FFFFFF', 
          borderRadius: '12px', 
          border: '1px solid #E5E7EB', 
          maxHeight: '70vh', 
          overflowY: 'auto',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <h4 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            marginBottom: '24px',
            color: '#111827',
            letterSpacing: '0.02em'
          }}>
            新しいメンバーを追加
          </h4>
          
          {/* 基本情報セクション */}
          <div style={{ marginBottom: '24px' }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid #E5E7EB',
              letterSpacing: '0.02em',
            }}>
              基本情報
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  名前 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="名前を入力"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  役職
                </label>
                <input
                  type="text"
                  value={newMember.title || ''}
                  onChange={(e) => setNewMember({ ...newMember, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 部長"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  名前（ローマ字）
                </label>
                <input
                  type="text"
                  value={newMember.nameRomaji || ''}
                  onChange={(e) => setNewMember({ ...newMember, nameRomaji: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: Taro Yamada"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  部署
                </label>
                <input
                  type="text"
                  value={newMember.department || ''}
                  onChange={(e) => setNewMember({ ...newMember, department: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 営業部"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  従業員タイプ
                </label>
                <input
                  type="text"
                  value={newMember.employeeType || ''}
                  onChange={(e) => setNewMember({ ...newMember, employeeType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 正社員"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  役割名
                </label>
                <input
                  type="text"
                  value={newMember.roleName || ''}
                  onChange={(e) => setNewMember({ ...newMember, roleName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: プロジェクトマネージャー"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* 連絡先セクション */}
          <div style={{ marginBottom: '24px' }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid #E5E7EB',
              letterSpacing: '0.02em',
            }}>
              連絡先
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  内線番号
                </label>
                <input
                  type="text"
                  value={newMember.extension || ''}
                  onChange={(e) => setNewMember({ ...newMember, extension: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 1234"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  会社電話番号
                </label>
                <input
                  type="tel"
                  value={newMember.companyPhone || ''}
                  onChange={(e) => setNewMember({ ...newMember, companyPhone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 03-1234-5678"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  携帯電話番号
                </label>
                <input
                  type="tel"
                  value={newMember.mobilePhone || ''}
                  onChange={(e) => setNewMember({ ...newMember, mobilePhone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 090-1234-5678"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={newMember.email || ''}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: taro@example.com"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  伊藤忠メールアドレス
                </label>
                <input
                  type="email"
                  value={newMember.itochuEmail || ''}
                  onChange={(e) => setNewMember({ ...newMember, itochuEmail: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: taro@itochu.co.jp"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  Teams情報
                </label>
                <input
                  type="text"
                  value={newMember.teams || ''}
                  onChange={(e) => setNewMember({ ...newMember, teams: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: @taro.yamada"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* その他セクション */}
          <div style={{ marginBottom: '24px' }}>
            <h5 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid #E5E7EB',
              letterSpacing: '0.02em',
            }}>
              その他
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  所在地
                </label>
                <input
                  type="text"
                  value={newMember.location || ''}
                  onChange={(e) => setNewMember({ ...newMember, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 東京都千代田区"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  階・ドア番号
                </label>
                <input
                  type="text"
                  value={newMember.floorDoorNo || ''}
                  onChange={(e) => setNewMember({ ...newMember, floorDoorNo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 5F-501"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  インジケーター
                </label>
                <input
                  type="text"
                  value={newMember.indicator || ''}
                  onChange={(e) => setNewMember({ ...newMember, indicator: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 重要"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' }}>
                  以前の名前
                </label>
                <input
                  type="text"
                  value={newMember.previousName || ''}
                  onChange={(e) => setNewMember({ ...newMember, previousName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                  }}
                  placeholder="例: 旧姓"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
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
              onClick={() => {
                setShowAddMemberForm(false);
                setNewMember({
                  name: '',
                  title: '',
                  nameRomaji: '',
                  department: '',
                  extension: '',
                  companyPhone: '',
                  mobilePhone: '',
                  email: '',
                  itochuEmail: '',
                  teams: '',
                  employeeType: '',
                  roleName: '',
                  indicator: '',
                  location: '',
                  floorDoorNo: '',
                  previousName: '',
                });
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6B7280',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
              onClick={handleAddMember}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
              追加
            </button>
          </div>
        </div>
      )}

      {/* メンバー一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
        {editingMembers.map((member, index) => (
          <div
            key={index}
            style={{
              padding: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border-color)',
              borderRadius: '8px',
            }}
          >
            {editingMemberIndex === index ? (
              <MemberEditForm
                member={member}
                onSave={(updated) => handleUpdateMember(index, updated)}
                onCancel={() => setEditingMemberIndex(null)}
                onDelete={() => onDeleteMember(index)}
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {/* 順序変更ボタン */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => handleMoveMember(index, 'up')}
                      disabled={index === 0}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: index === 0 ? '#E5E7EB' : '#F3F4F6',
                        color: index === 0 ? '#9CA3AF' : '#374151',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '32px',
                        height: '24px',
                      }}
                      onMouseEnter={(e) => {
                        if (index !== 0) {
                          e.currentTarget.style.backgroundColor = '#E5E7EB';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== 0) {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                      title="上に移動"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveMember(index, 'down')}
                      disabled={index === editingMembers.length - 1}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: index === editingMembers.length - 1 ? '#E5E7EB' : '#F3F4F6',
                        color: index === editingMembers.length - 1 ? '#9CA3AF' : '#374151',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        cursor: index === editingMembers.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '32px',
                        height: '24px',
                      }}
                      onMouseEnter={(e) => {
                        if (index !== editingMembers.length - 1) {
                          e.currentTarget.style.backgroundColor = '#E5E7EB';
                          e.currentTarget.style.transform = 'translateY(1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== editingMembers.length - 1) {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                      title="下に移動"
                    >
                      ↓
                    </button>
                  </div>
                  
                  {/* メンバー情報 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#111827' }}>
                      {member.name}
                    </div>
                    {member.title && (
                      <div style={{ fontSize: '14px', color: '#6B7280' }}>
                        {member.title}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* アクションボタン */}
                <div style={{ display: 'flex', gap: '4px', opacity: 0.6 }}>
                  <button
                    onClick={() => setEditingMemberIndex(index)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      color: '#6B7280',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.color = '#374151';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.color = '#6B7280';
                    }}
                    title="編集"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onDeleteMember(index)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      color: '#9CA3AF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                      e.currentTarget.style.borderColor = '#FECACA';
                      e.currentTarget.style.color = '#DC2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.color = '#9CA3AF';
                    }}
                    title="削除"
                  >
                    削除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {editingMembers.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-light)' }}>
            メンバーが登録されていません
          </div>
        )}
      </div>
    </div>
  );
}
