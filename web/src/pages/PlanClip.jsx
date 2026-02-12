import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const useQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};

const PlanClip = () => {
  const query = useQuery();
  const planid = query.get('planid') || '';
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [lookups, setLookups] = useState({
    prefix: {},
    teachSubject: {},
    gradeLevel: {},
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
          .eq('planid', planid)
          .maybeSingle();

        const [teacherRes, prefixRes, subjectRes, gradeRes] = await Promise.all([
          supabase.from('tbl_Users').select('*').eq('people_id', planData?.people_id || '').maybeSingle(),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
        ]);

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });
        const teachSubjectMap = {};
        subjectRes.data?.forEach((s) => { teachSubjectMap[s.teach_subject_id] = s.teach_subject; });
        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        if (mounted) {
          setPlan(planData || null);
          setTeacher(teacherRes.data || null);
          setLookups({ prefix: prefixMap, teachSubject: teachSubjectMap, gradeLevel: gradeMap });
        }
      } catch (err) {
        console.error('PlanClip load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [planid]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!plan) {
    return <div className="alert alert-warning">ไม่พบข้อมูลคลิปการสอน</div>;
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title">คลิปการสอน</h3>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-6">
                <strong>ชื่อ-นามสกุล : </strong>{lookups.prefix[teacher?.prefix] || ''}{teacher?.name || ''} {teacher?.lastname || ''}<br />
                <strong>กลุ่มสาระ : </strong>{lookups.teachSubject[plan.teach_subject_id] || ''}<br />
                <strong>ระดับชั้น : </strong>{lookups.gradeLevel[plan.grade_level_id] || ''}<br />
                <strong>ปีการศึกษา : </strong>{plan.edu_year}/{plan.edu_term}<br />
                <strong>ชื่อวิชา : </strong>{plan.subject_name}<br />
                <strong>เรื่องที่สอน : </strong>{plan.subject_content}<br />
              </div>
              <div className="col-6">
                {plan.plan_clip ? (
                  <iframe
                    width="560"
                    height="315"
                    src={`https://www.youtube.com/embed/${plan.plan_clip}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="text-danger">ยังไม่มีคลิปการสอน</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanClip;
