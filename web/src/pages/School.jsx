import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import useUserLookups from '../hooks/useUserLookups';
import useActiveYears from '../hooks/useActiveYears';

const toNum = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const School = () => {
  const navigate = useNavigate();
  const { lookups: schoolLookups, loading: schoolLookupLoading } = useSchoolLookups();
  const { lookups: userLookups, loading: userLookupLoading } = useUserLookups();
  const { educationYear, loading: yearLoading } = useActiveYears();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const eduYear = educationYear?.year || '';
  const eduSection = educationYear?.section || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolRes, dmcRes, userRes] = await Promise.all([
        supabase.from('tbl_school').select('*').eq('school_flag', '1'),
        eduYear && eduSection
          ? supabase
            .from('tbl_school_DMCdata')
            .select('school_code8,a1m,a1f,a2m,a2f,p1m,p1f,p2m,p2f,p3m,p3f,p4m,p4f,p5m,p5f,p6m,p6f,m1m,m1f,m2m,m2f,m3m,m3f,m4m,m4f,m5m,m5f,m6m,m6f,v1m,v1f,v2m,v2f')
            .eq('education_year', eduYear)
            .eq('education_section', eduSection)
          : Promise.resolve({ data: [] }),
        supabase
          .from('tbl_Users')
          .select('school, position_id, prefix, name, lastname')
          .in('position_id', ['10007', '10006', '10000', '10001']),
      ]);

      if (schoolRes.error) throw schoolRes.error;
      if (dmcRes.error) throw dmcRes.error;
      if (userRes.error) throw userRes.error;

      const dmcMap = {};
      (dmcRes.data || []).forEach((row) => {
        dmcMap[row.school_code8] = row;
      });

      const directorName = {};
      const directorCount = {};
      const deputyCount = {};
      const teacherCount = {};

      (userRes.data || []).forEach((row) => {
        const schoolId = row.school;
        if (!schoolId) return;
        if (row.position_id === '10007') {
          directorCount[schoolId] = (directorCount[schoolId] || 0) + 1;
          if (!directorName[schoolId]) {
            const prefix = userLookups.prefix[row.prefix] || '';
            directorName[schoolId] = `${prefix}${row.name || ''} ${row.lastname || ''}`.trim();
          }
        }
        if (row.position_id === '10006') {
          deputyCount[schoolId] = (deputyCount[schoolId] || 0) + 1;
        }
        if (row.position_id === '10000' || row.position_id === '10001') {
          teacherCount[schoolId] = (teacherCount[schoolId] || 0) + 1;
        }
      });

      const mapped = (schoolRes.data || []).map((row) => {
        const dmc = dmcMap[row.school_code8] || {};
        const stdA = toNum(dmc.a1m) + toNum(dmc.a1f) + toNum(dmc.a2m) + toNum(dmc.a2f);
        const stdP = toNum(dmc.p1m) + toNum(dmc.p1f) + toNum(dmc.p2m) + toNum(dmc.p2f)
          + toNum(dmc.p3m) + toNum(dmc.p3f) + toNum(dmc.p4m) + toNum(dmc.p4f)
          + toNum(dmc.p5m) + toNum(dmc.p5f) + toNum(dmc.p6m) + toNum(dmc.p6f);
        const stdM = toNum(dmc.m1m) + toNum(dmc.m1f) + toNum(dmc.m2m) + toNum(dmc.m2f)
          + toNum(dmc.m3m) + toNum(dmc.m3f) + toNum(dmc.m4m) + toNum(dmc.m4f)
          + toNum(dmc.m5m) + toNum(dmc.m5f) + toNum(dmc.m6m) + toNum(dmc.m6f);
        const stdV = toNum(dmc.v1m) + toNum(dmc.v1f) + toNum(dmc.v2m) + toNum(dmc.v2f)
          + toNum(dmc.v2m) + toNum(dmc.v2f);
        const students = stdA + stdP + stdM + stdP;

        return {
          ...row,
          directorName: directorName[row.school_id] || '',
          directorCount: directorCount[row.school_id] || 0,
          deputyCount: deputyCount[row.school_id] || 0,
          teacherCount: teacherCount[row.school_id] || 0,
          students,
          stdV,
        };
      });

      setRows(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [eduYear, eduSection, userLookups.prefix]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemove = (schoolId) => {
    Swal.fire({
      title: 'ลบข้อมูลหรือไม่ ?',
      text: 'คุณจะไม่สามารถยกเลิกได้หากทำการลบไปแล้ว !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบข้อมูล!',
      cancelButtonText: 'ไม่ ยกเลิกการลบ!',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(`/school_remove?school_id=${schoolId}`);
      }
    });
  };

  const numberFormatter = useMemo(() => new Intl.NumberFormat('th-TH'), []);

  if (loading || schoolLookupLoading || userLookupLoading || yearLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> จัดการข้อมูลโรงเรียน</h3>
          </div>
          <div className="card-body">
            <div className="col-sm-12">
              <span className="float-sm-right">
                <Link className="btn btn-outline-info" to="/school_add">เพิ่มโรงเรียน</Link>
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>รหัส MOECODE</th>
                    <th>ชื่อโรงเรียน</th>
                    <th>ผู้อำนวยการ</th>
                    <th>สหวิทยาเขต</th>
                    <th>จังหวัด</th>
                    <th>ขนาดโรงเรียน</th>
                    <th>ผอ.</th>
                    <th>รอง.ผอ.</th>
                    <th>ครู</th>
                    <th>นักเรียน</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.school_id}>
                      <td className="text-center">{row.school_id}</td>
                      <td>{row.school_name}</td>
                      <td>{row.directorName}</td>
                      <td>{schoolLookups.khet[row.khet_code] || ''}</td>
                      <td>{schoolLookups.provinces[row.school_province] || ''}</td>
                      <td>{schoolLookups.schoolSize[row.school_size] || ''}</td>
                      <td>{row.directorCount}</td>
                      <td>{row.deputyCount}</td>
                      <td>{numberFormatter.format(row.teacherCount)}</td>
                      <td>{numberFormatter.format(row.students)}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/school_edit?school_id=${row.school_id}`} className="btn btn-sm btn-warning">
                            <i className="fa-regular fa-pen-to-square"></i>
                          </Link>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemove(row.school_id)}>
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="11" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
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

export default School;
