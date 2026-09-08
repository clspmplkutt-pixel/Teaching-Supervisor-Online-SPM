import React from 'react';

const CertificateModal = ({
  plan,
  teacherFullName,
  schoolName,
  academicName,
  subjectAreaName,
  planScoreMap,
  committeeProfiles,
  lookups,
  profile,
  onClose,
}) => {
  const planScore = planScoreMap[String(plan.planid)];
  const getQualityLabel = (score) => {
    if (score >= 90) return 'ดีเยี่ยม (Excellent)';
    if (score >= 80) return 'ดีมาก (Very Good)';
    if (score >= 70) return 'ดี (Good)';
    if (score >= 60) return 'พอใช้ (Fair)';
    return 'ควรปรับปรุง';
  };

  return (
    <div className="certificate-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="certificate-paper">
        {/* Modal Actions Bar (No Print) */}
        <div className="d-flex justify-content-between align-items-center mb-4 no-print border-bottom pb-3">
          <div>
            <h5 className="font-weight-bold m-0 text-dark">
              <i className="fa-solid fa-certificate text-warning me-2"></i>
              ใบรายงานผลการนิเทศการจัดการเรียนรู้ (แบบรายงาน ว.PA)
            </h5>
            <small className="text-muted">เอกสารรับรองสำหรับแนบประกอบการประเมินวิทยฐานะ</small>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary font-weight-bold px-3 py-2"
              style={{ borderRadius: '10px' }}
            >
              <i className="fa-solid fa-print me-1"></i> พิมพ์เอกสาร (Print A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-light border font-weight-bold px-3 py-2"
              style={{ borderRadius: '10px' }}
            >
              <i className="fa-solid fa-xmark me-1"></i> ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {/* Official Certificate Formatted View */}
        <div className="certificate-double-border">
          <img src="/images/obec.png" alt="Emblem" className="garuda-emblem" />

          <div className="text-center mb-4">
            <h4 className="font-weight-bold mb-1" style={{ fontSize: '1.4rem' }}>
              ใบรายงานผลการนิเทศการจัดการเรียนรู้
            </h4>
            <p className="mb-0 text-secondary" style={{ fontSize: '1.05rem' }}>
              ตามข้อตกลงในการพัฒนางาน (Performance Agreement: PA)
            </p>
            <p className="text-muted small">สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา</p>
          </div>

          <div className="mb-4" style={{ lineHeight: '1.9', fontSize: '1rem' }}>
            <p className="mb-2">
              เอกสารฉบับนี้ให้ไว้เพื่อรับรองว่า <strong>ครู{teacherFullName}</strong> ตำแหน่ง <strong>{lookups?.position?.[profile?.position_id] || 'ครู'}</strong> วิทยฐานะ <strong>{academicName}</strong>
            </p>
            <p className="mb-2">
              สังกัด <strong>โรงเรียน{schoolName}</strong> กลุ่มสาระการเรียนรู้ <strong>{subjectAreaName}</strong>
            </p>
            <p className="mb-2">
              ได้รับการนิเทศติดตามการจัดการเรียนรู้ รายวิชา <strong>{plan.subject_name}</strong> รหัสวิชา <strong>{plan.subject_code}</strong>
            </p>
            <p className="mb-2">
              หน่วยการเรียนรู้/เรื่อง: <strong>{plan.subject_name_plan || plan.subject_content}</strong>
            </p>
            <p className="mb-2">
              รูปแบบการจัดการเรียนรู้: <strong>{plan.learning_model || 'Active Learning'}</strong> • ปีการศึกษา <strong>{plan.edu_year}</strong> ภาคเรียนที่ <strong>{plan.edu_term}</strong>
            </p>
          </div>

          <div className="p-3 border rounded mb-4 text-center" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
            <p className="mb-1 text-secondary font-weight-bold">ผลการประเมินการจัดการเรียนรู้โดยคณะกรรมการ</p>
            <h2 className="font-weight-bold text-primary mb-1">
              {planScore || 100} / 100 คะแนน
            </h2>
            <span className="badge bg-success px-3 py-2 fs-6">
              ระดับคุณภาพ: {getQualityLabel(planScore || 100)}
            </span>
          </div>

          <div className="mb-4 small">
            <p className="font-weight-bold mb-1">คณะกรรมการผู้ตรวจนิเทศและประเมินผล:</p>
            <ol className="ps-3 mb-0">
              {[plan.committee1, plan.committee2, plan.committee3].filter(Boolean).map((cid, i) => {
                const cm = committeeProfiles[String(cid)];
                return (
                  <li key={cid} className="mb-1">
                    {cm ? `${lookups?.prefix?.[cm.prefix] || ''}${cm.name} ${cm.lastname}` : `กรรมการนิเทศ ${i + 1}`}
                    {cm?.academic_id && ` (${lookups?.academic?.[cm.academic_id] || ''})`}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="row text-center mt-5 pt-3">
            <div className="col-6">
              <p className="mb-4">ลงชื่อ..........................................................</p>
              <p className="mb-1 font-weight-bold">(..........................................................)</p>
              <p className="text-muted small">ประธานคณะกรรมการนิเทศ</p>
            </div>
            <div className="col-6">
              <p className="mb-4">ลงชื่อ..........................................................</p>
              <p className="mb-1 font-weight-bold">(..........................................................)</p>
              <p className="text-muted small">ผู้อำนวยการโรงเรียน{schoolName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateModal;
