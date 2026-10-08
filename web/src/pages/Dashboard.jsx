import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const Dashboard = () => {
    const { user } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [khetStats, setKhetStats] = useState([]);
    const [sizeStats, setSizeStats] = useState([]);
    const [studentData, setStudentData] = useState([]);
    const [configData, setConfigData] = useState({});
    const [planStats, setPlanStats] = useState(null);
    const [lookupData, setLookupData] = useState({
        khet: {},
        province: {},
        schoolSize: {}
    });

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Load Config Data
            const { data: configs } = await supabase
                .from('tbl_config')
                .select('config_name, config_value');

            const configMap = {};
            configs?.forEach(c => {
                configMap[c.config_name] = c.config_value;
            });
            setConfigData(configMap);

            // 2. Load Lookup Tables
            const [khetRes, provinceRes, sizeRes] = await Promise.all([
                supabase.from('tbl_khet').select('khet_code, khet_name'),
                supabase.from('tbl_province').select('province_id, province_name'),
                supabase.from('tbl_schoolsize').select('schoolsize_id, schoolsize_name, schoolsize_details')
            ]);

            const khetMap = {};
            khetRes.data?.forEach(k => khetMap[k.khet_code] = k.khet_name);

            const provinceMap = {};
            provinceRes.data?.forEach(p => provinceMap[p.province_id] = p.province_name);

            const sizeMap = {};
            sizeRes.data?.forEach(s => sizeMap[s.schoolsize_id] = [s.schoolsize_name, s.schoolsize_details]);

            setLookupData({ khet: khetMap, province: provinceMap, schoolSize: sizeMap });

            // 3. Load School Data
            const { data: schools } = await supabase
                .from('tbl_school')
                .select('khet_code, school_province, school_size, school_flag')
                .neq('school_flag', 0);

            // Aggregate by Khet
            const khetCount = {};
            const sizeCount = {};

            schools?.forEach(school => {
                // Count by Khet
                const khetKey = `${school.khet_code}_${school.school_province}`;
                if (!khetCount[khetKey]) {
                    khetCount[khetKey] = {
                        khet_code: school.khet_code,
                        province: school.school_province,
                        count: 0
                    };
                }
                khetCount[khetKey].count++;

                // Count by Size
                if (!sizeCount[school.school_size]) {
                    sizeCount[school.school_size] = 0;
                }
                sizeCount[school.school_size]++;
            });

            setKhetStats(Object.values(khetCount));
            setSizeStats(Object.entries(sizeCount).map(([size, count]) => ({ size, count })));

            // 4. Load Student Data (For Admin Only - with DMC data)
            if (user?.user_metadata?.role === 'admin' || user?.level_id === 'admin') {
                const eduYear = configMap.EDUYEAR || new Date().getFullYear() + 543;
                const eduRound = configMap.EDUROUND || 1;

                // Note: This requires tbl_school_DMCdata to exist
                const { data: dmcData } = await supabase
                    .from('tbl_school')
                    .select(`
                        school_id,
                        school_code8,
                        school_name,
                        school_province,
                        khet_code,
                        school_size,
                        tbl_school_DMCdata!inner(*)
                    `)
                    .eq('tbl_school_DMCdata.education_year', eduYear)
                    .eq('tbl_school_DMCdata.education_section', eduRound)
                    .eq('school_flag', 1);

                setStudentData(dmcData || []);
            }

            // 5. Load Plan Stats (For Teachers / Authors / Directors / Supervisors)
            const role = user?.level_id || user?.user_metadata?.role || user?.role || profile?.level || 'teacher';
            if (role === 'teacher' && profile?.people_id) {
                const { data: plans } = await supabase
                    .from('tbl_sendplan')
                    .select('planid, plan_status')
                    .eq('people_id', profile.people_id);
                if (plans) {
                    setPlanStats({
                        type: 'teacher',
                        total: plans.length,
                        waitingDirector: plans.filter(p => ['1', '4'].includes(String(p.plan_status))).length,
                        waitingClip: plans.filter(p => String(p.plan_status) === '2').length,
                        underEvaluation: plans.filter(p => ['5', '6'].includes(String(p.plan_status))).length,
                        completed: plans.filter(p => String(p.plan_status) === '7').length,
                        rejected: plans.filter(p => String(p.plan_status) === '3').length,
                    });
                }
            } else if (role === 'directorschool' && profile?.school) {
                const { data: plans } = await supabase
                    .from('tbl_sendplan')
                    .select('planid, plan_status')
                    .eq('school_code', profile.school);
                if (plans) {
                    setPlanStats({
                        type: 'director',
                        total: plans.length,
                        pending: plans.filter(p => ['1', '4'].includes(String(p.plan_status))).length,
                        approved: plans.filter(p => ['2', '5', '6', '7'].includes(String(p.plan_status))).length,
                        rejected: plans.filter(p => String(p.plan_status) === '3').length,
                        completed: plans.filter(p => String(p.plan_status) === '7').length,
                    });
                }
            } else if (['supervisor', 'chairman'].includes(role) && profile?.people_id) {
                const { data: plans } = await supabase
                    .from('tbl_sendplan')
                    .select('planid, plan_status, committee1, committee2, committee3, committee4, committee5')
                    .or(`committee1.eq.${profile.people_id},committee2.eq.${profile.people_id},committee3.eq.${profile.people_id},committee4.eq.${profile.people_id},committee5.eq.${profile.people_id}`);
                
                const { data: scores } = await supabase
                    .from('tbl_sendplan_score')
                    .select('planid')
                    .eq('supervision', profile.people_id);
                
                const scoredSet = new Set((scores || []).map(s => String(s.planid)));
                const totalAssigned = plans?.length || 0;
                const scoredCount = plans?.filter(p => scoredSet.has(String(p.planid))).length || 0;
                const pendingCount = totalAssigned - scoredCount;

                setPlanStats({
                    type: 'committee',
                    total: totalAssigned,
                    scored: scoredCount,
                    pending: pendingCount,
                });
            } else if (['districdirector', 'admin'].includes(role)) {
                const [planRes, scoredPlanRes, usingSchoolRes] = await Promise.all([
                    supabase.from('tbl_sendplan').select('planid', { count: 'exact', head: true }),
                    supabase.from('tbl_sendplan').select('planid', { count: 'exact', head: true }).eq('plan_status', '7'),
                    supabase.from('tbl_sendplan').select('school_code')
                ]);
                const usingSchoolsSet = new Set((usingSchoolRes.data || []).map(p => p.school_code).filter(Boolean));
                setPlanStats({
                    type: 'district',
                    totalPlans: planRes.count || 0,
                    completedPlans: scoredPlanRes.count || 0,
                    usingSchools: usingSchoolsSet.size,
                });
            }

        } catch (error) {
            console.error('Dashboard data load error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [user, profile]);

    useEffect(() => {
        if (!profileLoading) {
            loadDashboardData();
        }
    }, [loadDashboardData, profileLoading]);

    if (loading || profileLoading) {
        return (
            <LoadingSpinner
                title="หน้าหลัก"
                message="กำลังโหลดข้อมูลสถิติ กรุณารอสักครู่..."
            />
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <EmptyState title="ไม่สามารถแสดงข้อมูลได้" message={error} type="error" />
            </div>
        );
    }

    const totalSchools = khetStats.reduce((sum, k) => sum + k.count, 0);
    const totalSchoolsBySize = sizeStats.reduce((sum, s) => sum + s.count, 0);

    return (
        <div className="dashboard">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">หน้าหลัก</h1>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="row">
                        {/* Welcome Banner */}
                        <div className="col-12 mb-3">
                            <div className="alert alert-info alert-dismissible bg-info text-white border-0 shadow-sm">
                                <button type="button" className="close text-white" data-dismiss="alert" aria-hidden="true">×</button>
                                <h5><i className="icon fas fa-info"></i> ยินดีต้อนรับสู่ระบบ</h5>
                                สวัสดีคุณ {profile?.name} {profile?.lastname} 
                            </div>
                        </div>

                        {/* Info Boxes (Stats) for Teacher */}
                        {planStats && planStats.type === 'teacher' && (
                            <div className="col-12 mb-3">
                                {planStats.rejected > 0 && (
                                    <div className="alert alert-warning border-0 shadow-sm mb-3 d-flex align-items-center justify-content-between">
                                        <div>
                                            <i className="fa-solid fa-triangle-exclamation mr-2 text-danger"></i>
                                            <strong>แจ้งเตือน:</strong> คุณมีแผนที่ผู้อำนวยการส่งกลับเพื่อแก้ไข จำนวน {planStats.rejected} แผน
                                        </div>
                                        <Link to="/statusplan" className="btn btn-sm btn-warning font-weight-bold">
                                            ดูแผนและแก้ไข
                                        </Link>
                                    </div>
                                )}
                                <div className="row">
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/statusplan" className="text-decoration-none">
                                            <div className="info-box bg-info shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="far fa-file-alt"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">แผนทั้งหมด</span>
                                                    <span className="info-box-number">{planStats.total} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/statusplan" className="text-decoration-none">
                                            <div className="info-box bg-warning shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="far fa-clock"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">รอ ผอ. อนุมัติ</span>
                                                    <span className="info-box-number">{planStats.waitingDirector} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/statusplan_clip" className="text-decoration-none">
                                            <div className="info-box bg-primary shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-brands fa-youtube"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">รอส่งคลิปการสอน</span>
                                                    <span className="info-box-number">{planStats.waitingClip} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/statusplan_pass" className="text-decoration-none">
                                            <div className="info-box bg-success shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="far fa-check-circle"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">ผ่านการนิเทศสมบูรณ์</span>
                                                    <span className="info-box-number">{planStats.completed} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Boxes (Stats) for School Director */}
                        {planStats && planStats.type === 'director' && (
                            <div className="col-12 mb-3">
                                <div className="row">
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/Plan_Check" className="text-decoration-none">
                                            <div className="info-box bg-warning shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="far fa-envelope"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">รอ ผอ. ตรวจอนุมัติ</span>
                                                    <span className="info-box-number">{planStats.pending} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/Plan_Check" className="text-decoration-none">
                                            <div className="info-box bg-info shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-solid fa-spinner"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">อนุมัติแล้ว/กำลังประเมิน</span>
                                                    <span className="info-box-number">{planStats.approved} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/Plan_Check" className="text-decoration-none">
                                            <div className="info-box bg-success shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="far fa-check-circle"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">ประเมินเสร็จสมบูรณ์</span>
                                                    <span className="info-box-number">{planStats.completed} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/Plan_Check" className="text-decoration-none">
                                            <div className="info-box bg-secondary shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-solid fa-school"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">แผนในโรงเรียนทั้งหมด</span>
                                                    <span className="info-box-number">{planStats.total} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Boxes (Stats) for Supervisor / Committee */}
                        {planStats && planStats.type === 'committee' && (
                            <div className="col-12 mb-3">
                                <div className="row">
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/Plan_Check" className="text-decoration-none">
                                            <div className="info-box bg-info shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-solid fa-list-check"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">แผนที่ได้รับมอบหมาย</span>
                                                    <span className="info-box-number">{planStats.total} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/Plan_Check" className="text-decoration-none">
                                            <div className={`info-box ${planStats.pending > 0 ? 'bg-danger' : 'bg-success'} shadow-sm`} style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className={planStats.pending > 0 ? 'far fa-clock' : 'far fa-check-circle'}></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">ค้างการประเมิน</span>
                                                    <span className="info-box-number">{planStats.pending} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/view_scoring" className="text-decoration-none">
                                            <div className="info-box bg-success shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-solid fa-star"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">ประเมินแล้วเสร็จ</span>
                                                    <span className="info-box-number">{planStats.scored} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/admin_monitor" className="text-decoration-none">
                                            <div className="info-box bg-primary shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-solid fa-chart-line"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">กำกับติดตามระดับเขต</span>
                                                    <span className="info-box-number">ศูนย์ Monitor</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Boxes (Stats) for District Director / Admin */}
                        {planStats && planStats.type === 'district' && (
                            <div className="col-12 mb-3">
                                <div className="row">
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/admin_monitor" className="text-decoration-none">
                                            <div className="info-box bg-success shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-solid fa-school-circle-check"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">รร. ที่ส่งแผนแล้ว</span>
                                                    <span className="info-box-number">{planStats.usingSchools} / {totalSchools} แห่ง</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/admin_monitor" className="text-decoration-none">
                                            <div className="info-box bg-info shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="far fa-file-alt"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">แผนการสอนทั้งเขต</span>
                                                    <span className="info-box-number">{planStats.totalPlans} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/supervision_summary" className="text-decoration-none">
                                            <div className="info-box bg-primary shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="far fa-check-circle"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">ประเมินเสร็จสมบูรณ์</span>
                                                    <span className="info-box-number">{planStats.completedPlans} แผน</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12 mb-2">
                                        <Link to="/admin_monitor" className="text-decoration-none">
                                            <div className="info-box bg-warning shadow-sm" style={{ cursor: 'pointer' }}>
                                                <span className="info-box-icon"><i className="fa-solid fa-chart-pie"></i></span>
                                                <div className="info-box-content text-white">
                                                    <span className="info-box-text">ศูนย์กำกับติดตาม</span>
                                                    <span className="info-box-number">ดูภาพรวม</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* สหวิทยาเขต */}
                        <div className="col-lg-6">
                            <div className="card card-outline card-primary">
                                <div className="card-header">
                                    <h3 className="card-title">ข้อมูลสหวิทยาเขต</h3>
                                </div>
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-hover table-striped">
                                            <thead>
                                                <tr>
                                                    <th>ชื่อสหวิทยาเขต</th>
                                                    <th>จังหวัด</th>
                                                    <th>จำนวนโรงเรียน</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {khetStats.map((stat, idx) => (
                                                    <tr key={idx} className="text-center">
                                                        <td className="text-left">{lookupData.khet[stat.khet_code] || stat.khet_code}</td>
                                                        <td>{lookupData.province[stat.province] || stat.province}</td>
                                                        <td>{stat.count}</td>
                                                    </tr>
                                                ))}
                                                <tr className="text-center">
                                                    <td colSpan="2"><strong>รวม</strong></td>
                                                    <td><strong>{totalSchools}</strong></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* ขนาดโรงเรียน */}
                            <div className="card card-outline card-info">
                                <div className="card-header">
                                    <h3 className="card-title">ข้อมูลขนาดโรงเรียน</h3>
                                </div>
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-hover table-striped">
                                            <thead>
                                                <tr>
                                                    <th>ขนาดโรงเรียน</th>
                                                    <th>จำนวนโรงเรียน</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sizeStats.map((stat, idx) => (
                                                    <tr key={idx} className="text-center">
                                                        <td>{lookupData.schoolSize[stat.size]?.[0] || stat.size}</td>
                                                        <td>{stat.count}</td>
                                                    </tr>
                                                ))}
                                                <tr className="text-center">
                                                    <td><strong>รวม</strong></td>
                                                    <td><strong>{totalSchoolsBySize}</strong></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ข้อมูลนักเรียน (Admin Only) */}
                        {(user?.user_metadata?.role === 'admin' || user?.level_id === 'admin') && studentData.length > 0 && (
                            <div className="col-lg-12">
                                <div className="card card-outline card-teal">
                                    <div className="card-header">
                                        <h3 className="card-title">
                                            ข้อมูลนักเรียน ปีการศึกษา {configData.EDUYEAR} ภาคเรียนที่ {configData.EDUROUND}
                                        </h3>
                                    </div>
                                    <div className="card-body">
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-hover table-striped table-sm">
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2">รหัสโรงเรียน</th>
                                                        <th rowSpan="2">ชื่อโรงเรียน</th>
                                                        <th rowSpan="2">จังหวัด</th>
                                                        <th rowSpan="2">สหวิทยาเขต</th>
                                                        <th colSpan="4">จำนวนนักเรียน</th>
                                                        <th rowSpan="2">ขนาดโรงเรียน</th>
                                                    </tr>
                                                    <tr>
                                                        <th>ม.ต้น</th>
                                                        <th>ม.ปลาย</th>
                                                        <th>ปวส.</th>
                                                        <th>รวม</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {studentData.map((school, idx) => {
                                                        const dmc = school.tbl_school_DMCdata || {};
                                                        const stdM1 = (dmc.m1m || 0) + (dmc.m1f || 0) + (dmc.m2m || 0) + (dmc.m2f || 0) + (dmc.m3m || 0) + (dmc.m3f || 0);
                                                        const stdM2 = (dmc.m4m || 0) + (dmc.m4f || 0) + (dmc.m5m || 0) + (dmc.m5f || 0) + (dmc.m6m || 0) + (dmc.m6f || 0);
                                                        const stdV = (dmc.v1m || 0) + (dmc.v1f || 0) + (dmc.v2m || 0) + (dmc.v2f || 0);
                                                        const total = stdM1 + stdM2 + stdV;

                                                        return (
                                                            <tr key={idx}>
                                                                <td>{school.school_id}</td>
                                                                <td>{school.school_name}</td>
                                                                <td>{lookupData.province[school.school_province]}</td>
                                                                <td>{lookupData.khet[school.khet_code]}</td>
                                                                <td className="text-right">{stdM1.toLocaleString()}</td>
                                                                <td className="text-right">{stdM2.toLocaleString()}</td>
                                                                <td className="text-right">{stdV.toLocaleString()}</td>
                                                                <td className="text-right">{total.toLocaleString()}</td>
                                                                <td>{lookupData.schoolSize[school.school_size]?.[0]}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
