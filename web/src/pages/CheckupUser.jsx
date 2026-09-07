import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';

const CheckupUser = () => {
  const { lookups, loading: lookupsLoading } = useUserLookups();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const limitYear = new Date().getFullYear() - 18;
      const cutoff = `${limitYear}-12-31`;
      const { data, error } = await supabase
        .from('tbl_Users')
        .select('*')
        .or(`people_id.is.null,people_id.eq.,birthday.gt.${cutoff}`)
        .order('school', { ascending: true })
        .order('academic_id', { ascending: true })
        .order('position_id', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getEditModule = (level) => {
    if (level === 'teacher') return 'teacher_edit';
    if (level === 'directorschool') return 'directorschool_edit';
    if (level === 'supervisor' || level === 'supervision') return 'supervisor_edit';
    if (level === 'districdirector') return 'dd_edit';
    return 'teacher_edit';
  };

  const parseBirthdayInfo = (birthday) => {
    if (!birthday) return { isBuddhist: false, convertedDate: null, year: null };
    const parts = String(birthday).trim().split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      if (y >= 2400 && y <= 2600) {
        return {
          isBuddhist: true,
          convertedDate: `${y - 543}-${parts[1]}-${parts[2]}`,
          year: y,
        };
      }
      return { isBuddhist: false, convertedDate: null, year: y };
    }
    return { isBuddhist: false, convertedDate: null, year: null };
  };

  const handleConvertSingle = async (row) => {
    const { isBuddhist, convertedDate } = parseBirthdayInfo(row.birthday);
    if (!isBuddhist || !convertedDate) return;

    const result = await Swal.fire({
      title: 'ยืนยันแปลงปี พ.ศ. เป็น ค.ศ.',
      html: `ต้องการแก้ไขวันเกิดของ <b>${row.name} ${row.lastname}</b><br/>จาก <span class="text-danger">${row.birthday}</span> (พ.ศ.)<br/>เป็น <span class="text-success font-weight-bold">${convertedDate}</span> (ค.ศ.) หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ใช่, บันทึกแก้ไข',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      let query = supabase.from('tbl_Users').update({ birthday: convertedDate });
      if (row.people_id) {
        query = query.eq('people_id', row.people_id);
      } else {
        query = query.eq('id', row.id);
      }
      const { error } = await query;
      if (error) throw error;

      Swal.fire('สำเร็จ', `อัปเดตวันเกิดเป็น ${convertedDate} เรียบร้อยแล้ว`, 'success');
      loadUsers();
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertAllBuddhist = async () => {
    const buddhistRows = rows.filter((r) => parseBirthdayInfo(r.birthday).isBuddhist);
    if (buddhistRows.length === 0) return;

    const result = await Swal.fire({
      title: `แปลงปี พ.ศ. เป็น ค.ศ. ทั้งหมด (${buddhistRows.length} คน)`,
      html: `ระบบจะคำนวณปีเกิดลบด้วย 543 เพื่อเปลี่ยนเป็นปี ค.ศ. มาตรฐาน<br/>ต้องการดำเนินการทั้งหมดหรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `ยืนยันแปลง ${buddhistRows.length} รายการ`,
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      let successCount = 0;
      for (const r of buddhistRows) {
        const { convertedDate } = parseBirthdayInfo(r.birthday);
        if (!convertedDate) continue;
        let query = supabase.from('tbl_Users').update({ birthday: convertedDate });
        if (r.people_id) {
          query = query.eq('people_id', r.people_id);
        } else {
          query = query.eq('id', r.id);
        }
        const { error } = await query;
        if (!error) successCount++;
      }

      Swal.fire('สำเร็จ', `แปลงข้อมูลวันเกิดเป็น ค.ศ. เรียบร้อยแล้ว ${successCount} รายการ`, 'success');
      loadUsers();
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const buddhistCount = useMemo(() => {
    return rows.filter((r) => parseBirthdayInfo(r.birthday).isBuddhist).length;
  }, [rows]);

  const missingIdCount = useMemo(() => {
    return rows.filter((r) => !r.people_id || !String(r.people_id).trim()).length;
  }, [rows]);

  const underAgeCount = useMemo(() => {
    return rows.filter((r) => {
      if (!r.people_id || !String(r.people_id).trim()) return false;
      const info = parseBirthdayInfo(r.birthday);
      return !info.isBuddhist;
    }).length;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      const name = `${r.name || ''} ${r.lastname || ''}`.toLowerCase();
      const school = (lookups.school[r.school] || '').toLowerCase();
      const peopleId = String(r.people_id || '').toLowerCase();
      const birthday = String(r.birthday || '').toLowerCase();
      return name.includes(term) || school.includes(term) || peopleId.includes(term) || birthday.includes(term);
    });
  }, [rows, searchTerm, lookups.school]);

  if (loading || lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูลผู้ใช้งานข้อมูลผิดพลาด...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-outline card-success shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h3 className="card-title m-0">
              <i className="fa-solid fa-user-xmark text-danger me-2"></i> ผู้ใช้งานข้อมูลผิดพลาด
            </h3>
            <div className="card-tools d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={loadUsers}
                disabled={actionLoading}
                title="รีเฟรชข้อมูล"
              >
                <i className="fa-solid fa-arrows-rotate me-1"></i> รีเฟรช
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Action Banner for Buddhist Era issues */}
            {buddhistCount > 0 && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
                <div className="d-flex align-items-center">
                  <i className="fa-solid fa-calendar-days fa-2x text-warning me-3"></i>
                  <div>
                    <h5 className="alert-heading mb-1 font-weight-bold">
                      พบผู้ใช้งานระบุปีเกิดเป็น พ.ศ. จำนวน {buddhistCount} รายการ
                    </h5>
                    <p className="mb-0 text-muted">
                      ระบบมาตรฐานใช้ปีเกิดแบบ ค.ศ. (YYYY-MM-DD) เพื่อการคำนวณอายุและวันเกษียณที่ถูกต้อง
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-success font-weight-bold"
                  onClick={handleConvertAllBuddhist}
                  disabled={actionLoading}
                >
                  <i className="fa-solid fa-wand-magic-sparkles me-1"></i> แปลง พ.ศ. เป็น ค.ศ. ทั้งหมด ({buddhistCount} คน)
                </button>
              </div>
            )}

            {/* Statistics & Search Toolbar */}
            <div className="row mb-3 align-items-center">
              <div className="col-md-7 mb-2 mb-md-0 d-flex flex-wrap gap-2">
                <span className="badge badge-info p-2">
                  <i className="fa-solid fa-list me-1"></i> ผิดพลาดทั้งหมด {rows.length} รายการ
                </span>
                {missingIdCount > 0 && (
                  <span className="badge badge-danger p-2">
                    <i className="fa-solid fa-id-card me-1"></i> ไม่มีเลข ปชช. {missingIdCount} คน
                  </span>
                )}
                {underAgeCount > 0 && (
                  <span className="badge badge-danger p-2">
                    <i className="fa-solid fa-cake-candles me-1"></i> อายุ &lt; 18 ปี / ปีผิด {underAgeCount} คน
                  </span>
                )}
                {buddhistCount > 0 && (
                  <span className="badge badge-warning p-2">
                    <i className="fa-solid fa-clock-rotate-left me-1"></i> ระบุปี พ.ศ. {buddhistCount} คน
                  </span>
                )}
              </div>
              <div className="col-md-5">
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ค้นหาชื่อ, โรงเรียน, เลขประจำตัวประชาชน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button className="btn btn-outline-secondary" onClick={() => setSearchTerm('')}>
                      <i className="fa-solid fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }} className="text-center">ที่</th>
                    <th>เลขประจำตัวประชาชน</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>โรงเรียน</th>
                    <th style={{ width: '110px' }} className="text-center">ระดับ (Level)</th>
                    <th>สาเหตุความผิดพลาด</th>
                    <th style={{ width: '180px' }} className="text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        {rows.length === 0 ? (
                          <div>
                            <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                            <h4 className="text-success font-weight-bold">ไม่พบข้อมูลผู้ใช้งานที่ผิดพลาด</h4>
                            <p className="text-muted mb-0">ข้อมูลเลขประจำตัวประชาชนและวันเกิดของผู้ใช้ทุกคนในระบบถูกต้องครบถ้วนแล้ว</p>
                          </div>
                        ) : (
                          <div>
                            <i className="fa-solid fa-magnifying-glass text-muted fa-2x mb-2"></i>
                            <p className="text-muted mb-0">ไม่พบข้อมูลที่ตรงกับคำค้นหา "{searchTerm}"</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const name = (lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname;
                      const moduleEdit = getEditModule(row.level);
                      const { isBuddhist, convertedDate } = parseBirthdayInfo(row.birthday);

                      let errorComponent;
                      if (!row.people_id || !String(row.people_id).trim()) {
                        errorComponent = (
                          <span className="badge badge-danger">
                            <i className="fa-solid fa-circle-exclamation me-1"></i> ไม่มีเลขประจำตัวประชาชน
                          </span>
                        );
                      } else if (isBuddhist) {
                        errorComponent = (
                          <div>
                            <span className="badge badge-warning text-dark me-1">
                              <i className="fa-solid fa-clock-rotate-left me-1"></i> ระบุปีเกิดเป็น พ.ศ. ({row.birthday})
                            </span>
                            <small className="text-muted d-block mt-1">
                              ควรเป็น ค.ศ.: <strong className="text-success">{convertedDate}</strong>
                            </small>
                          </div>
                        );
                      } else {
                        errorComponent = (
                          <span className="badge badge-danger">
                            <i className="fa-solid fa-triangle-exclamation me-1"></i> ปีเกิด {row.birthday} (อายุไม่ถึง 18 ปี หรือเป็นปีอนาคต)
                          </span>
                        );
                      }

                      return (
                        <tr key={row.id || idx}>
                          <td className="text-center">{idx + 1}</td>
                          <td>
                            {row.people_id ? (
                              <code>{row.people_id}</code>
                            ) : (
                              <span className="text-muted fst-italic">- ไม่ระบุ -</span>
                            )}
                          </td>
                          <td className="font-weight-bold">{name}</td>
                          <td>{lookups.school[row.school] || row.school || '-'}</td>
                          <td className="text-center">
                            <span className="badge badge-secondary">{row.level}</span>
                          </td>
                          <td>{errorComponent}</td>
                          <td className="text-center">
                            <div className="btn-group">
                              {isBuddhist && (
                                <button
                                  className="btn btn-sm btn-warning"
                                  onClick={() => handleConvertSingle(row)}
                                  disabled={actionLoading}
                                  title={`แปลงเป็น ค.ศ. (${convertedDate})`}
                                >
                                  <i className="fa-solid fa-wand-magic-sparkles me-1"></i> แปลงเป็น ค.ศ.
                                </button>
                              )}
                              <Link
                                to={`/${moduleEdit}?id=${row.id}&people_id=${row.people_id || ''}&peopleid_error=peopleidError`}
                                className="btn btn-sm btn-danger"
                                title="แก้ไขข้อมูลผู้ใช้"
                              >
                                <i className="fa-regular fa-edit me-1"></i> แก้ไข
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

export default CheckupUser;
