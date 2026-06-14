import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
};

const StatusPlanClip = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const roleId = getRoleId(user);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({
    teachSubjectShort: {},
    gradeLevel: {},
    status: {},
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!profile && roleId === 'directorschool') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [subjectRes, gradeRes, statusRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject_1, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan_status').select('id, status_name'),
        ]);

        const teachSubjectShortMap = {};
        subjectRes.data?.forEach((s) => {
          teachSubjectShortMap[s.teach_subject_id] = s.teach_subject_1 || s.teach_subject;
        });

        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        const statusMap = {};
        statusRes.data?.forEach((s) => { statusMap[String(s.id)] = s.status_name; });

        let plans = [];
        if (roleId === 'directorschool') {
          plans = (await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('school_code', profile?.school)
            .eq('plan_status', '5')).data || [];
        } else {
          const peopleId = profile?.people_id || user?.email || '';
          plans = (await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('people_id', peopleId)).data || [];
        }

        if (mounted) {
          setLookups({ teachSubjectShort: teachSubjectShortMap, gradeLevel: gradeMap, status: statusMap });
          setRows(plans);
        }
      } catch (err) {
        console.error('StatusPlanClip load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [roleId, profile, profileLoading, user]);

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
                      <th>ชื่อวิชา (รหัสวิชา)</th>
                      <th>หน่วยการเรียนรู้</th>
                      <th>ชื่อแผนการสอน</th>
                      <th><i className="fa-brands fa-youtube text-danger"></i></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={roleId === 'directorschool' ? 10 : 7}>
                        <h4 className="text-center text-danger">ยังไม่มีข้อมูล</h4>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, index) => (
                    <tr key={row.planid}>
                      <td className="text-center">{index + 1}</td>
                      <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
                      <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
                      <td>{row.subject_name} ({row.subject_code})</td>
                      <td>{row.subject_content}</td>
                      <td>{row.subject_name_plan}</td>
                      {roleId === 'directorschool' ? (
                        <>
                          <td>{row.edu_year}/{row.edu_term} (ปีงบประมาณ {row.budget_year})</td>
                          <td>{row.plan_senddate}</td>
                          <td className="text-center">
                            {row.plan_file && (
                              <a href={row.plan_file} target="_blank" rel="noreferrer"><i className="fa-regular fa-file-pdf fa-2xl"></i></a>
                            )}
                          </td>
                          <td><Link to={`/plan_clip?planid=${row.planid}`}>คลิปการสอน</Link></td>
                        </>
                      ) : (
                        <td>
                          {lookups.status[String(row.plan_status)] || ''}
                          <br />
                          {String(row.plan_status) === '2' && (
                            <Link to={`/send_clip?planid=${row.planid}`} title="ส่งคลิปการสอน" className="btn btn-danger btn-xs">
                              <i className="fa-regular fa-paper-plane"></i>
                            </Link>
                          )}
                          {String(row.plan_status) === '5' && row.plan_clip && (
                            <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} title="ดูคลิปการสอน" target="_blank" rel="noreferrer">
                              <i className="fa-brands fa-youtube text-danger"></i>
                            </a>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPlanClip;
