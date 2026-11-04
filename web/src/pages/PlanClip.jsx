import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '../utils/scoreCalculator';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const PlanClip = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [lookups, setLookups] = useState({
    prefix: {},
    teachSubject: {},
    gradeLevel: {},
    school: {},
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

        const [teacherRes, prefixRes, subjectRes, gradeRes, schoolRes] = await Promise.all([
          planData?.people_id
            ? supabase.from('tbl_Users').select('*').eq('people_id', planData.people_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_school').select('school_id, school_name'),
        ]);

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });
        const teachSubjectMap = {};
        subjectRes.data?.forEach((s) => { teachSubjectMap[s.teach_subject_id] = s.teach_subject; });
        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });
        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });

        if (mounted) {
          setPlan(planData || null);
          setTeacher(teacherRes.data || null);
          setLookups({
            prefix: prefixMap,
            teachSubject: teachSubjectMap,
            gradeLevel: gradeMap,
            school: schoolMap,
          });
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

  const embedUrl = useMemo(() => {
    return plan?.plan_clip ? getYouTubeEmbedUrl(plan.plan_clip) : '';
  }, [plan]);

  const watchUrl = useMemo(() => {
    return plan?.plan_clip ? getYouTubeWatchUrl(plan.plan_clip) : '';
  }, [plan]);

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดคลิปวิดีโอการสอน..." />;
  }

  if (!plan) {
    return (
      <EmptyState
        title="คลิปการสอน"
        message="ไม่พบข้อมูลแผนการสอน หรือยังไม่ได้ระบุรหัสแผน"
        actionLabel="กลับหน้ารายการแผน"
        actionTo="/statusplan"
      />
    );
  }

  const pfx = lookups.prefix[teacher?.prefix] || '';
  const teacherFullName = teacher?.name ? `${pfx}${teacher.name} ${teacher.lastname || ''}`.trim() : plan.people_id;
  const schoolName = lookups.school[plan.school_code] || teacher?.school || '';

  return (
    <div className="container-fluid py-3">
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h4 className="font-weight-bold m-0 text-success">
              <i className="fa-brands fa-youtube mr-2 text-danger"></i>
              คลิปวิดีโอการสอน: {plan.subject_name_plan || plan.subject_name}
            </h4>
            <small className="text-muted">
              รหัสแผน #{plan.planid} • {plan.subject_name} ({plan.subject_code || '-'})
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-danger btn-sm font-weight-bold"
              >
                <i className="fa-brands fa-youtube mr-1"></i> เปิดใน YouTube
              </a>
            )}
            <button
              type="button"
              className="btn btn-light border btn-sm"
              onClick={() => navigate(-1)}
            >
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </button>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="row g-4">
            {/* Left Column: Responsive 16:9 Video Player */}
            <div className="col-lg-7 col-12">
              <div className="card border-0 bg-dark rounded-lg overflow-hidden shadow-sm">
                {embedUrl ? (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                    <iframe
                      title="YouTube clip player"
                      src={embedUrl}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="p-5 text-center text-white-50">
                    <i className="fa-brands fa-youtube fa-3x mb-3 text-secondary"></i>
                    <p className="mb-0">ไม่พบลิงก์วิดีโอคลิปการสอน หรือรูปแบบ URL ไม่ถูกต้อง</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Plan Metadata & Reflection */}
            <div className="col-lg-5 col-12">
              <div className="card border h-100 bg-light p-3" style={{ borderRadius: '10px' }}>
                <h5 className="font-weight-bold text-dark mb-3 border-bottom pb-2">
                  <i className="fa-solid fa-circle-info text-primary mr-2"></i> ข้อมูลการจัดการเรียนรู้
                </h5>

                <div className="mb-2">
                  <span className="text-muted small d-block">ครูผู้สอน:</span>
                  <strong className="text-dark">{teacherFullName}</strong>
                  {schoolName && <span className="text-muted small d-block">โรงเรียน{schoolName}</span>}
                </div>

                <div className="mb-2">
                  <span className="text-muted small d-block">วิชา / กลุ่มสาระฯ:</span>
                  <div>
                    <span className="badge badge-primary mr-1">
                      {lookups.teachSubject[plan.teach_subject_id] || '-'}
                    </span>
                    <span className="badge badge-secondary">
                      ชั้น {lookups.gradeLevel[plan.grade_level_id] || '-'}
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-muted small d-block">หน่วยการเรียนรู้:</span>
                  <div className="text-dark">{plan.subject_content || '-'}</div>
                </div>

                <div className="mb-3">
                  <span className="text-muted small d-block">ปีการศึกษา / ภาคเรียน:</span>
                  <span className="text-dark font-weight-bold">ปี {plan.edu_year || '-'} / ภาคเรียนที่ {plan.edu_term || '-'}</span>
                </div>

                {/* Reflection Notes */}
                <div className="pt-2 border-top mt-auto">
                  <h6 className="font-weight-bold text-dark mb-2">
                    <i className="fa-solid fa-pen-nib text-success mr-1"></i> บันทึกหลังการสอน (Reflection):
                  </h6>
                  {plan.plan_after_teaching ? (
                    <div
                      className="p-3 bg-white border rounded small text-dark"
                      style={{ whiteSpace: 'pre-line', maxHeight: '180px', overflowY: 'auto' }}
                    >
                      {plan.plan_after_teaching}
                    </div>
                  ) : (
                    <div className="p-3 bg-white border rounded small text-muted font-italic">
                      ยังไม่มีการบันทึกหลังการสอน
                    </div>
                  )}
                </div>

                {plan.plan_file && (
                  <div className="mt-3">
                    <a
                      href={plan.plan_file}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-danger btn-block btn-sm font-weight-bold"
                    >
                      <i className="fa-regular fa-file-pdf mr-1"></i> เปิดดูเอกสารแผนการสอน (PDF)
                    </a>
                  </div>
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