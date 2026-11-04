import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import roleModules, { roleLabels } from '../config/roleModules';

const getRoleTitle = (level) => {
  if (roleLabels[level]) return roleLabels[level];
  switch (level) {
    case 'admin':
    case 'root':
      return 'ผู้ดูแลระบบสูงสุด (Super Admin)';
    case 'supervisor':
      return 'ศึกษานิเทศก์ (Supervisor)';
    case 'supervision':
      return 'คณะกรรมการนิเทศ (Evaluator)';
    case 'chairman':
      return 'ประธานสหวิทยาเขต (Chairman)';
    case 'directorschool':
      return 'ผู้อำนวยการโรงเรียน (Director)';
    case 'headdepartment':
      return 'หัวหน้ากลุ่มสาระการเรียนรู้ (Head of Department)';
    case 'admin_school':
      return 'เจ้าหน้าที่ดูแลระบบโรงเรียน (School Admin)';
    case 'districdirector':
    case 'dd':
      return 'ผู้อำนวยการเขตพื้นที่การศึกษา (District Director)';
    default:
      return 'บุคลากรทางการศึกษา';
  }
};

const InfoSimple = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('khet'); // 'khet', 'size', 'dmc', 'tools'

  const [khetStats, setKhetStats] = useState([]);
  const [sizeStats, setSizeStats] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [planStats, setPlanStats] = useState({ total: 0, approved: 0, pending: 0, fullyScored: 0 });
  const [myWorkload, setMyWorkload] = useState({ assigned: 0, scored: 0, pending: 0 });

  // DMC Data state
  const [dmcYear, setDmcYear] = useState('2568');
  const [dmcRound, setDmcRound] = useState('1'); // 1 = 10 มิ.ย., 2 = 10 พ.ย.
  const [dmcRows, setDmcRows] = useState([]);
  const [dmcLoading, setDmcLoading] = useState(false);
  const [dmcSearch, setDmcSearch] = useState('');

  const [lookupData, setLookupData] = useState({
    khet: {},
    province: {},
    schoolSize: {},
    prefix: {},
  });

  const userId = profile?.people_id || user?.user_metadata?.people_id || user?.people_id || '';
  const userRole = profile?.level || profile?.level_id || user?.user_metadata?.role || user?.role || 'supervisor';

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [
          khetRes,
          provinceRes,
          sizeRes,
          schoolRes,
          usersCountRes,
          planRes,
          scoreRes,
          prefixRes,
        ] = await Promise.all([
          supabase.from('tbl_khet').select('khet_code, khet_name'),
          supabase.from('tbl_province').select('province_id, province_name'),
          supabase.from('tbl_schoolsize').select('schoolsize_id, schoolsize_name, schoolsize_details'),
          supabase.from('tbl_school').select('school_id, school_name, school_code8, khet_code, school_province, school_size').neq('school_flag', 0),
          supabase.from('tbl_Users').select('people_id', { count: 'exact', head: true }),
          supabase.from('tbl_sendplan').select('planid, school_code, plan_status, committee1, committee2, committee3, committee4, committee5'),
          supabase.from('tbl_sendplan_score').select('planid, supervision'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
        ]);

        if (!mounted) return;

        // Lookup mappings
        const khetMap = {};
        khetRes.data?.forEach((k) => { khetMap[k.khet_code] = k.khet_name; });

        const provinceMap = {};
        provinceRes.data?.forEach((p) => { provinceMap[p.province_id] = p.province_name; });

        const sizeMap = {};
        sizeRes.data?.forEach((s) => { sizeMap[s.schoolsize_id] = [s.schoolsize_name, s.schoolsize_details]; });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });

        // Schools aggregation
        const schools = schoolRes.data || [];
        const khetCount = {};
        const sizeCount = {};

        schools.forEach((school) => {
          const khetKey = `${school.khet_code}_${school.school_province}`;
          if (!khetCount[khetKey]) {
            khetCount[khetKey] = {
              khet_code: school.khet_code,
              province: school.school_province,
              count: 0,
            };
          }
          khetCount[khetKey].count += 1;

          const sizeKey = school.school_size || 'ไม่ระบุ';
          if (!sizeCount[sizeKey]) sizeCount[sizeKey] = 0;
          sizeCount[sizeKey] += 1;
        });

        // Plan & Score aggregation
        const plans = planRes.data || [];
        const scores = scoreRes.data || [];
        const scoreSet = new Set(scores.map((s) => `${s.planid}_${s.supervision}`));

        let totalPlans = plans.length;
        let approvedPlans = 0;
        let pendingPlans = 0;
        let fullyScoredPlans = 0;

        let myAssigned = 0;
        let myScored = 0;

        plans.forEach((p) => {
          const status = String(p.plan_status);
          if (status === '2' || status === '5' || status === '6' || status === '7') {
            approvedPlans += 1;
          } else if (status === '1' || status === '4') {
            pendingPlans += 1;
          }

          const committees = [p.committee1, p.committee2, p.committee3, p.committee4, p.committee5].filter(Boolean);
          if (committees.length > 0) {
            const allScored = committees.every((c) => scoreSet.has(`${p.planid}_${c}`));
            if (allScored) fullyScoredPlans += 1;
          }

          // Check if current user is assigned
          if (userId && committees.includes(userId)) {
            myAssigned += 1;
            if (scoreSet.has(`${p.planid}_${userId}`)) {
              myScored += 1;
            }
          }
        });

        setLookupData({ khet: khetMap, province: provinceMap, schoolSize: sizeMap, prefix: prefixMap });
        setKhetStats(Object.values(khetCount));
        setSizeStats(Object.entries(sizeCount).map(([size, count]) => ({ size, count })));
        setTotalUsers(usersCountRes.count || 0);
        setPlanStats({
          total: totalPlans,
          approved: approvedPlans,
          pending: pendingPlans,
          fullyScored: fullyScoredPlans,
        });
        setMyWorkload({
          assigned: myAssigned,
          scored: myScored,
          pending: Math.max(0, myAssigned - myScored),
        });
      } catch (err) {
        console.error('InfoSimple load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => { mounted = false; };
  }, [userId]);

  // Load DMC student summary on demand when tab changes
  useEffect(() => {
    if (activeTab !== 'dmc') return;
    let mounted = true;
    const loadDMC = async () => {
      setDmcLoading(true);
      try {
        const [dmcRes, schoolRes] = await Promise.all([
          supabase
            .from('tbl_school_DMCdata')
            .select('*')
            .eq('education_year', dmcYear)
            .eq('education_section', dmcRound),
          supabase
            .from('tbl_school')
            .select('school_id, school_name, school_code8, school_code6, district_name')
            .neq('school_flag', 0)
        ]);

        if (!mounted) return;

        const schoolMap = {};
        (schoolRes.data || []).forEach(s => {
          if (s.school_code8) schoolMap[s.school_code8] = s;
          if (s.school_code6) schoolMap[s.school_code6] = s;
          if (s.school_id) schoolMap[s.school_id] = s;
        });

        const enriched = (dmcRes.data || []).map(r => {
          const s = schoolMap[r.school_code8] || schoolMap[r.school_id] || {};
          const mLower = (Number(r.m1m) || 0) + (Number(r.m1f) || 0) + (Number(r.m2m) || 0) + (Number(r.m2f) || 0) + (Number(r.m3m) || 0) + (Number(r.m3f) || 0);
          const mUpper = (Number(r.m4m) || 0) + (Number(r.m4f) || 0) + (Number(r.m5m) || 0) + (Number(r.m5f) || 0) + (Number(r.m6m) || 0) + (Number(r.m6f) || 0);
          const voc = (Number(r.v1m) || 0) + (Number(r.v1f) || 0) + (Number(r.v2m) || 0) + (Number(r.v2f) || 0) + (Number(r.v3m) || 0) + (Number(r.v3f) || 0);
          const total = mLower + mUpper + voc;
          return {
            ...r,
            school_name: s.school_name || r.school_name || r.school_code8,
            district_name: s.district_name || '-',
            mLower,
            mUpper,
            voc,
            total,
          };
        });

        setDmcRows(enriched);
      } catch (err) {
        console.error('DMC load error:', err);
      } finally {
        if (mounted) setDmcLoading(false);
      }
    };

    loadDMC();
    return () => { mounted = false; };
  }, [activeTab, dmcYear, dmcRound]);

  const totalSchools = useMemo(() => khetStats.reduce((sum, k) => sum + k.count, 0), [khetStats]);

  // DMC aggregated totals
  const dmcTotals = useMemo(() => {
    let lower = 0;
    let upper = 0;
    let voc = 0;
    let grand = 0;
    dmcRows.forEach(r => {
      lower += r.mLower;
      upper += r.mUpper;
      voc += r.voc;
      grand += r.total;
    });
    return { lower, upper, voc, grand };
  }, [dmcRows]);

  const filteredDmcRows = useMemo(() => {
    if (!dmcSearch.trim()) return dmcRows;
    const q = dmcSearch.trim().toLowerCase();
    return dmcRows.filter(r => (r.school_name || '').toLowerCase().includes(q) || (r.district_name || '').toLowerCase().includes(q));
  }, [dmcRows, dmcSearch]);

  const completionPct = useMemo(() => {
    if (planStats.total === 0) return 0;
    return Math.round((planStats.fullyScored / planStats.total) * 100);
  }, [planStats]);

  const greetingName = useMemo(() => {
    if (!profile?.name) return 'ท่านผู้บริหาร / กรรมการนิเทศ';
    const pfx = lookupData.prefix[profile.prefix] || profile.prefix || '';
    return `${pfx}${profile.name} ${profile.lastname || ''}`.trim();
  }, [profile, lookupData.prefix]);

  // Allowed modules for current user
  const allowedModules = useMemo(() => {
    return new Set(roleModules[userRole] || []);
  }, [userRole]);

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลศูนย์บัญชาการนิเทศการศึกษา..."
        fullPage={false}
      />
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* ─── Hero Banner ─── */}
      <div
        className="card mb-4 border-0 shadow-sm text-white"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #0284c7 100%)',
          borderRadius: '12px',
        }}
      >
        <div className="card-body p-4">
          <div className="row align-items-center">
            <div className="col-lg-8 mb-3 mb-lg-0">
              <div className="d-flex align-items-center flex-wrap mb-2" style={{ gap: '8px' }}>
                <span className="badge badge-warning text-dark font-weight-bold px-2 py-1">
                  <i className="fa-solid fa-shield-halved mr-1"></i> {getRoleTitle(userRole)}
                </span>
                <span className="text-white-50" style={{ fontSize: '13px' }}>
                  สพม.พิษณุโลก อุตรดิตถ์
                </span>
              </div>
              <h2 className="font-weight-bold mb-1" style={{ fontSize: '24px' }}>
                สวัสดี, {greetingName}
              </h2>
              <p className="mb-0 text-white-50" style={{ fontSize: '14px' }}>
                ศูนย์บัญชาการติดตามและส่งเสริมประสิทธิภาพการนิเทศการศึกษาออนไลน์ ระดับเขตพื้นที่การศึกษา
              </p>
            </div>
            <div className="col-lg-4 text-lg-right">
              {allowedModules.has('Plan_Check') && (
                <Link to="/Plan_Check" className="btn btn-light font-weight-bold shadow-sm mr-2 mb-2">
                  <i className="fa-solid fa-list-check text-primary mr-1"></i> ตรวจแผนการสอน
                </Link>
              )}
              {allowedModules.has('admin_monitor') && (
                <Link to="/admin_monitor" className="btn btn-outline-light font-weight-bold mb-2">
                  <i className="fa-solid fa-chart-line mr-1"></i> ติดตามรายโรงเรียน
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Evaluator Personal Workload Banner (If user has assigned plans) ─── */}
      {myWorkload.assigned > 0 && (
        <div className="card mb-4 border-left-warning shadow-sm" style={{ borderLeft: '5px solid #f59e0b', borderRadius: '8px' }}>
          <div className="card-body py-3 px-4">
            <div className="row align-items-center">
              <div className="col-md-7 mb-2 mb-md-0">
                <h5 className="font-weight-bold text-dark mb-1">
                  <i className="fa-solid fa-clipboard-user text-warning mr-2"></i>
                  ภาระงานนิเทศของคุณ: ได้รับมอบหมาย {myWorkload.assigned} แผน
                </h5>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                  ประเมินแล้ว <strong className="text-success">{myWorkload.scored}</strong> แผน | คงเหลือรอการประเมิน{' '}
                  <strong className="text-danger">{myWorkload.pending}</strong> แผน
                </p>
              </div>
              <div className="col-md-5 text-md-right">
                <Link to="/Plan_Check" className="btn btn-warning btn-sm font-weight-bold shadow-sm text-dark px-3 py-2">
                  <i className="fa-solid fa-pen-to-square mr-1"></i> เข้าสู่หน้าประเมินแผนงานค้าง
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── KPI Metric Cards ─── */}
      <div className="row mb-4">
        {/* Total Schools */}
        <div className="col-xl-3 col-md-6 col-12 mb-3">
          <div className="card shadow-sm h-100 border-0" style={{ borderLeft: '4px solid #3b82f6', borderRadius: '10px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted d-block font-weight-bold" style={{ fontSize: '12px' }}>สถานศึกษาในสังกัด</span>
                  <h3 className="font-weight-bold mb-1 text-primary">{totalSchools} แห่ง</h3>
                  <small className="text-muted">
                    8 สหวิทยาเขต (พิษณุโลก / อุตรดิตถ์)
                  </small>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle shadow-sm"
                  style={{ width: '48px', height: '48px', fontSize: '20px' }}
                >
                  <i className="fa-solid fa-school"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="col-xl-3 col-md-6 col-12 mb-3">
          <div className="card shadow-sm h-100 border-0" style={{ borderLeft: '4px solid #10b981', borderRadius: '10px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted d-block font-weight-bold" style={{ fontSize: '12px' }}>บุคลากรในระบบ</span>
                  <h3 className="font-weight-bold mb-1 text-success">{totalUsers.toLocaleString()} คน</h3>
                  <small className="text-muted">ผู้บริหาร ครู และศึกษานิเทศก์</small>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center bg-success text-white rounded-circle shadow-sm"
                  style={{ width: '48px', height: '48px', fontSize: '20px' }}
                >
                  <i className="fa-solid fa-chalkboard-user"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teaching Plans */}
        <div className="col-xl-3 col-md-6 col-12 mb-3">
          <div className="card shadow-sm h-100 border-0" style={{ borderLeft: '4px solid #f59e0b', borderRadius: '10px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted d-block font-weight-bold" style={{ fontSize: '12px' }}>แผนการสอนที่ส่งแล้ว</span>
                  <h3 className="font-weight-bold mb-1 text-warning">{planStats.total.toLocaleString()}</h3>
                  <small className="text-muted">
                    อนุมัติแล้ว {planStats.approved} | รอตรวจ {planStats.pending}
                  </small>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center bg-warning text-white rounded-circle shadow-sm"
                  style={{ width: '48px', height: '48px', fontSize: '20px' }}
                >
                  <i className="fa-solid fa-file-signature"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supervision Completion */}
        <div className="col-xl-3 col-md-6 col-12 mb-3">
          <div className="card shadow-sm h-100 border-0" style={{ borderLeft: '4px solid #8b5cf6', borderRadius: '10px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted d-block font-weight-bold" style={{ fontSize: '12px' }}>นิเทศเสร็จสิ้นสมบูรณ์</span>
                  <h3 className="font-weight-bold mb-1 text-purple" style={{ color: '#8b5cf6' }}>
                    {completionPct}%
                  </h3>
                  <small className="text-muted">ประเมินครบ {planStats.fullyScored} แผน</small>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center text-white rounded-circle shadow-sm"
                  style={{ width: '48px', height: '48px', fontSize: '20px', backgroundColor: '#8b5cf6' }}
                >
                  <i className="fa-solid fa-award"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Detailed Analytics & Tabs ─── */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '10px' }}>
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs border-0" role="tablist">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link border-0 font-weight-bold py-3 px-4 ${activeTab === 'khet' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                style={{ cursor: 'pointer', background: 'none' }}
                onClick={() => setActiveTab('khet')}
              >
                <i className="fa-solid fa-network-wired mr-2"></i> สหวิทยาเขต ({khetStats.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link border-0 font-weight-bold py-3 px-4 ${activeTab === 'size' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                style={{ cursor: 'pointer', background: 'none' }}
                onClick={() => setActiveTab('size')}
              >
                <i className="fa-solid fa-shapes mr-2"></i> ขนาดโรงเรียน ({sizeStats.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link border-0 font-weight-bold py-3 px-4 ${activeTab === 'dmc' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                style={{ cursor: 'pointer', background: 'none' }}
                onClick={() => setActiveTab('dmc')}
              >
                <i className="fa-solid fa-users mr-2"></i> ข้อมูลนักเรียน (DMC)
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link border-0 font-weight-bold py-3 px-4 ${activeTab === 'tools' ? 'active text-primary border-bottom border-primary' : 'text-muted'}`}
                style={{ cursor: 'pointer', background: 'none' }}
                onClick={() => setActiveTab('tools')}
              >
                <i className="fa-solid fa-compass mr-2"></i> เมนูบริหารและทางลัด
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {/* Tab 1: Khet Stats */}
          {activeTab === 'khet' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap" style={{ gap: '10px' }}>
                <h5 className="font-weight-bold m-0 text-dark">
                  <i className="fa-solid fa-map-location-dot text-primary mr-2"></i>
                  การกระจายตัวของโรงเรียนตามสหวิทยาเขต
                </h5>
                <Link to="/school" className="btn btn-outline-primary btn-sm">
                  <i className="fa-solid fa-list mr-1"></i> ดูรายชื่อโรงเรียนทั้งหมด
                </Link>
              </div>

              <div className="table-responsive">
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ลำดับ</th>
                      <th>ชื่อสหวิทยาเขต</th>
                      <th>จังหวัด</th>
                      <th className="text-right">จำนวนโรงเรียน</th>
                      <th className="text-right">สัดส่วน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {khetStats.map((k, idx) => {
                      const pct = totalSchools > 0 ? Math.round((k.count / totalSchools) * 100) : 0;
                      return (
                        <tr key={`${k.khet_code}_${k.province}`}>
                          <td className="text-center font-weight-bold">{idx + 1}</td>
                          <td>
                            <strong>{lookupData.khet[k.khet_code] || k.khet_code}</strong>
                          </td>
                          <td>
                            <span className="badge badge-light border">
                              {lookupData.province[k.province] || k.province}
                            </span>
                          </td>
                          <td className="text-right font-weight-bold text-primary">{k.count} แห่ง</td>
                          <td className="text-right">
                            <span className="badge badge-secondary">{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Size Stats */}
          {activeTab === 'size' && (
            <div>
              <h5 className="font-weight-bold mb-3 text-dark">
                <i className="fa-solid fa-chart-pie text-success mr-2"></i>
                การจำแนกสถานศึกษาตามขนาดโรงเรียน
              </h5>
              <div className="table-responsive">
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>รหัส</th>
                      <th>ขนาดโรงเรียน</th>
                      <th>เกณฑ์จำนวนนักเรียน</th>
                      <th className="text-right">จำนวนสถานศึกษา</th>
                      <th className="text-right">สัดส่วน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeStats.map((s) => {
                      const [name, desc] = lookupData.schoolSize[s.size] || [s.size, ''];
                      const pct = totalSchools > 0 ? Math.round((s.count / totalSchools) * 100) : 0;
                      return (
                        <tr key={s.size}>
                          <td className="text-center font-weight-bold">{s.size}</td>
                          <td><strong>{name}</strong></td>
                          <td className="text-muted">{desc || '-'}</td>
                          <td className="text-right font-weight-bold text-success">{s.count} แห่ง</td>
                          <td className="text-right">
                            <span className="badge badge-secondary">{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: DMC Student Summary (Rescued from Dashboard.jsx) */}
          {activeTab === 'dmc' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <h5 className="font-weight-bold m-0 text-dark">
                    <i className="fa-solid fa-graduation-cap text-indigo mr-2"></i>
                    สรุปสารสนเทศจำนวนนักเรียน (Data Management Center: DMC)
                  </h5>
                  <small className="text-muted">ข้อมูลรายสถานศึกษา สพม.พิษณุโลก อุตรดิตถ์</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <select
                    className="custom-select custom-select-sm"
                    value={dmcYear}
                    onChange={(e) => setDmcYear(e.target.value)}
                    style={{ width: '130px' }}
                  >
                    <option value="2568">ปีการศึกษา 2568</option>
                    <option value="2567">ปีการศึกษา 2567</option>
                    <option value="2566">ปีการศึกษา 2566</option>
                  </select>
                  <select
                    className="custom-select custom-select-sm"
                    value={dmcRound}
                    onChange={(e) => setDmcRound(e.target.value)}
                    style={{ width: '120px' }}
                  >
                    <option value="1">รอบ 10 มิ.ย.</option>
                    <option value="2">รอบ 10 พ.ย.</option>
                  </select>
                </div>
              </div>

              {/* DMC Mini KPI Cards */}
              <div className="row g-2 mb-3">
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-light rounded border text-center">
                    <div className="text-muted small">มัธยมศึกษาตอนต้น</div>
                    <div className="fs-4 fw-bold text-primary">{dmcTotals.lower.toLocaleString()} <span className="small text-muted font-weight-normal">คน</span></div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-light rounded border text-center">
                    <div className="text-muted small">มัธยมศึกษาตอนปลาย</div>
                    <div className="fs-4 fw-bold text-success">{dmcTotals.upper.toLocaleString()} <span className="small text-muted font-weight-normal">คน</span></div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-light rounded border text-center">
                    <div className="text-muted small">ระดับ ปวช./ปวส.</div>
                    <div className="fs-4 fw-bold text-warning">{dmcTotals.voc.toLocaleString()} <span className="small text-muted font-weight-normal">คน</span></div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="p-3 bg-primary-subtle rounded border border-primary-subtle text-center">
                    <div className="text-primary small font-weight-bold">รวมนักเรียนทั้งเขตพื้นที่ฯ</div>
                    <div className="fs-4 fw-bold text-primary">{dmcTotals.grand.toLocaleString()} <span className="small text-muted font-weight-normal">คน</span></div>
                  </div>
                </div>
              </div>

              {/* Search input */}
              <div className="input-group input-group-sm mb-3" style={{ maxWidth: '300px' }}>
                <div className="input-group-prepend">
                  <span className="input-group-text bg-white"><i className="fa-solid fa-search text-muted"></i></span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ค้นหาชื่อโรงเรียน หรืออำเภอ..."
                  value={dmcSearch}
                  onChange={(e) => setDmcSearch(e.target.value)}
                />
              </div>

              {dmcLoading ? (
                <LoadingSpinner message="กำลังโหลดข้อมูลนักเรียน DMC..." />
              ) : filteredDmcRows.length === 0 ? (
                <EmptyState message="ยังไม่พบข้อมูล DMC สำหรับปีการศึกษาและรอบที่เลือก" />
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover table-bordered mb-0">
                    <thead className="bg-light text-center">
                      <tr>
                        <th style={{ width: '5%' }}>ที่</th>
                        <th>ชื่อสถานศึกษา</th>
                        <th style={{ width: '12%' }}>อำเภอ</th>
                        <th style={{ width: '15%' }}>ม.ต้น (คน)</th>
                        <th style={{ width: '15%' }}>ม.ปลาย (คน)</th>
                        <th style={{ width: '12%' }}>ปวช./ปวส.</th>
                        <th style={{ width: '15%' }}>รวมนักเรียน (คน)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDmcRows.map((r, idx) => (
                        <tr key={r.school_code8 || idx}>
                          <td className="text-center font-weight-bold">{idx + 1}</td>
                          <td className="font-weight-bold text-dark">{r.school_name}</td>
                          <td className="text-center text-muted">{r.district_name}</td>
                          <td className="text-right text-primary font-weight-bold">{r.mLower.toLocaleString()}</td>
                          <td className="text-right text-success font-weight-bold">{r.mUpper.toLocaleString()}</td>
                          <td className="text-right text-warning">{r.voc.toLocaleString()}</td>
                          <td className="text-right font-weight-bold">{r.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Role-aware Tools & Shortcuts */}
          {activeTab === 'tools' && (
            <div>
              <h5 className="font-weight-bold mb-3 text-dark">
                <i className="fa-solid fa-rocket text-primary mr-2"></i>
                เมนูการปฏิบัติงานตามบทบาทของคุณ
              </h5>

              <div className="row">
                {allowedModules.has('Plan_Check') && (
                  <div className="col-md-4 mb-3">
                    <div className="card h-100 border p-3 hover-shadow" style={{ borderRadius: '8px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fa-solid fa-list-check text-primary fa-lg mr-2"></i>
                        <h6 className="font-weight-bold m-0">ตรวจประเมินแผนการสอน</h6>
                      </div>
                      <p className="small text-muted mb-3">
                        ตรวจแผนการจัดการเรียนรู้และให้คะแนนการนิเทศตามภาระงานที่ได้รับมอบหมาย
                      </p>
                      <Link to="/Plan_Check" className="btn btn-outline-primary btn-sm mt-auto">
                        เข้าสู่หน้าตรวจแผน
                      </Link>
                    </div>
                  </div>
                )}

                {allowedModules.has('admin_monitor') && (
                  <div className="col-md-4 mb-3">
                    <div className="card h-100 border p-3 hover-shadow" style={{ borderRadius: '8px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fa-solid fa-chart-line text-success fa-lg mr-2"></i>
                        <h6 className="font-weight-bold m-0">กำกับติดตามรายสถานศึกษา</h6>
                      </div>
                      <p className="small text-muted mb-3">
                        ติดตามสถานะการส่งแผนและการประเมินของ 57 สถานศึกษา สพม.พิษณุโลก อุตรดิตถ์
                      </p>
                      <Link to="/admin_monitor" className="btn btn-outline-success btn-sm mt-auto">
                        เปิดระบบกำกับติดตาม
                      </Link>
                    </div>
                  </div>
                )}

                {allowedModules.has('supervision_summary') && (
                  <div className="col-md-4 mb-3">
                    <div className="card h-100 border p-3 hover-shadow" style={{ borderRadius: '8px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fa-solid fa-chart-pie text-info fa-lg mr-2"></i>
                        <h6 className="font-weight-bold m-0">สารสนเทศสรุปผลการนิเทศ</h6>
                      </div>
                      <p className="small text-muted mb-3">
                        ดูสถิติภาพรวม คุณภาพการจัดการเรียนรู้ และรายงานผลการนิเทศระดับเขต
                      </p>
                      <Link to="/supervision_summary" className="btn btn-outline-info btn-sm mt-auto">
                        ดูสารสนเทศ
                      </Link>
                    </div>
                  </div>
                )}

                {allowedModules.has('statusplan_pass') && (
                  <div className="col-md-4 mb-3">
                    <div className="card h-100 border p-3 hover-shadow" style={{ borderRadius: '8px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fa-solid fa-circle-check text-success fa-lg mr-2"></i>
                        <h6 className="font-weight-bold m-0">คลังแผนการสอนที่ผ่านการประเมิน</h6>
                      </div>
                      <p className="small text-muted mb-3">
                        สืบค้นและศึกษาแผนการจัดการเรียนรู้ที่ผ่านการนิเทศสมบูรณ์แล้ว
                      </p>
                      <Link to="/statusplan_pass" className="btn btn-outline-success btn-sm mt-auto">
                        เปิดคลังแผนการสอน
                      </Link>
                    </div>
                  </div>
                )}

                {allowedModules.has('editprofile') && (
                  <div className="col-md-4 mb-3">
                    <div className="card h-100 border p-3 hover-shadow" style={{ borderRadius: '8px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fa-solid fa-id-card text-secondary fa-lg mr-2"></i>
                        <h6 className="font-weight-bold m-0">แก้ไขข้อมูลส่วนตัว</h6>
                      </div>
                      <p className="small text-muted mb-3">
                        ปรับปรุงข้อมูลตำแหน่ง สังกัด และเบอร์โทรศัพท์ติดต่อ
                      </p>
                      <Link to="/editprofile" className="btn btn-outline-secondary btn-sm mt-auto">
                        แก้ไขโปรไฟล์
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoSimple;