import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Indicators = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teachSubjectId = searchParams.get('teach_subject_id') || '';
  const gradeLevelId = searchParams.get('grade_level_id') || '';
  const indicatorId = searchParams.get('indicator_id') || '';

  const [loading, setLoading] = useState(true);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [indicatorTypes, setIndicatorTypes] = useState([]);
  const [rows, setRows] = useState([]);

  const teachSubjectMap = useMemo(() => {
    const map = {};
    teachSubjects.forEach((row) => { map[row.teach_subject_id] = row.teach_subject; });
    return map;
  }, [teachSubjects]);

  const gradeShortMap = useMemo(() => {
    const map = {};
    gradeLevels.forEach((row) => { map[row.grade_level_id] = row.grade_level_shortname; });
    return map;
  }, [gradeLevels]);

  const indicatorTypeMap = useMemo(() => {
    const map = {};
    indicatorTypes.forEach((row) => { map[row.indicator_id] = row.indicator_name; });
    return map;
  }, [indicatorTypes]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teachRes, gradeRes, typeRes] = await Promise.all([
        supabase
          .from('tbl_system_Teach_Subject')
          .select('*')
          .eq('teach_subject_status', '1')
          .order('teach_subject_id', { ascending: true }),
        supabase
          .from('tbl_system_GradeLevel')
          .select('*')
          .eq('grade_level_status', '1')
          .order('grade_level_id', { ascending: true }),
        supabase
          .from('tbl_type_indicators')
          .select('*')
          .eq('indicator_status', '1')
          .order('indicator_id', { ascending: true }),
      ]);
      if (teachRes.error) throw teachRes.error;
      if (gradeRes.error) throw gradeRes.error;
      if (typeRes.error) throw typeRes.error;
      setTeachSubjects(teachRes.data || []);
      setGradeLevels(gradeRes.data || []);
      setIndicatorTypes(typeRes.data || []);

      let query = supabase.from('tbl_indicators').select('*');
      if (teachSubjectId) query = query.eq('teach_subject_id', teachSubjectId);
      if (gradeLevelId) query = query.eq('grade_level_id', gradeLevelId);
      if (indicatorId) query = query.eq('indicator_id', indicatorId);
      query = query
        .order('teach_subject_id', { ascending: true })
        .order('indicator_group', { ascending: true })
        .order('grade_level_id', { ascending: true })
        .order('indicators_name', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachSubjectId, gradeLevelId, indicatorId]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const addLink = teachSubjectId ? `/indicators_add?teach_subject_id=${teachSubjectId}` : '/indicators_add';

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    navigate(query ? `/indicators?${query}` : '/indicators');
  };

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-info card-outline">
          <div className="card-body">
            <div className="row">
              <div className="col-sm-12 col-md-1 col-xl-1 col-lg-1">
                <Link className="btn btn-block btn-info" to={addLink}>เพิ่มตัวชี้วัด</Link>
              </div>
              <div className="col-sm-12 col-md-1 col-xl-1 col-lg-1">
                <Link to="/indicators" className="btn btn-block btn-success">ตัวชี้วัดทั้งหมด</Link>
              </div>
              <div className="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                <select
                  className="form-control form-select-lg"
                  name="teach_subject_id"
                  id="teach_subject_id"
                  value={teachSubjectId}
                  onChange={(e) => updateParams({ teach_subject_id: e.target.value, grade_level_id: gradeLevelId, indicator_id: indicatorId })}
                  required
                >
                  <option value="">เลือกกลุ่มสาระการเรียนรู้</option>
                  {teachSubjects.map((row) => (
                    <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                <select
                  className="form-control form-select-lg"
                  name="grade_level_id"
                  id="grade_level_id"
                  value={gradeLevelId}
                  onChange={(e) => updateParams({ teach_subject_id: teachSubjectId, grade_level_id: e.target.value, indicator_id: indicatorId })}
                  required
                >
                  <option value="">ระดับชั้น</option>
                  {gradeLevels.map((row) => (
                    <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                <select
                  className="form-control form-select-lg"
                  name="indicator_id"
                  id="indicator_id"
                  value={indicatorId}
                  onChange={(e) => updateParams({ teach_subject_id: teachSubjectId, grade_level_id: gradeLevelId, indicator_id: e.target.value })}
                  required
                >
                  <option value="">ประเภทตัวชี้วัด</option>
                  {indicatorTypes.map((row) => (
                    <option key={row.indicator_id} value={row.indicator_id}>{row.indicator_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> จัดการตัวชี้วัดรายวิชา</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped" data-page-length="50">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>กลุ่มสาระ</th>
                    <th>ระดับชั้น</th>
                    <th>มาตรฐาน</th>
                    <th>กลุ่มที่</th>
                    <th>ตัวชี้วัด</th>
                    <th>ประเภท</th>
                    <th>คำอธิบาย</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="text-center">{row.id}</td>
                      <td className="text-center">{teachSubjectMap[row.teach_subject_id] || row.teach_subject_id}</td>
                      <td className="text-center">{gradeShortMap[row.grade_level_id] || row.grade_level_id}</td>
                      <td className="text-center">{row.content_s_name}</td>
                      <td className="text-center">{row.indicator_group}</td>
                      <td className="text-center">{row.indicators_name}</td>
                      <td>{indicatorTypeMap[row.indicator_id] || row.indicator_id}</td>
                      <td>{row.indicators_details}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/indicators_edit?id=${row.id}`} className="btn btn-warning">แก้ไข</Link>
                          <a href="" className="btn btn-danger">ลบ</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Indicators;
