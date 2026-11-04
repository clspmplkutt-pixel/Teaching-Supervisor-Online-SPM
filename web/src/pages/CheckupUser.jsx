import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';
import useAppConfig from '../hooks/useAppConfig';
import { cleanThaiId, formatThaiId, isValidThaiId } from '../utils/thaiId';
import { showToast } from '../utils/toast';
import SearchableSelect from '../components/SearchableSelect';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const getEditModule = (level) => {
  if (level === 'directorschool') return 'directorschool_edit';
  if (level === 'supervisor' || level === 'supervision') return 'supervisor_edit';
  if (level === 'districdirector') return 'dd_edit';
  return 'teacher_edit';
};

const parseBirthdayDiagnostic = (birthday) => {
  if (!birthday) {
    return { status: 'missing', isBuddhist: false, convertedDate: null, label: 'ไม่ระบุวันเกิด' };
  }
  const str = String(birthday).trim().slice(0, 10);
  if (!str || str === '0000-00-00') {
    return { status: 'missing', isBuddhist: false, convertedDate: null, label: 'ไม่ระบุวันเกิด' };
  }
  const parts = str.split('-');
  if (parts.length !== 3) {
    return { status: 'invalid', isBuddhist: false, convertedDate: null, label: `รูปแบบผิด (${str})` };
  }
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    return { status: 'invalid', isBuddhist: false, convertedDate: null, label: `วันเกิดไม่ถูกต้อง (${str})` };
  }
  if (y >= 2400 && y <= 2600) {
    const adYear = y - 543;
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return {
      status: 'buddhist',
      isBuddhist: true,
      convertedDate: `${adYear}-${mm}-${dd}`,
      label: `ระบุปี พ.ศ. (${str})`,
    };
  }
  const maxBirthYear = new Date().getFullYear() - 18;
  if (y < 1930 || y > maxBirthYear) {
    return {
      status: 'invalid',
      isBuddhist: false,
      convertedDate: null,
      label: `ปีเกิดผิดปกติ (${str})`,
    };
  }
  return { status: 'ok', isBuddhist: false, convertedDate: null, label: '' };
};

const ISSUE_META = {
  cid_error: {
    key: 'cid_error',
    label: 'เลขบัตรไม่ครบ/ผิดหลัก',
    badgeClass: 'badge-danger',
    icon: 'fa-id-card',
  },
  missing_school: {
    key: 'missing_school',
    label: 'ไม่ระบุโรงเรียน',
    badgeClass: 'badge-danger',
    icon: 'fa-school-circle-exclamation',
  },
  missing_position: {
    key: 'missing_position',
    label: 'ไม่ระบุตำแหน่ง',
    badgeClass: 'badge-warning text-dark',
    icon: 'fa-user-tag',
  },
  missing_subject: {
    key: 'missing_subject',
    label: 'ไม่ระบุกลุ่มสาระฯ',
    badgeClass: 'badge-info',
    icon: 'fa-book-open',
  },
  buddhist_bday: {
    key: 'buddhist_bday',
    label: 'ระบุปีเกิด พ.ศ.',
    badgeClass: 'badge-warning text-dark',
    icon: 'fa-clock-rotate-left',
  },
  invalid_bday: {
    key: 'invalid_bday',
    label: 'วันเกิดผิดปกติ/ไม่ระบุ',
    badgeClass: 'badge-secondary',
    icon: 'fa-cake-candles',
  },
};

const CheckupUser = () => {
  const { lookups, lists, loading: lookupsLoading } = useUserLookups();
  const { config, loading: configLoading } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [planCountByCid, setPlanCountByCid] = useState({});

  const [issueFilter, setIssueFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Loop-fetch ALL users in tbl_Users (bypassing 1,000-row PostgREST cap)
      const fetchedUsers = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('tbl_Users')
          .select('*')
          .order('id', { ascending: true })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        const chunk = data || [];
        fetchedUsers.push(...chunk);
        if (chunk.length < batchSize) break;
        offset += batchSize;
      }

      // 2. Loop-fetch tbl_sendplan (people_id) to protect accounts with plans
      const planCounts = {};
      let planOffset = 0;
      while (true) {
        const { data: plans, error: planErr } = await supabase
          .from('tbl_sendplan')
          .select('planid, people_id')
          .order('planid', { ascending: true })
          .range(planOffset, planOffset + batchSize - 1);
        if (planErr) throw planErr;
        const pChunk = plans || [];
        pChunk.forEach((p) => {
          const cid = String(p.people_id || '').trim();
          if (cid) planCounts[cid] = (planCounts[cid] || 0) + 1;
        });
        if (pChunk.length < batchSize) break;
        planOffset += batchSize;
      }

      setAllUsers(fetchedUsers);
      setPlanCountByCid(planCounts);
    } catch (err) {
      console.error('CheckupUser load error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถสแกนข้อมูลบุคลากรได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Duplicate count map to know if another record holds the same people_id
  const cidRecordCounts = useMemo(() => {
    const map = {};
    allUsers.forEach((u) => {
      const cid = String(u.people_id || '').trim();
      if (cid) map[cid] = (map[cid] || 0) + 1;
    });
    return map;
  }, [allUsers]);

  // Diagnose all users once lookups are loaded
  const diagnosedRows = useMemo(() => {
    if (lookupsLoading) return [];
    const results = [];

    allUsers.forEach((row) => {
      const issues = [];
      const cidCleaned = cleanThaiId(row.people_id);
      if (!cidCleaned || !isValidThaiId(cidCleaned)) {
        issues.push('cid_error');
      }

      const isDistrictRole =
        row.level === 'districdirector' ||
        row.level === 'supervisor' ||
        row.position_id === '10008' ||
        row.position_id === '10009' ||
        row.position_id === '10010';

      const schoolStr = String(row.school || '').trim();
      if (!isDistrictRole && (!schoolStr || (!lookups.school[schoolStr] && schoolStr !== String(areaCode)))) {
        issues.push('missing_school');
      }

      const posStr = String(row.position_id || '').trim();
      if (!posStr || !lookups.position[posStr]) {
        issues.push('missing_position');
      }

      const needsSubject =
        row.level === 'teacher' || row.level === 'admin_school' || row.level === 'supervisor';
      const subjStr = String(row.teach_subject || '').trim();
      if (needsSubject && (!subjStr || !lookups.teachSubject[subjStr])) {
        issues.push('missing_subject');
      }

      const bdayDiag = parseBirthdayDiagnostic(row.birthday);
      if (bdayDiag.status === 'buddhist') {
        issues.push('buddhist_bday');
      } else if (bdayDiag.status === 'missing' || bdayDiag.status === 'invalid') {
        issues.push('invalid_bday');
      }

      if (issues.length > 0) {
        results.push({
          ...row,
          issues,
          bdayDiag,
        });
      }
    });

    return results;
  }, [allUsers, lookups, lookupsLoading, areaCode]);

  const issueCounts = useMemo(() => {
    const counts = {
      all: diagnosedRows.length,
      cid_error: 0,
      missing_school: 0,
      missing_position: 0,
      missing_subject: 0,
      buddhist_bday: 0,
      invalid_bday: 0,
    };
    diagnosedRows.forEach((r) => {
      r.issues.forEach((k) => {
        if (typeof counts[k] === 'number') counts[k] += 1;
      });
    });
    return counts;
  }, [diagnosedRows]);

  const schoolOptions = useMemo(() => {
    return [
      { value: '', label: '-- ทุกสถานศึกษา / สังกัด --' },
      ...lists.school.map((s) => ({
        value: String(s.school_id),
        label: s.school_name || s.school_id,
        subLabel: `รหัส: ${s.school_id}`,
      })),
    ];
  }, [lists.school]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return diagnosedRows.filter((r) => {
      if (issueFilter !== 'all' && !r.issues.includes(issueFilter)) {
        return false;
      }
      if (schoolFilter && String(r.school || '') !== String(schoolFilter)) {
        return false;
      }
      if (term) {
        const fullName = `${lookups.prefix[r.prefix] || ''}${r.name || ''} ${r.lastname || ''}`.toLowerCase();
        const schoolName = (lookups.school[r.school] || String(r.school || '')).toLowerCase();
        const cid = String(r.people_id || '').toLowerCase();
        const bday = String(r.birthday || '').toLowerCase();
        if (
          !fullName.includes(term) &&
          !schoolName.includes(term) &&
          !cid.includes(term) &&
          !bday.includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [diagnosedRows, issueFilter, schoolFilter, searchTerm, lookups]);

  useEffect(() => {
    setPage(1);
  }, [issueFilter, schoolFilter, searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const handleConvertSingle = async (row) => {
    const { isBuddhist, convertedDate } = row.bdayDiag || parseBirthdayDiagnostic(row.birthday);
    if (!isBuddhist || !convertedDate) return;

    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const result = await Swal.fire({
      title: 'ยืนยันแปลงปีเกิด พ.ศ. → ค.ศ.',
      html: `ต้องการแปลงวันเกิดของ <strong>${fullName}</strong> (#${row.id})<br/>จาก <code class="text-danger">${row.birthday}</code> เป็น <code class="text-success font-weight-bold">${convertedDate}</code> หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      confirmButtonText: 'ยืนยันแปลงเป็น ค.ศ.',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tbl_Users')
        .update({ birthday: convertedDate })
        .eq('id', row.id);
      if (error) throw error;

      showToast(`แปลงวันเกิดเป็น ${convertedDate} เรียบร้อยแล้ว`, 'success');
      await loadAllData();
    } catch (err) {
      console.error('Convert single birthday error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถอัปเดตวันเกิดได้', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertAllBuddhist = async () => {
    const buddhistRows = diagnosedRows.filter((r) => r.bdayDiag?.isBuddhist && r.bdayDiag?.convertedDate);
    if (buddhistRows.length === 0) return;

    const result = await Swal.fire({
      title: `แปลงปีเกิด พ.ศ. → ค.ศ. ทั้งหมด (${buddhistRows.length} คน)?`,
      html: `ระบบจะปรับปีเกิดลบด้วย 543 ให้เป็นปี ค.ศ. มาตรฐาน (YYYY-MM-DD) สำหรับบุคลากรจำนวน <strong>${buddhistRows.length} รายการ</strong>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      confirmButtonText: `ยืนยันแปลงทั้งหมด (${buddhistRows.length})`,
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      let updatedCount = 0;
      const chunkSize = 25;
      for (let i = 0; i < buddhistRows.length; i += chunkSize) {
        const batch = buddhistRows.slice(i, i + chunkSize);
        const results = await Promise.all(
          batch.map((r) =>
            supabase
              .from('tbl_Users')
              .update({ birthday: r.bdayDiag.convertedDate })
              .eq('id', r.id)
          )
        );
        results.forEach(({ error }) => {
          if (!error) updatedCount += 1;
        });
      }

      Swal.fire('สำเร็จ', `แปลงปีเกิดเป็น ค.ศ. เรียบร้อยแล้ว ${updatedCount} รายการ`, 'success');
      await loadAllData();
    } catch (err) {
      console.error('Convert all buddhist error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถแปลงวันเกิดทั้งหมดได้', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteJunkRow = async (row) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const cid = String(row.people_id || '').trim();
    const planCount = cid ? planCountByCid[cid] || 0 : 0;
    const siblingCount = cid ? cidRecordCounts[cid] || 0 : 0;

    if (planCount > 0 && siblingCount <= 1) {
      Swal.fire(
        'ไม่อนุญาตให้ลบบัญชีนี้',
        `บุคลากร "${fullName}" มีประวัติส่งแผนการสอน ${planCount} แผนในระบบ กรุณากดปุ่ม "แก้ไข" เพื่อซ่อมแซมข้อมูลแทนการลบ`,
        'warning'
      );
      return;
    }

    const confirm = await Swal.fire({
      title: 'ยืนยันการลบรายการข้อมูลผิดพลาด?',
      html: `
        <div class="text-left small">
          <div class="p-3 rounded bg-light border mb-2">
            <div><strong>รหัสอ้างอิง (ID):</strong> #${row.id}</div>
            <div><strong>ชื่อ-นามสกุล:</strong> ${fullName || '- ไม่ระบุชื่อ -'}</div>
            <div><strong>เลขบัตร ปชช.:</strong> <code>${cid || 'ไม่ระบุ'}</code></div>
            <div><strong>สถานศึกษา:</strong> ${lookups.school[row.school] || row.school || 'ไม่ระบุ'}</div>
          </div>
          <p class="text-danger mb-0"><i class="fa-solid fa-trash-can mr-1"></i> ตรวจสอบแล้วไม่มีแผนการสอนผูกอยู่กับระเบียนเดี่ยวนี้ ยืนยันการลบถาวรหรือไม่?</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ยืนยันลบรายการนี้',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('tbl_Users').delete().eq('id', row.id);
      if (error) throw error;
      showToast(`ลบรายการ #${row.id} เรียบร้อยแล้ว`, 'success');
      await loadAllData();
    } catch (err) {
      console.error('Delete junk row error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถลบรายการได้', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || lookupsLoading || configLoading) {
    return <LoadingSpinner message="กำลังสแกนตรวจสอบสุขภาพข้อมูลบุคลากรทั้งระบบ..." />;
  }

  return (
    <div className="container-fluid pb-4">
      {/* Header & Summary Card */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '14px' }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h4 className="mb-1 font-weight-bold text-dark">
                <i className="fa-solid fa-stethoscope text-danger mr-2"></i>
                ตรวจสอบความสมบูรณ์ของข้อมูลบุคลากร (Data Health)
              </h4>
              <p className="text-muted small mb-0">
                สแกนบุคลากรทั้งหมดในระบบ <strong>{allUsers.length.toLocaleString()}</strong> รายการ — พบรายการที่ควรปรับปรุง{' '}
                <strong className={diagnosedRows.length > 0 ? 'text-danger' : 'text-success'}>
                  {diagnosedRows.length.toLocaleString()}
                </strong>{' '}
                รายการ
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {issueCounts.buddhist_bday > 0 && (
                <button
                  type="button"
                  className="btn btn-warning btn-sm font-weight-bold text-dark shadow-sm"
                  onClick={handleConvertAllBuddhist}
                  disabled={actionLoading}
                >
                  <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>
                  แปลงปีเกิด พ.ศ. → ค.ศ. ทั้งหมด ({issueCounts.buddhist_bday})
                </button>
              )}
              <Link to="/checkupUserduplicate" className="btn btn-outline-primary btn-sm">
                <i className="fa-solid fa-clone mr-1"></i> ตรวจรายชื่อซ้ำซ้อน
              </Link>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={loadAllData}
                disabled={actionLoading}
              >
                <i className="fa-solid fa-arrows-rotate mr-1"></i> สแกนใหม่
              </button>
            </div>
          </div>

          {/* Interactive Issue Filter Pills */}
          <hr className="my-3" />
          <div className="d-flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              className={`btn btn-sm rounded-pill ${issueFilter === 'all' ? 'btn-dark font-weight-bold' : 'btn-outline-secondary'}`}
              onClick={() => setIssueFilter('all')}
            >
              พบปัญหาทั้งหมด ({issueCounts.all.toLocaleString()})
            </button>
            {Object.values(ISSUE_META).map((meta) => {
              const count = issueCounts[meta.key] || 0;
              const active = issueFilter === meta.key;
              return (
                <button
                  key={meta.key}
                  type="button"
                  className={`btn btn-sm rounded-pill ${active ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'}`}
                  onClick={() => setIssueFilter(meta.key)}
                >
                  <i className={`fa-solid ${meta.icon} mr-1`}></i>
                  {meta.label} ({count.toLocaleString()})
                </button>
              );
            })}
          </div>

          {/* Search & School Filter */}
          <div className="row">
            <div className="col-md-6 mb-2 mb-md-0">
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text bg-white">
                    <i className="fa-solid fa-magnifying-glass text-muted"></i>
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ค้นหาชื่อ-สกุล, เลขบัตรประชาชน, โรงเรียน, วันเกิด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <SearchableSelect
                options={schoolOptions}
                value={schoolFilter}
                onChange={(val) => setSchoolFilter(val)}
                placeholder="-- กรองตามสถานศึกษา / สังกัด --"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
        <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center">
          <div className="small text-muted">
            แสดงรายการที่ตรงเงื่อนไข <strong>{filteredRows.length.toLocaleString()}</strong> รายการ
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted mr-1">แสดงหน้าละ:</span>
            <select
              className="form-control form-control-sm"
              style={{ width: '75px' }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                type={diagnosedRows.length === 0 ? 'success' : 'info'}
                icon={diagnosedRows.length === 0 ? 'fa-circle-check' : 'fa-filter-circle-xmark'}
                title={
                  diagnosedRows.length === 0
                    ? 'สุขภาพข้อมูลบุคลากรสมบูรณ์ 100%'
                    : 'ไม่พบรายการที่ตรงกับตัวกรองที่เลือก'
                }
                message={
                  diagnosedRows.length === 0
                    ? 'เลขประจำตัวประชาชน สังกัด ตำแหน่ง กลุ่มสาระฯ และวันเกิดของบุคลากรทุกคนถูกต้องครบถ้วน'
                    : 'ลองเลือกตัวกรองประเภทความผิดพลาดอื่น หรือล้างคำค้นหา'
                }
                actionLabel={
                  diagnosedRows.length > 0 && (issueFilter !== 'all' || schoolFilter || searchTerm)
                    ? 'แสดงปัญหาทั้งหมด'
                    : undefined
                }
                onAction={
                  diagnosedRows.length > 0 && (issueFilter !== 'all' || schoolFilter || searchTerm)
                    ? () => {
                        setIssueFilter('all');
                        setSchoolFilter('');
                        setSearchTerm('');
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="thead-light">
                  <tr>
                    <th className="text-center" style={{ width: '56px' }}>#</th>
                    <th style={{ minWidth: '175px' }}>เลขประจำตัวประชาชน</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>สถานศึกษา / ตำแหน่ง</th>
                    <th style={{ minWidth: '240px' }}>รายการที่ต้องตรวจสอบ / แก้ไข</th>
                    <th className="text-center" style={{ width: '100px' }}>แผนที่ส่ง</th>
                    <th className="text-center" style={{ minWidth: '195px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row, idx) => {
                    const rowNum = (safePage - 1) * pageSize + idx + 1;
                    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
                    const cid = String(row.people_id || '').trim();
                    const planCount = cid ? planCountByCid[cid] || 0 : 0;
                    const editMod = getEditModule(row.level);
                    const hasCidErr = row.issues.includes('cid_error');
                    const { isBuddhist, convertedDate, label: bdayLabel } = row.bdayDiag || {};

                    return (
                      <tr key={row.id}>
                        <td className="text-center text-muted small">{rowNum}</td>
                        <td>
                          {cid ? (
                            <code className={hasCidErr ? 'text-danger font-weight-bold' : 'text-dark'}>
                              {formatThaiId(cid) || cid}
                            </code>
                          ) : (
                            <span className="badge badge-danger">ไม่ได้ระบุเลขบัตร</span>
                          )}
                          <div className="small text-muted">ID: #{row.id}</div>
                        </td>
                        <td>
                          <div className="font-weight-bold text-dark">{fullName || '- ไม่ระบุชื่อ -'}</div>
                          <span className="badge badge-light border small">{row.level || 'ไม่ระบุระดับ'}</span>
                        </td>
                        <td>
                          <div>
                            {lookups.school[row.school] || (
                              <span className="text-danger small font-weight-bold">
                                {row.school ? `รหัสสังกัดไม่พบ (${row.school})` : 'ไม่ระบุโรงเรียน'}
                              </span>
                            )}
                          </div>
                          <div className="small text-muted">
                            {lookups.position[row.position_id] || 'ไม่ระบุตำแหน่ง'}
                            {lookups.teachSubject[row.teach_subject]
                              ? ` • ${lookups.teachSubject[row.teach_subject]}`
                              : ''}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {row.issues.map((issueKey) => {
                              const meta = ISSUE_META[issueKey];
                              if (!meta) return null;
                              const customText =
                                issueKey === 'buddhist_bday' || issueKey === 'invalid_bday'
                                  ? bdayLabel || meta.label
                                  : meta.label;
                              return (
                                <span key={issueKey} className={`badge ${meta.badgeClass} py-1 px-2`}>
                                  <i className={`fa-solid ${meta.icon} mr-1`}></i>
                                  {customText}
                                </span>
                              );
                            })}
                          </div>
                          {isBuddhist && convertedDate && (
                            <div className="small text-success mt-1">
                              แนะนำแปลงเป็น ค.ศ.: <strong>{convertedDate}</strong>
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          {planCount > 0 ? (
                            <span className="badge badge-primary px-2 py-1">{planCount} แผน</span>
                          ) : (
                            <span className="text-muted small">0</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            {isBuddhist && (
                              <button
                                type="button"
                                className="btn btn-warning font-weight-bold text-dark"
                                onClick={() => handleConvertSingle(row)}
                                disabled={actionLoading}
                                title={`แปลงวันเกิดเป็น ${convertedDate}`}
                              >
                                <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> แปลง ค.ศ.
                              </button>
                            )}
                            <Link
                              to={`/${editMod}?id=${row.id}&people_id=${encodeURIComponent(cid)}${
                                hasCidErr ? '&peopleid_error=peopleidError' : ''
                              }`}
                              className="btn btn-primary"
                              title="แก้ไขข้อมูลบุคลากร"
                            >
                              <i className="fa-regular fa-pen-to-square mr-1"></i> แก้ไข
                            </Link>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteJunkRow(row)}
                              disabled={actionLoading}
                              title="ลบรายการขยะ (เฉพาะบัญชีที่ไม่มีแผนการสอน)"
                            >
                              <i className="fa-regular fa-trash-can"></i>
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

        {filteredRows.length > pageSize && (
          <div className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center py-2">
            <div className="small text-muted">
              แสดง {(safePage - 1) * pageSize + 1} - {Math.min(filteredRows.length, safePage * pageSize)} จาก{' '}
              {filteredRows.length.toLocaleString()} รายการ
            </div>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left"></i> ก่อนหน้า
              </button>
              <span className="btn btn-light disabled font-weight-bold">
                หน้า {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ถัดไป <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckupUser;
