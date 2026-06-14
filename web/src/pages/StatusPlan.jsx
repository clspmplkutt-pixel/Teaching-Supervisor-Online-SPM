import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
};

const statusBadgeClass = (status) => {
  if (String(status) === '1') return 'badge-warning';
  if (String(status) === '2') return 'badge-success';
  if (String(status) === '3') return 'badge-danger';
  return 'badge-info';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const StatusPlan = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const roleId = getRoleId(user);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [schoolPlanRank, setSchoolPlanRank] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [lookups, setLookups] = useState({
    teachSubject: {},
    teachSubjectShort: {},
    gradeLevel: {},
    status: {},
    prefix: {},
    subjectType: {},
  });
  const [scoreMap, setScoreMap] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!profile && roleId === 'directorschool') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [subjectRes, gradeRes, statusRes, prefixRes, subjectTypeRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject, teach_subject_1'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan_status').select('id, status_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_SubjectType').select('subjecttype_id, subjecttype_name'),
        ]);

        const teachSubjectMap = {};
        const teachSubjectShortMap = {};
        subjectRes.data?.forEach((s) => {
          teachSubjectMap[s.teach_subject_id] = s.teach_subject;
          teachSubjectShortMap[s.teach_subject_id] = s.teach_subject_1 || s.teach_subject;
        });

        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        const statusMap = {};
        statusRes.data?.forEach((s) => { statusMap[String(s.id)] = s.status_name; });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });

        const subjectTypeMap = {};
        subjectTypeRes.data?.forEach((t) => { subjectTypeMap[t.subjecttype_id] = t.subjecttype_name; });

        let plans = [];
        let schoolCode = profile?.school || '';

        if (roleId === 'directorschool') {
          plans = (await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('school_code', profile?.school)
            .eq('plan_status', '1')).data || [];
        } else {
          const peopleId = profile?.people_id || user?.email || '';
          // ดึงแผนของครูคนนี้ก่อนเพื่อรู้ school_code
          const { data: myPlans } = await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('people_id', peopleId);
          plans = myPlans || [];
          // ดึง school_code จากโปรไฟล์หรือจากแผน
          if (!schoolCode && plans.length > 0) {
            schoolCode = plans[0].school_code || '';
          }
        }

        // คำนวณลำดับแผนภายในโรงเรียน (school_plan_no)
        // ดึงแผนทั้งหมดของโรงเรียน (เฉพาะ planid) เพื่อสร้าง rank
        let rankMap = {};
        if (schoolCode) {
          const { data: allSchoolPlans } = await supabase
            .from('tbl_sendplan')
            .select('planid')
            .eq('school_code', schoolCode)
            .order('planid', { ascending: true });
          if (allSchoolPlans) {
            allSchoolPlans.forEach((p, idx) => {
              rankMap[p.planid] = idx + 1;
            });
          }
        }

        if (roleId === 'directorschool' && plans.length > 0) {
          const teacherIds = Array.from(new Set(plans.map((p) => p.people_id).filter(Boolean)));
          const { data: teachers } = await supabase
            .from('tbl_Users')
            .select('people_id, prefix, name, lastname')
            .in('people_id', teacherIds);
          const teacherMap = {};
          teachers?.forEach((t) => {
            teacherMap[t.people_id] = `${prefixMap[t.prefix] || ''}${t.name} ${t.lastname}`;
          });
          plans = plans.map((plan) => ({ ...plan, teacher_name: teacherMap[plan.people_id] || '' }));
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
        }

        if (roleId !== 'directorschool' && plans.length > 0) {
          const planIds = plans.map((p) => p.planid);
          const { data: scores } = await supabase
            .from('tbl_sendplan_score')
            .select('planid, supervision')
            .in('planid', planIds);

          const scoreCountMap = {};
          scores?.forEach((s) => {
            if (!scoreCountMap[s.planid]) scoreCountMap[s.planid] = new Set();
            scoreCountMap[s.planid].add(s.supervision);
          });

          const result = {};
          Object.keys(scoreCountMap).forEach((planid) => {
            result[planid] = scoreCountMap[planid].size;
          });

          if (mounted) setScoreMap(result);
        }
      } catch (err) {
        console.error('StatusPlan load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [roleId, profile, profileLoading, user]);

  const totalColumns = roleId === 'directorschool' ? 12 : 13;

  const renderTeacherRow = (row, index) => {
    const committeeTotal = [row.committee1, row.committee2, row.committee3, row.committee4, row.committee5].filter(Boolean).length;
    const scoringCount = scoreMap[row.planid] || 0;
    const canEdit = ['1', '3', '4'].includes(String(row.plan_status));
    const schoolNo = schoolPlanRank[row.planid] || (index + 1);

    return (
      <tr key={row.planid}>
        <td className="text-center">
          <span title={`รหัสแผนระบบ: ${row.planid}`}>{schoolNo}</span>
        </td>
        <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
        <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
        <td><span className="badge badge-secondary">{lookups.subjectType[row.subject_type] || row.subject_type || 'พื้นฐาน'}</span></td>
        <td>{row.subject_content}</td>
        <td>{row.subject_name_plan}</td>
        <td>{row.edu_year}/{row.edu_term}<br />(ปีงบ {row.budget_year})</td>
        <td>{formatDate(row.plan_senddate)}</td>
        <td className="text-center">
          {row.plan_file && (
            <a href={row.plan_file} title="แผน" target="_blank" rel="noreferrer"><i className="fa-regular fa-file-pdf fa-lg"></i></a>
          )}
        </td>
        <td className="text-center">
          {row.plan_clip && (
            <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} title="ดูคลิปการสอน" target="_blank" rel="noreferrer">
              <i className="fa-brands fa-youtube text-danger"></i>
            </a>
          )}
        </td>
        <td className="text-center">
          {scoringCount > 0 ? (
            <Link to={`/view_scoring?planid=${row.planid}`} title="ดูผลการประเมิน">
              <i className="fa-solid fa-check-circle text-success"></i><br />
              ประเมินแล้ว {scoringCount} คน
            </Link>
          ) : (
            <i className="fa-solid fa-circle text-danger"></i>
          )}
          {committeeTotal > 0 ? ` / ${committeeTotal} คน` : ''}
        </td>
        <td>
          <span className={`badge ${statusBadgeClass(row.plan_status)}`}>{lookups.status[String(row.plan_status)] || ''}</span>
          {String(row.plan_status) === '3' && row.plan_ds_comment && (
            <div className="mt-1">หมายเหตุ: {row.plan_ds_comment}</div>
          )}
        </td>
        <td className="text-center">
          {canEdit ? (
            <Link to={`/sendplan?planid=${row.planid}`} className="btn btn-sm btn-warning">
              <i className="fa-solid fa-edit"></i> แก้ไข
            </Link>
          ) : (
            <span className="text-muted"><i className="fa-solid fa-lock"></i> ล็อคแล้ว</span>
          )}
        </td>
      </tr>
    );
  };

  const renderDirectorRow = (row, index) => {
    const schoolNo = schoolPlanRank[row.planid] || (index + 1);
    return (
      <tr key={row.planid}>
        <td className="text-center">
          <span title={`รหัสแผนระบบ: ${row.planid}`}>{schoolNo}</span>
        </td>
        <td className="text-center">{row.teacher_name || ''}</td>
        <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
        <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
        <td><span className="badge badge-secondary">{lookups.subjectType[row.subject_type] || row.subject_type || 'พื้นฐาน'}</span></td>
        <td>{row.subject_name} ({row.subject_code})</td>
        <td>{row.subject_content}</td>
        <td>{row.subject_name_plan}</td>
        <td>{row.edu_year}/{row.edu_term} (ปีงบประมาณ {row.budget_year})</td>
        <td>{formatDate(row.plan_senddate)}</td>
        <td className="text-center">
          {row.plan_file && (
            <a href={row.plan_file} target="_blank" rel="noreferrer"><i className="fa-regular fa-file-pdf fa-2xl"></i></a>
          )}
        </td>
        <td>
          <Link to={`/appointment?planid=${row.planid}`} className="btn btn-info">ตรวจ/แต่งตั้ง</Link>
        </td>
      </tr>
    );
  };

  const enrichedRows = useMemo(() => {
    let filteredRows = rows;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filteredRows = rows.filter(r => 
        (r.subject_name_plan && r.subject_name_plan.toLowerCase().includes(lowerTerm)) ||
        (r.subject_content && r.subject_content.toLowerCase().includes(lowerTerm)) ||
        (r.teacher_name && r.teacher_name.toLowerCase().includes(lowerTerm)) ||
        (r.planid && String(r.planid).includes(lowerTerm))
      );
    }
    if (roleId !== 'directorschool') return filteredRows;
    return filteredRows.map((row) => {
      return { ...row };
    });
  }, [rows, roleId, searchTerm]);

  if (loading || profileLoading) {
    return <LoadingSpinner fullPage={false} />;
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-primary card-outline">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0"><i className="fa-solid fa-school-circle-check"></i> สถานะแผนการส่ง</h3>
            <div className="card-tools ml-auto">
                <div className="input-group input-group-sm" style={{ width: '250px' }}>
                    <input type="text" className="form-control float-right" placeholder="ค้นหาชื่อแผน / หน่วย / รหัส..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <div className="input-group-append">
                        <button type="button" className="btn btn-default" disabled>
                            <i className="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped" id="data">
                <thead>
                  {roleId === 'directorschool' ? (
                    <tr>
                      <th>ที่</th>
                      <th>ครู</th>
                      <th>กลุ่มสาระ (ย่อ)</th>
                      <th>ระดับชั้น</th>
                      <th>ประเภทวิชา</th>
                      <th>ชื่อวิชา (รหัสวิชา)</th>
                      <th>หน่วยการเรียนรู้</th>
                      <th>ชื่อแผนการสอน</th>
                      <th>ปีการศึกษา/ภาคเรียน (ปีงบประมาณ)</th>
                      <th>วันที่ส่ง</th>
                      <th>ไฟล์แผนการสอน</th>
                      <th>สถานะ</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>ที่</th>
                      <th>กลุ่มสาระ (ย่อ)</th>
                      <th>ระดับชั้น</th>
                      <th>ประเภทวิชา</th>
                      <th>หน่วยการเรียนรู้</th>
                      <th>ชื่อแผนการสอน</th>
                      <th>ปีการศึกษา/ภาคเรียน (ปีงบประมาณ)</th>
                      <th>วันที่ส่ง</th>
                      <th>แผน</th>
                      <th>คลิป</th>
                      <th>ผลประเมิน</th>
                      <th>สถานะ</th>
                      <th>การจัดการ</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={totalColumns} style={{ padding: 0 }}>
                        <EmptyState fullPage={false} message="ยังไม่มีข้อมูลแผนการส่ง" />
                      </td>
                    </tr>
                  )}
                  {roleId === 'directorschool'
                    ? enrichedRows.map(renderDirectorRow)
                    : enrichedRows.map(renderTeacherRow)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPlan;
