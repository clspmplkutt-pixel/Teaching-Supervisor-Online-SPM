import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showLineShareDialog } from '../utils/lineNotifyHelper';
import { getYouTubeEmbedUrl, getYouTubeWatchUrl } from '../utils/scoreCalculator';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const PlanScoring = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const committeeParam = query.get('committee') || '';
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
  const [activeMediaTab, setActiveMediaTab] = useState('clip'); // 'clip' | 'pdf' | 'reflection'
  const [lookups, setLookups] = useState({
    prefix: {},
    school: {},
    academic: {},
  });

  const userId = profile?.people_id || '';
  const draftKey = planid && userId ? `lmss_scoring_draft_${planid}_${userId}` : null;

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!planid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [planRes, prefixRes, schoolRes, academicRes] = await Promise.all([
          supabase.from('tbl_sendplan').select('*').eq('planid', planid).maybeSingle(),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_school').select('school_id, school_name'),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
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

        const academicMap = {};
        academicRes.data?.forEach((a) => { academicMap[String(a.academic_id)] = a.academic_standing; });

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
          supabase.from('tbl_sendplan_score').select('planid, supervision, policy_id, score').eq('planid', planid).eq('supervision', userId),
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

        // Auto-detect committee slot
        let detectedSlot = committeeParam.replace('committee', '');
        if (!detectedSlot) {
          [1, 2, 3, 4, 5].forEach((num) => {
            if (planData[`committee${num}`] === userId) {
              detectedSlot = String(num);
            }
          });
        }

        let savedComment = detectedSlot ? (planData[`committee${detectedSlot}_comment`] || '') : '';

        // Check local draft if not scored yet
        if (!isScored && draftKey) {
          try {
            const rawDraft = localStorage.getItem(draftKey);
            if (rawDraft) {
              const parsed = JSON.parse(rawDraft);
              if (parsed.scores) {
                Object.assign(prefilledScores, parsed.scores);
              }
              if (parsed.comment && !savedComment) {
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
          setLookups({ prefix: prefixMap, school: schoolMap, academic: academicMap });
        }
      } catch (err) {
        console.error('PlanScoring load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [planid, userId, profileLoading, draftKey, committeeParam]);

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
          text: `กรุณาให้คะแนนข้อ "${policy.text}" ก่อนส่งผลประเมิน`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
        });
        const el = document.getElementById(`policy-row-${policy.auto_id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // Confirmation Summary Modal before permanent save
    const confirmResult = await Swal.fire({
      title: 'ยืนยันการส่งผลการประเมิน?',
      html: `
        <div class="text-left p-2">
          <div class="mb-2">คะแนนรวมที่ได้: <strong>${scoreStats.currentWeightedSum} / ${scoreStats.maxWeightedSum} คะแนน</strong></div>
          <div class="mb-2">คิดเป็นร้อยละ: <strong class="text-primary">${scoreStats.percentage}%</strong></div>
          <div class="mb-2">ระดับคุณภาพ: <strong style="color: ${scoreStats.quality.color}">${scoreStats.quality.label}</strong></div>
          ${comment.trim() ? `<div class="small text-muted border-top pt-2 mt-2">ข้อเสนอแนะ: ${comment.trim()}</div>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการบันทึก',
      cancelButtonText: 'กลับไปตรวจสอบ',
      confirmButtonColor: '#10b981',
    });

    if (!confirmResult.isConfirmed) return;

    setSaving(true);
    try {
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

      // Auto-detect committee slot
      let slotToUpdate = committeeParam.replace('committee', '');
      if (!slotToUpdate) {
        [1, 2, 3, 4, 5].forEach((num) => {
          if (plan?.[`committee${num}`] === userId) {
            slotToUpdate = String(num);
          }
        });
      }

      if (slotToUpdate) {
        const updatePayload = {};
        updatePayload[`date_scoring${slotToUpdate}`] = new Date().toISOString().slice(0, 10);
        if (comment.trim()) {
          updatePayload[`committee${slotToUpdate}_comment`] = comment.trim();
        }
        await supabase.from('tbl_sendplan').update(updatePayload).eq('planid', planid);
      }

      // Check if all committees have scored to update status to '7' (completed) or '6' (in progress)
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
        const nextStatus = isAllScored ? '7' : '6';
        await supabase.from('tbl_sendplan').update({ plan_status: nextStatus }).eq('planid', planid);
      } catch (checkErr) {
        console.warn('Auto status check failed:', checkErr);
      }

      // Clear draft
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }

      // Prepare LINE notification message
      const teacherPrefix = lookups.prefix[teacher?.prefix] || '';
      const teacherName = `${teacherPrefix}${teacher?.name || ''} ${teacher?.lastname || ''}`.trim();
      const evaluatorPrefix = lookups.prefix[profile?.prefix] || '';
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
        title: 'บันทึกผลการประเมินสำเร็จ!',
        subtitle: `ประเมินเรียบร้อยแล้ว (${scoreStats.percentage}% - ระดับ ${scoreStats.quality.label})`,
        messageText: lineMessage,
        onClose: () => {
          navigate(`/view_scoring?planid=${planid}`);
        },
      });
    } catch (err) {
      console.error('PlanScoring submit error:', err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกคะแนนได้ กรุณาลองใหม่อีกครั้ง: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return <LoadingSpinner message="กำลังโหลดแบบประเมินและเกณฑ์ ว.PA..." />;
  }

  if (!plan) {
    return (
      <EmptyState
        title="ประเมินแผนการจัดการเรียนรู้"
        message="ไม่พบข้อมูลแผนการสอน หรือรหัสแผนไม่ถูกต้อง"
        actionLabel="กลับหน้าตรวจแผน"
        actionTo="/Plan_Check"
      />
    );
  }

  const pfx = lookups.prefix[teacher?.prefix] || '';
  const teacherFullName = teacher?.name ? `${pfx}${teacher.name} ${teacher.lastname || ''}`.trim() : plan.people_id;
  const schoolFullName = lookups.school[plan.school_code] ? `โรงเรียน${lookups.school[plan.school_code]}` : '';
  const embedVideoUrl = plan.plan_clip ? getYouTubeEmbedUrl(plan.plan_clip) : '';
  const watchVideoUrl = plan.plan_clip ? getYouTubeWatchUrl(plan.plan_clip) : '';

  return (
    <div className="container-fluid py-3">
      {/* ─── Hero Information Card ─── */}
      <div
        className="card mb-4 border-0 shadow-sm text-white"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #10b981 100%)',
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
                <span className="text-white-50 small">
                  {schoolFullName}
                </span>
              </div>
              <h3 className="font-weight-bold mb-1">
                {plan.subject_name} ({plan.subject_code || '-'})
              </h3>
              <p className="text-white mb-2" style={{ fontSize: '15px' }}>
                <strong>ชื่อแผน:</strong> {plan.subject_name_plan || '-'} | <strong>หน่วย:</strong> {plan.subject_content || '-'}
              </p>
              <div className="d-flex align-items-center flex-wrap text-white-50 small" style={{ gap: '15px' }}>
                <span><i className="fa-solid fa-chalkboard-user mr-1 text-warning"></i> ครูผู้สอน: <strong className="text-white">{teacherFullName}</strong></span>
                <span><i className="fa-regular fa-calendar mr-1"></i> ปีการศึกษา {plan.edu_year}/{plan.edu_term}</span>
              </div>
            </div>

            <div className="col-lg-4 text-lg-right">
              <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                {plan.plan_file && (
                  <a href={plan.plan_file} target="_blank" rel="noreferrer" className="btn btn-light btn-sm font-weight-bold shadow-sm">
                    <i className="fa-regular fa-file-pdf text-danger mr-1"></i> ดู PDF
                  </a>
                )}
                {watchVideoUrl && (
                  <a href={watchVideoUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-sm font-weight-bold">
                    <i className="fa-brands fa-youtube text-danger mr-1"></i> เปิด YouTube
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Flagship Split-Screen Evaluation Studio ─── */}
      <div className="row g-4">
        {/* LEFT COLUMN: Sticky Media & Teaching Reflection Panel */}
        <div className="col-lg-5 col-12">
          <div style={{ position: 'sticky', top: '76px', zIndex: 10 }}>
            <div className="card shadow-sm border-0 overflow-hidden mb-3" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-white border-bottom p-0">
                <ul className="nav nav-tabs border-0" role="tablist">
                  <li className="nav-item flex-fill text-center">
                    <button
                      type="button"
                      className={`nav-link border-0 w-100 py-3 font-weight-bold ${activeMediaTab === 'clip' ? 'active text-danger border-bottom border-danger' : 'text-muted'}`}
                      onClick={() => setActiveMediaTab('clip')}
                      style={{ background: 'none' }}
                    >
                      <i className="fa-brands fa-youtube mr-1 text-danger"></i> คลิปการสอน
                    </button>
                  </li>
                  <li className="nav-item flex-fill text-center">
                    <button
                      type="button"
                      className={`nav-link border-0 w-100 py-3 font-weight-bold ${activeMediaTab === 'reflection' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                      onClick={() => setActiveMediaTab('reflection')}
                      style={{ background: 'none' }}
                    >
                      <i className="fa-solid fa-pen-nib mr-1 text-primary"></i> บันทึกหลังสอน
                    </button>
                  </li>
                  <li className="nav-item flex-fill text-center">
                    <button
                      type="button"
                      className={`nav-link border-0 w-100 py-3 font-weight-bold ${activeMediaTab === 'pdf' ? 'active text-danger border-bottom border-danger' : 'text-muted'}`}
                      onClick={() => setActiveMediaTab('pdf')}
                      style={{ background: 'none' }}
                    >
                      <i className="fa-regular fa-file-pdf mr-1 text-danger"></i> แผน PDF
                    </button>
                  </li>
                </ul>
              </div>

              <div className="card-body p-3">
                {activeMediaTab === 'clip' && (
                  <div>
                    {embedVideoUrl ? (
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                        <iframe
                          title="Evaluation YouTube Player"
                          src={embedVideoUrl}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted bg-light rounded">
                        <i className="fa-brands fa-youtube fa-2x mb-2 text-secondary"></i>
                        <p className="mb-0 small">ยังไม่ได้ระบุคลิปวิดีโอการสอน</p>
                      </div>
                    )}
                  </div>
                )}

                {activeMediaTab === 'reflection' && (
                  <div>
                    <h6 className="font-weight-bold text-dark mb-2">
                      <i className="fa-solid fa-chalkboard-user mr-1 text-primary"></i> บันทึกผลการจัดการเรียนรู้ของครู:
                    </h6>
                    {plan.plan_after_teaching ? (
                      <div
                        className="p-3 bg-light rounded border text-dark small"
                        style={{ whiteSpace: 'pre-line', maxHeight: '350px', overflowY: 'auto' }}
                      >
                        {plan.plan_after_teaching}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted bg-light rounded">
                        <i className="fa-solid fa-comment-slash fa-2x mb-2 text-secondary"></i>
                        <p className="mb-0 small">ครูยังไม่ได้บันทึกผลการจัดการเรียนรู้หลังสอน</p>
                      </div>
                    )}
                  </div>
                )}

                {activeMediaTab === 'pdf' && (
                  <div>
                    {plan.plan_file ? (
                      <div>
                        <div className="mb-2 text-center">
                          <a
                            href={plan.plan_file}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-danger btn-sm font-weight-bold"
                          >
                            <i className="fa-regular fa-file-pdf mr-1"></i> เปิดดูไฟล์เต็มหน้าต่างใหม่
                          </a>
                        </div>
                        <iframe
                          title="Plan PDF Preview"
                          src={plan.plan_file}
                          style={{ width: '100%', height: '360px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted bg-light rounded">
                        <i className="fa-regular fa-file-excel fa-2x mb-2 text-secondary"></i>
                        <p className="mb-0 small">ยังไม่มีไฟล์แผนการสอน PDF แนบมา</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Score Progress Sticky Meter */}
            <div className="card shadow-sm border-0 p-3" style={{ borderRadius: '12px' }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted font-weight-bold">ความก้าวหน้าการประเมิน:</span>
                <span className="badge badge-primary">{scoreStats.answeredCount} / {scoreStats.totalCount} ข้อ</span>
              </div>
              <div className="progress mb-3" style={{ height: '6px' }}>
                <div
                  className={`progress-bar ${scoreStats.isComplete ? 'bg-success' : 'bg-primary'}`}
                  style={{ width: `${scoreStats.totalCount > 0 ? (scoreStats.answeredCount / scoreStats.totalCount) * 100 : 0}%` }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                <div>
                  <span className="text-muted small d-block">คะแนนรวมเบื้องต้น:</span>
                  <strong className="fs-5 text-success">{scoreStats.currentWeightedSum} / {scoreStats.maxWeightedSum}</strong>
                  <span className="badge badge-warning text-dark ml-2">{scoreStats.percentage}%</span>
                </div>
                <div className="text-right">
                  <span className="text-muted small d-block">ระดับคุณภาพ:</span>
                  <strong style={{ color: scoreStats.quality.color }}>{scoreStats.quality.label}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Rubric Questions & Submit Form */}
        <div className="col-lg-7 col-12">
          <form onSubmit={handleSubmit}>
            {alreadyScored && (
              <div className="alert alert-info shadow-sm mb-4" style={{ borderRadius: '8px' }}>
                <i className="fa-solid fa-circle-info mr-2"></i>
                <strong>แผนการจัดการเรียนรู้นี้ได้รับการประเมินคะแนนแล้ว</strong> (แสดงในโหมดดูข้อมูล)
              </div>
            )}

            {/* ด้านที่ 1 */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-success text-white py-3">
                <h5 className="card-title m-0 font-weight-bold">
                  <i className="fa-solid fa-chalkboard-user mr-2"></i>
                  ด้านที่ 1: ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน
                  <span className="badge badge-light text-dark ml-2">
                    {scoreStats.side1Answered}/{scoreStats.side1Total} ข้อ
                  </span>
                </h5>
              </div>

              <div className="card-body p-4">
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
                      }}
                    >
                      <h6 className="font-weight-bold text-dark mb-2">
                        {idx + 1}. {policy.text}
                      </h6>
                      <div className="text-muted pl-2 mb-3 small" style={{ borderLeft: '2px solid #cbd5e1' }}>
                        {(policyItems[policy.auto_id] || []).map((item) => (
                          <div key={item.id} className="mb-1">
                            {item.no_order}. {item.text}
                          </div>
                        ))}
                      </div>

                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                        <span className="small text-muted font-weight-bold">เลือกระดับคะแนน (1 - 5):</span>
                        <div className="btn-group">
                          {[1, 2, 3, 4, 5].map((v) => {
                            const isSel = Number(selectedValue) === v;
                            return (
                              <button
                                key={v}
                                type="button"
                                disabled={alreadyScored}
                                onClick={() => handleScoreChange(policy.auto_id, v)}
                                className={`btn font-weight-bold ${isSel ? 'btn-success' : 'btn-outline-secondary'}`}
                                style={{ width: '44px', height: '38px' }}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ด้านที่ 2 */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-primary text-white py-3">
                <h5 className="card-title m-0 font-weight-bold">
                  <i className="fa-solid fa-graduation-cap mr-2"></i>
                  ด้านที่ 2: ด้านผลลัพธ์การเรียนรู้ของผู้เรียน
                  <span className="badge badge-light text-dark ml-2">
                    {scoreStats.side2Answered}/{scoreStats.side2Total} ข้อ
                  </span>
                </h5>
              </div>

              <div className="card-body p-4">
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
                      }}
                    >
                      <h6 className="font-weight-bold text-dark mb-2">
                        {idx + 1}. {policy.text}
                      </h6>
                      <div className="text-muted pl-2 mb-3 small" style={{ borderLeft: '2px solid #cbd5e1' }}>
                        {(policyItems[policy.auto_id] || []).map((item) => (
                          <div key={item.id} className="mb-1">
                            {item.no_order}. {item.text}
                          </div>
                        ))}
                      </div>

                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                        <span className="small text-muted font-weight-bold">เลือกระดับคะแนน (1 - 5):</span>
                        <div className="btn-group">
                          {[1, 2, 3, 4, 5].map((v) => {
                            const isSel = Number(selectedValue) === v;
                            return (
                              <button
                                key={v}
                                type="button"
                                disabled={alreadyScored}
                                onClick={() => handleScoreChange(policy.auto_id, v)}
                                className={`btn font-weight-bold ${isSel ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{ width: '44px', height: '38px' }}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feedback Comment */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-warning py-3">
                <h6 className="font-weight-bold text-dark m-0">
                  <i className="fa-solid fa-comment-dots mr-2"></i> ข้อเสนอแนะ / ความคิดเห็นเชิงพัฒนาของกรรมการ
                </h6>
              </div>
              <div className="card-body p-4">
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="กรอกข้อเสนอแนะ เทคนิควิธีการสอน หรือจุดเด่นจุดควรพัฒนาสำหรับครูผู้สอน..."
                  value={comment}
                  onChange={handleCommentChange}
                  disabled={alreadyScored}
                  style={{ borderRadius: '8px' }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-between align-items-center mb-5 gap-2">
              <Link to="/Plan_Check" className="btn btn-outline-secondary px-4 py-2 font-weight-bold">
                <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
              </Link>

              {!alreadyScored && (
                <button
                  type="submit"
                  className="btn btn-success btn-lg font-weight-bold px-4 py-2 shadow-sm"
                  disabled={saving || !scoreStats.isComplete}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true" />
                      กำลังบันทึกคะแนน...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk mr-2"></i> ยืนยันการส่งผลประเมิน
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlanScoring;