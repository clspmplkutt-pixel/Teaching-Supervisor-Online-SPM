import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const AdminMonitor = () => {
    const [loading, setLoading] = useState(true);
    const [schools, setSchools] = useState([]);
    const [committeeStats, setCommitteeStats] = useState([]);
    const [lookups, setLookups] = useState({ khet: {}, prefix: {} });
    const [activeTab, setActiveTab] = useState('school'); // 'school' or 'committee'
    const [searchSchool, setSearchSchool] = useState('');
    const [filterKhet, setFilterKhet] = useState('');
    const [filterUsage, setFilterUsage] = useState('');
    const [searchCommittee, setSearchCommittee] = useState('');
    const [filterProgress, setFilterProgress] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            setLoading(true);
            try {
                const [
                    schoolRes,
                    khetRes,
                    userRes,
                    prefixRes,
                    planRes,
                    scoreRes
                ] = await Promise.all([
                    supabase.from('tbl_school').select('school_id, school_name, khet_code'),
                    supabase.from('tbl_khet').select('khet_code, khet_name'),
                    supabase.from('tbl_Users').select('people_id, name, lastname, prefix, school, level'),
                    supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
                    supabase.from('tbl_sendplan').select('planid, school_code, committee1, committee2, committee3, committee4, committee5'),
                    supabase.from('tbl_sendplan_score').select('planid, supervision')
                ]);

                if (!mounted) return;

                const khetMap = {};
                khetRes.data?.forEach(k => khetMap[k.khet_code] = k.khet_name);
                
                const prefixMap = {};
                prefixRes.data?.forEach(p => prefixMap[p.prefix_id] = p.prefix);

                // User mappings
                const usersBySchool = {};
                const userMap = {};
                userRes.data?.forEach(u => {
                    userMap[u.people_id] = u;
                    if (u.school) {
                        if (!usersBySchool[u.school]) usersBySchool[u.school] = 0;
                        usersBySchool[u.school]++;
                    }
                });

                // Plan and score mappings
                const plansBySchool = {};
                const scoreSet = new Set(); // set of `${planid}_${supervision}`
                scoreRes.data?.forEach(s => {
                    scoreSet.add(`${s.planid}_${s.supervision}`);
                });

                const committeeWorkload = {}; // people_id -> { total: 0, scored: 0, pending: 0, name: '' }

                planRes.data?.forEach(plan => {
                    // count plans per school
                    const sCode = plan.school_code;
                    if (sCode) {
                        if (!plansBySchool[sCode]) plansBySchool[sCode] = { total: 0, fullyScored: 0 };
                        plansBySchool[sCode].total++;
                    }

                    // process committees
                    const committees = [plan.committee1, plan.committee2, plan.committee3, plan.committee4, plan.committee5].filter(Boolean);
                    
                    let allScored = true;
                    if (committees.length === 0) allScored = false;

                    committees.forEach(c => {
                        if (!committeeWorkload[c]) {
                            const u = userMap[c] || {};
                            const cName = u.name ? `${prefixMap[u.prefix] || ''}${u.name} ${u.lastname}` : c;
                            committeeWorkload[c] = { people_id: c, name: cName, level: u.level || 'ไม่ระบุ', total: 0, scored: 0, pending: 0 };
                        }
                        committeeWorkload[c].total++;

                        if (scoreSet.has(`${plan.planid}_${c}`)) {
                            committeeWorkload[c].scored++;
                        } else {
                            committeeWorkload[c].pending++;
                            allScored = false;
                        }
                    });

                    if (sCode && allScored && committees.length > 0) {
                        plansBySchool[sCode].fullyScored++;
                    }
                });

                // Aggregate School Data
                const schoolData = (schoolRes.data || []).map(s => {
                    const activeUsers = usersBySchool[s.school_id] || 0;
                    const pStats = plansBySchool[s.school_id] || { total: 0, fullyScored: 0 };
                    return {
                        id: s.school_id,
                        name: s.school_name,
                        khet: khetMap[s.khet_code] || s.khet_code,
                        usersCount: activeUsers,
                        isUsing: activeUsers > 0 || pStats.total > 0,
                        plansTotal: pStats.total,
                        plansEvaluated: pStats.fullyScored
                    };
                });

                setSchools(schoolData);
                setCommitteeStats(Object.values(committeeWorkload).sort((a, b) => b.total - a.total));
                setLookups({ khet: khetMap, prefix: prefixMap });

            } catch (err) {
                console.error("Error loading monitor data:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
        return () => { mounted = false; };
    }, []);

    const summary = useMemo(() => {
        let using = 0;
        let notUsing = 0;
        schools.forEach(s => {
            if (s.isUsing) using++;
            else notUsing++;
        });
        return { using, notUsing, total: schools.length };
    }, [schools]);

    const filteredSchools = useMemo(() => {
        return schools.filter(s => {
            const matchSearch = s.name.toLowerCase().includes(searchSchool.toLowerCase());
            const matchKhet = filterKhet ? s.khet === filterKhet : true;
            let matchUsage = true;
            if (filterUsage === 'using') matchUsage = s.isUsing;
            if (filterUsage === 'not_using') matchUsage = !s.isUsing;
            return matchSearch && matchKhet && matchUsage;
        });
    }, [schools, searchSchool, filterKhet, filterUsage]);

    const filteredCommittees = useMemo(() => {
        return committeeStats.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(searchCommittee.toLowerCase());
            let matchProgress = true;
            const percent = c.total > 0 ? (c.scored / c.total) * 100 : 0;
            if (filterProgress === 'done') matchProgress = percent === 100;
            if (filterProgress === 'pending') matchProgress = percent < 100;
            return matchSearch && matchProgress;
        });
    }, [committeeStats, searchCommittee, filterProgress]);

    if (loading) {
        return <LoadingSpinner title="กำกับติดตามการใช้งาน" message="กำลังโหลดข้อมูลสรุปผล กรุณารอสักครู่..." />;
    }

    return (
        <div className="admin-monitor">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">กำกับติดตามและประเมินผลการใช้งาน (Monitor)</h1>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-12 col-sm-6 col-md-4">
                            <div className="info-box mb-3">
                                <span className="info-box-icon bg-info elevation-1"><i className="fa-solid fa-school"></i></span>
                                <div className="info-box-content">
                                    <span className="info-box-text">โรงเรียนทั้งหมด</span>
                                    <span className="info-box-number">{summary.total}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-sm-6 col-md-4">
                            <div className="info-box mb-3">
                                <span className="info-box-icon bg-success elevation-1"><i className="fa-solid fa-circle-check"></i></span>
                                <div className="info-box-content">
                                    <span className="info-box-text">โรงเรียนที่ใช้งานระบบแล้ว</span>
                                    <span className="info-box-number">{summary.using}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-sm-6 col-md-4">
                            <div className="info-box mb-3">
                                <span className="info-box-icon bg-danger elevation-1"><i className="fa-solid fa-circle-xmark"></i></span>
                                <div className="info-box-content">
                                    <span className="info-box-text">โรงเรียนที่ยังไม่ได้ใช้งาน</span>
                                    <span className="info-box-number">{summary.notUsing}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card card-primary card-outline card-outline-tabs">
                        <div className="card-header p-0 border-bottom-0">
                            <ul className="nav nav-tabs" role="tablist">
                                <li className="nav-item">
                                    <a className={`nav-link ${activeTab === 'school' ? 'active' : ''}`} onClick={() => setActiveTab('school')} style={{cursor: 'pointer'}}>
                                        สรุปรายโรงเรียน
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a className={`nav-link ${activeTab === 'committee' ? 'active' : ''}`} onClick={() => setActiveTab('committee')} style={{cursor: 'pointer'}}>
                                        สรุปรายบุคคล (คณะกรรมการ)
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div className="card-body">
                            <div className="tab-content">
                                {activeTab === 'school' && (
                                    <>
                                        <div className="row mb-3">
                                            <div className="col-md-4 mb-2">
                                                <input type="text" className="form-control" placeholder="ค้นหาชื่อโรงเรียน..." value={searchSchool} onChange={e => setSearchSchool(e.target.value)} />
                                            </div>
                                            <div className="col-md-4 mb-2">
                                                <select className="form-control" value={filterKhet} onChange={e => setFilterKhet(e.target.value)}>
                                                    <option value="">-- ทุกสหวิทยาเขต --</option>
                                                    {Object.values(lookups.khet).map((kName, i) => <option key={i} value={kName}>{kName}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-4 mb-2">
                                                <select className="form-control" value={filterUsage} onChange={e => setFilterUsage(e.target.value)}>
                                                    <option value="">-- ทุกสถานะ --</option>
                                                    <option value="using">ใช้งานแล้ว</option>
                                                    <option value="not_using">ยังไม่ได้ใช้งาน</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-striped table-hover">
                                                <thead>
                                                    <tr className="text-center bg-light">
                                                    <th>ที่</th>
                                                    <th>สหวิทยาเขต</th>
                                                    <th>ชื่อโรงเรียน</th>
                                                    <th>สถานะการใช้งาน</th>
                                                    <th>จำนวนบุคลากร</th>
                                                    <th>แผนที่ส่ง (แผน)</th>
                                                    <th>ประเมินครบ (แผน)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredSchools.length === 0 && (
                                                    <tr><td colSpan="7"><EmptyState message="ไม่มีข้อมูลโรงเรียนที่ค้นหา" /></td></tr>
                                                )}
                                                {filteredSchools.map((s, idx) => (
                                                    <tr key={s.id}>
                                                        <td className="text-center">{idx + 1}</td>
                                                        <td>{s.khet}</td>
                                                        <td>{s.name}</td>
                                                        <td className="text-center">
                                                            {s.isUsing ? (
                                                                <span className="badge badge-success px-2 py-1"><i className="fa-solid fa-check"></i> ใช้งานแล้ว</span>
                                                            ) : (
                                                                <span className="badge badge-danger px-2 py-1"><i className="fa-solid fa-xmark"></i> ยังไม่ได้ใช้งาน</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center">{s.usersCount}</td>
                                                        <td className="text-center text-primary"><strong>{s.plansTotal}</strong></td>
                                                        <td className="text-center text-success"><strong>{s.plansEvaluated}</strong></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                )}

                                {activeTab === 'committee' && (
                                    <>
                                        <div className="row mb-3">
                                            <div className="col-md-6 mb-2">
                                                <input type="text" className="form-control" placeholder="ค้นหาชื่อกรรมการ..." value={searchCommittee} onChange={e => setSearchCommittee(e.target.value)} />
                                            </div>
                                            <div className="col-md-6 mb-2">
                                                <select className="form-control" value={filterProgress} onChange={e => setFilterProgress(e.target.value)}>
                                                    <option value="">-- ทุกสถานะการประเมิน --</option>
                                                    <option value="done">ประเมินครบ 100%</option>
                                                    <option value="pending">ค้างประเมิน (ยังไม่ครบ 100%)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-striped table-hover">
                                                <thead>
                                                    <tr className="text-center bg-light">
                                                    <th>ที่</th>
                                                    <th>ชื่อ - นามสกุล กรรมการ</th>
                                                    <th>ตำแหน่ง / สิทธิ์</th>
                                                    <th>จำนวนแผนที่ได้รับมอบหมาย (แผน)</th>
                                                    <th>ประเมินแล้ว (แผน)</th>
                                                    <th>ค้างประเมิน (แผน)</th>
                                                    <th>สถานะดำเนินการ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCommittees.length === 0 && (
                                                    <tr><td colSpan="7"><EmptyState message="ไม่มีข้อมูลกรรมการที่ค้นหา" /></td></tr>
                                                )}
                                                {filteredCommittees.map((c, idx) => {
                                                    const percent = c.total > 0 ? (c.scored / c.total) * 100 : 0;
                                                    let statusBadge = "badge-danger";
                                                    if (percent === 100) statusBadge = "badge-success";
                                                    else if (percent > 0) statusBadge = "badge-warning";

                                                    return (
                                                        <tr key={c.people_id}>
                                                            <td className="text-center">{idx + 1}</td>
                                                            <td>{c.name}</td>
                                                            <td className="text-center">{c.level}</td>
                                                            <td className="text-center"><strong>{c.total}</strong></td>
                                                            <td className="text-center text-success"><strong>{c.scored}</strong></td>
                                                            <td className="text-center text-danger"><strong>{c.pending}</strong></td>
                                                            <td className="text-center">
                                                                <div className="progress progress-sm mb-1" style={{height: '10px'}}>
                                                                    <div className={`progress-bar bg-${statusBadge === 'badge-success' ? 'success' : statusBadge === 'badge-warning' ? 'warning' : 'danger'}`} 
                                                                         role="progressbar" style={{ width: `${percent}%` }} aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100"></div>
                                                                </div>
                                                                <span className={`badge ${statusBadge}`}>{percent.toFixed(0)}%</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AdminMonitor;
