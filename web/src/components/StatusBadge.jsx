import React from 'react';

/**
 * Standardized Metadata for all 7 Supervision Plan Statuses
 */
export const PLAN_STATUS_CONFIG = {
  '1': {
    label: 'รอ ผอ. ตรวจอนุมัติ',
    shortLabel: 'รอ ผอ. อนุมัติ',
    badgeClass: 'badge-warning',
    pillBg: '#fffbeb',
    pillText: '#b45309',
    pillBorder: '#fde68a',
    icon: 'fa-solid fa-clock',
    step: 2,
    color: '#d97706',
  },
  '2': {
    label: 'ผอ. อนุมัติแล้ว • รอแนบคลิป',
    shortLabel: 'รอส่งคลิป',
    badgeClass: 'badge-info',
    pillBg: '#f0f9ff',
    pillText: '#0369a1',
    pillBorder: '#bae6fd',
    icon: 'fa-solid fa-video',
    step: 3,
    color: '#0284c7',
  },
  '3': {
    label: 'ไม่อนุมัติ • ส่งกลับแก้ไข',
    shortLabel: 'ส่งกลับแก้ไข',
    badgeClass: 'badge-danger',
    pillBg: '#fef2f2',
    pillText: '#b91c1c',
    pillBorder: '#fecaca',
    icon: 'fa-solid fa-rotate-left',
    step: 1,
    color: '#dc2626',
  },
  '4': {
    label: 'แก้ไขแล้ว • รอ ผอ. ตรวจซ้ำ',
    shortLabel: 'ส่งแก้ไขแล้ว',
    badgeClass: 'badge-info',
    pillBg: '#eef2ff',
    pillText: '#4338ca',
    pillBorder: '#c7d2fe',
    icon: 'fa-solid fa-paper-plane',
    step: 2,
    color: '#4f46e5',
  },
  '5': {
    label: 'ส่งคลิปแล้ว • รอนิเทศ',
    shortLabel: 'รอนิเทศ',
    badgeClass: 'badge-primary',
    pillBg: '#eff6ff',
    pillText: '#1d4ed8',
    pillBorder: '#bfdbfe',
    icon: 'fa-solid fa-film',
    step: 3,
    color: '#2563eb',
  },
  '6': {
    label: 'คกก. กำลังประเมินผล',
    shortLabel: 'กำลังประเมิน',
    badgeClass: 'badge-warning',
    pillBg: '#f5f3ff',
    pillText: '#6d28d9',
    pillBorder: '#ddd6fe',
    icon: 'fa-solid fa-user-pen',
    step: 4,
    color: '#7c3aed',
  },
  '7': {
    label: 'ประเมินเสร็จสิ้นสมบูรณ์',
    shortLabel: 'เสร็จสมบูรณ์',
    badgeClass: 'badge-success',
    pillBg: '#ecfdf5',
    pillText: '#047857',
    pillBorder: '#a7f3d0',
    icon: 'fa-solid fa-award',
    step: 4,
    color: '#059669',
  },
};

export const StatusBadge = ({ status, showIcon = true, short = false, customNote = '' }) => {
  const statusStr = String(status || '1');
  const config = PLAN_STATUS_CONFIG[statusStr] || {
    label: `สถานะ ${statusStr}`,
    shortLabel: `สถานะ ${statusStr}`,
    pillBg: '#f1f5f9',
    pillText: '#475569',
    pillBorder: '#cbd5e1',
    icon: 'fa-solid fa-circle-info',
  };

  return (
    <div className="d-inline-flex flex-column align-items-start">
      <span
        className="d-inline-flex align-items-center py-1 px-2"
        style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          borderRadius: '999px',
          backgroundColor: config.pillBg,
          color: config.pillText,
          border: `1px solid ${config.pillBorder}`,
          whiteSpace: 'nowrap',
        }}
      >
        {showIcon && <i className={`${config.icon} mr-1`} style={{ fontSize: '0.74rem' }}></i>}
        {short ? config.shortLabel : config.label}
      </span>
      {customNote && (
        <small className="text-danger mt-1 font-weight-bold" style={{ fontSize: '0.75rem' }}>
          <i className="fa-solid fa-triangle-exclamation mr-1"></i>
          {customNote}
        </small>
      )}
    </div>
  );
};

export const PlanTimelineStepper = ({ currentStatus }) => {
  const statusStr = String(currentStatus || '1');
  const isRejected = statusStr === '3';

  let activeStep = 1;
  if (['1', '4'].includes(statusStr)) activeStep = 2;
  else if (['2', '5'].includes(statusStr)) activeStep = 3;
  else if (['6', '7'].includes(statusStr)) activeStep = 4;

  const steps = [
    { num: 1, title: 'ส่งแผนการสอน', desc: 'ครูบันทึกแผน' },
    { num: 2, title: 'ผอ. อนุมัติ', desc: isRejected ? 'ส่งกลับให้แก้ไข' : 'ตรวจและตั้งกรรมการ' },
    { num: 3, title: 'คลิป/บันทึกหลังสอน', desc: statusStr === '5' ? 'แนบคลิปแล้ว' : 'รอแนบหลักฐาน' },
    { num: 4, title: 'การประเมิน ว.PA', desc: statusStr === '7' ? 'ประเมินเสร็จสมบูรณ์' : 'กรรมการให้คะแนน' },
  ];

  return (
    <div className="plan-timeline-container py-3 px-3 my-2 bg-white rounded border shadow-sm">
      <div className="d-flex justify-content-between align-items-center position-relative">
        <div
          className="position-absolute"
          style={{
            top: '15px',
            left: '36px',
            right: '36px',
            height: '3px',
            backgroundColor: '#e2e8f0',
            zIndex: 1,
          }}
        />

        {steps.map((st) => {
          let circleBg = '#cbd5e1';
          let textColor = '#64748b';
          let icon = st.num;

          if (isRejected && st.num === 2) {
            circleBg = '#ef4444';
            textColor = '#dc2626';
            icon = <i className="fa-solid fa-xmark text-white" />;
          } else if (st.num < activeStep || (st.num === 4 && statusStr === '7')) {
            circleBg = '#10b981';
            textColor = '#047857';
            icon = <i className="fa-solid fa-check text-white" />;
          } else if (st.num === activeStep) {
            circleBg = '#4f46e5';
            textColor = '#4338ca';
          }

          return (
            <div
              key={st.num}
              className="d-flex flex-column align-items-center text-center position-relative"
              style={{ zIndex: 2, width: '24%' }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold shadow-sm"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: circleBg,
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                {icon}
              </div>
              <div className="mt-1 font-weight-bold" style={{ fontSize: '0.8rem', color: textColor }}>
                {st.title}
              </div>
              <div className="text-muted d-none d-sm-block" style={{ fontSize: '0.72rem' }}>
                {st.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusBadge;
