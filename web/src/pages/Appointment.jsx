import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const useQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};

const Appointment = ({ readOnly = false }) => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const { profile, loading: profileLoading } = useUserProfile();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [lookups, setLookups] = useState({
    prefix: {},
    position: {},
    academic: {},
    school: {},
    teachSubject: {},
    gradeLevel: {},
    competency: {},
    ability21: {},
    desirable: {},
    indicator: {},
  });

  const [committeeOptions, setCommitteeOptions] = useState([]);

  const [form, setForm] = useState({
    plan_approve: '',
    plan_ds_comment: '',
    committee1: '',
    committee2: '',
    committee3: '',
    committee4: '',
    committee5: '',
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

        if (!planData) {
          if (mounted) setLoading(false);
          return;
        }

        const [teacherRes, prefixRes, positionRes, academicRes, schoolRes, teachRes, gradeRes, competencyRes, abilityRes, desirableRes, indicatorRes] = await Promise.all([
          supabase.from('tbl_Users').select('*').eq('people_id', planData.people_id).maybeSingle(),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name'),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
          supabase.from('tbl_school').select('school_id, school_name'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_system_Competency').select('competency_id, competency_name'),
          supabase.from('tbl_ability21').select('ability21_id, ability21_name_th'),
          supabase.from('tbl_system_Desirable').select('desirable_id, desirable_name'),
          supabase.from('tbl_indicators').select('indicators_name, indicators_details'),
        ]);

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });
        const positionMap = {};
        positionRes.data?.forEach((p) => { positionMap[p.position_id] = p.position_name; });
        const academicMap = {};
        academicRes.data?.forEach((a) => { academicMap[a.academic_id] = a.academic_standing; });
        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });
        const teachMap = {};
        teachRes.data?.forEach((t) => { teachMap[t.teach_subject_id] = t.teach_subject; });
        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });
        const competencyMap = {};
        competencyRes.data?.forEach((c) => { competencyMap[c.competency_id] = c.competency_name; });
        const abilityMap = {};
        abilityRes.data?.forEach((a) => { abilityMap[a.ability21_id] = a.ability21_name_th; });
        const desirableMap = {};
        desirableRes.data?.forEach((d) => { desirableMap[d.desirable_id] = d.desirable_name; });
        const indicatorMap = {};
        indicatorRes.data?.forEach((i) => { indicatorMap[i.indicators_name] = i.indicators_details; });

        // 1. Fetch approved nominations from tbl_EvaluatorNominations
        let approvedNomineeIds = new Set();
        try {
          const { data: approvedNominations, error: nomError } = await supabase
            .from('tbl_EvaluatorNominations')
            .select('nominee_people_id')
            .eq('status', 'approved');
          
          if (!nomError && approvedNominations) {
            approvedNominations.forEach((n) => {
              if (n.nominee_people_id) {
                approvedNomineeIds.add(n.nominee_people_id);
              }
            });
          }
        } catch (err) {
          console.warn('Failed to fetch evaluator nominations:', err);
        }

        // 2. Fetch all confirmed users with levels of interest
        const { data: committeeData } = await supabase
          .from('tbl_Users')
          .select('people_id, prefix, name, lastname, school, level')
          .eq('register_isConfirm', '1')
          .in('level', ['districdirector', 'supervisor', 'supervision', 'directorschool', 'teacher'])
          .order('school', { ascending: true })
          .order('name', { ascending: true });

        // 3. Filter users: keep non-teachers with target roles, and teachers ONLY if approved as evaluators
        const filteredCommitteeData = (committeeData || []).filter((row) => {
          if (['districdirector', 'supervisor', 'supervision', 'directorschool'].includes(row.level)) {
            return true;
          }
          if (row.level === 'teacher') {
            return approvedNomineeIds.has(row.people_id);
          }
          return false;
        });

        const options = filteredCommitteeData.map((row) => ({
          value: row.people_id,
          label: `${prefixMap[row.prefix] || ''}${row.name} ${row.lastname} (${schoolMap[row.school] || ''})`,
        }));

        if (mounted) {
          setPlan(planData);
          setTeacher(teacherRes.data || null);
          setLookups({
            prefix: prefixMap,
            position: positionMap,
            academic: academicMap,
            school: schoolMap,
            teachSubject: teachMap,
            gradeLevel: gradeMap,
            competency: competencyMap,
            ability21: abilityMap,
            desirable: desirableMap,
            indicator: indicatorMap,
          });
          setCommitteeOptions(options);
          setForm((prev) => ({
            ...prev,
            plan_approve: planData.plan_approve || '',
            plan_ds_comment: planData.plan_ds_comment || '',
            committee1: planData.committee1 || '',
            committee2: planData.committee2 || '',
            committee3: planData.committee3 || '',
            committee4: planData.committee4 || '',
            committee5: planData.committee5 || '',
          }));
        }
      } catch (err) {
        console.error('Appointment load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [planid, profileLoading]);

  // ── Select2 สำหรับ dropdown กรรมการ ──
  const select2InitRef = useRef(false);
  useEffect(() => {
    const $ = window.$;
    if (!$ || !$.fn || !$.fn.select2) return;
    if (loading || committeeOptions.length === 0) return;

    const timeout = setTimeout(() => {
      [1, 2, 3, 4, 5].forEach((num) => {
        const $el = $(`#committee${num}`);
        if (!$el.length) return;
        try { $el.select2('destroy'); } catch { /* noop */ }
        $el.select2({
          theme: 'bootstrap4',
          width: '100%',
          placeholder: `ค้นหากรรมการท่านที่ ${num}...`,
          allowClear: true,
        });
        // sync Select2 value → React state
        $el.on('change.select2commit', function () {
          const val = $(this).val() || '';
          setForm((prev) => ({ ...prev, [`committee${num}`]: val }));
        });
      });
      select2InitRef.current = true;
    }, 100);

    return () => {
      clearTimeout(timeout);
      [1, 2, 3, 4, 5].forEach((num) => {
        try {
          const $el = $(`#committee${num}`);
          $el.off('change.select2commit');
          $el.select2('destroy');
        } catch { /* noop */ }
      });
      select2InitRef.current = false;
    };
  }, [loading, committeeOptions.length]);

  // sync React form state → Select2 UI เมื่อ form.committeeX เปลี่ยน
  useEffect(() => {
    const $ = window.$;
    if (!$ || !select2InitRef.current) return;
    [1, 2, 3, 4, 5].forEach((num) => {
      const $el = $(`#committee${num}`);
      if ($el.length) $el.val(form[`committee${num}`] || '').trigger('change.select2');
    });
  }, [form.committee1, form.committee2, form.committee3, form.committee4, form.committee5]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleApproveChange = (e) => {
    const value = e.target.value;
    if (value === '0') {
      setForm((prev) => ({
        ...prev,
        plan_approve: value,
        plan_ds_comment: 'ไม่อนุมัติใช้แผน เนื่องจาก................',
        committee1: '',
        committee2: '',
        committee3: '',
        committee4: '',
        committee5: '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        plan_approve: value,
        plan_ds_comment: 'แผนการสอนนี้สามารถนำไปใช้งานได้ มีเทคนิควิธีการสอนที่.............\nมีการวัดผลประเมินผลที่หลากหลาย................\n...................',
      }));
    }
  };

  const validateCommittees = () => {
    if (!form.plan_approve) {
      Swal.fire('Error', 'กรุณาเลือกอนุมัติใช้แผนการสอน', 'error');
      return false;
    }

    if (form.plan_approve === '0') return true;

    const committees = [form.committee1, form.committee2, form.committee3, form.committee4, form.committee5].filter(Boolean);
    if (committees.length === 0) {
      Swal.fire('Error', 'กรุณาเลือกกรรมการอย่างน้อย 1 ท่าน', 'error');
      return false;
    }

    const unique = new Set(committees);
    if (unique.size !== committees.length) {
      Swal.fire('Error', 'กรุณาเลือกกรรมการไม่ซ้ำกัน', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (!validateCommittees()) return;

    try {
      const updatePayload = {};
      if (form.plan_approve === '1') {
        updatePayload.plan_approve = form.plan_approve;
        updatePayload.plan_ds_comment = form.plan_ds_comment;
        updatePayload.plan_status = '2';
        updatePayload.committee1 = form.committee1 || null;
        updatePayload.committee2 = form.committee2 || null;
        updatePayload.committee3 = form.committee3 || null;
        updatePayload.committee4 = form.committee4 || null;
        updatePayload.committee5 = form.committee5 || null;
        updatePayload.director = profile?.people_id || '';
      } else {
        updatePayload.plan_approve = form.plan_approve;
        updatePayload.plan_status = '3';
        updatePayload.plan_ds_comment = form.plan_ds_comment;
        updatePayload.director = profile?.people_id || '';
      }

      const { error } = await supabase
        .from('tbl_sendplan')
        .update(updatePayload)
        .eq('planid', planid);

      if (error) throw error;

      Swal.fire('สำเร็จ', 'บันทึกเรียบร้อย', 'success');
      navigate('/statusplan');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถบันทึกได้', 'error');
    }
  };

  const competencyNames = useMemo(() => (plan?.competency || '').split(',').filter(Boolean).map((id) => lookups.competency[id] || id), [plan, lookups]);
  const abilityNames = useMemo(() => (plan?.ability21 || '').split(',').filter(Boolean).map((id) => lookups.ability21[id] || id), [plan, lookups]);
  const desirableNames = useMemo(() => (plan?.desirable || '').split(',').filter(Boolean).map((id) => lookups.desirable[id] || id), [plan, lookups]);
  const midIndicators = useMemo(() => (plan?.indicators_mid || '').split(',').filter(Boolean), [plan]);
  const finalIndicators = useMemo(() => (plan?.indicators_final || '').split(',').filter(Boolean), [plan]);

  if (loading || profileLoading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลแผนการสอน กรุณารอสักครู่..."
        fullPage={false}
      />
    );
  }

  if (!plan) {
    return (
      <EmptyState
        message="ไม่พบข้อมูลแผนการสอน"
        fullPage={false}
      />
    );
  }

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <div className="card card-success">
            <div className="card-header">
              <h4 className="card-title">ข้อมูลแผนการสอน</h4>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-lg-6">
                  <strong>ชื่อผู้จัดทำแผน</strong> : <span className="text-success underline">{lookups.prefix[teacher?.prefix] || ''}{teacher?.name} {teacher?.lastname} ({teacher?.people_id})</span>
                </div>
                <div className="col-lg-6">
                  <strong>ตำแหน่ง</strong> : <span className="text-success underline">{lookups.position[teacher?.position_id] || ''} (วิทยฐานะ {lookups.academic[teacher?.academic_id] || ''})</span>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-6">
                  <strong>โรงเรียน</strong> : <span className="text-success underline">{lookups.school[teacher?.school] || ''}</span>
                </div>
                <div className="col-lg-6">
                  <strong>กลุ่มสาระ</strong> : <span className="text-success underline">{lookups.teachSubject[teacher?.teach_subject] || ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-teal">
            <div className="card-header">
              <h4 className="card-title">ข้อมูลแผนการสอน</h4>
            </div>
            <div className="card-body">
              <div className="row mt-3">
                <div className="col-lg-6">
                  <strong>กลุ่มสาระ : </strong><span className="text-success"> {lookups.teachSubject[plan.teach_subject_id] || ''}</span>
                </div>
                <div className="col-lg-6">
                  <strong>ระดับชั้นที่ทำการสอน : </strong><span className="text-success"> {lookups.gradeLevel[plan.grade_level_id] || ''}</span>
                </div>
              </div>
              <div className="row mt-3">
                <div className="col-lg-3"><strong>รหัสวิชา : </strong><span className="text-success">{plan.subject_code}</span></div>
                <div className="col-lg-3"><strong>ชื่อวิชา : </strong><span className="text-success">{plan.subject_name}</span></div>
                <div className="col-lg-3"><strong>หน่วยการเรียนรู้ : </strong><span className="text-success">{plan.subject_content}</span></div>
                <div className="col-lg-3"><strong>ชื่อแผนการสอน : </strong><span className="text-success">{plan.subject_name_plan}</span></div>
              </div>
              <div className="row mt-3">
                <div className="col-lg-3"><strong>วันที่สอน : </strong><span className="text-success">{plan.teach_date}</span></div>
                <div className="col-lg-3"><strong>เริ่มเวลา : </strong><span className="text-success">{plan.teach_timestart} น.</span></div>
                <div className="col-lg-3"><strong>เสร็จเวลา : </strong><span className="text-success">{plan.teach_timeend} น.</span></div>
                <div className="col-lg-3"><strong>เวลาที่ใช้ในการสอน (จำนวนนาที) : </strong><span className="text-success">{plan.teach_minute} นาที</span></div>
              </div>
              <div className="row mt-3">
                <div className="col-lg-1"><strong>วิธีการสอน :</strong></div>
                <div className="col-lg-4"><span className="text-success">{plan.learning_model}</span></div>
                <div className="col-lg-1"><strong>สมรรถนะ :</strong></div>
                <div className="col-lg-4">
                  {competencyNames.map((c, idx) => (
                    <div key={idx} className="text-success">{idx + 1}. {c}</div>
                  ))}
                </div>
              </div>
              <div className="row mt-3 border">
                <div className="col-lg-2"><strong>ทักษะในศตวรรษที่ 21 : </strong></div>
                <div className="col-lg-4"><span className="text-success">{abilityNames.join(', ')}</span></div>
                <div className="col-lg-2"><strong>คุณลักษณะอันพึงประสงค์ : </strong></div>
                <div className="col-lg-4"><span className="text-success">{desirableNames.join(', ')}</span></div>
              </div>
              <div className="row mt-3 border">
                <div className="col-lg-12"><strong>จุดประสงค์การเรียนรู้</strong></div>
                <div className="col-lg-4"><strong>1. ด้านความรู้ (K) :</strong><br /><span className="text-success">{plan.objectives_knowledge}</span></div>
                <div className="col-lg-4"><strong>2. ด้านทักษะ/กระบวนการ (P) :</strong><br /><span className="text-success">{plan.objectives_process}</span></div>
                <div className="col-lg-4"><strong>3. ด้านคุณลักษณะ (A) :</strong><br /><span className="text-success">{plan.objectives_attribute}</span></div>
              </div>
              <div className="row mt-3">
                <div className="col-lg-6 border"><strong>มาตรฐานการเรียนรู้ ตัวชี้วัด/ผลการเรียนรู้ : </strong><br /><span className="text-success">{plan.learning_outcomes}</span></div>
                <div className="col-lg-6 border"><strong>สาระการเรียนรู้ : </strong><br /><span className="text-success">{plan.learning_content}</span></div>
              </div>
              <div className="row mt-3">
                <div className="col-lg-6 border"><strong>ขั้นตอนการจัดกิจกรรมการเรียนรู้/เวลา (นาที) : </strong><br /><span className="text-success">{plan.learning_activities}</span></div>
                <div className="col-lg-6 border"><strong>สื่อ/แหล่งเรียนรู้ : </strong><br /><span className="text-success">{plan.instructional_media}</span></div>
              </div>
              <div className="row mt-3">
                <div className="col-lg-6 border"><strong>ตัวชี้วัดระหว่างทาง : </strong><br />
                  {midIndicators.map((ind, idx) => (
                    <div key={idx} className="text-success">{ind} : {lookups.indicator[ind] || ''}</div>
                  ))}
                </div>
                <div className="col-lg-6 border"><strong>ตัวชี้วัดปลายทาง : </strong><br />
                  {finalIndicators.map((ind, idx) => (
                    <div key={idx} className="text-success">{ind} : {lookups.indicator[ind] || ''}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-12">
          <div className="card card-info">
            <div className="card-header">
              <h4 className="card-title"><strong>ไฟล์แผนการสอน</strong></h4>
            </div>
            <div className="card-body">
              {plan.plan_file ? (
                <>
                  <iframe
                    src={plan.plan_file.includes('drive.google.com') && plan.plan_file.includes('/view') ? plan.plan_file.replace('/view', '/preview') : plan.plan_file}
                    frameBorder="0"
                    width="100%"
                    height="800px"
                    title="plan-file"
                  />
                  <div className="mt-2 text-center">
                    <a href={plan.plan_file} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                      <i className="fas fa-external-link-alt mr-1"></i> เปิดไฟล์ในหน้าต่างใหม่ (หากดูไม่ได้)
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-danger">ไม่พบไฟล์แผนการสอน</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} id="AppointmentCommittee">
        <div className="row">
          <div className="col-lg-12">
            <div className="card card-navy">
              <div className="card-header">
                <h4 className="card-title"><strong>อนุมัติใช้แผน</strong></h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="form-group">
                      <label htmlFor="plan_approve"><strong>อนุมัติใช้แผนการสอน : </strong></label>
                      <select className="select2bs4" id="plan_approve" name="plan_approve" value={form.plan_approve} onChange={handleApproveChange} style={{ width: '100%' }} disabled={readOnly}>
                        <option value=""></option>
                        <option value="1">อนุมัติใช้แผน</option>
                        <option value="0">ไม่อนุมัติใช้แผน</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <label htmlFor="plan_ds_comment"><strong>ข้อเสนอแนะ : </strong></label>
                    <textarea name="plan_ds_comment" id="plan_ds_comment" className="form-control" rows="6" value={form.plan_ds_comment} onChange={handleChange} disabled={readOnly}></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div className="card card-pink">
              <div className="card-header">
                <h4 className="card-title"><strong>แต่งตั้งกรรมการ</strong></h4>
              </div>
              <div className="card-body">
                <div className="row">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const field = `committee${num}`;
                    const isDisabled = readOnly || form.plan_approve !== '1' || (num > 1 && !form[`committee${num - 1}`]);
                    return (
                      <div className="col-lg-4" key={field}>
                        <div className="mb-3 mt-3">
                          <div className="form-group">
                            <label htmlFor={field}>
                              <strong>กรรมการท่านที่ {num} :</strong>
                              {form[field] && (
                                <span className="badge badge-success ml-2" style={{ fontSize: '11px' }}>
                                  <i className="fas fa-check mr-1"></i>เลือกแล้ว
                                </span>
                              )}
                            </label>
                            <select
                              id={field}
                              name={field}
                              style={{ width: '100%' }}
                              disabled={isDisabled}
                              defaultValue={form[field] || ''}
                            >
                              <option value=""></option>
                              {committeeOptions.map((opt) => (
                                <option key={`${field}-${opt.value}`} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card-footer text-center">
                {!readOnly && (
                  <button type="submit" className="btn btn-success" id="btn_submit"><i className="fa-regular fa-paper-plane"></i> แต่งตั้งกรรมการ</button>
                )}
                <Link to="/statusplan" className="btn btn-danger ml-2"><i className="fa-solid fa-ban"></i> ยกเลิก</Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Appointment;
