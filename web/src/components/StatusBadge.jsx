import React from 'react';

/**
 * Metadata for all 7 plan statuses
 */
export const PLAN_STATUS_CONFIG = {
  '1': {
    label: 'รอผู้อำนวยการอนุมัติ',
    shortLabel: 'รอ ผอ. อนุมัติ',
    badgeClass: 'badge-warning',
    bgClass: 'bg-warning text-dark',
    icon: 'fa-solid fa-clock',
    step: 2, // At step 2 (Waiting for Director)
    color: '#f59e0b',
  },
  '2': {
    label: 'ผู้อำนวยการอนุมัติแล้ว',
    shortLabel: 'ผอ. อนุมัติแล้ว',
    badgeClass: 'badge-success',
    bgClass: 'bg-success text-white',
    icon: 'fa-solid fa-circle-check',
    step: 3, // Ready for Teaching Clip / Committee
    color: '#10b981',
  },
  '3': {
    label: 'ไม่อนุมัติ / กรุณาแก้ไขแผน',
    shortLabel: 'ส่งกลับแก้ไข',
    badgeClass: 'badge-danger',
    bgClass: 'bg-danger text-white',
    icon: 'fa-solid fa-rotate-left',
    step: 1, // Sent back to teacher
    color: '#ef4444',
  },
  '4': {
    label: 'แก้ไขแผนแล้ว รอ ผอ. อนุมัติ',
    shortLabel: 'ส่งแก้ไขแล้ว',
    badgeClass: 'badge-info',
    bgClass: 'bg-info text-white',
    icon: 'fa-solid fa-paper-plane',
    step: 2, // Resubmitted to Director
    color: '#06b6d4',
  },
  '5': {
    label: 'ส่งคลิป/บันทึกหลังสอนแล้ว',
    shortLabel: 'ส่งคลิปสอนแล้ว',
    badgeClass: 'badge-primary',
    bgClass: 'bg-primary text-white',
    icon: 'fa-solid fa-film',
    step: 3, // Evidence attached
    color: '#3b82f6',
  },
  '6': {
    label: 'คณะกรรมการกำลังประเมิน',
    shortLabel: 'กำลังประเมิน',
    badgeClass: 'badge-warning',
    bgClass: 'bg-warning text-dark',
    icon: 'fa-solid fa-user-pen',
    step: 4, // Evaluating
    color: '#f59e0b',
  },
  '7': {
    label: 'ประเมินเสร็จสิ้น',
    shortLabel: 'ประเมินเสร็จสิ้น',
    badgeClass: 'badge-success',
    bgClass: 'bg-success text-white',
    icon: 'fa-solid fa-award',
    step: 4, // Completed
    color: '#10b981',
  },
};

/**
 * StatusBadge Component
 * Displays a clean, standardized status badge with icon
 */
export const StatusBadge = ({ status, showIcon = true, short = false, customNote = '' }) => {
  const statusStr = String(status || '1');
  const config = PLAN_STATUS_CONFIG[statusStr] || {
    label: `สถานะ ${statusStr}`,
    shortLabel: `สถานะ ${statusStr}`,
    badgeClass: 'badge-secondary',
    icon: 'fa-solid fa-circle-info',
  };

  return (
    <div className="d-inline-flex flex-column align-items-start">
      <span
        className={`badge ${config.badgeClass} d-inline-flex align-items-center py-1 px-2`}
        style={{ fontSize: '0.82rem', fontWeight: 500, borderRadius: '4px' }}
      >
        {showIcon && <i className={`${config.icon} mr-1`} style={{ fontSize: '0.75rem' }}></i>}
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

/**
 * PlanTimelineStepper Component
 * Visualizes the 4-step progress for a plan
 */
export const PlanTimelineStepper = ({ currentStatus }) => {
  const statusStr = String(currentStatus || '1');
  const isRejected = statusStr === '3';

  // Determine current active step (1-4)
  // Step 1: ยื่นส่งแผน (Submitted)
  // Step 2: ผอ. ตรวจสอบ/อนุมัติ (Director)
  // Step 3: ส่งคลิป/บันทึกการสอน (Clip/Evidence)
  // Step 4: กรรมการประเมินผล (Evaluated)
  let activeStep = 1;
  if (['1', '4'].includes(statusStr)) activeStep = 2; // Waiting for director
  else if (statusStr === '2') activeStep = 3; // Approved, waiting for clip or evaluation
  else if (statusStr === '5') activeStep = 3; // Clip sent
  else if (statusStr === '6') activeStep = 4; // Under evaluation
  else if (statusStr === '7') activeStep = 4; // Complete

  const steps = [
    { num: 1, title: 'ส่งแผนการสอน', desc: 'ครูผู้สอนบันทึกข้อมูล' },
    { num: 2, title: 'ผอ. อนุมัติ', desc: isRejected ? 'ต้องแก้ไขแผน' : 'ตรวจสอบความถูกต้อง' },
    { num: 3, title: 'หลักฐานการสอน', desc: 'ส่งคลิป/บันทึกหลังสอน' },
    { num: 4, title: 'การประเมินผล', desc: statusStr === '7' ? 'ประเมินเสร็จสมบูรณ์' : 'กรรมการให้คะแนน' },
  ];

  return (
    <div className="plan-timeline-container py-2 px-3 my-2 bg-light rounded border">
      <div className="d-flex justify-content-between align-items-center position-relative">
        {/* Connector line */}
        <div
          className="position-absolute"
          style={{
            top: '15px',
            left: '30px',
            right: '30px',
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
            textColor = '#ef4444';
            icon = <i className="fa-solid fa-times text-white" />;
          } else if (st.num < activeStep || (st.num === 4 && statusStr === '7')) {
            circleBg = '#10b981';
            textColor = '#0f766e';
            icon = <i className="fa-solid fa-check text-white" />;
          } else if (st.num === activeStep) {
            circleBg = '#3b82f6';
            textColor = '#1d4ed8';
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
                  width: '30px',
                  height: '30px',
                  backgroundColor: circleBg,
                  color: '#fff',
                  fontSize: '0.85rem',
                  transition: 'all 0.3s',
                }}
              >
                {icon}
              </div>
              <div className="mt-1 font-weight-bold" style={{ fontSize: '0.8rem', color: textColor }}>
                {st.title}
              </div>
              <div className="text-muted d-none d-sm-block" style={{ fontSize: '0.7rem' }}>
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
