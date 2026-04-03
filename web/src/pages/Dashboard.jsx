import React, { useState, useEffect, useCallback } from 'react';
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

            // 5. Load Plan Stats (For Teachers / Authors / Directors)
            const role = user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
            if (role === 'teacher' && profile?.people_id) {
                const { data: plans } = await supabase
                    .from('tbl_sendplan')
                    .select('plan_status')
                    .eq('people_id', profile.people_id);
                if (plans) {
                    setPlanStats({
                        type: 'teacher',
                        total: plans.length,
                        pending: plans.filter(p => String(p.plan_status) === '1').length,
                        passed: plans.filter(p => String(p.plan_status) === '2').length,
                        rejected: plans.filter(p => String(p.plan_status) === '3').length,
                    });
                }
            } else if (role === 'directorschool' && profile?.school) {
                const { count } = await supabase
                    .from('tbl_sendplan')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_code', profile.school)
                    .eq('plan_status', '1');
                setPlanStats({ type: 'director', pending: count || 0 });
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

                        {/* Info Boxes (Stats) */}
                        {planStats && planStats.type === 'teacher' && (
                            <div className="col-12 mb-3">
                                <div className="row">
                                    <div className="col-md-3 col-sm-6 col-12">
                                        <div className="info-box bg-info">
                                            <span className="info-box-icon"><i className="far fa-file-alt"></i></span>
                                            <div className="info-box-content">
                                                <span className="info-box-text">แผนทั้งหมด</span>
                                                <span className="info-box-number">{planStats.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12">
                                        <div className="info-box bg-warning">
                                            <span className="info-box-icon"><i className="far fa-clock"></i></span>
                                            <div className="info-box-content">
                                                <span className="info-box-text">รอการประเมิน</span>
                                                <span className="info-box-number">{planStats.pending}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12">
                                        <div className="info-box bg-success">
                                            <span className="info-box-icon"><i className="far fa-check-circle"></i></span>
                                            <div className="info-box-content">
                                                <span className="info-box-text">ผ่านแล้ว</span>
                                                <span className="info-box-number">{planStats.passed}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-sm-6 col-12">
                                        <div className="info-box bg-danger">
                                            <span className="info-box-icon"><i className="fas fa-times-circle"></i></span>
                                            <div className="info-box-content">
                                                <span className="info-box-text">ไม่ผ่าน (รอแก้ไข)</span>
                                                <span className="info-box-number">{planStats.rejected}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {planStats && planStats.type === 'director' && (
                            <div className="col-12 mb-3">
                                <div className="row">
                                    <div className="col-md-4 col-sm-6 col-12">
                                        <div className="info-box bg-warning">
                                            <span className="info-box-icon"><i className="far fa-envelope"></i></span>
                                            <div className="info-box-content">
                                                <span className="info-box-text">แผนรอการประเมิน (โรงเรียน)</span>
                                                <span className="info-box-number">{planStats.pending}</span>
                                            </div>
                                        </div>
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
