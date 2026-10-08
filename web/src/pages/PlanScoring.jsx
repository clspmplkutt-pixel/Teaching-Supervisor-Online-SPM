import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { generateDirectorToCommitteeMessage, showLineShareDialog } from '../utils/lineNotifyHelper';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const PlanScoring = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const committee = query.get('committee') || '';
  const { profile, loading: profileLoading } = useUserProfile();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [policySide1, setPolicySide1] = useState([]);
  const [policySide2, setPolicySide2] = useState([]);
  const [policyItems, setPolicyItems] = useState({});
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState('');
  const [alreadyScored, setAlreadyScored] = useState(false);
  const [lookups, setLookups] = useState({
    prefix: {},
    school: {},
  });

  const draftKey = planid && profile?.people_id ? `lmss_scoring_draft_${planid}_${profile.people_id}` : null;

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!planid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [planRes, prefixRes, schoolRes] = await Promise.all([
          supabase.from('tbl_sendplan').select('*').eq('planid', planid).maybeSingle(),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_school').select('school_id, school_name'),
        ]);

        const planData = planRes.data;
        if (!planData) {
          if (mounted) setLoading(false);
          return;
        }

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });

        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });

        // Load teacher
        const { data: teacherData } = await supabase
          .from('tbl_Users')
          .select('people_id, prefix, name, lastname, academic_id, school')
          .eq('people_id', planData.people_id)
          .maybeSingle();

        const academicId = teacherData?.academic_id || '';

        const [side1Res, side2Res, scoreRes] = await Promise.all([
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '1').order('auto_id', { ascending: true }),
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '2').order('auto_id', { ascending: true }),
          supabase.from('tbl_sendplan_score').select('planid, supervision, policy_id, score').eq('planid', planid).eq('supervision', profile?.people_id || ''),
        ]);

        const side1 = side1Res.data || [];
        const side2 = side2Res.data || [];

        const policyIds = [...side1, ...side2].map((p) => p.auto_id);
        const { data: policyItemsRes } = await supabase
          .from('tbl_policy_items')
          .select('*')
          .in('policy_id', policyIds)
          .order('no_order', { ascending: true });

        const itemsMap = {};
        policyItemsRes?.forEach((item) => {
          if (!itemsMap[item.policy_id]) itemsMap[item.policy_id] = [];
          itemsMap[item.policy_id].push(item);
        });

        const isScored = (scoreRes.data || []).length > 0;

        // If already scored, prefill scores
        const prefilledScores = {};
        if (isScored) {
          scoreRes.data.forEach((s) => {
            prefilledScores[s.policy_id] = s.score;
          });
        }

        // Load committee comment if already saved
        let savedComment = '';
        if (committee) {
          const cNum = committee.replace('committee', '');
          savedComment = planData[`committee${cNum}_comment`] || '';
        }

        // Check local draft if not scored yet
        if (!isScored && draftKey) {
          try {
            const rawDraft = localStorage.getItem(draftKey);
            if (rawDraft) {
              const parsed = JSON.parse(rawDraft);
              if (parsed.scores) {
                Object.assign(prefilledScores, parsed.scores);
              }
              if (parsed.comment) {
                savedComment = parsed.comment;
              }
            }
          } catch (e) {
            console.warn('Draft read error:', e);
          }
        }

        if (mounted) {
          setPlan(planData);
          setTeacher(teacherData || null);
          setPolicySide1(side1);
          setPolicySide2(side2);
          setPolicyItems(itemsMap);
          setScores(prefilledScores);
          setComment(savedComment);
          setAlreadyScored(isScored);
          setLookups({ prefix: prefixMap, school: schoolMap });
        }
      } catch (err) {
        console.error('PlanScoring load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [planid, profile, profileLoading, draftKey, committee]);

  const handleScoreChange = (policyId, value) => {
    if (alreadyScored) return;
    setScores((prev) => {
      const updated = { ...prev, [policyId]: value };
      if (draftKey) {
        try {
          localStorage.setItem(draftKey, JSON.stringify({ scores: updated, comment }));
        } catch { /* noop */ }
      }
      return updated;
    });
  };

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setComment(val);
    if (!alreadyScored && draftKey) {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ scores, comment: val }));
      } catch { /* noop */ }
    }
  };

  // Live Score & Quality Calculations
  const scoreStats = useMemo(() => {
    const allPolicies = [...policySide1, ...policySide2];
    const totalCount = allPolicies.length;
    let answeredCount = 0;
    let currentWeightedSum = 0;
    let maxWeightedSum = 0;
    let rawScoreSum = 0;

    let side1Answered = 0;
    let side2Answered = 0;

    policySide1.forEach((p) => {
      const s = Number(scores[p.auto_id]);
      if (s && s >= 1 && s <= 5) side1Answered += 1;
    });

    policySide2.forEach((p) => {
      const s = Number(scores[p.auto_id]);
      if (s && s >= 1 && s <= 5) side2Answered += 1;
    });

    allPolicies.forEach((p) => {
      const w = Number(p.weight || 1);
      maxWeightedSum += 5 * w;
      const s = Number(scores[p.auto_id]);
      if (s && s >= 1 && s <= 5) {
        answeredCount += 1;
        rawScoreSum += s;
        currentWeightedSum += s * w;
      }
    });

    const percentage = maxWeightedSum > 0 ? (currentWeightedSum / maxWeightedSum) * 100 : 0;

    let quality = { label: 'ยังประเมินไม่ครบ', color: '#6b7280', bg: '#f3f4f6', isPass: false };
    if (answeredCount === totalCount && totalCount > 0) {
      if (percentage >= 90) {
        quality = { label: 'ดีเด่น', eng: 'Excellent', color: '#059669', bg: '#ecfdf5', isPass: true };
      } else if (percentage >= 80) {
        quality = { label: 'ดีมาก', eng: 'Very Good', color: '#2563eb', bg: '#eff6ff', isPass: true };
      } else if (percentage >= 70) {
        quality = { label: 'ดี', eng: 'Good', color: '#0891b2', bg: '#ecfeff', isPass: true };
      } else if (percentage >= 60) {
        quality = { label: 'พอใช้', eng: 'Fair', color: '#d97706', bg: '#fffbeb', isPass: true };
      } else {
        quality = { label: 'ต้องปรับปรุง', eng: 'Needs Work', color: '#dc2626', bg: '#fef2f2', isPass: false };
      }
    }

    return {
      totalCount,
      answeredCount,
      side1Total: policySide1.length,
      side1Answered,
      side2Total: policySide2.length,
      side2Answered,
      rawScoreSum,
      currentWeightedSum,
      maxWeightedSum,
      percentage: Math.round(percentage * 10) / 10,
      quality,
      isComplete: totalCount > 0 && answeredCount === totalCount,
    };
  }, [policySide1, policySide2, scores]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planid) return;
    if (alreadyScored) {
      Swal.fire('ข้อมูล', 'แผนการสอนนี้ถูกบันทึกคะแนนเรียบร้อยแล้ว', 'info');
      return;
    }

    const allPolicies = [...policySide1, ...policySide2];
    for (const policy of allPolicies) {
      if (!scores[policy.auto_id]) {
        Swal.fire({
          title: 'ประเมินยังไม่ครบทุกข้อ',
          text: `กรุณาให้คะแนนข้อ "${policy.text}" ก่อนบันทึก`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
        });
        const el = document.getElementById(`policy-row-${policy.auto_id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setSaving(true);
    try {
      const userId = profile?.people_id || '';
      const insertPayload = allPolicies.map((policy) => ({
        planid: String(planid),
        policy_id: String(policy.auto_id),
        score: Number(scores[policy.auto_id]),
        score_weight: Number(scores[policy.auto_id]) * Number(policy.weight || 1),
        supervision: String(userId),
        academic: String(policy.academic),
        create_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from('tbl_sendplan_score').insert(insertPayload);
      if (insertError) throw insertError;

      // Update committee date and comments in tbl_sendplan
      if (committee) {
        const committeeNum = committee.replace('committee', '');
        if (committeeNum) {
          const updatePayload = {};
          updatePayload[`date_scoring${committeeNum}`] = new Date().toISOString().slice(0, 10);
          if (comment.trim()) {
            updatePayload[`committee${committeeNum}_comment`] = comment.trim();
          }
          await supabase.from('tbl_sendplan').update(updatePayload).eq('planid', planid);
        }
      }

      // Check if all committees have scored to auto-update plan status to '7' (ประเมินเสร็จสิ้น)
      try {
        const { data: updatedPlan } = await supabase
          .from('tbl_sendplan')
          .select('committee1, committee2, committee3, committee4, committee5')
          .eq('planid', planid)
          .maybeSingle();

        const allCommittees = [
          updatedPlan?.committee1,
          updatedPlan?.committee2,
          updatedPlan?.committee3,
          updatedPlan?.committee4,
          updatedPlan?.committee5,
        ].filter(Boolean);

        const { data: allScores } = await supabase
          .from('tbl_sendplan_score')
          .select('supervision')
          .eq('planid', planid);

        const scoredSet = new Set((allScores || []).map((s) => s.supervision));
        if (userId) scoredSet.add(String(userId));

        const isAllScored = allCommittees.length > 0 && allCommittees.every((c) => scoredSet.has(String(c)));
        if (isAllScored) {
          await supabase.from('tbl_sendplan').update({ plan_status: '7' }).eq('planid', planid);
        }
      } catch (checkErr) {
        console.warn('Auto status check failed:', checkErr);
      }

      // Clear draft
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }

      // Prepare LINE notification message for teacher & admin
      const teacherPrefix = lookups.prefix[teacher?.prefix] || teacher?.prefix || '';
      const teacherName = `${teacherPrefix}${teacher?.name || ''} ${teacher?.lastname || ''}`.trim();
      const schoolName = lookups.school[plan?.school_code] || '';
      const evaluatorPrefix = lookups.prefix[profile?.prefix] || profile?.prefix || '';
      const evaluatorName = `${evaluatorPrefix}${profile?.name || ''} ${profile?.lastname || ''}`.trim();

      const lineMessage =
        `✅ [ระบบนิเทศออนไลน์ สพม.พิษณุโลก อุตรดิตถ์]\n` +
        `เรียน ครูผู้สอน (${teacherName})\n\n` +
        `คณะกรรมการนิเทศได้ประเมินแผนการจัดการเรียนรู้เรียบร้อยแล้ว:\n` +
        `📖 วิชา: ${plan?.subject_name || '-'} (${plan?.subject_code || '-'})\n` +
        `📝 แผนการสอน: ${plan?.subject_name_plan || '-'}\n` +
        `👥 ผู้ประเมิน: ${evaluatorName}\n` +
        `🏆 ผลคะแนนรวม: ${scoreStats.currentWeightedSum}/${scoreStats.maxWeightedSum} คะแนน (${scoreStats.percentage}% ระดับ: ${scoreStats.quality.label})\n` +
        (comment.trim() ? `💬 ข้อเสนอแนะ: ${comment.trim()}\n` : '') +
        `\n🔗 ตรวจสอบผลการประเมินได้ที่:\n${window.location.origin}/view_scoring?planid=${planid}`;

      showLineShareDialog({
        title: 'บันทึกการประเมินสำเร็จ!',
        subtitle: 'ท่านสามารถส่งผลการประเมินและข้อเสนอแนะแจ้งเตือนครูผู้สอนผ่าน LINE ได้ทันที',
        messageText: lineMessage,
        onClose: () => {
          navigate('/Plan_Check');
        },
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถบันทึกคะแนนได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return <LoadingSpinner text="กำลังโหลดแบบประเมินแผนการสอน..." />;
  }

  if (!plan) {
    return (
      <div className="container-fluid p-4">
        <EmptyState message="ไม่พบข้อมูลแผนการสอนที่ต้องการประเมิน" fullPage={false} />
      </div>
    );
  }

  const teacherFullName = teacher
    ? `${lookups.prefix[teacher.prefix] || ''}${teacher.name || ''} ${teacher.lastname || ''}`.trim()
    : plan.people_id;

  const schoolFullName = lookups.school[plan.school_code] || plan.school_code;

  return (
    <div className="container-fluid p-0">
      {/* ─── Hero Information Card ─── */}
      <div
        className="card mb-4 border-0 shadow-sm text-white"
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #059669 60%, #10b981 100%)',
          borderRadius: '12px',
        }}
      >
        <div className="card-body p-4">
          <div className="row align-items-center">
            <div className="col-lg-8 mb-3 mb-lg-0">
              <div className="d-flex align-items-center flex-wrap mb-2" style={{ gap: '8px' }}>
                <span className="badge badge-warning text-dark font-weight-bold px-2 py-1">
                  รหัสแผน #{plan.planid}
                </span>
                <span className="text-white-50" style={{ fontSize: '13px' }}>
                  {schoolFullName}
                </span>
              </div>
              <h2 className="font-weight-bold mb-1" style={{ fontSize: '22px' }}>
                {plan.subject_name} ({plan.subject_code})
              </h2>
              <p className="text-white mb-2 font-weight-light" style={{ fontSize: '15px' }}>
                <strong>ชื่อแผน:</strong> {plan.subject_name_plan || '-'} | <strong>หน่วย:</strong> {plan.subject_content || '-'}
              </p>
              <div className="d-flex align-items-center flex-wrap text-white-50" style={{ gap: '15px', fontSize: '13px' }}>
                <span><i className="fa-solid fa-chalkboard-user mr-1 text-warning"></i> ครูผู้สอน: <strong className="text-white">{teacherFullName}</strong></span>
                <span><i className="fa-regular fa-calendar mr-1"></i> ปี {plan.edu_year}/{plan.edu_term} (งบฯ {plan.budget_year})</span>
              </div>
            </div>

            <div className="col-lg-4 text-lg-right">
              <div className="d-flex flex-wrap justify-content-lg-end" style={{ gap: '8px' }}>
                {plan.plan_file && (
                  <a
                    href={plan.plan_file}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-light font-weight-bold shadow-sm"
                    title="เปิดอ่านไฟล์แผนการจัดการเรียนรู้ PDF"
                  >
                    <i className="fa-regular fa-file-pdf text-danger mr-1"></i> เปิดดูไฟล์แผน (PDF)
                  </a>
                )}
                {plan.plan_clip && (
                  <a
                    href={`https://www.youtube.com/watch?v=${plan.plan_clip}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-light font-weight-bold"
                    title="เปิดดูคลิปวิดีโอการสอนบน YouTube"
                  >
                    <i className="fa-brands fa-youtube text-danger mr-1"></i> คลิปการสอน
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sticky Score Meter Bar ─── */}
      <div
        className="card mb-4 shadow-sm border-0"
        style={{
          borderRadius: '10px',
          position: 'sticky',
          top: '65px',
          zIndex: 1020,
          background: '#ffffff',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        }}
      >
        <div className="card-body py-3 px-4">
          <div className="row align-items-center">
            {/* Progress Counter */}
            <div className="col-md-4 col-sm-6 mb-2 mb-md-0">
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center text-white rounded-circle mr-3 shadow-sm"
                  style={{
                    width: '42px',
                    height: '42px',
                    fontSize: '18px',
                    backgroundColor: scoreStats.isComplete ? '#059669' : '#3b82f6',
                  }}
                >
                  <i className={`fa-solid ${scoreStats.isComplete ? 'fa-check' : 'fa-list-check'}`}></i>
                </div>
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                    ความคืบหน้าการประเมิน
                  </span>
                  <strong style={{ fontSize: '15px' }}>
                    {scoreStats.answeredCount} / {scoreStats.totalCount} ข้อ
                  </strong>
                  <span className="text-muted ml-1" style={{ fontSize: '12px' }}>
                    ({scoreStats.totalCount > 0 ? Math.round((scoreStats.answeredCount / scoreStats.totalCount) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Score & Percentage */}
            <div className="col-md-4 col-sm-6 mb-2 mb-md-0">
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center text-white rounded-circle mr-3 shadow-sm"
                  style={{ width: '42px', height: '42px', fontSize: '18px', backgroundColor: '#f59e0b' }}
                >
                  <i className="fa-solid fa-award"></i>
                </div>
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '11px' }}>
                    คะแนนรวม (คิดเป็นร้อยละ)
                  </span>
                  <strong style={{ fontSize: '15px', color: '#059669' }}>
                    {scoreStats.currentWeightedSum} / {scoreStats.maxWeightedSum} คะแนน
                  </strong>
                  <span className="badge badge-warning text-dark font-weight-bold ml-2">
                    {scoreStats.percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quality Grade Level */}
            <div className="col-md-4 col-12 text-md-right mt-2 mt-md-0">
              <div className="d-inline-flex align-items-center p-2 rounded" style={{ backgroundColor: scoreStats.quality.bg }}>
                <i className="fa-solid fa-medal mr-2" style={{ color: scoreStats.quality.color, fontSize: '18px' }}></i>
                <div className="text-left">
                  <span className="d-block text-muted" style={{ fontSize: '10px' }}>ระดับคุณภาพ</span>
                  <strong style={{ color: scoreStats.quality.color, fontSize: '14px' }}>
                    {scoreStats.quality.label}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="progress mt-2" style={{ height: '4px' }}>
            <div
              className={`progress-bar ${scoreStats.isComplete ? 'bg-success' : 'bg-primary'}`}
              role="progressbar"
              style={{
                width: `${scoreStats.totalCount > 0 ? (scoreStats.answeredCount / scoreStats.totalCount) * 100 : 0}%`,
              }}
              aria-valuenow={scoreStats.answeredCount}
              aria-valuemin="0"
              aria-valuemax={scoreStats.totalCount}
            ></div>
          </div>
        </div>
      </div>

      {/* ─── Scoring Form ─── */}
      <form onSubmit={handleSubmit}>
        {alreadyScored && (
          <div className="alert alert-info shadow-sm mb-4" style={{ borderRadius: '8px' }}>
            <i className="fa-solid fa-circle-info mr-2"></i>
            <strong>แผนการจัดการเรียนรู้นี้ได้รับการประเมินคะแนนแล้ว</strong> (แสดงในโหมดดูข้อมูล)
          </div>
        )}

        {/* ── ด้านที่ 1 ── */}
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px' }}>
          <div className="card-header bg-success text-white py-3">
            <h4 className="card-title m-0 font-weight-bold" style={{ fontSize: '17px' }}>
              <i className="fa-solid fa-chalkboard-user mr-2"></i>
              ด้านที่ 1: ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน
              <span className="badge badge-light text-dark ml-2">
                {scoreStats.side1Answered}/{scoreStats.side1Total} ข้อ
              </span>
            </h4>
          </div>

          <div className="card-body p-4">
            {/* Rubric Info Box */}
            <div
              className="alert alert-light border mb-4"
              style={{
                borderRadius: '8px',
                borderLeft: '4px solid #059669',
                backgroundColor: '#f8fafc',
                fontSize: '13px',
                color: '#334155',
                lineHeight: 1.6,
              }}
            >
              <strong className="text-success d-block mb-1">
                <i className="fa-solid fa-circle-question mr-1"></i> เกณฑ์การให้คะแนนด้านที่ 1 (Scoring Rubric):
              </strong>
              <div>• <strong>1 คะแนน:</strong> เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ 1 ข้อ</div>
              <div>• <strong>2 คะแนน:</strong> เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ 2 ข้อ</div>
              <div>• <strong>3 คะแนน:</strong> เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ทั้ง 3 ข้อ</div>
              <div>• <strong>4 คะแนน:</strong> เมื่อปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ครบ 3 ข้อ และปฏิบัติตามข้อ 4 หรือ ข้อ 5 ได้ 1 ข้อ</div>
              <div>• <strong>5 คะแนน:</strong> เมื่อปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ครบ 3 ข้อ และปฏิบัติตามข้อ 4 และ ข้อ 5 ได้ทั้ง 2 ข้อ</div>
            </div>

            {/* Questions for Side 1 */}
            {policySide1.map((policy, idx) => {
              const selectedValue = scores[policy.auto_id];
              return (
                <div
                  key={policy.auto_id}
                  id={`policy-row-${policy.auto_id}`}
                  className="p-3 mb-3 border rounded shadow-none"
                  style={{
                    backgroundColor: selectedValue ? '#f0fdf4' : '#ffffff',
                    borderColor: selectedValue ? '#bbf7d0' : '#e2e8f0',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div className="row align-items-center">
                    <div className="col-lg-8 mb-3 mb-lg-0">
                      <h5 className="font-weight-bold text-dark mb-2" style={{ fontSize: '15px' }}>
                        {idx + 1}. {policy.text}
                      </h5>
                      <div className="text-muted pl-2" style={{ fontSize: '13px', lineHeight: 1.5, borderLeft: '2px solid #cbd5e1' }}>
                        <strong className="text-secondary d-block mb-1">ตัวชี้วัดย่อย:</strong>
                        {(policyItems[policy.auto_id] || []).map((item) => (
                          <div key={item.id} className="mb-1">
                            {item.no_order}. {item.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Touch-Friendly Score Selector */}
                    <div className="col-lg-4 text-lg-right">
                      <span className="text-muted d-block mb-2 font-weight-bold" style={{ fontSize: '12px' }}>
                        เลือกระดับคะแนน (1 - 5):
                      </span>
                      <div className="d-flex flex-wrap justify-content-lg-end" style={{ gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((v) => {
                          const isSelected = Number(selectedValue) === v;
                          const colors = {
                            1: { bg: '#ef4444', text: '#fff', border: '#ef4444' },
                            2: { bg: '#f97316', text: '#fff', border: '#f97316' },
                            3: { bg: '#f59e0b', text: '#fff', border: '#f59e0b' },
                            4: { bg: '#10b981', text: '#fff', border: '#10b981' },
                            5: { bg: '#059669', text: '#fff', border: '#059669' },
                          };
                          return (
                            <button
                              key={v}
                              type="button"
                              disabled={alreadyScored}
                              onClick={() => handleScoreChange(policy.auto_id, v)}
                              className="btn font-weight-bold d-flex flex-column align-items-center justify-content-center"
                              style={{
                                width: '50px',
                                height: '44px',
                                borderRadius: '8px',
                                border: `2px solid ${isSelected ? colors[v].border : '#cbd5e1'}`,
                                backgroundColor: isSelected ? colors[v].bg : '#ffffff',
                                color: isSelected ? colors[v].text : '#475569',
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? `0 4px 10px ${colors[v].bg}40` : 'none',
                                cursor: alreadyScored ? 'default' : 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '16px', lineHeight: 1 }}>{v}</span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedValue && (
                        <div className="mt-1" style={{ fontSize: '11px', color: '#059669' }}>
                          <i className="fa-solid fa-circle-check mr-1"></i> ให้ {selectedValue} คะแนน
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ด้านที่ 2 ── */}
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px' }}>
          <div className="card-header bg-primary text-white py-3">
            <h4 className="card-title m-0 font-weight-bold" style={{ fontSize: '17px' }}>
              <i className="fa-solid fa-graduation-cap mr-2"></i>
              ด้านที่ 2: ด้านผลลัพธ์การเรียนรู้ของผู้เรียน
              <span className="badge badge-light text-dark ml-2">
                {scoreStats.side2Answered}/{scoreStats.side2Total} ข้อ
              </span>
            </h4>
          </div>

          <div className="card-body p-4">
            {/* Rubric Info Box */}
            <div
              className="alert alert-light border mb-4"
              style={{
                borderRadius: '8px',
                borderLeft: '4px solid #2563eb',
                backgroundColor: '#f8fafc',
                fontSize: '13px',
                color: '#334155',
                lineHeight: 1.6,
              }}
            >
              <strong className="text-primary d-block mb-1">
                <i className="fa-solid fa-circle-question mr-1"></i> เกณฑ์การให้คะแนนด้านที่ 2 (Scoring Rubric):
              </strong>
              <div>• <strong>1 คะแนน:</strong> เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 1 ข้อ จาก 5 ข้อ</div>
              <div>• <strong>2 คะแนน:</strong> เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 2 ข้อ จาก 5 ข้อ</div>
              <div>• <strong>3 คะแนน:</strong> เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 3 ข้อ จาก 5 ข้อ</div>
              <div>• <strong>4 คะแนน:</strong> เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 4 ข้อ จาก 5 ข้อ</div>
              <div>• <strong>5 คะแนน:</strong> เมื่อปฏิบัติได้หรือปรากฏผลชัดเจนครบทั้ง 5 ข้อ</div>
            </div>

            {/* Questions for Side 2 */}
            {policySide2.map((policy, idx) => {
              const selectedValue = scores[policy.auto_id];
              return (
                <div
                  key={policy.auto_id}
                  id={`policy-row-${policy.auto_id}`}
                  className="p-3 mb-3 border rounded shadow-none"
                  style={{
                    backgroundColor: selectedValue ? '#eff6ff' : '#ffffff',
                    borderColor: selectedValue ? '#bfdbfe' : '#e2e8f0',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div className="row align-items-center">
                    <div className="col-lg-8 mb-3 mb-lg-0">
                      <h5 className="font-weight-bold text-dark mb-2" style={{ fontSize: '15px' }}>
                        {idx + 1}. {policy.text}
                      </h5>
                      <div className="text-muted pl-2" style={{ fontSize: '13px', lineHeight: 1.5, borderLeft: '2px solid #cbd5e1' }}>
                        <strong className="text-secondary d-block mb-1">ตัวชี้วัดย่อย:</strong>
                        {(policyItems[policy.auto_id] || []).map((item) => (
                          <div key={item.id} className="mb-1">
                            {item.no_order}. {item.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Touch-Friendly Score Selector */}
                    <div className="col-lg-4 text-lg-right">
                      <span className="text-muted d-block mb-2 font-weight-bold" style={{ fontSize: '12px' }}>
                        เลือกระดับคะแนน (1 - 5):
                      </span>
                      <div className="d-flex flex-wrap justify-content-lg-end" style={{ gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((v) => {
                          const isSelected = Number(selectedValue) === v;
                          const colors = {
                            1: { bg: '#ef4444', text: '#fff', border: '#ef4444' },
                            2: { bg: '#f97316', text: '#fff', border: '#f97316' },
                            3: { bg: '#f59e0b', text: '#fff', border: '#f59e0b' },
                            4: { bg: '#10b981', text: '#fff', border: '#10b981' },
                            5: { bg: '#059669', text: '#fff', border: '#059669' },
                          };
                          return (
                            <button
                              key={v}
                              type="button"
                              disabled={alreadyScored}
                              onClick={() => handleScoreChange(policy.auto_id, v)}
                              className="btn font-weight-bold d-flex flex-column align-items-center justify-content-center"
                              style={{
                                width: '50px',
                                height: '44px',
                                borderRadius: '8px',
                                border: `2px solid ${isSelected ? colors[v].border : '#cbd5e1'}`,
                                backgroundColor: isSelected ? colors[v].bg : '#ffffff',
                                color: isSelected ? colors[v].text : '#475569',
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? `0 4px 10px ${colors[v].bg}40` : 'none',
                                cursor: alreadyScored ? 'default' : 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '16px', lineHeight: 1 }}>{v}</span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedValue && (
                        <div className="mt-1" style={{ fontSize: '11px', color: '#2563eb' }}>
                          <i className="fa-solid fa-circle-check mr-1"></i> ให้ {selectedValue} คะแนน
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ข้อเสนอแนะจากกรรมการ ── */}
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px' }}>
          <div className="card-header bg-warning py-3">
            <h4 className="card-title m-0 font-weight-bold text-dark" style={{ fontSize: '16px' }}>
              <i className="fa-solid fa-comment-dots mr-2"></i> ข้อเสนอแนะ / ความคิดเห็นเชิงพัฒนาของกรรมการ
            </h4>
          </div>
          <div className="card-body p-4">
            <textarea
              className="form-control"
              rows="4"
              placeholder="กรอกข้อเสนอแนะ เทคนิควิธีการสอน หรือจุดเด่นจุดควรพัฒนาสำหรับครูผู้สอน..."
              value={comment}
              onChange={handleCommentChange}
              disabled={alreadyScored}
              style={{ fontSize: '14px', borderRadius: '8px' }}
            />
            <small className="text-muted d-block mt-2">
              <i className="fa-solid fa-circle-info mr-1 text-primary"></i>
              ข้อเสนอแนะนี้จะปรากฏในรายงานผลการนิเทศและเกียรติบัตร เพื่อให้ครูนำไปปรับใช้ในการจัดการเรียนรู้ Active Coding
            </small>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="d-flex justify-content-center align-items-center mb-5 flex-wrap" style={{ gap: '12px' }}>
          {!alreadyScored && (
            <button
              type="submit"
              className="btn btn-success btn-lg font-weight-bold px-4 py-2 shadow-sm"
              disabled={saving}
              style={{ borderRadius: '8px', minWidth: '180px' }}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                  กำลังบันทึกคะแนน...
                </>
              ) : (
                <>
                  <i className="fa-regular fa-floppy-disk mr-2"></i> บันทึกผลการประเมิน
                </>
              )}
            </button>
          )}

          <Link
            to="/Plan_Check"
            className="btn btn-outline-secondary btn-lg font-weight-bold px-4 py-2"
            style={{ borderRadius: '8px' }}
          >
            <i className="fa-solid fa-arrow-left mr-2"></i> ย้อนกลับ
          </Link>
        </div>
      </form>
    </div>
  );
};

export default PlanScoring;
