'use client';

import React from 'react';
import type { FilterDropdownProps } from './types';

export default function FilterDropdown<T>({
  label,
  selectedIds,
  items,
  getItemId,
  getItemTitle,
  onSelectionChange,
  showFilter,
  setShowFilter,
}: FilterDropdownProps<T>) {
  return (
    <div style={{ position: 'relative' }} data-filter-dropdown>
      <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginRight: '8px' }}>
        {label}:
      </label>
      <button
        onClick={() => setShowFilter(!showFilter)}
        style={{
          padding: '8px 36px 8px 12px',
          border: '1.5px solid #E5E7EB',
          borderRadius: '8px',
          fontSize: '14px',
          backgroundColor: '#FFFFFF',
          color: selectedIds.size > 0 ? '#1F2937' : '#9CA3AF',
          fontWeight: selectedIds.size > 0 ? '500' : '400',
          cursor: 'pointer',
          minWidth: '200px',
          textAlign: 'left',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          transition: 'all 0.2s ease',
        }}
      >
        {selectedIds.size > 0 
          ? `${selectedIds.size}件選択中`
          : `すべての${label}`}
      </button>
      {showFilter && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '250px',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #E5E7EB',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
              {label}を選択
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectionChange(new Set(items.map(item => getItemId(item))));
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                全て選択
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectionChange(new Set());
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E5E7EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                >
                  全てクリア
                </button>
              )}
            </div>
          </div>
          {items.map(item => {
            const itemId = getItemId(item);
            const isSelected = selectedIds.has(itemId);
            return (
              <label
                key={itemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const newSet = new Set(selectedIds);
                    if (e.target.checked) {
                      newSet.add(itemId);
                    } else {
                      newSet.delete(itemId);
                    }
                    onSelectionChange(newSet);
                  }}
                  style={{
                    marginRight: '8px',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '14px', color: '#1A1A1A' }}>
                  {getItemTitle(item)}
                </span>
              </label>
            );
          })}
        </div>
      )}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '8px',
        }}>
          {Array.from(selectedIds).map(id => {
            const item = items.find(i => getItemId(i) === id);
            if (!item) return null;
            return (
              <span
                key={id}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {getItemTitle(item)}
                <button
                  onClick={() => {
                    const newSet = new Set(selectedIds);
                    newSet.delete(id);
                    onSelectionChange(newSet);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1E40AF',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '14px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

