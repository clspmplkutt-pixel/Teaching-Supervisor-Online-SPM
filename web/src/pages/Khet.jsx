import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const EMPTY_FORM = {
  khet_province: '',
  khet_code: '',
  khet_name: '',
};

const Khet = () => {
  const { lists, lookups, loading: lookupLoading } = useSchoolLookups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [schoolCounts, setSchoolCounts] = useState({});
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'add', form: EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const provinceOptions = useMemo(() => {
    const areaProvinces = (lists.provinces || []).filter(
      (p) => String(p.province_id) === '53' || String(p.province_id) === '65'
    );
    const source = areaProvinces.length > 0 ? areaProvinces : lists.provinces || [];
    return source.map((p) => ({
      value: String(p.province_id),
      label: p.province_name,
      subLabel: `รหัสจังหวัด ${p.province_id}`,
    }));
  }, [lists.provinces]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [khetRes, schoolRes] = await Promise.all([
        supabase.from('tbl_khet').select('*').order('khet_code', { ascending: true }),
        supabase.from('tbl_school').select('school_id, khet_code, school_flag'),
      ]);
      if (khetRes.error) throw khetRes.error;
      if (schoolRes.error) throw schoolRes.error;

      const counts = {};
      (schoolRes.data || []).forEach((s) => {
        if (!s.khet_code) return;
        if (!counts[s.khet_code]) {
          counts[s.khet_code] = { total: 0, active: 0 };
        }
        counts[s.khet_code].total += 1;
        if (String(s.school_flag) === '1') {
          counts[s.khet_code].active += 1;
        }
      });

      setRows(khetRes.data || []);
      setSchoolCounts(counts);
    } catch (err) {
      console.error('Khet load error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลสหวิทยาเขตได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (provinceFilter && String(r.khet_province) !== String(provinceFilter)) return false;
      if (!q) return true;
      const provName = lookups.provinces[r.khet_province] || '';
      return (
        String(r.khet_code || '').toLowerCase().includes(q) ||
        String(r.khet_name || '').toLowerCase().includes(q) ||
        provName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, provinceFilter, lookups.provinces]);

  const totalSchoolsInKhets = useMemo(
    () => Object.values(schoolCounts).reduce((sum, item) => sum + (item.active || 0), 0),
    [schoolCounts]
  );

  const openAddModal = () => {
    setModal({ open: true, mode: 'add', form: { ...EMPTY_FORM, khet_province: provinceFilter || '' } });
  };

  const openEditModal = (row) => {
    setModal({
      open: true,
      mode: 'edit',
      form: {
        khet_province: String(row.khet_province || ''),
        khet_code: String(row.khet_code || ''),
        khet_name: String(row.khet_name || ''),
      },
    });
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (saving) return;

    const codeClean = String(modal.form.khet_code || '').trim();
    const nameClean = String(modal.form.khet_name || '').trim();
    const provClean = String(modal.form.khet_province || '').trim();

    if (!provClean) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกจังหวัดที่สหวิทยาเขตตั้งอยู่', 'warning');
      return;
    }
    if (codeClean.length !== 4) {
      Swal.fire('รหัสไม่ถูกต้อง', 'รหัสสหวิทยาเขตต้องมีความยาว 4 หลัก', 'warning');
      return;
    }
    if (!nameClean) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อสหวิทยาเขต', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (modal.mode === 'add') {
        const { data: exists } = await supabase
          .from('tbl_khet')
          .select('khet_code')
          .eq('khet_code', codeClean)
          .maybeSingle();

        if (exists) {
          Swal.fire('รหัสซ้ำ', `รหัสสหวิทยาเขต ${codeClean} มีอยู่ในระบบแล้ว กรุณาระบุรหัสอื่น`, 'warning');
          setSaving(false);
          return;
        }

        const { error } = await supabase.from('tbl_khet').insert([
          {
            khet_code: codeClean,
            khet_name: nameClean,
            khet_province: provClean,
          },
        ]);
        if (error) throw error;
        showToast('เพิ่มข้อมูลสหวิทยาเขตสำเร็จ');
      } else {
        const { error } = await supabase
          .from('tbl_khet')
          .update({
            khet_name: nameClean,
            khet_province: provClean,
          })
          .eq('khet_code', codeClean);
        if (error) throw error;
        showToast('แก้ไขข้อมูลสหวิทยาเขตสำเร็จ');
      }

      setModal({ open: false, mode: 'add', form: EMPTY_FORM });
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const localCount = schoolCounts[row.khet_code]?.total || 0;
    if (localCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบสหวิทยาเขตนี้ได้',
        html: `สหวิทยาเขต <b>${row.khet_name} (${row.khet_code})</b> มีสถานศึกษาสังกัดอยู่ <b>${localCount} แห่ง</b><br/>กรุณาย้ายสังกัดสถานศึกษาก่อนดำเนินการลบ`,
        confirmButtonText: 'รับทราบ',
      });
      return;
    }

    // Double-check live reference in tbl_school before deleting
    const { count, error: countErr } = await supabase
      .from('tbl_school')
      .select('school_id', { count: 'exact', head: true })
      .eq('khet_code', row.khet_code);

    if (countErr) {
      Swal.fire('ข้อผิดพลาด', countErr.message || 'ไม่สามารถตรวจสอบข้อมูลอ้างอิงได้', 'error');
      return;
    }
    if ((count || 0) > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบสหวิทยาเขตนี้ได้',
        text: `พบสถานศึกษาอ้างอิงรหัส ${row.khet_code} จำนวน ${count} แห่งในระบบ`,
      });
      loadData();
      return;
    }

    const result = await Swal.fire({
      title: `ยืนยันการลบสหวิทยาเขต?`,
      html: `ต้องการลบ <b>${row.khet_name}</b> (รหัส <code>${row.khet_code}</code>) ใช่หรือไม่?<br/><small class="text-danger">การดำเนินการนี้ไม่สามารถเรียกคืนได้</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from('tbl_khet').delete().eq('khet_code', row.khet_code);
      if (error) throw error;
      showToast(`ลบสหวิทยาเขต ${row.khet_name} เรียบร้อยแล้ว`);
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('ลบไม่สำเร็จ', err.message || 'ไม่สามารถลบข้อมูลสหวิทยาเขตได้', 'error');
    }
  };

  if (loading || lookupLoading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลสหวิทยาเขต..." />;
  }

  return (
    <div>
      {/* KPI Summary Strip */}
      <div className="row mb-3">
        <div className="col-md-4 mb-2 mb-md-0">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold">จำนวนสหวิทยาเขตทั้งหมด</div>
                <div className="h4 font-weight-bold text-primary mb-0 mt-1">{rows.length} สหวิทยาเขต</div>
              </div>
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="fa-solid fa-map-location-dot"></i>
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-2 mb-md-0">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold">โรงเรียนที่เปิดใช้งานในสังกัดรวม</div>
                <div className="h4 font-weight-bold text-success mb-0 mt-1">{totalSchoolsInKhets} แห่ง</div>
              </div>
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-success-subtle text-success"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="fa-solid fa-school"></i>
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold">พื้นที่รับผิดชอบ</div>
                <div className="h6 font-weight-bold text-dark mb-0 mt-1">
                  {provinceOptions.map((p) => p.label).join(' • ') || 'สพม.พิษณุโลก อุตรดิตถ์'}
                </div>
              </div>
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-info-subtle text-info"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="fa-solid fa-location-dot"></i>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span
              className="rounded d-inline-flex align-items-center justify-content-center bg-info-subtle text-info"
              style={{ width: '36px', height: '36px' }}
            >
              <i className="fa-solid fa-map-location-dot"></i>
            </span>
            <div>
              <h3 className="card-title m-0 font-weight-bold text-dark">จัดการข้อมูลสหวิทยาเขต</h3>
              <small className="text-muted">แสดง {filteredRows.length} จาก {rows.length} สหวิทยาเขต</small>
            </div>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-2">
            <select
              className="custom-select custom-select-sm"
              style={{ width: '175px' }}
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
            >
              <option value="">ทุกจังหวัด</option>
              {provinceOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  จ.{p.label}
                </option>
              ))}
            </select>

            <div className="input-group input-group-sm" style={{ width: '230px' }}>
              <div className="input-group-prepend">
                <span className="input-group-text bg-light border-right-0">
                  <i className="fa-solid fa-magnifying-glass text-muted"></i>
                </span>
              </div>
              <input
                type="text"
                className="form-control border-left-0"
                placeholder="ค้นหารหัส / ชื่อสหวิทยาเขต..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <div className="input-group-append">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={openAddModal} className="btn btn-primary btn-sm font-weight-bold px-3">
              <i className="fa-solid fa-plus mr-1"></i> เพิ่มสหวิทยาเขต
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="fa-map-location-dot"
                message={search || provinceFilter ? 'ไม่พบสหวิทยาเขตที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลสหวิทยาเขต'}
                actionLabel={search || provinceFilter ? 'ล้างตัวกรอง' : '+ เพิ่มสหวิทยาเขต'}
                onAction={
                  search || provinceFilter
                    ? () => {
                        setSearch('');
                        setProvinceFilter('');
                      }
                    : openAddModal
                }
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: '140px' }}>รหัสสหวิทยาเขต</th>
                    <th>ชื่อสหวิทยาเขต</th>
                    <th className="text-center" style={{ width: '160px' }}>จังหวัด</th>
                    <th className="text-center" style={{ width: '180px' }}>จำนวนโรงเรียนในสังกัด</th>
                    <th className="text-center" style={{ width: '210px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const stat = schoolCounts[row.khet_code] || { total: 0, active: 0 };
                    const hasSchools = stat.total > 0;
                    return (
                      <tr key={row.khet_code}>
                        <td className="text-center font-weight-bold">
                          <code>{row.khet_code}</code>
                        </td>
                        <td className="font-weight-semibold">{row.khet_name}</td>
                        <td className="text-center">
                          <span className="badge bg-info-subtle text-info px-2 py-1">
                            {lookups.provinces[row.khet_province] || row.khet_province}
                          </span>
                        </td>
                        <td className="text-center">
                          {hasSchools ? (
                            <Link
                              to={`/school?khet_code=${encodeURIComponent(row.khet_code)}`}
                              className="badge bg-success-subtle text-success px-3 py-1 text-decoration-none"
                              style={{ borderRadius: '999px', fontSize: '0.84rem' }}
                              title="คลิกเพื่อดูรายชื่อโรงเรียนในสหวิทยาเขตนี้"
                            >
                              <i className="fa-solid fa-school mr-1"></i>
                              {stat.active} แห่ง
                              {stat.total > stat.active ? ` (รวมปิดใช้ ${stat.total})` : ''}
                            </Link>
                          ) : (
                            <span className="badge badge-light border text-muted px-2 py-1" style={{ borderRadius: '999px' }}>
                              0 แห่ง
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-inline-flex align-items-center flex-wrap gap-1 justify-content-center">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="btn btn-sm btn-outline-primary py-1 px-2"
                              title="แก้ไขด่วน"
                            >
                              <i className="fa-solid fa-pen-to-square mr-1"></i> แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className={`btn btn-sm py-1 px-2 ${
                                hasSchools ? 'btn-outline-secondary' : 'btn-outline-danger'
                              }`}
                              title={
                                hasSchools
                                  ? `ไม่สามารถลบได้เนื่องจากมีโรงเรียนสังกัดอยู่ ${stat.total} แห่ง`
                                  : 'ลบสหวิทยาเขต'
                              }
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Inline Add / Edit Modal */}
      {modal.open && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1060 }}
          onClick={(e) => e.target === e.currentTarget && setModal({ open: false, mode: 'add', form: EMPTY_FORM })}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <form onSubmit={handleSaveModal}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title font-weight-bold">
                    <i className={`fa-solid ${modal.mode === 'add' ? 'fa-plus-circle text-primary' : 'fa-pen-to-square text-info'} mr-2`}></i>
                    {modal.mode === 'add' ? 'เพิ่มข้อมูลสหวิทยาเขต' : `แก้ไขสหวิทยาเขต (${modal.form.khet_code})`}
                  </h5>
                  <button
                    type="button"
                    className="close"
                    onClick={() => setModal({ open: false, mode: 'add', form: EMPTY_FORM })}
                  >
                    <span>&times;</span>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="form-group mb-3">
                    <label className="form-label">
                      จังหวัดที่ตั้งสหวิทยาเขต <span className="text-danger">*</span>
                    </label>
                    <SearchableSelect
                      options={provinceOptions}
                      value={modal.form.khet_province}
                      onChange={(val) =>
                        setModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, khet_province: val },
                        }))
                      }
                      placeholder="-- เลือกจังหวัด --"
                      required
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">
                      รหัสสหวิทยาเขต (4 หลัก) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength="4"
                      className="form-control"
                      placeholder="เช่น 5301 หรือ 6501"
                      value={modal.form.khet_code}
                      readOnly={modal.mode === 'edit'}
                      required
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, khet_code: e.target.value.trim() },
                        }))
                      }
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label">
                      ชื่อสหวิทยาเขต <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ระบุชื่อสหวิทยาเขต"
                      value={modal.form.khet_name}
                      required
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, khet_name: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light border-top-0">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setModal({ open: false, mode: 'add', form: EMPTY_FORM })}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Khet;
