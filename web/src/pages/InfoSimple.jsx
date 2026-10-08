import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';

const getRoleTitle = (level) => {
  switch (level) {
    case 'admin':
      return 'ผู้ดูแลระบบสูงสุด (Super Admin)';
    case 'supervisor':
      return 'ศึกษานิเทศก์ (Supervisor)';
    case 'supervision':
      return 'คณะกรรมการนิเทศ (Evaluator)';
    case 'chairman':
      return 'ประธานกรรมการนิเทศ (Chairman)';
    case 'directorschool':
      return 'ผู้อำนวยการโรงเรียน (Director)';
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
  const [activeTab, setActiveTab] = useState('khet'); // 'khet', 'size', 'tools'

  const [khetStats, setKhetStats] = useState([]);
  const [sizeStats, setSizeStats] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [planStats, setPlanStats] = useState({ total: 0, approved: 0, pending: 0, fullyScored: 0 });
  const [myWorkload, setMyWorkload] = useState({ assigned: 0, scored: 0, pending: 0 });

  const [lookupData, setLookupData] = useState({
    khet: {},
    province: {},
    schoolSize: {},
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
        ] = await Promise.all([
          supabase.from('tbl_khet').select('khet_code, khet_name'),
          supabase.from('tbl_province').select('province_id, province_name'),
          supabase.from('tbl_schoolsize').select('schoolsize_id, schoolsize_name, schoolsize_details'),
          supabase.from('tbl_school').select('school_id, school_name, khet_code, school_province, school_size').neq('school_flag', 0),
          supabase.from('tbl_Users').select('people_id', { count: 'exact', head: true }),
          supabase.from('tbl_sendplan').select('planid, school_code, plan_status, committee1, committee2, committee3, committee4, committee5'),
          supabase.from('tbl_sendplan_score').select('planid, supervision'),
        ]);

        if (!mounted) return;

        // Lookup mappings
        const khetMap = {};
        khetRes.data?.forEach((k) => { khetMap[k.khet_code] = k.khet_name; });

        const provinceMap = {};
        provinceRes.data?.forEach((p) => { provinceMap[p.province_id] = p.province_name; });

        const sizeMap = {};
        sizeRes.data?.forEach((s) => { sizeMap[s.schoolsize_id] = [s.schoolsize_name, s.schoolsize_details]; });

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

        setLookupData({ khet: khetMap, province: provinceMap, schoolSize: sizeMap });
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

  const totalSchools = useMemo(() => khetStats.reduce((sum, k) => sum + k.count, 0), [khetStats]);
  const totalSchoolsBySize = useMemo(() => sizeStats.reduce((sum, s) => sum + s.count, 0), [sizeStats]);

  // Province split
  const schoolsByProvince = useMemo(() => {
    let phitsanulok = 0;
    let uttaradit = 0;
    khetStats.forEach((k) => {
      const provName = lookupData.province[k.province] || '';
      if (provName.includes('พิษณุโลก')) phitsanulok += k.count;
      else if (provName.includes('อุตรดิตถ์')) uttaradit += k.count;
    });
    return { phitsanulok, uttaradit };
  }, [khetStats, lookupData.province]);

  const completionPct = useMemo(() => {
    if (planStats.total === 0) return 0;
    return Math.round((planStats.fullyScored / planStats.total) * 100);
  }, [planStats]);

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
                สวัสดี, {profile?.name ? `${profile?.prefix || ''}${profile.name} ${profile.lastname || ''}` : 'ท่านผู้บริหาร / กรรมการนิเทศ'}
              </h2>
              <p className="mb-0 text-white-50" style={{ fontSize: '14px' }}>
                ศูนย์บัญชาการติดตามและส่งเสริมประสิทธิภาพการนิเทศการศึกษาออนไลน์ ระดับเขตพื้นที่การศึกษา
              </p>
            </div>
            <div className="col-lg-4 text-lg-right">
              <Link to="/Plan_Check" className="btn btn-light font-weight-bold shadow-sm mr-2 mb-2">
                <i className="fa-solid fa-list-check text-primary mr-1"></i> ตรวจแผนการสอน
              </Link>
              <Link to="/admin_monitor" className="btn btn-outline-light font-weight-bold mb-2">
                <i className="fa-solid fa-chart-line mr-1"></i> ติดตามรายโรงเรียน
              </Link>
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
                <Link to="/Plan_Check" className="btn btn-warning btn-sm font-weight-bold text-dark shadow-sm">
                  <i className="fa-solid fa-pen-to-square mr-1"></i> ไปยังหน้าให้คะแนนการประเมิน ({myWorkload.pending})
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4 KPI Metrics Cards ─── */}
      <div className="row mb-3">
        {/* Total Schools */}
        <div className="col-xl-3 col-md-6 col-12 mb-3">
          <div className="card shadow-sm h-100 border-0" style={{ borderLeft: '4px solid #2563eb', borderRadius: '10px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted d-block font-weight-bold" style={{ fontSize: '12px' }}>โรงเรียนในสังกัด</span>
                  <h3 className="font-weight-bold mb-1 text-primary">{totalSchools}</h3>
                  <small className="text-muted">
                    พล. {schoolsByProvince.phitsanulok} แห่ง | อต. {schoolsByProvince.uttaradit} แห่ง
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

        {/* Teachers Count */}
        <div className="col-xl-3 col-md-6 col-12 mb-3">
          <div className="card shadow-sm h-100 border-0" style={{ borderLeft: '4px solid #10b981', borderRadius: '10px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted d-block font-weight-bold" style={{ fontSize: '12px' }}>ครูและบุคลากรในระบบ</span>
                  <h3 className="font-weight-bold mb-1 text-success">{totalUsers.toLocaleString()}</h3>
                  <small className="text-muted">ผู้ใช้งานที่ลงทะเบียนแล้ว</small>
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
                <span className="badge badge-light p-2 font-weight-normal border">
                  รวมทั้งสิ้น <strong>{totalSchools}</strong> โรงเรียน
                </span>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-hover table-striped">
                  <thead className="bg-light">
                    <tr>
                      <th className="text-center" style={{ width: '130px' }}>รหัสสหวิทยาเขต</th>
                      <th>ชื่อสหวิทยาเขต</th>
                      <th>จังหวัด</th>
                      <th className="text-center" style={{ width: '150px' }}>จำนวนโรงเรียน</th>
                      <th className="text-center" style={{ width: '120px' }}>สัดส่วน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {khetStats.map((stat, idx) => {
                      const sharePct = totalSchools > 0 ? ((stat.count / totalSchools) * 100).toFixed(1) : 0;
                      return (
                        <tr key={idx}>
                          <td className="text-center font-weight-bold text-muted">{stat.khet_code}</td>
                          <td className="font-weight-bold text-dark">{lookupData.khet[stat.khet_code] || stat.khet_code}</td>
                          <td>
                            <span className={`badge ${String(lookupData.province[stat.province] || '').includes('พิษณุโลก') ? 'badge-primary' : 'badge-info'}`}>
                              {lookupData.province[stat.province] || stat.province}
                            </span>
                          </td>
                          <td className="text-center font-weight-bold text-primary">{stat.count} แห่ง</td>
                          <td className="text-center">
                            <span className="text-muted" style={{ fontSize: '13px' }}>{sharePct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-light font-weight-bold">
                      <td colSpan="3" className="text-right">รวมทั้งหมด</td>
                      <td className="text-center text-primary">{totalSchools} แห่ง</td>
                      <td className="text-center">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: School Size Stats */}
          {activeTab === 'size' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap" style={{ gap: '10px' }}>
                <h5 className="font-weight-bold m-0 text-dark">
                  <i className="fa-solid fa-chart-pie text-success mr-2"></i>
                  การกระจายตัวตามขนาดโรงเรียน
                </h5>
                <span className="badge badge-light p-2 font-weight-normal border">
                  รวมทั้งสิ้น <strong>{totalSchoolsBySize}</strong> โรงเรียน
                </span>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-hover table-striped">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '250px' }}>ขนาดโรงเรียน</th>
                      <th>คำอธิบาย</th>
                      <th className="text-center" style={{ width: '150px' }}>จำนวนโรงเรียน</th>
                      <th className="text-center" style={{ width: '120px' }}>สัดส่วน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeStats.map((stat, idx) => {
                      const sizeName = lookupData.schoolSize[stat.size]?.[0] || stat.size;
                      const sizeDetail = lookupData.schoolSize[stat.size]?.[1] || '-';
                      const sharePct = totalSchoolsBySize > 0 ? ((stat.count / totalSchoolsBySize) * 100).toFixed(1) : 0;
                      return (
                        <tr key={idx}>
                          <td className="font-weight-bold text-dark">{sizeName}</td>
                          <td className="text-muted" style={{ fontSize: '13px' }}>{sizeDetail}</td>
                          <td className="text-center font-weight-bold text-success">{stat.count} แห่ง</td>
                          <td className="text-center">
                            <span className="text-muted" style={{ fontSize: '13px' }}>{sharePct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-light font-weight-bold">
                      <td colSpan="2" className="text-right">รวมทั้งหมด</td>
                      <td className="text-center text-success">{totalSchoolsBySize} แห่ง</td>
                      <td className="text-center">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Executive Tools & Quick Links */}
          {activeTab === 'tools' && (
            <div className="row">
              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 border shadow-none" style={{ borderRadius: '8px' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-primary text-white rounded p-2 mr-3">
                        <i className="fa-solid fa-chart-line fa-lg"></i>
                      </div>
                      <h6 className="font-weight-bold m-0 text-dark">กำกับติดตามรายโรงเรียน</h6>
                    </div>
                    <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                      ตรวจสอบสถานะการส่งแผนและการประเมินของโรงเรียนและกรรมการทุกแห่งแบบเรียลไทม์
                    </p>
                    <Link to="/admin_monitor" className="btn btn-outline-primary btn-sm btn-block">
                      เปิดหน้า Monitor <i className="fa-solid fa-arrow-right ml-1"></i>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 border shadow-none" style={{ borderRadius: '8px' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-success text-white rounded p-2 mr-3">
                        <i className="fa-solid fa-clipboard-check fa-lg"></i>
                      </div>
                      <h6 className="font-weight-bold m-0 text-dark">สรุปรายงานการนิเทศ</h6>
                    </div>
                    <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                      ดูสรุปผลการประเมิน KSA และสมรรถนะสำคัญของครูตามโมเดล ADAACE_T
                    </p>
                    <Link to="/supervision_summary" className="btn btn-outline-success btn-sm btn-block">
                      เปิดรายงานสรุป <i className="fa-solid fa-arrow-right ml-1"></i>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 border shadow-none" style={{ borderRadius: '8px' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-warning text-white rounded p-2 mr-3">
                        <i className="fa-solid fa-user-check fa-lg"></i>
                      </div>
                      <h6 className="font-weight-bold m-0 text-dark">ตรวจและให้คะแนนแผน</h6>
                    </div>
                    <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                      เข้าสู่ระบบประเมินแผนการจัดการเรียนรู้และคลิปวิดีโอของครูผู้สอน
                    </p>
                    <Link to="/Plan_Check" className="btn btn-outline-warning btn-sm btn-block text-dark font-weight-bold">
                      ตรวจแผนการสอน <i className="fa-solid fa-arrow-right ml-1"></i>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 border shadow-none" style={{ borderRadius: '8px' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-info text-white rounded p-2 mr-3">
                        <i className="fa-solid fa-users-gear fa-lg"></i>
                      </div>
                      <h6 className="font-weight-bold m-0 text-dark">ทะเบียนครูผู้สอน</h6>
                    </div>
                    <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                      ค้นหาและตรวจสอบข้อมูลครูผู้สอนในสังกัด สพม.พิษณุโลก อุตรดิตถ์
                    </p>
                    <Link to="/userteacher" className="btn btn-outline-info btn-sm btn-block">
                      ดูรายชื่อครู <i className="fa-solid fa-arrow-right ml-1"></i>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 border shadow-none" style={{ borderRadius: '8px' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <div className="bg-secondary text-white rounded p-2 mr-3">
                        <i className="fa-solid fa-school-flag fa-lg"></i>
                      </div>
                      <h6 className="font-weight-bold m-0 text-dark">ข้อมูลสถานศึกษา</h6>
                    </div>
                    <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                      ตรวจสอบข้อมูลพื้นฐาน สหวิทยาเขต และขนาดของโรงเรียนในสังกัด
                    </p>
                    <Link to="/school" className="btn btn-outline-secondary btn-sm btn-block">
                      ดูข้อมูลโรงเรียน <i className="fa-solid fa-arrow-right ml-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoSimple;
