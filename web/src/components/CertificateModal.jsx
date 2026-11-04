import React, { useEffect } from 'react';
import { getQualityBadge } from '../utils/scoreCalculator';

const resolveSignatureUrl = (sig) => {
  if (!sig) return '';
  const str = String(sig).trim();
  if (!str) return '';
  if (str.startsWith('http') || str.startsWith('data:')) return str;
  return `/fileupload/signature/${str}`;
};

const cleanSchoolTitle = (name) => {
  if (!name) return '';
  return String(name).trim().replace(/^โรงเรียน\s*/, '');
};

const CertificateModal = ({
  plan,
  teacherFullName,
  schoolName,
  academicName,
  subjectAreaName,
  planScoreMap = {},
  scoreOverride = null,
  committeeProfiles = {},
  directorProfile = null,
  lookups = {},
  profile = null,
  onClose,
}) => {
  // Scope certificate print isolation strictly while CertificateModal is mounted
  useEffect(() => {
    document.body.classList.add('printing-certificate');
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('printing-certificate');
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  if (!plan) return null;

  const rawScore =
    scoreOverride !== null && scoreOverride !== undefined
      ? Number(scoreOverride)
      : Number(planScoreMap[String(plan.planid)] ?? 0);
  const validScore = Number.isFinite(rawScore) && rawScore > 0 ? Math.round(rawScore * 10) / 10 : null;
  const quality = validScore !== null ? getQualityBadge(validScore) : null;
  const isCompleted = String(plan.plan_status) === '7' && validScore !== null;

  const committees = [
    plan.committee1,
    plan.committee2,
    plan.committee3,
    plan.committee4,
    plan.committee5,
  ].filter(Boolean);

  const chairProfile = committees.length > 0 ? committeeProfiles[String(committees[0])] : null;
  const chairName = chairProfile
    ? `${lookups?.prefix?.[chairProfile.prefix] || ''}${chairProfile.name || ''} ${chairProfile.lastname || ''}`.trim()
    : '';
  const chairSigUrl = resolveSignatureUrl(chairProfile?.signature);

  const dirName = directorProfile
    ? `${lookups?.prefix?.[directorProfile.prefix] || ''}${directorProfile.name || ''} ${directorProfile.lastname || ''}`.trim()
    : '';
  const dirSigUrl = resolveSignatureUrl(directorProfile?.signature);

  const cleanSchool = cleanSchoolTitle(schoolName);
  const learningModelLabel =
    lookups?.learningModel?.[plan.learning_model] || plan.learning_model || 'Active Learning';

  return (
    <div
      className="certificate-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="ใบรายงานผลการนิเทศ ว.PA"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="certificate-paper">
        {/* Top Action Bar (No Print) */}
        <div className="d-flex justify-content-between align-items-center mb-4 no-print border-bottom pb-3 flex-wrap gap-2">
          <div>
            <h5 className="font-weight-bold m-0 text-dark">
              <i className="fa-solid fa-certificate text-warning mr-2"></i>
              ใบรายงานผลการนิเทศการจัดการเรียนรู้ (แบบรายงาน ว.PA)
            </h5>
            <small className="text-muted">
              เอกสารรับรองผลการประเมินแผนและคลิปการสอน สำหรับแนบประกอบ ว.PA
            </small>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!isCompleted}
              className="btn btn-primary font-weight-bold px-3 py-2"
              style={{ borderRadius: '10px' }}
              title={!isCompleted ? 'สามารถพิมพ์ได้เมื่อคณะกรรมการประเมินครบถ้วนแล้วเท่านั้น' : 'พิมพ์เอกสาร A4'}
            >
              <i className="fa-solid fa-print mr-1"></i> พิมพ์เอกสาร (A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-light border font-weight-bold px-3 py-2"
              style={{ borderRadius: '10px' }}
            >
              <i className="fa-solid fa-xmark mr-1"></i> ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {!isCompleted && (
          <div className="alert alert-warning no-print mb-3">
            <i className="fa-solid fa-clock mr-2"></i>
            แผนการสอนนี้ยังอยู่ระหว่างการประเมินของคณะกรรมการ (ยังไม่ครบทุกท่าน) จึงเป็นเพียงตัวอย่างก่อนออกใบรับรองจริง
          </div>
        )}

        {/* Official Certificate Formatted Paper */}
        <div className="certificate-double-border">
          <img src="/images/obec.png" alt="ตรา สพฐ." className="garuda-emblem" />

          <div className="text-center mb-4">
            <h4 className="font-weight-bold mb-1" style={{ fontSize: '1.4rem' }}>
              ใบรายงานผลการนิเทศการจัดการเรียนรู้
            </h4>
            <p className="mb-0 text-secondary" style={{ fontSize: '1.03rem' }}>
              ตามข้อตกลงในการพัฒนางาน (Performance Agreement: ว.PA)
            </p>
            <p className="text-muted small mb-0">
              สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
            </p>
          </div>

          <div className="mb-4" style={{ lineHeight: '1.9', fontSize: '1rem', fontFamily: 'var(--lmss-font-doc)' }}>
            <p className="mb-2">
              เอกสารฉบับนี้ให้ไว้เพื่อรับรองว่า <strong>{teacherFullName}</strong>{' '}
              ตำแหน่ง <strong>{lookups?.position?.[profile?.position_id] || 'ครู'}</strong>{' '}
              วิทยฐานะ <strong>{academicName || 'ไม่มีวิทยฐานะ'}</strong>
            </p>
            <p className="mb-2">
              สังกัด <strong>โรงเรียน{cleanSchool}</strong>{' '}
              กลุ่มสาระการเรียนรู้ <strong>{subjectAreaName}</strong>
            </p>
            <p className="mb-2">
              ได้รับการนิเทศ ติดตาม และประเมินผลการจัดการเรียนรู้ รายวิชา{' '}
              <strong>{plan.subject_name}</strong> รหัสวิชา <strong>{plan.subject_code}</strong>
            </p>
            <p className="mb-2">
              หน่วยการเรียนรู้ / ชื่อแผน: <strong>{plan.subject_name_plan || plan.subject_content || '-'}</strong>
            </p>
            <p className="mb-2">
              รูปแบบการจัดการเรียนรู้: <strong>{learningModelLabel}</strong> • ปีการศึกษา{' '}
              <strong>{plan.edu_year}</strong> ภาคเรียนที่ <strong>{plan.edu_term}</strong>
            </p>
          </div>

          <div
            className="p-3 border rounded mb-4 text-center"
            style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}
          >
            <p className="mb-1 text-secondary font-weight-bold">
              ผลการประเมินการจัดการเรียนรู้โดยคณะกรรมการนิเทศ
            </p>
            {validScore !== null ? (
              <>
                <h2 className="font-weight-bold text-primary mb-2">{validScore} / 100 คะแนน</h2>
                {quality && (
                  <span
                    className="badge px-3 py-2"
                    style={{
                      backgroundColor: quality.bg,
                      color: quality.color,
                      border: `1px solid ${quality.color}40`,
                      fontSize: '0.95rem',
                    }}
                  >
                    ระดับคุณภาพ: {quality.fullLabel}
                  </span>
                )}
              </>
            ) : (
              <h5 className="text-muted my-2">อยู่ระหว่างรวบรวมคะแนนจากคณะกรรมการ</h5>
            )}
          </div>

          <div className="mb-4 small">
            <p className="font-weight-bold mb-1">คณะกรรมการผู้ตรวจนิเทศและประเมินผล ({committees.length} ท่าน):</p>
            <ol className="pl-3 mb-0">
              {committees.map((cid, i) => {
                const cm = committeeProfiles[String(cid)];
                return (
                  <li key={`${cid}-${i}`} className="mb-1">
                    {cm
                      ? `${lookups?.prefix?.[cm.prefix] || ''}${cm.name} ${cm.lastname}`
                      : `กรรมการนิเทศ ท่านที่ ${i + 1}`}
                    {cm?.academic_id && lookups?.academic?.[cm.academic_id]
                      ? ` (${lookups.academic[cm.academic_id]})`
                      : ''}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="row text-center mt-4 pt-3">
            <div className="col-6">
              <div style={{ minHeight: '58px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {chairSigUrl ? (
                  <img
                    src={chairSigUrl}
                    alt="ลายเซ็นประธานกรรมการ"
                    style={{ maxHeight: '54px', maxWidth: '170px', objectFit: 'contain' }}
                  />
                ) : (
                  <p className="mb-1 text-muted">ลงชื่อ....................................................</p>
                )}
              </div>
              <p className="mb-1 font-weight-bold mt-1">
                ({chairName || '....................................................'})
              </p>
              <p className="text-muted small mb-0">ประธานคณะกรรมการนิเทศ</p>
            </div>

            <div className="col-6">
              <div style={{ minHeight: '58px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {dirSigUrl ? (
                  <img
                    src={dirSigUrl}
                    alt="ลายเซ็นผู้อำนวยการ"
                    style={{ maxHeight: '54px', maxWidth: '170px', objectFit: 'contain' }}
                  />
                ) : (
                  <p className="mb-1 text-muted">ลงชื่อ....................................................</p>
                )}
              </div>
              <p className="mb-1 font-weight-bold mt-1">
                ({dirName || '....................................................'})
              </p>
              <p className="text-muted small mb-0">ผู้อำนวยการโรงเรียน{cleanSchool}</p>
            </div>
          </div>

          <div className="mt-4 pt-2 border-top d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.74rem' }}>
            <span>รหัสอ้างอิงแผนการสอน: LMSS-{plan.planid}</span>
            <span>ออกโดยระบบนิเทศออนไลน์ สพม.พิษณุโลก อุตรดิตถ์</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateModal;
