'use client';

import React from 'react';

interface AgencyContractSectionProps {
  localAgencyContractMonth: string;
  setLocalAgencyContractMonth: (month: string) => void;
}

export default function AgencyContractSection({
  localAgencyContractMonth,
  setLocalAgencyContractMonth,
}: AgencyContractSectionProps) {
  // 年と月を分離
  const [agencyContractYear, setAgencyContractYear] = React.useState<string>(() => {
    if (localAgencyContractMonth) {
      const [year] = localAgencyContractMonth.split('-');
      return year || '';
    }
    return '';
  });
  
  const [agencyContractMonth, setAgencyContractMonth] = React.useState<string>(() => {
    if (localAgencyContractMonth) {
      const [, month] = localAgencyContractMonth.split('-');
      return month || '';
    }
    return '';
  });

  // localAgencyContractMonthが変更されたときに年と月を更新
  React.useEffect(() => {
    if (localAgencyContractMonth) {
      const [year, month] = localAgencyContractMonth.split('-');
      if (year && year !== agencyContractYear) {
        setAgencyContractYear(year);
      }
      if (month && month !== agencyContractMonth) {
        setAgencyContractMonth(month);
      }
    } else {
      if (agencyContractYear) {
        setAgencyContractYear('');
      }
      if (agencyContractMonth) {
        setAgencyContractMonth('');
      }
    }
  }, [localAgencyContractMonth]);

  // 年と月が変更されたら、YYYY-MM形式に変換して保存
  React.useEffect(() => {
    if (agencyContractYear && agencyContractMonth) {
      const formattedMonth = `${agencyContractYear}-${agencyContractMonth.padStart(2, '0')}`;
      if (formattedMonth !== localAgencyContractMonth) {
        setLocalAgencyContractMonth(formattedMonth);
      }
    } else if (!agencyContractYear && !agencyContractMonth) {
      if (localAgencyContractMonth) {
        setLocalAgencyContractMonth('');
      }
    }
  }, [agencyContractYear, agencyContractMonth]);

  return (
    <div style={{ marginBottom: '28px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontWeight: '600', 
        color: '#1A1A1A',
        fontSize: '14px',
        fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <span style={{ 
          display: 'inline-block',
          width: '24px',
          height: '24px',
          lineHeight: '24px',
          textAlign: 'center',
          backgroundColor: '#4262FF',
          color: '#FFFFFF',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '700',
          marginRight: '8px',
          verticalAlign: 'middle',
        }}>3</span>
        代理店契約締結月
      </label>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {/* 年の選択 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '0 0 auto' }}>
          <label style={{ 
            fontSize: '12px', 
            color: '#6B7280', 
            fontWeight: '500',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            年
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={agencyContractYear}
              onChange={(e) => setAgencyContractYear(e.target.value)}
              style={{
                padding: '10px 40px 10px 14px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                color: agencyContractYear ? '#1A1A1A' : '#9CA3AF',
                fontWeight: agencyContractYear ? '500' : '400',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                minWidth: '140px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#4262FF';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
              {Array.from({ length: 30 }, (_, i) => {
                const year = new Date().getFullYear() - 10 + i;
                return (
                  <option key={year} value={year.toString()} style={{ color: '#1A1A1A' }}>
                    {year}年
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        
        {/* 月の選択 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '0 0 auto' }}>
          <label style={{ 
            fontSize: '12px', 
            color: '#6B7280', 
            fontWeight: '500',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            月
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={agencyContractMonth}
              onChange={(e) => setAgencyContractMonth(e.target.value)}
              disabled={!agencyContractYear}
              style={{
                padding: '10px 40px 10px 14px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: agencyContractYear ? '#FFFFFF' : '#F9FAFB',
                cursor: agencyContractYear ? 'pointer' : 'not-allowed',
                color: agencyContractYear ? (agencyContractMonth ? '#1A1A1A' : '#9CA3AF') : '#9CA3AF',
                fontWeight: agencyContractMonth ? '500' : '400',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                minWidth: '140px',
                transition: 'all 0.2s ease',
                opacity: agencyContractYear ? 1 : 0.6,
              }}
              onMouseEnter={(e) => {
                if (agencyContractYear) {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                if (agencyContractYear) {
                  e.currentTarget.style.borderColor = '#4262FF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
                  e.currentTarget.style.outline = 'none';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
              {Array.from({ length: 12 }, (_, i) => {
                const month = (i + 1).toString();
                return (
                  <option key={month} value={month} style={{ color: '#1A1A1A' }}>
                    {month}月
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        
        {/* クリアボタン */}
        {(agencyContractYear || agencyContractMonth) && (
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => {
                setAgencyContractYear('');
                setAgencyContractMonth('');
              }}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              クリア
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

