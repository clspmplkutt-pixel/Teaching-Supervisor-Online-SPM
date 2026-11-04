import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge, { PlanTimelineStepper } from '../components/StatusBadge';
import {
  calculatePlanScoreFromRows,
  getQualityBadge,
  getYouTubeWatchUrl,
} from '../utils/scoreCalculator';
import { generateTeacherToDirectorMessage, showLineShareDialog } from '../utils/lineNotifyHelper';

const PAGE_SIZE = 15;

const FILTER_TABS = [
  { key: 'all', label: 'ทั้งหมด', icon: 'fa-layer-group', activeClass: 'btn-dark' },
  { key: 'pending', label: 'รอ ผอ.ตรวจ', icon: 'fa-hourglass-half', activeClass: 'btn-warning text-dark' },
  { key: 'clip', label: 'รอส่งคลิป', icon: 'fa-video', activeClass: 'btn-success' },
  { key: 'revision', label: 'ส่งกลับแก้ไข', icon: 'fa-rotate-left', activeClass: 'btn-danger' },
  { key: 'scoring', label: 'กำลังประเมิน', icon: 'fa-clipboard-check', activeClass: 'btn-info' },
  { key: 'completed', label: 'เสร็จสมบูรณ์', icon: 'fa-award', activeClass: 'btn-primary' },
];

const VALID_FILTERS = new Set(FILTER_TABS.map((t) => t.key));

const getRoleId = (user, profile) =>
  profile?.level ||
  profile?.level_id ||
  user?.level_id ||
  user?.user_metadata?.role ||
  user?.role ||
  'teacher';

const matchesStatusFilter = (statusVal, filterKey) => {
  const s = String(statusVal || '');
  if (filterKey === 'pending') return s === '1' || s === '4';
  if (filterKey === 'clip') return s === '2';
  if (filterKey === 'revision') return s === '3';
  if (filterKey === 'scoring') return s === '5' || s === '6';
  if (filterKey === 'completed') return s === '7';
  return true;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const StatusPlan = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleId = getRoleId(user, profile);
  const isDirector = roleId === 'directorschool';
  const myPeopleId = profile?.people_id || user?.user_metadata?.people_id || user?.email || '';

  const rawFilter = searchParams.get('filter') || 'all';
  const activeFilter = VALID_FILTERS.has(rawFilter) ? rawFilter : 'all';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [schoolPlanRank, setSchoolPlanRank] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('auto'); // 'auto' | 'table' | 'card'
  const [lookups, setLookups] = useState({
    teachSubject: {},
    teachSubjectShort: {},
    gradeLevel: {},
    status: {},
    prefix: {},
    subjectType: {},
  });
  const [scoreStatsByPlan, setScoreStatsByPlan] = useState({});

  const handleFilterChange = (nextFilter) => {
    setCurrentPage(1);
    const next = new URLSearchParams(searchParams);
    if (!nextFilter || nextFilter === 'all') {
      next.delete('filter');
    } else {
      next.set('filter', nextFilter);
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!profile && isDirector) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [subjectRes, gradeRes, statusRes, prefixRes, subjectTypeRes, policyRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject, teach_subject_1'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan_status').select('id, status_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_SubjectType').select('subjecttype_id, subjecttype_name'),
          supabase.from('tbl_policy_number').select('auto_id, weight'),
        ]);

        const teachSubjectMap = {};
        const teachSubjectShortMap = {};
        subjectRes.data?.forEach((s) => {
          teachSubjectMap[s.teach_subject_id] = s.teach_subject;
          teachSubjectShortMap[s.teach_subject_id] = s.teach_subject_1 || s.teach_subject;
        });

        const gradeMap = {};
        gradeRes.data?.forEach((g) => {
          gradeMap[g.grade_level_id] = g.grade_level_name;
        });

        const statusMap = {};
        statusRes.data?.forEach((s) => {
          statusMap[String(s.id)] = s.status_name;
        });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => {
          prefixMap[p.prefix_id] = p.prefix;
        });

        const subjectTypeMap = {};
        subjectTypeRes.data?.forEach((t) => {
          subjectTypeMap[t.subjecttype_id] = t.subjecttype_name;
        });

        const policyWeightMap = {};
        policyRes.data?.forEach((p) => {
          policyWeightMap[String(p.auto_id)] = Number(p.weight || 1);
        });

        let plans = [];
        let schoolCode = profile?.school || '';

        if (isDirector) {
          if (schoolCode) {
            const { data: dirPlans } = await supabase
              .from('tbl_sendplan')
              .select('*')
              .eq('school_code', schoolCode)
              .order('planid', { ascending: false });
            plans = dirPlans || [];
          }
        } else if (myPeopleId) {
          const { data: myPlans } = await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('people_id', myPeopleId)
            .order('planid', { ascending: false });
          plans = myPlans || [];
          if (!schoolCode && plans.length > 0) {
            schoolCode = plans[0].school_code || '';
          }
        }

        // Sort newest plans first reliably
        plans = [...plans].sort((a, b) => Number(b.planid || 0) - Number(a.planid || 0));

        // Calculate school-wide sequence number
        const rankMap = {};
        if (schoolCode) {
          const { data: allSchoolPlans } = await supabase
            .from('tbl_sendplan')
            .select('planid')
            .eq('school_code', schoolCode)
            .order('planid', { ascending: true });
          (allSchoolPlans || []).forEach((p, idx) => {
            rankMap[p.planid] = idx + 1;
          });
        }

        // Enrich teacher names for Director view
        if (isDirector && plans.length > 0) {
          const teacherIds = Array.from(new Set(plans.map((p) => p.people_id).filter(Boolean)));
          if (teacherIds.length > 0) {
            const { data: teachers } = await supabase
              .from('tbl_Users')
              .select('people_id, prefix, name, lastname')
              .in('people_id', teacherIds);
            const teacherMap = {};
            (teachers || []).forEach((t) => {
              teacherMap[t.people_id] = `${prefixMap[t.prefix] || ''}${t.name || ''} ${t.lastname || ''}`.trim();
            });
            plans = plans.map((plan) => ({
              ...plan,
              teacher_name: teacherMap[plan.people_id] || '',
            }));
          }
        }

        // Fetch score summary for plans
        const scoreSummary = {};
        if (plans.length > 0) {
          const planIds = plans.map((p) => String(p.planid));
          const { data: scoreRows } = await supabase
            .from('tbl_sendplan_score')
            .select('planid, policy_id, score, score_weight, supervision')
            .in('planid', planIds);

          const grouped = {};
          (scoreRows || []).forEach((s) => {
            const pid = String(s.planid);
            if (!grouped[pid]) grouped[pid] = [];
            const w = policyWeightMap[String(s.policy_id)];
            if (w) {
              const rawS = Number(s.score) || 0;
              const sw = Number(s.score_weight) || 0;
              grouped[pid].push({
                ...s,
                score: sw > 0 ? sw : rawS * w,
                score_weight: 5 * w,
              });
            } else {
              grouped[pid].push(s);
            }
          });

          Object.entries(grouped).forEach(([pid, pRows]) => {
            const calc = calculatePlanScoreFromRows(pRows);
            scoreSummary[pid] = {
              evaluatorCount: calc.evaluatorCount,
              percentage: calc.percentage,
            };
          });
        }

        if (mounted) {
          setLookups({
            teachSubject: teachSubjectMap,
            teachSubjectShort: teachSubjectShortMap,
            gradeLevel: gradeMap,
            status: statusMap,
            prefix: prefixMap,
            subjectType: subjectTypeMap,
          });
          setRows(plans);
          setSchoolPlanRank(rankMap);
          setScoreStatsByPlan(scoreSummary);
        }
      } catch (err) {
        console.error('StatusPlan load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => {
      mounted = false;
    };
  }, [isDirector, myPeopleId, profile, profileLoading]);

  // Filter counts across all loaded plans
  const filterCounts = useMemo(() => {
    const counts = {
      all: rows.length,
      pending: 0,
      clip: 0,
      revision: 0,
      scoring: 0,
      completed: 0,
    };
    rows.forEach((r) => {
      const s = String(r.plan_status || '');
      if (s === '1' || s === '4') counts.pending += 1;
      else if (s === '2') counts.clip += 1;
      else if (s === '3') counts.revision += 1;
      else if (s === '5' || s === '6') counts.scoring += 1;
      else if (s === '7') counts.completed += 1;
    });
    return counts;
  }, [rows]);

  // Filtered + searched rows
  const filteredRows = useMemo(() => {
    let list = rows.filter((r) => matchesStatusFilter(r.plan_status, activeFilter));

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter((r) => {
        const planName = (r.subject_name_plan || '').toLowerCase();
        const unitName = (r.subject_content || '').toLowerCase();
        const subjName = (r.subject_name || '').toLowerCase();
        const subjCode = (r.subject_code || '').toLowerCase();
        const teacherName = (r.teacher_name || '').toLowerCase();
        const pid = String(r.planid || '').toLowerCase();
        const year = String(r.edu_year || '').toLowerCase();
        return (
          planName.includes(term) ||
          unitName.includes(term) ||
          subjName.includes(term) ||
          subjCode.includes(term) ||
          teacherName.includes(term) ||
          pid.includes(term) ||
          year.includes(term)
        );
      });
    }

    return list;
  }, [rows, activeFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const handleDelete = async (row) => {
    const committeeCount = [row.committee1, row.committee2, row.committee3, row.committee4, row.committee5].filter(Boolean).length;
    if (committeeCount > 0) {
      Swal.fire({
        title: 'ไม่สามารถลบได้',
        text: 'แผนนี้มีกรรมการถูกแต่งตั้งแล้ว ไม่สามารถลบได้',
        icon: 'warning',
        confirmButtonText: 'ตกลง',
      });
      return;
    }
    const result = await Swal.fire({
      title: 'ยืนยันการลบแผนการสอน',
      html: `คุณต้องการลบแผน <strong>"${row.subject_name_plan || row.subject_content || row.subject_name}"</strong> ใช่หรือไม่?<br/><span class="text-danger small">การลบข้อมูลไม่สามารถกู้คืนได้</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fa-solid fa-trash mr-1"></i> ลบแผนนี้',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;
    try {
      await supabase.from('tbl_sendplan_score').delete().eq('planid', String(row.planid));
      const { error } = await supabase.from('tbl_sendplan').delete().eq('planid', row.planid);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.planid !== row.planid));
      Swal.fire({
        title: 'ลบสำเร็จ',
        text: 'ลบแผนการสอนเรียบร้อยแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Delete plan error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถลบแผนได้', 'error');
    }
  };

  const handleShareLineToDirector = (row) => {
    const teacherPrefix = lookups?.prefix?.[profile?.prefix] || profile?.prefix || '';
    const teacherName = `${teacherPrefix}${profile?.name || ''} ${profile?.lastname || ''}`.trim();
    const schoolName = profile?.school_name || '';

    const lineMsg = generateTeacherToDirectorMessage({
      teacherName,
      schoolName,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      planName: row.subject_name_plan,
      planId: row.planid,
    });

    showLineShareDialog({
      title: 'ส่งข้อความแจ้งเตือน ผอ. ผ่าน LINE',
      subtitle: `แจ้งเตือนท่าน ผอ. เพื่อตรวจอนุมัติแผน #${row.planid} (${row.subject_name})`,
      messageText: lineMsg,
    });
  };

  const renderPlanActions = (row, compact = false) => {
    const status = String(row.plan_status || '');
    const isOwner = !isDirector || String(row.people_id) === String(myPeopleId);
    const clipWatchUrl = getYouTubeWatchUrl(row.plan_clip);

    if (isDirector && !isOwner) {
      return (
        <div className={`d-flex ${compact ? 'flex-column' : 'flex-wrap'} align-items-stretch`} style={{ gap: '6px' }}>
          {['1', '4'].includes(status) && (
            <Link
              to={`/appointment?planid=${row.planid}&from=statusplan`}
              className="btn btn-sm btn-primary font-weight-bold shadow-sm"
            >
              <i className="fa-solid fa-clipboard-check mr-1"></i> ตรวจ/แต่งตั้งกรรมการ
            </Link>
          )}
          {status === '2' && (
            <Link
              to={`/appointment?planid=${row.planid}&from=statusplan`}
              className="btn btn-sm btn-outline-primary font-weight-bold"
            >
              <i className="fa-solid fa-user-pen mr-1"></i> แก้ไขกรรมการ
            </Link>
          )}
          {['5', '6', '7'].includes(status) && row.plan_clip && (
            <Link to={`/plan_clip?planid=${row.planid}`} className="btn btn-sm btn-outline-danger font-weight-bold">
              <i className="fa-brands fa-youtube mr-1"></i> ดูคลิปการสอน
            </Link>
          )}
          {['6', '7'].includes(status) && (
            <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-sm btn-success font-weight-bold">
              <i className="fa-solid fa-chart-simple mr-1"></i> ดูผลประเมิน
            </Link>
          )}
          <Link to={`/view_appointment?planid=${row.planid}`} className="btn btn-sm btn-light border text-secondary">
            <i className="fa-solid fa-eye mr-1"></i> รายละเอียดแผน
          </Link>
        </div>
      );
    }

    return (
      <div className={`d-flex ${compact ? 'flex-column' : 'flex-wrap'} align-items-stretch`} style={{ gap: '6px' }}>
        {/* Status 2: Prominent Primary CTA to submit teaching clip */}
        {status === '2' && (
          <Link
            to={`/send_clip?planid=${row.planid}`}
            className="btn btn-sm btn-success font-weight-bold shadow-sm"
          >
            <i className="fa-solid fa-video mr-1"></i> แนบคลิปการสอน
          </Link>
        )}

        {/* Status 3: Returned for revision */}
        {status === '3' && (
          <Link
            to={`/sendplan?planid=${row.planid}`}
            className="btn btn-sm btn-warning text-dark font-weight-bold shadow-sm"
          >
            <i className="fa-solid fa-pen-to-square mr-1"></i> แก้ไขและส่งใหม่
          </Link>
        )}

        {/* Status 1 or 4: Waiting for director */}
        {['1', '4'].includes(status) && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-success font-weight-bold"
              onClick={() => handleShareLineToDirector(row)}
              title="ส่งข้อความแจ้งเตือน ผอ. ผ่าน LINE"
            >
              <i className="fa-brands fa-line mr-1"></i> เตือน ผอ.
            </button>
            <Link to={`/sendplan?planid=${row.planid}`} className="btn btn-sm btn-outline-warning text-dark">
              <i className="fa-solid fa-edit mr-1"></i> แก้ไขแผน
            </Link>
          </>
        )}

        {/* Status 5: Clip submitted, can still view/update clip before scoring starts */}
        {status === '5' && (
          <>
            <Link to={`/send_clip?planid=${row.planid}`} className="btn btn-sm btn-outline-success font-weight-bold">
              <i className="fa-solid fa-pen mr-1"></i> ดู/แก้ไขคลิป
            </Link>
            {clipWatchUrl && (
              <Link to={`/plan_clip?planid=${row.planid}`} className="btn btn-sm btn-light border text-danger">
                <i className="fa-brands fa-youtube mr-1"></i> ดูคลิป
              </Link>
            )}
          </>
        )}

        {/* Status 6: Partially evaluated */}
        {status === '6' && (
          <>
            <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-sm btn-info font-weight-bold shadow-sm">
              <i className="fa-solid fa-chart-line mr-1"></i> ดูผลประเมินเบื้องต้น
            </Link>
            {row.plan_clip && (
              <Link to={`/plan_clip?planid=${row.planid}`} className="btn btn-sm btn-light border text-danger">
                <i className="fa-brands fa-youtube mr-1"></i> ดูคลิป
              </Link>
            )}
          </>
        )}

        {/* Status 7: Completed */}
        {status === '7' && (
          <>
            <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-sm btn-primary font-weight-bold shadow-sm">
              <i className="fa-solid fa-award mr-1"></i> ดูผลคะแนน / เกียรติบัตร
            </Link>
            {row.plan_clip && (
              <Link to={`/plan_clip?planid=${row.planid}`} className="btn btn-sm btn-light border text-danger">
                <i className="fa-brands fa-youtube mr-1"></i> ดูคลิป
              </Link>
            )}
          </>
        )}

        {/* Delete allowed only on status 1 or 3 when no committee appointed */}
        {['1', '3'].includes(status) && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDelete(row)}
            title="ลบแผนการสอนนี้"
          >
            <i className="fa-solid fa-trash mr-1"></i> ลบ
          </button>
        )}
      </div>
    );
  };

  const renderCard = (row, index) => {
    const committeeTotal = [row.committee1, row.committee2, row.committee3, row.committee4, row.committee5].filter(Boolean).length;
    const scoreInfo = scoreStatsByPlan[String(row.planid)] || { evaluatorCount: 0, percentage: 0 };
    const quality = scoreInfo.percentage > 0 ? getQualityBadge(scoreInfo.percentage) : null;
    const schoolNo = schoolPlanRank[row.planid] || index + 1;
    const status = String(row.plan_status || '');

    return (
      <div
        key={`card-${row.planid}`}
        className="card shadow-sm mb-3"
        style={{
          borderRadius: '14px',
          border: status === '3' ? '1px solid #fecaca' : status === '2' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-2 px-3 border-bottom flex-wrap" style={{ gap: '8px' }}>
          <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
            <span className="badge badge-light border text-secondary font-weight-bold">
              ลำดับ #{schoolNo} (รหัส {row.planid})
            </span>
            {isDirector && row.teacher_name && (
              <span className="font-weight-bold text-dark">
                <i className="fa-solid fa-chalkboard-user text-primary mr-1"></i>
                {row.teacher_name}
              </span>
            )}
            <span className="text-muted small">
              {lookups.teachSubjectShort[row.teach_subject_id] || '-'} • {lookups.gradeLevel[row.grade_level_id] || '-'}
            </span>
          </div>
          <StatusBadge status={row.plan_status} />
        </div>

        <div className="card-body p-3">
          <h5 className="font-weight-bold text-dark mb-1" style={{ fontSize: '1rem', lineHeight: 1.4 }}>
            {row.subject_name_plan || row.subject_name || 'ไม่ระบุชื่อแผนการจัดการเรียนรู้'}
          </h5>
          <div className="text-secondary small mb-2">
            <strong>รายวิชา:</strong> {row.subject_name} ({row.subject_code})
            {row.subject_content ? ` • หน่วยการเรียนรู้: ${row.subject_content}` : ''}
          </div>

          <div className="d-flex flex-wrap text-muted small mb-2" style={{ gap: '14px' }}>
            <span>
              <i className="fa-regular fa-calendar mr-1 text-primary"></i>
              ปีการศึกษา {row.edu_year}/{row.edu_term} (งบฯ {row.budget_year})
            </span>
            <span>
              <i className="fa-regular fa-clock mr-1"></i>
              ส่งเมื่อ {formatDate(row.plan_senddate)}
            </span>
          </div>

          {/* Director Revision Feedback Banner */}
          {status === '3' && (
            <div
              className="p-3 rounded mb-3"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderLeft: '4px solid #dc2626',
              }}
            >
              <div className="font-weight-bold text-danger small mb-1">
                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                ข้อเสนอแนะจากผู้อำนวยการสถานศึกษา (กรุณาแก้ไขและส่งใหม่):
              </div>
              <div className="small text-dark" style={{ whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                {row.plan_ds_comment || 'กรุณาตรวจสอบและปรับปรุงแผนการจัดการเรียนรู้ก่อนส่งตรวจอีกครั้ง'}
              </div>
            </div>
          )}

          {/* Ready to attach clip callout */}
          {status === '2' && !isDirector && (
            <div
              className="p-2 px-3 rounded mb-2 d-flex align-items-center justify-content-between flex-wrap"
              style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', gap: '8px' }}
            >
              <span className="small text-success font-weight-bold">
                <i className="fa-solid fa-circle-check mr-1"></i>
                ผอ. อนุมัติแผนแล้ว! ขั้นตอนถัดไปคือแนบลิงก์คลิปการสอนและบันทึกหลังสอน
              </span>
            </div>
          )}

          <div
            className="p-2 px-3 rounded small d-flex justify-content-between align-items-center flex-wrap mb-2"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', gap: '8px' }}
          >
            <span>
              <i className="fa-solid fa-users mr-1 text-secondary"></i>
              กรรมการนิเทศ: <strong>{committeeTotal > 0 ? `${committeeTotal} ท่าน` : 'รอแต่งตั้ง'}</strong>
            </span>
            <div className="d-flex align-items-center" style={{ gap: '8px' }}>
              {scoreInfo.evaluatorCount > 0 ? (
                <Link to={`/view_scoring?planid=${row.planid}`} className="badge badge-success px-2 py-1">
                  ประเมินแล้ว {scoreInfo.evaluatorCount}/{committeeTotal || scoreInfo.evaluatorCount} ท่าน
                  {scoreInfo.percentage > 0 ? ` (${scoreInfo.percentage}%)` : ''}
                </Link>
              ) : (
                <span className="badge badge-light border text-muted px-2 py-1">ยังไม่มีผลประเมิน</span>
              )}
              {quality && status === '7' && (
                <span
                  className="badge px-2 py-1 font-weight-bold"
                  style={{ backgroundColor: quality.bg, color: quality.color, border: `1px solid ${quality.color}40` }}
                >
                  {quality.label}
                </span>
              )}
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center pt-2 mt-2 border-top" style={{ gap: '8px' }}>
            <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
              {row.plan_file && (
                <a href={row.plan_file} target="_blank" rel="noreferrer" className="btn btn-sm btn-light border text-danger">
                  <i className="fa-regular fa-file-pdf mr-1"></i> แผน PDF
                </a>
              )}
              {row.plan_clip && (
                <a href={getYouTubeWatchUrl(row.plan_clip)} target="_blank" rel="noreferrer" className="btn btn-sm btn-light border text-danger">
                  <i className="fa-brands fa-youtube mr-1"></i> YouTube
                </a>
              )}
            </div>
            {renderPlanActions(row, false)}
          </div>
        </div>
      </div>
    );
  };

  const renderTableRow = (row, index) => {
    const committeeTotal = [row.committee1, row.committee2, row.committee3, row.committee4, row.committee5].filter(Boolean).length;
    const scoreInfo = scoreStatsByPlan[String(row.planid)] || { evaluatorCount: 0, percentage: 0 };
    const quality = scoreInfo.percentage > 0 ? getQualityBadge(scoreInfo.percentage) : null;
    const schoolNo = schoolPlanRank[row.planid] || (safePage - 1) * PAGE_SIZE + index + 1;
    const status = String(row.plan_status || '');
    const clipWatchUrl = getYouTubeWatchUrl(row.plan_clip);

    return (
      <tr key={row.planid} style={status === '3' ? { backgroundColor: '#fffafa' } : status === '2' ? { backgroundColor: '#f7fee740' } : undefined}>
        <td className="text-center align-middle">
          <span className="font-weight-bold text-dark" title={`รหัสแผน #${row.planid}`}>
            {schoolNo}
          </span>
          <small className="d-block text-muted">#{row.planid}</small>
        </td>
        {isDirector && (
          <td className="align-middle">
            <strong className="text-dark">{row.teacher_name || '-'}</strong>
          </td>
        )}
        <td className="align-middle">
          <span className="badge badge-light border text-dark">
            {lookups.teachSubjectShort[row.teach_subject_id] || '-'}
          </span>
          <small className="d-block text-muted mt-1">
            {lookups.gradeLevel[row.grade_level_id] || '-'} • {lookups.subjectType[row.subject_type] || row.subject_type || 'พื้นฐาน'}
          </small>
        </td>
        <td className="align-middle" style={{ minWidth: '230px' }}>
          <div className="font-weight-bold text-primary">{row.subject_name_plan || '-'}</div>
          <div className="small text-dark">
            {row.subject_name} <span className="text-muted">({row.subject_code})</span>
          </div>
          {row.subject_content && (
            <small className="text-muted d-block">หน่วย: {row.subject_content}</small>
          )}
          {status === '3' && row.plan_ds_comment && (
            <div
              className="mt-2 p-2 rounded small"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                whiteSpace: 'pre-line',
              }}
            >
              <strong><i className="fa-solid fa-comment-dots mr-1"></i>ผอ. แจ้งแก้ไข:</strong> {row.plan_ds_comment}
            </div>
          )}
        </td>
        <td className="align-middle text-center" style={{ whiteSpace: 'nowrap' }}>
          <div>{row.edu_year}/{row.edu_term}</div>
          <small className="text-muted">งบฯ {row.budget_year}</small>
          <small className="d-block text-muted">{formatDate(row.plan_senddate)}</small>
        </td>
        <td className="align-middle text-center">
          <div className="d-flex justify-content-center align-items-center" style={{ gap: '8px' }}>
            {row.plan_file ? (
              <a
                href={row.plan_file}
                title="เปิดดูแผนการสอน PDF"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-light border text-danger px-2 py-1"
              >
                <i className="fa-regular fa-file-pdf"></i>
              </a>
            ) : (
              <span className="text-muted small">-</span>
            )}
            {clipWatchUrl ? (
              <Link
                to={`/plan_clip?planid=${row.planid}`}
                title="เปิดดูคลิปการสอนและบันทึกหลังสอน"
                className="btn btn-sm btn-light border text-danger px-2 py-1"
              >
                <i className="fa-brands fa-youtube"></i>
              </Link>
            ) : status === '2' && !isDirector ? (
              <Link
                to={`/send_clip?planid=${row.planid}`}
                title="คลิกเพื่อแนบคลิปการสอน"
                className="badge badge-success px-2 py-1"
              >
                + แนบคลิป
              </Link>
            ) : (
              <span className="text-muted small">-</span>
            )}
          </div>
        </td>
        <td className="align-middle text-center">
          {scoreInfo.evaluatorCount > 0 ? (
            <div>
              <Link to={`/view_scoring?planid=${row.planid}`} className="font-weight-bold text-success small d-block">
                <i className="fa-solid fa-check-circle mr-1"></i>
                {scoreInfo.evaluatorCount}/{committeeTotal || scoreInfo.evaluatorCount} ท่าน
              </Link>
              {scoreInfo.percentage > 0 && (
                <span
                  className="badge mt-1 px-2 py-1"
                  style={{
                    backgroundColor: quality?.bg || '#eff6ff',
                    color: quality?.color || '#1d4ed8',
                    fontSize: '11px',
                  }}
                >
                  {scoreInfo.percentage}% {quality ? `• ${quality.label}` : ''}
                </span>
              )}
            </div>
          ) : committeeTotal > 0 ? (
            <span className="text-muted small">0/{committeeTotal} ท่าน</span>
          ) : (
            <span className="text-muted small">รอแต่งตั้ง</span>
          )}
        </td>
        <td className="align-middle">
          <StatusBadge status={row.plan_status} />
        </td>
        <td className="align-middle" style={{ minWidth: '175px' }}>
          {renderPlanActions(row, true)}
        </td>
      </tr>
    );
  };

  if (loading || profileLoading) {
    return <LoadingSpinner text="กำลังโหลดข้อมูลแผนการจัดการเรียนรู้..." fullPage={false} />;
  }

  return (
    <div className="container-fluid py-2">
      <div
        className="card border-0 shadow-sm"
        style={{ borderRadius: '16px', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="card-header bg-white border-bottom py-3 px-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '12px' }}>
            <div>
              <h4 className="font-weight-bold m-0 text-dark" style={{ fontSize: '1.2rem' }}>
                <i className="fa-solid fa-layer-group text-primary mr-2"></i>
                ศูนย์รวมติดตามสถานะแผนและส่งคลิปการสอน
                <span className="badge badge-primary ml-2" style={{ fontSize: '0.8rem' }}>
                  {filteredRows.length} รายการ
                </span>
              </h4>
              <p className="text-muted small mb-0 mt-1">
                {isDirector
                  ? 'ติดตามความก้าวหน้าการส่งแผน แนบคลิปการสอน และผลการประเมินของครูในสถานศึกษา'
                  : 'ตรวจสอบสถานะแผนการจัดการเรียนรู้ แนบลิงก์คลิปการสอน แก้ไขแผนที่ส่งกลับ และดาวน์โหลดเกียรติบัตร ว.PA'}
              </p>
            </div>

            <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
              {!isDirector && (
                <Link to="/sendplan" className="btn btn-primary btn-sm font-weight-bold shadow-sm px-3" style={{ borderRadius: '8px' }}>
                  <i className="fa-solid fa-plus mr-1"></i> ส่งแผนการสอนใหม่
                </Link>
              )}
              <div className="btn-group btn-group-sm" role="group" aria-label="สลับมุมมอง">
                <button
                  type="button"
                  className={`btn ${viewMode === 'auto' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('auto')}
                  title="ปรับอัตโนมัติตามขนาดหน้าจอ"
                >
                  อัตโนมัติ
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'card' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('card')}
                >
                  <i className="fa-solid fa-grip-vertical mr-1"></i> การ์ด
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'table' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('table')}
                >
                  <i className="fa-solid fa-table-list mr-1"></i> ตาราง
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          {/* Latest Plan Progress Stepper for Teachers */}
          {!isDirector && rows.length > 0 && (
            <div
              className="p-3 rounded mb-4"
              style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
            >
              <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap" style={{ gap: '6px' }}>
                <span className="small font-weight-bold text-dark">
                  <i className="fa-solid fa-route mr-1 text-primary"></i>
                  สถานะแผนล่าสุดของท่าน:
                </span>
                <span className="small text-primary font-weight-bold">
                  {rows[0]?.subject_name_plan || rows[0]?.subject_name || ''} (#{rows[0]?.planid})
                </span>
              </div>
              <PlanTimelineStepper currentStatus={rows[0]?.plan_status || '1'} />
            </div>
          )}

          {/* Filter Pills + Search */}
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 pb-3 border-bottom" style={{ gap: '12px' }}>
            <div className="d-flex flex-wrap" style={{ gap: '6px' }} role="tablist" aria-label="กรองตามสถานะแผน">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.key;
                const count = filterCounts[tab.key] || 0;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleFilterChange(tab.key)}
                    className={`btn btn-sm ${isActive ? `${tab.activeClass} font-weight-bold shadow-sm` : 'btn-light border text-secondary'}`}
                    style={{ borderRadius: '999px', padding: '5px 14px' }}
                  >
                    <i className={`fa-solid ${tab.icon} mr-1`}></i>
                    {tab.label}
                    <span
                      className={`badge ml-1 ${isActive ? 'badge-light text-dark' : 'badge-secondary'}`}
                      style={{ borderRadius: '999px' }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="input-group input-group-sm" style={{ maxWidth: '290px' }}>
              <div className="input-group-prepend">
                <span className="input-group-text bg-white">
                  <i className="fa-solid fa-magnifying-glass text-muted"></i>
                </span>
              </div>
              <input
                type="text"
                className="form-control"
                placeholder={isDirector ? 'ค้นหาครู, วิชา, รหัสวิชา, ชื่อแผน...' : 'ค้นหาชื่อแผน, หน่วย, รหัสวิชา...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <div className="input-group-append">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSearchTerm('')}
                    title="ล้างคำค้นหา"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {filteredRows.length === 0 ? (
            <EmptyState
              fullPage={false}
              title={activeFilter === 'clip' ? 'ไม่มีแผนที่รอส่งคลิปการสอน' : 'ไม่พบรายการแผนการจัดการเรียนรู้'}
              message={
                searchTerm
                  ? 'ไม่พบแผนการจัดการเรียนรู้ที่ตรงกับคำค้นหา'
                  : activeFilter === 'clip'
                    ? 'ขณะนี้ไม่มีแผนการสอนที่อยู่ในสถานะรอแนบคลิปวิดีโอ (แผนต้องผ่านการอนุมัติจาก ผอ. ก่อน)'
                    : 'ยังไม่มีข้อมูลแผนการสอนในหมวดหมู่นี้'
              }
            >
              {activeFilter !== 'all' || searchTerm ? (
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm font-weight-bold px-3"
                  onClick={() => {
                    setSearchTerm('');
                    handleFilterChange('all');
                  }}
                >
                  <i className="fa-solid fa-rotate-left mr-1"></i> แสดงแผนทั้งหมด
                </button>
              ) : !isDirector ? (
                <Link to="/sendplan" className="btn btn-primary btn-sm font-weight-bold px-3">
                  <i className="fa-solid fa-plus mr-1"></i> เริ่มส่งแผนการสอนแผนแรก
                </Link>
              ) : null}
            </EmptyState>
          ) : (
            <>
              {/* Card View (Mobile default) */}
              <div className={viewMode === 'card' ? 'd-block' : viewMode === 'table' ? 'd-none' : 'd-block d-lg-none'}>
                {paginatedRows.map((row, idx) => renderCard(row, idx))}
              </div>

              {/* Desktop Table View */}
              <div className={`table-responsive ${viewMode === 'table' ? 'd-block' : viewMode === 'card' ? 'd-none' : 'd-none d-lg-block'}`}>
                <table className="table table-bordered table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '65px' }} className="text-center">ลำดับ</th>
                      {isDirector && <th style={{ minWidth: '150px' }}>ครูผู้สอน</th>}
                      <th style={{ minWidth: '130px' }}>กลุ่มสาระ / ชั้น</th>
                      <th>แผนการจัดการเรียนรู้ / รายวิชา</th>
                      <th className="text-center">ปีการศึกษา</th>
                      <th style={{ width: '95px' }} className="text-center">ไฟล์/คลิป</th>
                      <th style={{ width: '130px' }} className="text-center">ผลประเมิน</th>
                      <th style={{ width: '165px' }}>สถานะ</th>
                      <th style={{ width: '185px' }}>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, idx) => renderTableRow(row, idx))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center flex-wrap mt-3 pt-3 border-top" style={{ gap: '10px' }}>
                  <span className="small text-muted">
                    แสดงรายการที่ {(safePage - 1) * PAGE_SIZE + 1} - {Math.min(safePage * PAGE_SIZE, filteredRows.length)} จากทั้งหมด {filteredRows.length} แผน
                  </span>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <i className="fa-solid fa-chevron-left mr-1"></i> ก่อนหน้า
                    </button>
                    <span className="btn btn-light border disabled font-weight-bold text-dark">
                      หน้า {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      ถัดไป <i className="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusPlan;
