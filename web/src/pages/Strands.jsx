import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Strands = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teachSubjectFilter = searchParams.get('Teach_Subject') || '';

  const [loading, setLoading] = useState(true);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [rows, setRows] = useState([]);

  const subjectMap = useMemo(() => {
    const map = {};
    teachSubjects.forEach((row) => { map[row.teach_subject_id] = row.teach_subject; });
    return map;
  }, [teachSubjects]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjectRes, strandsRes] = await Promise.all([
        supabase
          .from('tbl_system_Teach_Subject')
          .select('*')
          .eq('teach_subject_status', '1')
          .order('teach_subject_id', { ascending: true }),
        teachSubjectFilter
          ? supabase
            .from('tbl_strands')
            .select('*')
            .eq('teach_subject_id', teachSubjectFilter)
            .order('strands_id', { ascending: true })
            .order('id', { ascending: true })
          : supabase
            .from('tbl_strands')
            .select('*')
            .order('strands_id', { ascending: true })
            .order('id', { ascending: true }),
      ]);
      if (subjectRes.error) throw subjectRes.error;
      if (strandsRes.error) throw strandsRes.error;
      setTeachSubjects(subjectRes.data || []);
      setRows(strandsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachSubjectFilter]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const handleTeachSubjectChange = (value) => {
    if (!value) {
      navigate('/strands');
      return;
    }
    navigate(`/strands?Teach_Subject=${value}`);
  };

  const addLink = teachSubjectFilter ? `/strands_add?Teach_Subject=${teachSubjectFilter}` : '/strands_add';

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-info card-outline">
          <div className="card-body">
            <div className="row">
              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <Link to="/strands" className="btn btn-block btn-success">สาระการเรียนรู้รายวิชาทั้งหมด</Link>
              </div>
              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <select
                  className="form-control form-select-lg"
                  name="Teach_Subject"
                  id="Teach_Subject"
                  value={teachSubjectFilter}
                  onChange={(e) => handleTeachSubjectChange(e.target.value)}
                  required
                >
                  <option value="">เลือกกลุ่มสาระการเรียนรู้</option>
                  {teachSubjects.map((row) => (
                    <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <Link className="btn btn-block btn-info" to={addLink}>เพิ่มสาระการเรียนรู้</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> จัดการสาระการเรียนรู้รายวิชา</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped" data-page-length="50">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>รหัสสาระการเรียนรู้</th>
                    <th>กลุ่มสาระการเรียนรู้</th>
                    <th>ลำดับที่</th>
                    <th>ชื่อสาระการเรียนรู้</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="text-center">{row.id}</td>
                      <td className="text-center">{row.strands_id}</td>
                      <td>{subjectMap[row.teach_subject_id] || row.teach_subject_id}</td>
                      <td>{row.strands_order}</td>
                      <td>{row.strands_name}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/strands_edit?id=${row.id}`} className="btn btn-warning">แก้ไข</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
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

export default Strands;
