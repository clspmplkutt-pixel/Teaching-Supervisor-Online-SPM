import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
};

const statusBadgeClass = (status) => {
  if (String(status) === '1') return 'badge-warning';
  if (String(status) === '2') return 'badge-success';
  if (String(status) === '3') return 'badge-danger';
  return 'badge-info';
};

const StatusPlan = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const roleId = getRoleId(user);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({
    teachSubject: {},
    teachSubjectShort: {},
    gradeLevel: {},
    status: {},
    prefix: {},
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
        const [subjectRes, gradeRes, statusRes, prefixRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject, teach_subject_1'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan_status').select('id, status_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
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

        let plans = [];
        if (roleId === 'directorschool') {
          plans = (await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('school_code', profile?.school)
            .eq('plan_status', '1')).data || [];
        } else {
          const peopleId = profile?.people_id || user?.email || '';
          plans = (await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('people_id', peopleId)).data || [];
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
          });
          setRows(plans);
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

  const totalColumns = roleId === 'directorschool' ? 11 : 11;

  const renderTeacherRow = (row) => {
    const committeeTotal = [row.committee1, row.committee2, row.committee3, row.committee4, row.committee5].filter(Boolean).length;
    const scoringCount = scoreMap[row.planid] || 0;

    return (
      <tr key={row.planid}>
        <td className="text-center">{row.planid}</td>
        <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
        <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
        <td>{row.subject_content}</td>
        <td>{row.subject_name_plan}</td>
        <td>{row.edu_year}/{row.edu_term}<br />(ปีงบ {row.budget_year})</td>
        <td>{row.plan_senddate}</td>
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
      </tr>
    );
  };

  const renderDirectorRow = (row) => {
    return (
      <tr key={row.planid}>
        <td className="text-center">{row.planid}</td>
        <td className="text-center">{row.teacher_name || ''}</td>
        <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
        <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
        <td>{row.subject_name} ({row.subject_code})</td>
        <td>{row.subject_content}</td>
        <td>{row.subject_name_plan}</td>
        <td>{row.edu_year}/{row.edu_term} (ปีงบประมาณ {row.budget_year})</td>
        <td>{row.plan_senddate}</td>
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
    if (roleId !== 'directorschool') return rows;
    return rows.map((row) => {
      return { ...row };
    });
  }, [rows, roleId]);

  if (loading || profileLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> สถานะแผนการส่ง</h3>
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
                      <th>หน่วยการเรียนรู้</th>
                      <th>ชื่อแผนการสอน</th>
                      <th>ปีการศึกษา/ภาคเรียน (ปีงบประมาณ)</th>
                      <th>วันที่ส่ง</th>
                      <th>แผน</th>
                      <th>คลิป</th>
                      <th>ผลประเมิน</th>
                      <th>สถานะ</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={totalColumns}>
                        <h4 className="text-center text-danger">ยังไม่มีข้อมูล</h4>
                      </td>
                    </tr>
                  )}
                  {roleId === 'directorschool'
                    ? enrichedRows.map(renderDirectorRow)
                    : rows.map(renderTeacherRow)}
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
