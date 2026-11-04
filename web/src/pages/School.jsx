import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import useUserLookups from '../hooks/useUserLookups';
import useActiveYears from '../hooks/useActiveYears';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showToast } from '../utils/toast';

const toNum = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const School = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lists: schoolLists, lookups: schoolLookups, loading: schoolLookupLoading } = useSchoolLookups();
  const { lookups: userLookups, loading: userLookupLoading } = useUserLookups();
  const { educationYear, loading: yearLoading } = useActiveYears();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState(searchParams.get('province_id') || '');
  const [khetFilter, setKhetFilter] = useState(searchParams.get('khet_code') || '');
  const [sizeFilter, setSizeFilter] = useState(searchParams.get('school_size') || '');
  const [statusFilter, setStatusFilter] = useState('1'); // 'ALL' | '1' | '0'

  const eduYear = educationYear?.year || '';
  const eduSection = educationYear?.section || '';
  const numberFormatter = useMemo(() => new Intl.NumberFormat('th-TH'), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolRes, dmcRes, userRes] = await Promise.all([
        supabase.from('tbl_school').select('*').order('school_id', { ascending: true }),
        eduYear && eduSection
          ? supabase
              .from('tbl_school_DMCdata')
              .select(
                'school_code8,a1m,a1f,a2m,a2f,p1m,p1f,p2m,p2f,p3m,p3f,p4m,p4f,p5m,p5f,p6m,p6f,m1m,m1f,m2m,m2f,m3m,m3f,m4m,m4f,m5m,m5f,m6m,m6f,v1m,v1f,v2m,v2f'
              )
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
        if (row.school_code8) dmcMap[row.school_code8] = row;
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
        // CRITICAL MATH FIX: stdV = v1 + v2 (not v2 twice), totalStudents = stdA + stdP + stdM + stdV (not stdP twice)
        const stdA = toNum(dmc.a1m) + toNum(dmc.a1f) + toNum(dmc.a2m) + toNum(dmc.a2f);
        const stdP =
          toNum(dmc.p1m) +
          toNum(dmc.p1f) +
          toNum(dmc.p2m) +
          toNum(dmc.p2f) +
          toNum(dmc.p3m) +
          toNum(dmc.p3f) +
          toNum(dmc.p4m) +
          toNum(dmc.p4f) +
          toNum(dmc.p5m) +
          toNum(dmc.p5f) +
          toNum(dmc.p6m) +
          toNum(dmc.p6f);
        const stdM =
          toNum(dmc.m1m) +
          toNum(dmc.m1f) +
          toNum(dmc.m2m) +
          toNum(dmc.m2f) +
          toNum(dmc.m3m) +
          toNum(dmc.m3f) +
          toNum(dmc.m4m) +
          toNum(dmc.m4f) +
          toNum(dmc.m5m) +
          toNum(dmc.m5f) +
          toNum(dmc.m6m) +
          toNum(dmc.m6f);
        const stdV = toNum(dmc.v1m) + toNum(dmc.v1f) + toNum(dmc.v2m) + toNum(dmc.v2f);
        const totalStudents = stdA + stdP + stdM + stdV;

        return {
          ...row,
          directorName: directorName[row.school_id] || '',
          directorCount: directorCount[row.school_id] || 0,
          deputyCount: deputyCount[row.school_id] || 0,
          teacherCount: teacherCount[row.school_id] || 0,
          stdA,
          stdP,
          stdM,
          stdV,
          totalStudents,
        };
      });

      setRows(mapped);
    } catch (err) {
      console.error('School load error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลสถานศึกษาได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [eduYear, eduSection, userLookups.prefix]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeRows = useMemo(() => rows.filter((r) => String(r.school_flag) === '1'), [rows]);

  const kpiStats = useMemo(() => {
    let studentsSum = 0;
    let teachersSum = 0;
    const byProvince = {};
    const bySize = {};

    activeRows.forEach((r) => {
      studentsSum += r.totalStudents || 0;
      teachersSum += r.teacherCount || 0;

      const pName = schoolLookups.provinces[r.school_province] || r.school_province || 'ไม่ระบุ';
      byProvince[pName] = (byProvince[pName] || 0) + 1;

      const sName = schoolLookups.schoolSize[r.school_size] || r.school_size || 'ไม่ระบุ';
      bySize[sName] = (bySize[sName] || 0) + 1;
    });

    return {
      totalSchools: rows.length,
      activeSchools: activeRows.length,
      inactiveSchools: rows.length - activeRows.length,
      studentsSum,
      teachersSum,
      byProvince: Object.entries(byProvince),
      bySize: Object.entries(bySize),
    };
  }, [activeRows, rows.length, schoolLookups.provinces, schoolLookups.schoolSize]);

  const provinceOptions = useMemo(() => {
    const usedIds = new Set(rows.map((r) => String(r.school_province)).filter(Boolean));
    return (schoolLists.provinces || []).filter((p) => usedIds.has(String(p.province_id)));
  }, [rows, schoolLists.provinces]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && String(r.school_flag) !== statusFilter) return false;
      if (provinceFilter && String(r.school_province) !== String(provinceFilter)) return false;
      if (khetFilter && String(r.khet_code) !== String(khetFilter)) return false;
      if (sizeFilter && String(r.school_size) !== String(sizeFilter)) return false;
      if (!q) return true;

      const khetName = schoolLookups.khet[r.khet_code] || '';
      const provName = schoolLookups.provinces[r.school_province] || '';
      return (
        String(r.school_id || '').toLowerCase().includes(q) ||
        String(r.school_code8 || '').toLowerCase().includes(q) ||
        String(r.school_code6 || '').toLowerCase().includes(q) ||
        String(r.school_name || '').toLowerCase().includes(q) ||
        String(r.directorName || '').toLowerCase().includes(q) ||
        khetName.toLowerCase().includes(q) ||
        provName.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, provinceFilter, khetFilter, sizeFilter, search, schoolLookups.khet, schoolLookups.provinces]);

  const clearAllFilters = () => {
    setSearch('');
    setProvinceFilter('');
    setKhetFilter('');
    setSizeFilter('');
    setStatusFilter('1');
    setSearchParams({});
  };

  const handleToggleSchoolFlag = async (row) => {
    const isCurrentlyActive = String(row.school_flag) === '1';
    const nextFlag = isCurrentlyActive ? '0' : '1';

    const result = await Swal.fire({
      title: isCurrentlyActive ? 'ปิดการใช้งานสถานศึกษา?' : 'เปิดการใช้งานสถานศึกษา?',
      html: isCurrentlyActive
        ? `ต้องการปรับสถานะ <b>โรงเรียน${row.school_name}</b> (<code>${row.school_id}</code>) เป็น <b>ปิดใช้งาน</b> ใช่หรือไม่?<br/><small class="text-muted">ข้อมูลประวัติและแผนการสอนเดิมจะยังคงอยู่ครบถ้วน</small>`
        : `ต้องการเปิดใช้งาน <b>โรงเรียน${row.school_name}</b> (<code>${row.school_id}</code>) อีกครั้งใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isCurrentlyActive ? '#d97706' : '#059669',
      confirmButtonText: isCurrentlyActive ? 'ยืนยันปิดใช้งาน' : 'ยืนยันเปิดใช้งาน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tbl_school')
        .update({ school_flag: nextFlag })
        .eq('school_id', row.school_id);
      if (error) throw error;

      setRows((prev) =>
        prev.map((item) => (item.school_id === row.school_id ? { ...item, school_flag: nextFlag } : item))
      );
      showToast(
        nextFlag === '1'
          ? `เปิดใช้งานโรงเรียน${row.school_name}แล้ว`
          : `ปิดใช้งานโรงเรียน${row.school_name}แล้ว`
      );
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถเปลี่ยนสถานะสถานศึกษาได้', 'error');
    }
  };

  if (loading || schoolLookupLoading || userLookupLoading || yearLoading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลสถานศึกษาและสถิตินักเรียน..." />;
  }

  return (
    <div>
      {/* KPI Summary Strip */}
      <div className="row mb-3">
        <div className="col-sm-6 col-xl-3 mb-2 mb-xl-0">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3 d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small font-weight-bold">จำนวนสถานศึกษาที่เปิดใช้งาน</div>
                <div className="h4 font-weight-bold text-primary mb-0 mt-1">
                  {numberFormatter.format(kpiStats.activeSchools)}{' '}
                  <small className="text-muted font-weight-normal" style={{ fontSize: '0.85rem' }}>
                    แห่ง
                  </small>
                </div>
                {kpiStats.inactiveSchools > 0 && (
                  <small className="text-muted">ปิดใช้งาน {kpiStats.inactiveSchools} แห่ง</small>
                )}
              </div>
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="fa-solid fa-school"></i>
              </span>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3 mb-2 mb-xl-0">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3 d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small font-weight-bold">
                  นักเรียนรวม {eduYear ? `(DMC ${eduYear}/${eduSection})` : ''}
                </div>
                <div className="h4 font-weight-bold text-success mb-0 mt-1">
                  {numberFormatter.format(kpiStats.studentsSum)}{' '}
                  <small className="text-muted font-weight-normal" style={{ fontSize: '0.85rem' }}>
                    คน
                  </small>
                </div>
                <small className="text-muted">ครูในระบบ {numberFormatter.format(kpiStats.teachersSum)} คน</small>
              </div>
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-success-subtle text-success"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="fa-solid fa-users"></i>
              </span>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3 mb-2 mb-sm-0">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3">
              <div className="text-muted small font-weight-bold mb-1">
                <i className="fa-solid fa-location-dot text-info mr-1"></i> แยกตามจังหวัด
              </div>
              <div className="d-flex flex-wrap gap-1 mt-1">
                {kpiStats.byProvince.length === 0 ? (
                  <span className="text-muted small">-</span>
                ) : (
                  kpiStats.byProvince.map(([prov, count]) => (
                    <span key={prov} className="badge bg-info-subtle text-info px-2 py-1">
                      {prov}: {count} แห่ง
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3">
              <div className="text-muted small font-weight-bold mb-1">
                <i className="fa-solid fa-chart-simple text-warning mr-1"></i> แยกตามขนาดโรงเรียน
              </div>
              <div className="d-flex flex-wrap gap-1 mt-1">
                {kpiStats.bySize.length === 0 ? (
                  <span className="text-muted small">-</span>
                ) : (
                  kpiStats.bySize.map(([sz, count]) => (
                    <span key={sz} className="badge bg-warning-subtle text-warning-emphasis px-2 py-1">
                      {sz}: {count}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span
                className="rounded d-inline-flex align-items-center justify-content-center bg-success-subtle text-success"
                style={{ width: '36px', height: '36px' }}
              >
                <i className="fa-solid fa-school"></i>
              </span>
              <div>
                <h3 className="card-title m-0 font-weight-bold text-dark">จัดการข้อมูลสถานศึกษา</h3>
                <small className="text-muted">
                  แสดง {numberFormatter.format(filteredRows.length)} จาก {numberFormatter.format(rows.length)} แห่ง
                </small>
              </div>
            </div>

            <div className="d-flex align-items-center flex-wrap gap-2">
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className={`btn ${statusFilter === '1' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('1')}
                >
                  เปิดใช้ ({kpiStats.activeSchools})
                </button>
                <button
                  type="button"
                  className={`btn ${statusFilter === '0' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('0')}
                >
                  ปิดใช้ ({kpiStats.inactiveSchools})
                </button>
                <button
                  type="button"
                  className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  ทั้งหมด ({kpiStats.totalSchools})
                </button>
              </div>

              <Link className="btn btn-primary btn-sm font-weight-bold px-3" to="/school_add">
                <i className="fa-solid fa-plus mr-1"></i> เพิ่มสถานศึกษา
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="row g-2">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <div className="input-group-prepend">
                  <span className="input-group-text bg-light border-right-0">
                    <i className="fa-solid fa-magnifying-glass text-muted"></i>
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control border-left-0"
                  placeholder="ค้นหาชื่อโรงเรียน, รหัส MOECODE, ผอ., สหวิทยาเขต..."
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
            </div>

            <div className="col-sm-4 col-md-2">
              <select
                className="custom-select custom-select-sm"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
              >
                <option value="">ทุกจังหวัด</option>
                {provinceOptions.map((p) => (
                  <option key={p.province_id} value={p.province_id}>
                    จ.{p.province_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-sm-4 col-md-3">
              <select
                className="custom-select custom-select-sm"
                value={khetFilter}
                onChange={(e) => setKhetFilter(e.target.value)}
              >
                <option value="">ทุกสหวิทยาเขต</option>
                {(schoolLists.khet || []).map((k) => (
                  <option key={k.khet_code} value={k.khet_code}>
                    {k.khet_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-sm-4 col-md-3 d-flex gap-1">
              <select
                className="custom-select custom-select-sm"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
              >
                <option value="">ทุกขนาดโรงเรียน</option>
                {(schoolLists.schoolSize || []).map((s) => (
                  <option key={s.schoolsize_id} value={s.schoolsize_id}>
                    {s.schoolsize_name}
                  </option>
                ))}
              </select>
              {(search || provinceFilter || khetFilter || sizeFilter || statusFilter !== '1') && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary text-nowrap"
                  onClick={clearAllFilters}
                  title="ล้างตัวกรองทั้งหมด"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="fa-school"
                message="ไม่พบสถานศึกษาที่ตรงกับเงื่อนไขการค้นหา"
                actionLabel="ล้างตัวกรองทั้งหมด"
                onAction={clearAllFilters}
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="text-center">รหัส MOECODE</th>
                    <th>ชื่อสถานศึกษา</th>
                    <th>ผู้อำนวยการ</th>
                    <th>สหวิทยาเขต</th>
                    <th className="text-center">จังหวัด</th>
                    <th className="text-center">ขนาด</th>
                    <th className="text-center">ผอ./รอง</th>
                    <th className="text-right">ครู</th>
                    <th className="text-right">นักเรียนรวม</th>
                    <th className="text-center" style={{ width: '130px' }}>สถานะใช้งาน</th>
                    <th className="text-center" style={{ width: '90px' }}>แก้ไข</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const active = String(row.school_flag) === '1';
                    return (
                      <tr key={row.school_id} className={!active ? 'text-muted bg-light' : ''}>
                        <td className="text-center">
                          <code>{row.school_id}</code>
                        </td>
                        <td className="font-weight-semibold">{row.school_name}</td>
                        <td>
                          {row.directorName || <span className="text-muted small">-</span>}
                        </td>
                        <td>{schoolLookups.khet[row.khet_code] || '-'}</td>
                        <td className="text-center">{schoolLookups.provinces[row.school_province] || '-'}</td>
                        <td className="text-center">
                          <span className="badge bg-info-subtle text-info px-2 py-1">
                            {schoolLookups.schoolSize[row.school_size] || row.school_size || '-'}
                          </span>
                        </td>
                        <td className="text-center small">
                          {row.directorCount} / {row.deputyCount}
                        </td>
                        <td className="text-right">{numberFormatter.format(row.teacherCount)}</td>
                        <td
                          className="text-right font-weight-bold text-primary"
                          title={`อ.: ${row.stdA} | ป.: ${row.stdP} | ม.: ${row.stdM} | ปวช.: ${row.stdV}`}
                        >
                          {numberFormatter.format(row.totalStudents)}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSchoolFlag(row)}
                            className={`btn btn-xs px-2 py-1 font-weight-bold ${
                              active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-muted'
                            }`}
                            style={{ borderRadius: '999px', border: 'none', minWidth: '88px' }}
                            title="คลิกเพื่อเปิด/ปิดการใช้งานสถานศึกษา"
                          >
                            <i className={`fa-solid ${active ? 'fa-toggle-on' : 'fa-toggle-off'} mr-1`}></i>
                            {active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </button>
                        </td>
                        <td className="text-center">
                          <Link
                            to={`/school_edit?school_id=${encodeURIComponent(row.school_id)}`}
                            className="btn btn-sm btn-outline-primary py-1 px-2"
                            title="แก้ไขข้อมูลสถานศึกษา"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </Link>
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
    </div>
  );
};

export default School;
