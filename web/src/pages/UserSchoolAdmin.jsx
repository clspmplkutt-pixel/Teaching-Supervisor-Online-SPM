import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';
import useSelect2 from '../hooks/useSelect2';
import useAppConfig from '../hooks/useAppConfig';

const UserSchoolAdmin = () => {
  const navigate = useNavigate();
  const { lookups, lists, loading: lookupsLoading } = useUserLookups();
  const { config } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');

  const schoolId = searchParams.get('school_id') || '';

  useSelect2([lookupsLoading, lists.school.length]);

  const filteredSchools = useMemo(
    () => lists.school.filter((row) => row.school_id !== areaCode),
    [lists.school, areaCode]
  );

  const loadSchoolAdmins = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tbl_Users')
        .select('*')
        .eq('level', 'admin_school')
        .neq('school', areaCode);

      if (schoolId) query = query.eq('school', schoolId);

      query = query
        .order('school', { ascending: true })
        .order('academic_id', { ascending: true })
        .order('position_id', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, areaCode]);

  useEffect(() => {
    loadSchoolAdmins();
  }, [loadSchoolAdmins]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return rows;
    const q = searchText.trim().toLowerCase();
    return rows.filter((row) =>
      (row.name || '').toLowerCase().includes(q) ||
      (row.lastname || '').toLowerCase().includes(q) ||
      (row.people_id || '').includes(q) ||
      (lookups.school[row.school] || '').toLowerCase().includes(q)
    );
  }, [rows, searchText, lookups.school]);

  const handleRevoke = async (userObj) => {
    const confirm = await Swal.fire({
      title: 'ยกเลิกสิทธิ์ School Admin?',
      html: `ต้องการเปลี่ยนสิทธิ์ของ <b>${lookups.prefix[userObj.prefix] || ''}${userObj.name} ${userObj.lastname}</b> กลับเป็นครูผู้สอนทั่วไปหรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกเลิกสิทธิ์',
      cancelButtonText: 'ยกเลิก',
    });

    if (confirm.isConfirmed) {
      try {
        const { error } = await supabase
          .from('tbl_Users')
          .update({ level: 'teacher' })
          .eq('people_id', userObj.people_id);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ปรับสิทธิ์กลับเป็นครูผู้สอนเรียบร้อยแล้ว', 'success');
        loadSchoolAdmins();
      } catch (err) {
        console.error(err);
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  if (lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-warning" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูลผู้ดูแลระบบระดับสถานศึกษา...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-warning card-outline">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0">
              <i className="fa-solid fa-school-flag mr-2 text-warning"></i>
              ผู้ดูแลระบบระดับสถานศึกษา (School Admin)
            </h3>
            <div className="card-tools ml-auto">
              <Link to="/userteacher" className="btn btn-sm btn-primary">
                <i className="fa-solid fa-user-plus mr-1"></i> แต่งตั้งจากรายชื่อครู
              </Link>
            </div>
          </div>
          <div className="card-body">
            {/* Filter and Search */}
            <div className="row g-2 mb-3">
              <div className="col-md-6 col-lg-4">
                <select
                  className="form-control select2bs4"
                  name="school_id"
                  id="school_id"
                  value={schoolId}
                  onChange={(e) => updateParam('school_id', e.target.value)}
                >
                  <option value="">-- ทุกโรงเรียน --</option>
                  {filteredSchools.map((row) => (
                    <option key={row.school_id} value={row.school_id}>
                      {row.school_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 col-lg-4">
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text"><i className="fas fa-search"></i></span>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ค้นหา ชื่อ / สกุล / เลขบัตร / โรงเรียน"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  {searchText && (
                    <div className="input-group-append">
                      <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchText('')}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-lg-4 text-right">
                <span className="badge badge-warning p-2 font-weight-normal" style={{ fontSize: '0.95rem' }}>
                  <i className="fas fa-user-shield mr-1"></i> จำนวน School Admin: <strong>{filteredRows.length}</strong> คน
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border text-warning" role="status"></div>
                <p className="mt-2">กำลังโหลดรายชื่อผู้ดูแลระบบ...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th width="5%" className="text-center">ที่</th>
                      <th width="15%">เลขประจำตัวประชาชน</th>
                      <th width="20%">ชื่อ - นามสกุล</th>
                      <th width="25%">โรงเรียน</th>
                      <th width="15%">กลุ่มสาระ</th>
                      <th width="10%" className="text-center">สถานะ</th>
                      <th width="10%" className="text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-danger py-4">
                          <i className="fas fa-info-circle fa-2x mb-2 text-muted"></i>
                          <p className="mb-0">
                            {searchText || schoolId
                              ? 'ไม่พบข้อมูลผู้ดูแลระบบระดับสถานศึกษาตามเงื่อนไขที่ค้นหา'
                              : 'ยังไม่มีผู้ได้รับการแต่งตั้งเป็น School Admin (สามารถไปที่เมนู "ครู" และกดแก้ไขเพื่อแต่งตั้งได้)'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="text-center">{idx + 1}</td>
                          <td><code>{row.people_id}</code></td>
                          <td className="font-weight-bold">
                            {(lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname}
                          </td>
                          <td>{lookups.school[row.school] || row.school}</td>
                          <td>{lookups.teachSubject[row.teach_subject] || '-'}</td>
                          <td className="text-center">
                            <span className="badge badge-success px-2 py-1">
                              <i className="fas fa-check-circle mr-1"></i> Active
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="btn-group">
                              <Link
                                to={`/teacher_edit?people_id=${row.people_id}`}
                                className="btn btn-sm btn-warning"
                                title="แก้ไขข้อมูล/สิทธิ์"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </Link>
                              <Link
                                to={`/reset_user_password?people_id=${row.people_id}`}
                                className="btn btn-sm btn-info"
                                title="Reset รหัสผ่าน"
                              >
                                <i className="fa-solid fa-key"></i>
                              </Link>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                title="ยกเลิกสิทธิ์ School Admin"
                                onClick={() => handleRevoke(row)}
                              >
                                <i className="fa-solid fa-user-xmark"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Information Notice */}
            <div className="alert alert-info mt-4 mb-0">
              <h6 className="font-weight-bold"><i className="fas fa-info-circle mr-2"></i> เกี่ยวกับสิทธิ์ School Admin (ผู้ดูแลระบบระดับสถานศึกษา)</h6>
              <p className="small mb-0">
                • <strong>ขอบเขตสิทธิ์:</strong> สามารถอนุมัติการสมัครของครูในโรงเรียนตนเอง, จัดการข้อมูลครู, ย้ายครูออก, และ Reset รหัสผ่านให้ครูในโรงเรียนได้ทันที<br/>
                • <strong>การแต่งตั้ง:</strong> Admin เขตสามารถแต่งตั้งครู/เจ้าหน้าที่ธุรการเป็น School Admin ได้ผ่านหน้า <em>"จัดการครู ➔ แก้ไขข้อมูลครู"</em>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSchoolAdmin;
