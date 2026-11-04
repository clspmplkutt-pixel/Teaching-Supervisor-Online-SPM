import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { generateEvaluationResultMessage, showLineShareDialog } from '../utils/lineNotifyHelper';
import {
  getYouTubeWatchUrl,
  getYouTubeEmbedUrl,
  calculatePlanScoreFromRows,
  getQualityBadge
} from '../utils/scoreCalculator';

const CertificateModal = lazy(() => import('../components/CertificateModal'));

// Print styles injected once
const PRINT_STYLE_ID = 'view-scoring-print-style';
const injectPrintStyle = () => {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.innerHTML = `
    @media print {
      .main-header, .main-sidebar, .content-header,
      .footer, .no-print, .btn, .alert { display: none !important; }
      .content-wrapper { margin-left: 0 !important; padding: 0 !important; background: #fff !important; }
      .card { border: none !important; box-shadow: none !important; }
      .card-header { background: #fff !important; color: #000 !important; border-bottom: 2px solid #000 !important; }
      .card-body { padding: 0 !important; }
      body { font-size: 13px !important; color: #000 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; }
      th, td { border: 1px solid #444 !important; padding: 6px 8px !important; }
      .table-bordered th, .table-bordered td { border: 1px solid #444 !important; }
      .bg-official-print { background-color: #f8fafc !important; color: #000 !important; }
      h3, h4, h5 { color: #000 !important; font-weight: bold !important; }
      .print-page-break { page-break-after: always; }
      .official-header { display: block !important; margin-bottom: 15px !important; text-align: center !important; }
    }
  `;
  document.head.appendChild(style);
};

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

// แปลงวันที่เป็นรูปแบบไทย (dd เดือน พ.ศ.)
const formatThaiDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

// แปลง Google Drive URL ให้ embed ได้
const convertDriveUrl = (url) => {
  if (!url) return '';
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (fileMatch) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  }
  const ucMatch = url.match(/[?&]id=([^&]+)/);
  if (ucMatch && url.includes('drive.google.com')) {
    return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  }
  return url;
};

// แสดงลายเซ็นจาก URL หรือ path
const SignatureImage = ({ src, alt }) => {
  const [imgError, setImgError] = useState(false);
  if (!src) {
    return (
      <div style={{
        width: '180px', height: '65px', border: '1px dashed #cbd5e1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#94a3b8', fontSize: '12px', margin: '0 auto', borderRadius: '4px'
      }}>
        ยังไม่มีลายเซ็นในระบบ
      </div>
    );
  }
  let url;
  if (String(src).startsWith('http')) {
    url = convertDriveUrl(src);
  } else {
    url = `/fileupload/signature/${src}`;
  }

  if (imgError) {
    return (
      <div style={{ textAlign: 'center', margin: '0 auto' }}>
        <a
          href={String(src).startsWith('http') ? src : `/fileupload/signature/${src}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: '12px', color: '#0284c7' }}
        >
          <i className="fa-solid fa-signature"></i> ดูลายเซ็น
        </a>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt || 'signature'}
      style={{ maxWidth: '180px', maxHeight: '65px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
      onError={() => setImgError(true)}
    />
  );
};

const ViewScoring = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [directorProfile, setDirectorProfile] = useState(null);
  const [committeeProfiles, setCommitteeProfiles] = useState([]);
  const [policySide1, setPolicySide1] = useState([]);
  const [policySide2, setPolicySide2] = useState([]);
  const [scores, setScores] = useState([]);
  const [showCert, setShowCert] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const [lookups, setLookups] = useState({
    academic: {},
    teachSubject: {},
    gradeLevel: {},
    competency: {},
    ability21: {},
    desirable: {},
    school: {},
    subjectType: {},
    prefix: {},
    position: {},
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!planid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: planData } = await supabase
          .from('tbl_sendplan')
          .select('*')
          .eq('planid', Number(planid))
          .maybeSingle();

        if (!planData) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: teacherData } = await supabase
          .from('tbl_Users')
          .select('*')
          .eq('people_id', planData.people_id)
          .maybeSingle();

        const academicId = teacherData?.academic_id || '';

        const [
          policy1Res, policy2Res, scoreRes,
          academicRes, teachSubjectRes, gradeRes,
          competencyRes, abilityRes, desirableRes,
          schoolRes, subjectTypeRes, prefixRes, positionRes,
          directorRes,
        ] = await Promise.all([
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '1').order('auto_id', { ascending: true }),
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '2').order('auto_id', { ascending: true }),
          supabase.from('tbl_sendplan_score').select('planid, policy_id, score_weight, score, supervision').eq('planid', String(planid)),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_system_Competency').select('competency_id, competency_name'),
          supabase.from('tbl_ability21').select('ability21_id, ability21_name_th'),
          supabase.from('tbl_system_Desirable').select('desirable_id, desirable_name'),
          supabase.from('tbl_school').select('school_id, school_name'),
          supabase.from('tbl_system_SubjectType').select('subjecttype_id, subjecttype_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name'),
          // Fetch school director
          planData.school_code ? supabase.from('tbl_Users').select('*').eq('school', planData.school_code).eq('position_id', '10007').maybeSingle() : Promise.resolve({ data: null }),
        ]);

        const academicMap = {};
        academicRes.data?.forEach((a) => { academicMap[a.academic_id] = a.academic_standing; });
        const teachSubjectMap = {};
        teachSubjectRes.data?.forEach((t) => { teachSubjectMap[t.teach_subject_id] = t.teach_subject; });
        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });
        const competencyMap = {};
        competencyRes.data?.forEach((c) => { competencyMap[c.competency_id] = c.competency_name; });
        const abilityMap = {};
        abilityRes.data?.forEach((a) => { abilityMap[a.ability21_id] = a.ability21_name_th; });
        const desirableMap = {};
        desirableRes.data?.forEach((d) => { desirableMap[d.desirable_id] = d.desirable_name; });
        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });
        const subjectTypeMap = {};
        subjectTypeRes.data?.forEach((t) => { subjectTypeMap[t.subjecttype_id] = t.subjecttype_name; });
        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });
        const positionMap = {};
        positionRes.data?.forEach((pos) => { positionMap[pos.position_id] = pos.position_name; });

        // ดึงข้อมูลกรรมการ (people_id, name, lastname, prefix, academic_id, signature, position_id)
        const committeeIds = [
          planData.committee1, planData.committee2, planData.committee3,
          planData.committee4, planData.committee5,
        ].filter(Boolean);

        let cProfiles = [];
        if (committeeIds.length > 0) {
          const { data: cData } = await supabase
            .from('tbl_Users')
            .select('people_id, name, lastname, prefix, academic_id, signature, position_id')
            .in('people_id', committeeIds);
          const cMap = {};
          (cData || []).forEach((u) => { cMap[u.people_id] = u; });
          cProfiles = committeeIds.map((id) => cMap[id] || { people_id: id });
        }

        if (mounted) {
          setPlan(planData);
          setTeacher(teacherData || null);
          setDirectorProfile(directorRes.data || null);
          setPolicySide1(policy1Res.data || []);
          setPolicySide2(policy2Res.data || []);
          setScores(scoreRes.data || []);
          setCommitteeProfiles(cProfiles);
          setLookups({
            academic: academicMap,
            teachSubject: teachSubjectMap,
            gradeLevel: gradeMap,
            competency: competencyMap,
            ability21: abilityMap,
            desirable: desirableMap,
            school: schoolMap,
            subjectType: subjectTypeMap,
            prefix: prefixMap,
            position: positionMap,
          });
        }
      } catch (err) {
        console.error('ViewScoring load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [planid]);

  const committeeList = useMemo(() => {
    if (!plan) return [];
    return [plan.committee1, plan.committee2, plan.committee3, plan.committee4, plan.committee5].filter(Boolean);
  }, [plan]);

  const committeeProfileMap = useMemo(() => {
    const map = {};
    committeeProfiles.forEach((cp) => {
      if (cp?.people_id) map[cp.people_id] = cp;
    });
    return map;
  }, [committeeProfiles]);

  const scorePassThreshold = useMemo(() => {
    const academicId = teacher?.academic_id;
    if (academicId === '15' || academicId === '99') return 65;
    if (academicId === '16') return 70;
    if (academicId === '17') return 75;
    if (academicId === '18') return 80;
    return 65; // เกณฑ์เริ่มต้นสำหรับครูผู้ช่วย/ครู
  }, [teacher]);

  // Standard calculation via scoreCalculator
  const calcResult = useMemo(() => {
    return calculatePlanScoreFromRows(scores);
  }, [scores]);

  const scoreMap = useMemo(() => {
    const map = {};
    scores.forEach((s) => {
      const key = `${s.policy_id}_${s.supervision}`;
      map[key] = s.score_weight ?? s.score ?? 0;
    });
    return map;
  }, [scores]);

  // Average per indicator only considering submitted scores for that cell
  const getIndicatorAvg = (autoId) => {
    const vals = [];
    committeeList.forEach((c) => {
      const val = scoreMap[`${autoId}_${c}`];
      if (val !== undefined && val !== null) {
        vals.push(Number(val));
      }
    });
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const policySide1Totals = useMemo(() => {
    let sum = 0;
    policySide1.forEach((p) => {
      sum += getIndicatorAvg(p.auto_id);
    });
    return sum;
  }, [policySide1, scoreMap, committeeList]);

  const policySide2Totals = useMemo(() => {
    let sum = 0;
    policySide2.forEach((p) => {
      sum += getIndicatorAvg(p.auto_id);
    });
    return sum;
  }, [policySide2, scoreMap, committeeList]);

  const overallAverage = useMemo(() => {
    if (calcResult.totalScore > 0) return calcResult.totalScore;
    if (policySide1Totals > 0 && policySide2Totals > 0) {
      return (policySide1Totals + policySide2Totals) / 2;
    }
    return policySide1Totals || policySide2Totals || 0;
  }, [calcResult.totalScore, policySide1Totals, policySide2Totals]);

  const qualityBadge = useMemo(() => {
    return getQualityBadge(overallAverage);
  }, [overallAverage]);

  const isPassed = overallAverage >= scorePassThreshold;

  const evaluatedCommitteeCount = useMemo(() => {
    return calcResult.evaluatorCount || committeeList.filter((c) => {
      return policySide1.some((p) => scoreMap[`${p.auto_id}_${c}`] !== undefined);
    }).length;
  }, [calcResult.evaluatorCount, committeeList, policySide1, scoreMap]);

  const competencyNames = useMemo(() => {
    const list = (plan?.competency || '').split(',').filter(Boolean);
    return list.map((id, idx) => `${idx + 1}. ${lookups.competency[id] || id}`);
  }, [plan, lookups]);

  const abilityNames = useMemo(() => {
    const list = (plan?.ability21 || '').split(',').filter(Boolean);
    return list.map((id) => lookups.ability21[id] || id).join(', ');
  }, [plan, lookups]);

  const desirableNames = useMemo(() => {
    const list = (plan?.desirable || '').split(',').filter(Boolean);
    return list.map((id) => lookups.desirable[id] || id).join(', ');
  }, [plan, lookups]);

  // Inject print CSS on first render
  useEffect(() => { injectPrintStyle(); }, []);

  // ดึงข้อเสนอแนะกรรมการจาก plan (committee1_comment ... committee5_comment)
  const committeeComments = useMemo(() => {
    if (!plan || !committeeProfiles.length) return [];
    return committeeProfiles.map((cp, idx) => ({
      label: `กรรมการคนที่ ${idx + 1} (${lookups.prefix[cp.prefix] || ''}${cp.name || ''} ${cp.lastname || ''})`,
      text: plan[`committee${idx + 1}_comment`] || '',
    })).filter((c) => c.text);
  }, [plan, committeeProfiles, lookups.prefix]);

  const handleShareLine = () => {
    const teacherPrefix = lookups.prefix[teacher?.prefix] || '';
    const teacherName = `${teacherPrefix}${teacher?.name || ''} ${teacher?.lastname || ''}`.trim();
    const schoolName = lookups.school[plan.school_code] || '';

    const lineMsg = generateEvaluationResultMessage({
      teacherName,
      schoolName,
      subjectName: plan.subject_name,
      subjectCode: plan.subject_code,
      planName: plan.subject_name_plan,
      totalScore: overallAverage,
      qualityLabel: qualityBadge.label,
      isPassed,
      planId: plan.planid,
    });

    showLineShareDialog({
      title: 'แชร์ผลการประเมินแผนการสอน',
      subtitle: 'ส่งรายงานสรุปผลคะแนน ระดับคุณภาพ และเกียรติบัตร เข้ากลุ่ม LINE ได้ทันที',
      messageText: lineMsg,
    });
  };

  if (loading) {
    return (
      <LoadingSpinner
        title="ดูคะแนนการประเมิน"
        message="กำลังโหลดข้อมูลการประเมิน กรุณารอสักครู่..."
      />
    );
  }

  if (!plan) {
    return (
      <EmptyState
        title="ดูคะแนนการประเมิน"
        message="ไม่พบข้อมูลแผนการสอน หรือรหัสแผนไม่ถูกต้อง"
        type="warning"
      />
    );
  }

  const teacherFullName = `${lookups.prefix[teacher?.prefix] || ''}${teacher?.name || ''} ${teacher?.lastname || ''}`.trim();
  const schoolName = lookups.school[plan.school_code] || '';
  const academicName = lookups.academic[teacher?.academic_id] || '-';
  const subjectAreaName = lookups.teachSubject[plan.teach_subject_id] || '-';
  const embedVideoUrl = plan.plan_clip ? getYouTubeEmbedUrl(plan.plan_clip) : null;
  const watchVideoUrl = plan.plan_clip ? getYouTubeWatchUrl(plan.plan_clip) : null;
  const isCompleted = String(plan.plan_status) === '7';

  return (
    <div className="view-scoring container-fluid py-3">
      {/* ─── TOP NAVIGATION & RETURN (NO PRINT) ─── */}
      <div className="d-flex align-items-center justify-content-between mb-3 no-print">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-outline-secondary btn-sm px-3 shadow-sm font-weight-bold"
          style={{ borderRadius: '20px' }}
        >
          <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
        </button>

        <div className="d-flex align-items-center gap-2">
          <Link
            to="/statusplan"
            className="btn btn-light btn-sm border text-muted px-3"
            style={{ borderRadius: '20px' }}
          >
            <i className="fa-solid fa-folder-open mr-1"></i> รายการแผนทั้งหมด
          </Link>
        </div>
      </div>

      {/* ─── TOP EXECUTIVE SCORE & ACTION CARD (NO PRINT) ─── */}
      <div className="card no-print border-0 shadow-sm mb-4" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff' }}>
        <div className="card-body p-4">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="badge badge-warning font-weight-bold px-3 py-1" style={{ borderRadius: '20px', fontSize: '13px' }}>
                  <i className="fa-solid fa-file-signature mr-1"></i> รายงานผลการประเมิน ว.PA
                </span>
                <span className="badge badge-light text-dark px-3 py-1" style={{ borderRadius: '20px', fontSize: '13px' }}>
                  รหัสแผน #{plan.planid}
                </span>
                {isCompleted ? (
                  <span className="badge badge-success px-3 py-1" style={{ borderRadius: '20px', fontSize: '13px' }}>
                    <i className="fa-solid fa-check-double mr-1"></i> ประเมินเสร็จสมบูรณ์
                  </span>
                ) : (
                  <span className="badge badge-info px-3 py-1" style={{ borderRadius: '20px', fontSize: '13px' }}>
                    <i className="fa-solid fa-hourglass-half mr-1"></i> กำลังอยู่ระหว่างการประเมิน
                  </span>
                )}
              </div>
              <h3 className="font-weight-bold mb-1" style={{ fontSize: '1.45rem', letterSpacing: '-0.5px' }}>
                {plan.subject_name_plan || plan.subject_name}
              </h3>
              <p className="mb-2 text-light" style={{ opacity: 0.9, fontSize: '0.95rem' }}>
                <i className="fa-solid fa-chalkboard-user mr-1 text-warning"></i> <strong>{teacherFullName}</strong> • วิทยฐานะ {academicName} • โรงเรียน{schoolName}
              </p>
              <div className="d-flex gap-3 text-light small flex-wrap" style={{ opacity: 0.85 }}>
                <span><i className="fa-solid fa-book-open mr-1"></i> {plan.subject_name} ({plan.subject_code})</span>
                <span><i className="fa-solid fa-graduation-cap mr-1"></i> ชั้น {lookups.gradeLevel[plan.grade_level_id] || '-'}</span>
                <span><i className="fa-solid fa-users mr-1"></i> กรรมการประเมินแล้ว {evaluatedCommitteeCount} / {committeeList.length} ท่าน</span>
              </div>
            </div>

            <div className="col-lg-5 mt-3 mt-lg-0">
              <div className="d-flex justify-content-lg-end align-items-center gap-3">
                <div className="text-center p-3 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', minWidth: '130px', borderRadius: '12px' }}>
                  <div className="small text-light text-uppercase font-weight-bold" style={{ opacity: 0.8, fontSize: '11px' }}>คะแนนเฉลี่ยรวม</div>
                  <div className="font-weight-bold" style={{ fontSize: '2rem', lineHeight: '1.1', color: '#38bdf8' }}>
                    {overallAverage.toFixed(2)}
                  </div>
                  <div className="small text-light font-weight-bold mt-1" style={{ fontSize: '12px' }}>
                    ระดับ: <span className="text-warning">{qualityBadge.label}</span>
                  </div>
                </div>

                <div className="text-center p-3 rounded" style={{ background: isPassed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(8px)', minWidth: '130px', borderRadius: '12px' }}>
                  <div className="small text-light text-uppercase font-weight-bold" style={{ opacity: 0.8, fontSize: '11px' }}>ผลการพิจารณา</div>
                  <div className="font-weight-bold mt-1" style={{ fontSize: '1.3rem', color: isPassed ? '#4ade80' : '#f87171' }}>
                    {isPassed ? '✓ ผ่านเกณฑ์' : '✗ ไม่ผ่าน'}
                  </div>
                  <div className="small text-light mt-1" style={{ fontSize: '11px', opacity: 0.85 }}>
                    เกณฑ์ร้อยละ {scorePassThreshold}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="d-flex flex-wrap gap-2 mt-4 pt-3 border-top" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            <button
              type="button"
              className="btn btn-primary font-weight-bold px-3 py-2 shadow-sm"
              style={{ borderRadius: '10px' }}
              onClick={() => window.print()}
            >
              <i className="fa-solid fa-print mr-1"></i> พิมพ์รายงานสรุปผล (A4)
            </button>

            {isCompleted ? (
              <button
                type="button"
                className="btn btn-warning font-weight-bold px-3 py-2 shadow-sm text-dark"
                style={{ borderRadius: '10px' }}
                onClick={() => setShowCert(true)}
              >
                <i className="fa-solid fa-certificate mr-1"></i> ดูเกียรติบัตรออนไลน์ (ว.PA)
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline-light font-weight-bold px-3 py-2"
                style={{ borderRadius: '10px', opacity: 0.7 }}
                disabled
                title="จะสามารถเปิดดูเกียรติบัตรได้เมื่อคณะกรรมการประเมินเสร็จสมบูรณ์ (สถานะ 7)"
              >
                <i className="fa-solid fa-lock mr-1"></i> เกียรติบัตร (รอผลประเมินครบ)
              </button>
            )}

            <button
              type="button"
              className="btn btn-success font-weight-bold px-3 py-2 shadow-sm"
              style={{ backgroundColor: '#06C755', borderColor: '#06C755', borderRadius: '10px' }}
              onClick={handleShareLine}
            >
              <i className="fa-brands fa-line mr-1"></i> แชร์ผลคะแนนเข้า LINE
            </button>

            {embedVideoUrl && (
              <button
                type="button"
                className={`btn ${showVideo ? 'btn-info' : 'btn-light'} font-weight-bold px-3 py-2 shadow-sm`}
                style={{ borderRadius: '10px' }}
                onClick={() => setShowVideo(!showVideo)}
              >
                <i className="fa-brands fa-youtube mr-1 text-danger"></i> {showVideo ? 'ซ่อนคลิปการสอน' : 'เปิดดูคลิปการสอน'}
              </button>
            )}

            {plan.plan_file && (
              <a
                href={plan.plan_file}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-light font-weight-bold px-3 py-2 shadow-sm"
                style={{ borderRadius: '10px' }}
              >
                <i className="fa-solid fa-file-pdf mr-1 text-danger"></i> ดูไฟล์แผนการสอน (PDF)
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ─── COLLAPSIBLE VIDEO PLAYER CARD (NO PRINT) ─── */}
      {showVideo && embedVideoUrl && (
        <div className="card shadow-sm border-0 mb-4 no-print" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="font-weight-bold mb-0">
              <i className="fa-brands fa-youtube text-danger mr-2"></i> วิดีโอคลิปการจัดการเรียนรู้ (YouTube)
            </h5>
            <div className="d-flex align-items-center gap-2">
              {watchVideoUrl && (
                <a
                  href={watchVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-light"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> เปิดใน YouTube
                </a>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary text-light"
                onClick={() => setShowVideo(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div className="card-body p-0 bg-black">
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
              <iframe
                title="Teaching Video Clip"
                src={embedVideoUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── TEACHER SELF-REFLECTION AFTER TEACHING (NO PRINT) ─── */}
      {plan.plan_after_teaching && (
        <div className="card shadow-sm border-0 mb-4 no-print" style={{ borderRadius: '12px', borderLeft: '5px solid #3b82f6' }}>
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-comment-dots text-primary mr-2"></i> บันทึกหลังการจัดกิจกรรมการเรียนรู้ของครูผู้สอน
            </h5>
          </div>
          <div className="card-body p-4" style={{ whiteSpace: 'pre-line', lineHeight: '1.8', fontSize: '14px', color: '#1e293b', background: '#f8fafc' }}>
            {plan.plan_after_teaching}
          </div>
        </div>
      )}

      {/* ─── OFFICIAL PRINT HEADER (Displayed on print & official view) ─── */}
      <div className="text-center mb-3 official-header" style={{ display: 'none' }}>
        <img src="/images/obec.png" alt="OBEC Emblem" style={{ width: '65px', height: 'auto', marginBottom: '8px' }} />
        <h4 className="font-weight-bold mb-1" style={{ fontSize: '16px' }}>
          แบบสรุปผลการประเมินตำแหน่งและวิทยฐานะ ด้านที่ 1 และ ด้านที่ 2
        </h4>
        <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
          สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
        </p>
      </div>

      {/* ─── MAIN EVALUATION REPORT CARD ─── */}
      <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
          <h5 className="font-weight-bold mb-0 text-dark">
            <i className="fa-solid fa-list-check text-primary mr-2"></i> รายละเอียดผลการประเมินแผนการจัดการเรียนรู้
          </h5>
          <span className="badge badge-light border text-muted no-print">
            ปีการศึกษา {plan.edu_year} ภาคเรียนที่ {plan.edu_term}
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead>
                <tr className="bg-light">
                  <th colSpan={3 + committeeList.length} className="p-3" style={{ lineHeight: '1.7', fontSize: '13.5px' }}>
                    <div className="font-weight-bold text-dark mb-1" style={{ fontSize: '15px' }}>
                      แบบสรุปผลการประเมินตำแหน่งและวิทยฐานะ ด้านที่ 1 และ ด้านที่ 2
                    </div>
                    <div>
                      ผู้ขอรับการประเมิน : <strong>{teacherFullName}</strong>&nbsp;&nbsp;&nbsp;&nbsp;
                      วิทยฐานะ : <strong>{academicName}</strong>&nbsp;&nbsp;&nbsp;&nbsp;
                      สถานศึกษา : <strong>โรงเรียน{schoolName}</strong>
                    </div>
                    <div className="text-muted" style={{ fontSize: '12.5px' }}>
                      สังกัด สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
                    </div>
                  </th>
                </tr>
                <tr>
                  <td colSpan={3 + committeeList.length} className="p-3" style={{ lineHeight: '1.8', fontSize: '13px', background: '#fafafa' }}>
                    <div>
                      <strong>กลุ่มสาระการเรียนรู้ :</strong> {subjectAreaName} &nbsp;&nbsp;&nbsp;&nbsp;
                      <strong>ระดับชั้น :</strong> {lookups.gradeLevel[plan.grade_level_id] || '-'} &nbsp;&nbsp;&nbsp;&nbsp;
                      <strong>ประเภทวิชา :</strong> {lookups.subjectType[plan.subject_type] || plan.subject_type || 'พื้นฐาน'}
                    </div>
                    <div>
                      <strong>ชื่อวิชา :</strong> {plan.subject_name} ({plan.subject_code}) &nbsp;&nbsp;&nbsp;&nbsp;
                      <strong>ชื่อหน่วยการเรียนรู้ :</strong> {plan.subject_content || '-'} &nbsp;&nbsp;&nbsp;&nbsp;
                      <strong>ชื่อแผนการจัดการเรียนรู้ :</strong> <span className="text-primary font-weight-bold">{plan.subject_name_plan}</span>
                    </div>
                    <div>
                      <strong>วันที่จัดการเรียนรู้ :</strong> {plan.teach_date} [เวลา {plan.teach_timestart} - {plan.teach_timeend} ({plan.teach_minute} นาที)] &nbsp;&nbsp;&nbsp;&nbsp;
                      <strong>วิธีการสอน :</strong> {plan.learning_model || '-'}
                    </div>
                    {competencyNames.length > 0 && (
                      <div>
                        <strong>สมรรถนะสำคัญ :</strong> {competencyNames.join(' • ')}
                      </div>
                    )}
                    {(abilityNames || desirableNames) && (
                      <div>
                        {abilityNames && <span><strong>ทักษะในศตวรรษที่ 21 :</strong> {abilityNames} &nbsp;&nbsp;&nbsp;&nbsp;</span>}
                        {desirableNames && <span><strong>คุณลักษณะอันพึงประสงค์ :</strong> {desirableNames}</span>}
                      </div>
                    )}
                  </td>
                </tr>

                {/* ── ด้านที่ 1 ── */}
                <tr style={{ background: '#e0f2fe' }}>
                  <td colSpan={3 + committeeList.length} className="py-2 px-3">
                    <strong className="text-primary" style={{ fontSize: '14.5px' }}>
                      <i className="fa-solid fa-chalkboard-user mr-2"></i> ด้านที่ 1 ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน
                    </strong>
                  </td>
                </tr>
                <tr className="text-center bg-light">
                  <th style={{ width: '45%' }}>ตัวชี้วัดการประเมิน</th>
                  {committeeList.map((_, idx) => (
                    <th key={idx} style={{ width: `${35 / (committeeList.length || 1)}%` }}>
                      กรรมการคนที่ {idx + 1}
                    </th>
                  ))}
                  <th style={{ width: '20%' }}>คะแนนเฉลี่ย</th>
                </tr>
              </thead>
              <tbody>
                {policySide1.map((item) => {
                  const values = committeeList.map((c) => scoreMap[`${item.auto_id}_${c}`]);
                  const avg = getIndicatorAvg(item.auto_id);
                  return (
                    <tr key={`s1-${item.auto_id}`}>
                      <td className="align-middle px-3" style={{ fontSize: '13px' }}>
                        {item.text}
                      </td>
                      {values.map((v, idx) => (
                        <td key={idx} className="text-center align-middle font-weight-bold" style={{ fontSize: '13px' }}>
                          {v !== undefined && v !== null ? Number(v).toFixed(2) : '—'}
                        </td>
                      ))}
                      <td className="text-center align-middle font-weight-bold text-primary" style={{ fontSize: '13px' }}>
                        {avg.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-light font-weight-bold">
                  <td className="text-center align-middle">รวมคะแนนด้านที่ 1</td>
                  {committeeList.map((_, idx) => (
                    <td key={idx} className="text-center align-middle">—</td>
                  ))}
                  <td className="text-center align-middle text-primary font-weight-bold" style={{ fontSize: '15px' }}>
                    {policySide1Totals.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3 + committeeList.length} className="p-3" style={{ background: '#f8fafc', fontSize: '13px' }}>
                    ได้คะแนนร้อยละ <strong>{policySide1Totals.toFixed(2)}</strong> อยู่ในระดับ <strong>{getQualityBadge(policySide1Totals).label}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
                    ผลการพิจารณา : {policySide1Totals >= scorePassThreshold ? (
                      <span className="text-success font-weight-bold"><i className="fa-regular fa-square-check mr-1"></i> ผ่านเกณฑ์</span>
                    ) : (
                      <span className="text-danger font-weight-bold"><i className="fa-regular fa-circle-xmark mr-1"></i> ไม่ผ่านเกณฑ์</span>
                    )} (เกณฑ์ร้อยละ {scorePassThreshold})
                  </td>
                </tr>

                {/* ── ด้านที่ 2 ── */}
                <tr style={{ background: '#e0f2fe' }}>
                  <td colSpan={3 + committeeList.length} className="py-2 px-3">
                    <strong className="text-primary" style={{ fontSize: '14.5px' }}>
                      <i className="fa-solid fa-graduation-cap mr-2"></i> ด้านที่ 2 ด้านผลลัพธ์การเรียนรู้ของผู้เรียน
                    </strong>
                  </td>
                </tr>
                <tr className="text-center bg-light">
                  <th>ตัวชี้วัดการประเมิน</th>
                  {committeeList.map((_, idx) => (
                    <th key={idx}>กรรมการคนที่ {idx + 1}</th>
                  ))}
                  <th>คะแนนเฉลี่ย</th>
                </tr>
                {policySide2.map((item) => {
                  const values = committeeList.map((c) => scoreMap[`${item.auto_id}_${c}`]);
                  const avg = getIndicatorAvg(item.auto_id);
                  return (
                    <tr key={`s2-${item.auto_id}`}>
                      <td className="align-middle px-3" style={{ fontSize: '13px' }}>
                        {item.text}
                      </td>
                      {values.map((v, idx) => (
                        <td key={idx} className="text-center align-middle font-weight-bold" style={{ fontSize: '13px' }}>
                          {v !== undefined && v !== null ? Number(v).toFixed(2) : '—'}
                        </td>
                      ))}
                      <td className="text-center align-middle font-weight-bold text-primary" style={{ fontSize: '13px' }}>
                        {avg.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-light font-weight-bold">
                  <td className="text-center align-middle">รวมคะแนนด้านที่ 2</td>
                  {committeeList.map((_, idx) => (
                    <td key={idx} className="text-center align-middle">—</td>
                  ))}
                  <td className="text-center align-middle text-primary font-weight-bold" style={{ fontSize: '15px' }}>
                    {policySide2Totals.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3 + committeeList.length} className="p-3" style={{ background: '#f8fafc', fontSize: '13px' }}>
                    ได้คะแนนร้อยละ <strong>{policySide2Totals.toFixed(2)}</strong> อยู่ในระดับ <strong>{getQualityBadge(policySide2Totals).label}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
                    ผลการพิจารณา : {policySide2Totals >= scorePassThreshold ? (
                      <span className="text-success font-weight-bold"><i className="fa-regular fa-square-check mr-1"></i> ผ่านเกณฑ์</span>
                    ) : (
                      <span className="text-danger font-weight-bold"><i className="fa-regular fa-circle-xmark mr-1"></i> ไม่ผ่านเกณฑ์</span>
                    )} (เกณฑ์ร้อยละ {scorePassThreshold})
                  </td>
                </tr>

                {/* ── สรุปผลภาพรวมทั้ง 2 ด้าน ── */}
                <tr style={{ background: '#f1f5f9' }}>
                  <td colSpan={3 + committeeList.length} className="p-3">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <strong>สรุปผลคะแนนรวมเฉลี่ยทั้ง 2 ด้าน : </strong>
                        <span className="font-weight-bold text-primary" style={{ fontSize: '16px' }}>{overallAverage.toFixed(2)} คะแนน</span>
                        &nbsp;&nbsp;
                        <strong>ระดับคุณภาพ : </strong>
                        <span className="badge badge-primary px-2 py-1 font-weight-bold">{qualityBadge.label}</span>
                      </div>
                      <div>
                        <strong>ผลการพิจารณาสรุป : </strong>
                        {isPassed ? (
                          <span className="text-success font-weight-bold">
                            <i className="fa-regular fa-square-check mr-1"></i> ผ่านเกณฑ์ (คะแนนเฉลี่ยร้อยละ {overallAverage.toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-danger font-weight-bold">
                            <i className="fa-regular fa-circle-xmark mr-1"></i> ไม่ผ่านเกณฑ์ (คะแนนเฉลี่ยร้อยละ {overallAverage.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* ── ลายเซ็นคณะกรรมการนิเทศ ── */}
                {committeeProfiles.length > 0 && (
                  <tr>
                    <td colSpan={3 + committeeList.length} className="p-0">
                      <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed' }}>
                        <tbody>
                          <tr>
                            {committeeProfiles.map((cp, idx) => (
                              <td
                                key={cp.people_id || idx}
                                className="text-center align-bottom"
                                style={{ width: `${100 / committeeProfiles.length}%`, padding: '16px 8px', background: '#fff' }}
                              >
                                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#1e293b' }}>
                                  กรรมการคนที่ {idx + 1}
                                </div>
                                <SignatureImage src={cp.signature} alt={`signature-${idx + 1}`} />
                                <div style={{ borderTop: '1px solid #333', marginTop: '10px', paddingTop: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                                  ({lookups.prefix[cp.prefix] || ''}{cp.name || ''} {cp.lastname || ''})
                                </div>
                                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                                  วิทยฐานะ {lookups.academic[cp.academic_id] || '-'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                  วันที่ประเมิน : {formatThaiDate(plan[`date_scoring${idx + 1}`]) || '....................'}
                                </div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}

                {/* ── ลายเซ็นครูรับทราบผลการประเมิน ── */}
                <tr>
                  <td colSpan={3 + committeeList.length} className="p-0">
                    <table className="table table-bordered mb-0">
                      <tbody>
                        <tr>
                          <td className="text-center align-bottom" style={{ width: '50%', padding: '16px 8px', background: '#fff' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#1e293b' }}>
                              ผู้รับทราบผลการประเมิน (ครูผู้สอน)
                            </div>
                            <SignatureImage src={teacher?.signature} alt="teacher-signature" />
                            <div style={{ borderTop: '1px solid #333', marginTop: '10px', paddingTop: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                              ({teacherFullName})
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                              วิทยฐานะ {academicName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              วันที่รับทราบผล : ........................................
                            </div>
                          </td>
                          <td style={{ width: '50%', background: '#fafafa', padding: '16px' }} className="align-middle">
                            <div className="small text-muted">
                              <p className="mb-1 font-weight-bold text-dark">
                                <i className="fa-solid fa-circle-check text-success mr-1"></i> คำรับรองการประเมินผลการจัดการเรียนรู้
                              </p>
                              <p className="mb-0" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                ผลการประเมินนี้ใช้ประกอบการประเมินผลการปฏิบัติงานตามข้อตกลงในการพัฒนางาน (PA) และรายงานการนิเทศภายในสถานศึกษา สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
                              </p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── ข้อเสนอแนะจากกรรมการ ── */}
          {committeeComments.length > 0 && (
            <div className="p-4 border-top" style={{ background: '#f8fafc' }}>
              <h5 className="font-weight-bold mb-3 text-dark">
                <i className="fa-solid fa-comment-dots text-warning mr-2"></i> ข้อเสนอแนะเชิงพัฒนาจากคณะกรรมการนิเทศ
              </h5>
              <div className="row">
                {committeeComments.map((c, idx) => (
                  <div key={idx} className="col-lg-6 mb-3">
                    <div className="card h-100 border shadow-none" style={{ borderRadius: '10px' }}>
                      <div className="card-header py-2 px-3 bg-light border-bottom">
                        <strong className="text-primary small" style={{ fontSize: '13px' }}>
                          <i className="fa-solid fa-user-check mr-1"></i> {c.label}
                        </strong>
                      </div>
                      <div className="card-body p-3" style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── CERTIFICATE MODAL POPUP ─── */}
      {showCert && (
        <Suspense fallback={<div className="certificate-modal-overlay"><div className="spinner-border text-light"></div></div>}>
          <CertificateModal
            plan={plan}
            teacherFullName={teacherFullName}
            schoolName={schoolName}
            academicName={academicName}
            subjectAreaName={subjectAreaName}
            planScoreMap={{ [String(plan.planid)]: overallAverage }}
            committeeProfiles={committeeProfileMap}
            directorProfile={directorProfile}
            lookups={lookups}
            profile={teacher}
            onClose={() => setShowCert(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ViewScoring;
