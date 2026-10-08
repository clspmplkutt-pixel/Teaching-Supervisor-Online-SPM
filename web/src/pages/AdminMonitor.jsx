import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import {
    showLineShareDialog,
    generateSchoolFollowUpMessage,
    generateCommitteeReminderMessage
} from '../utils/lineNotifyHelper';
import './AdminMonitor.css';

const AdminMonitor = () => {
    const [loading, setLoading] = useState(true);
    const [schools, setSchools] = useState([]);
    const [committeeStats, setCommitteeStats] = useState([]);
    const [lookups, setLookups] = useState({ khet: {}, prefix: {}, province: {} });
    const [activeTab, setActiveTab] = useState('school'); // 'school' or 'committee'

    // School Filters
    const [searchSchool, setSearchSchool] = useState('');
    const [filterProvince, setFilterProvince] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const [filterKhet, setFilterKhet] = useState('');
    const [filterUsage, setFilterUsage] = useState('');

    // Committee Filters
    const [searchCommittee, setSearchCommittee] = useState('');
    const [filterProgress, setFilterProgress] = useState('');

    // Modal Details
    const [selectedSchoolModal, setSelectedSchoolModal] = useState(null);
    const [schoolModalTab, setSchoolModalTab] = useState('plans'); // 'plans' or 'teachers'
    const [selectedCommitteeModal, setSelectedCommitteeModal] = useState(null);

    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            setLoading(true);
            try {
                const [
                    schoolRes,
                    khetRes,
                    provinceRes,
                    userRes,
                    prefixRes,
                    planRes,
                    scoreRes
                ] = await Promise.all([
                    supabase.from('tbl_school').select('school_id, school_name, khet_code, district_name, school_province').neq('school_flag', 0),
                    supabase.from('tbl_khet').select('khet_code, khet_name'),
                    supabase.from('tbl_province').select('province_id, province_name'),
                    supabase.from('tbl_Users').select('people_id, name, lastname, prefix, school, level'),
                    supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
                    supabase.from('tbl_sendplan').select('planid, people_id, school_code, subject_name, subject_name_plan, subject_content, plan_status, plan_senddate, committee1, committee2, committee3, committee4, committee5'),
                    supabase.from('tbl_sendplan_score').select('planid, supervision')
                ]);

                if (!mounted) return;

                const khetMap = {};
                khetRes.data?.forEach(k => { khetMap[k.khet_code] = k.khet_name; });

                const prefixMap = {};
                prefixRes.data?.forEach(p => { prefixMap[p.prefix_id] = p.prefix; });

                const provinceMap = {};
                provinceRes.data?.forEach(p => { provinceMap[String(p.province_id)] = p.province_name; });

                // School Name Map for quick reverse lookup
                const schoolNameMap = {};
                (schoolRes.data || []).forEach(s => {
                    schoolNameMap[s.school_id] = s.school_name;
                });

                // User mappings
                const usersBySchool = {};
                const teachersBySchool = {};
                const userMap = {};
                userRes.data?.forEach(u => {
                    userMap[u.people_id] = u;
                    if (u.school) {
                        if (!usersBySchool[u.school]) usersBySchool[u.school] = 0;
                        usersBySchool[u.school]++;

                        if (!teachersBySchool[u.school]) teachersBySchool[u.school] = [];
                        teachersBySchool[u.school].push(u);
                    }
                });

                // Plan and score mappings
                const plansBySchool = {};
                const scoreSet = new Set(); // set of `${planid}_${supervision}`
                scoreRes.data?.forEach(s => {
                    scoreSet.add(`${s.planid}_${s.supervision}`);
                });

                const committeeWorkload = {}; // people_id -> { people_id, name, level, total: 0, scored: 0, pending: 0, assignedPlans: [] }

                planRes.data?.forEach(plan => {
                    const sCode = plan.school_code;
                    const uTeacher = userMap[plan.people_id] || {};
                    const teacherName = uTeacher.name
                        ? `${prefixMap[uTeacher.prefix] || ''}${uTeacher.name} ${uTeacher.lastname}`.trim()
                        : plan.people_id;

                    const enrichedPlan = {
                        ...plan,
                        teacherName,
                        schoolName: schoolNameMap[sCode] || sCode,
                    };

                    // count plans per school
                    if (sCode) {
                        if (!plansBySchool[sCode]) plansBySchool[sCode] = { total: 0, fullyScored: 0, plans: [] };
                        plansBySchool[sCode].total++;
                        plansBySchool[sCode].plans.push(enrichedPlan);
                    }

                    // process committees
                    const committees = [plan.committee1, plan.committee2, plan.committee3, plan.committee4, plan.committee5].filter(Boolean);
                    let allScored = true;
                    if (committees.length === 0) allScored = false;

                    committees.forEach(c => {
                        if (!committeeWorkload[c]) {
                            const u = userMap[c] || {};
                            const cName = u.name ? `${prefixMap[u.prefix] || ''}${u.name} ${u.lastname}`.trim() : c;
                            committeeWorkload[c] = {
                                people_id: c,
                                name: cName,
                                level: u.level || 'ไม่ระบุ',
                                total: 0,
                                scored: 0,
                                pending: 0,
                                assignedPlans: []
                            };
                        }
                        committeeWorkload[c].total++;

                        const isScored = scoreSet.has(`${plan.planid}_${c}`);
                        if (isScored) {
                            committeeWorkload[c].scored++;
                        } else {
                            committeeWorkload[c].pending++;
                            allScored = false;
                        }

                        committeeWorkload[c].assignedPlans.push({
                            ...enrichedPlan,
                            isScored,
                        });
                    });

                    if (sCode && allScored && committees.length > 0) {
                        plansBySchool[sCode].fullyScored++;
                    }
                });

                // Aggregate School Data
                const schoolData = (schoolRes.data || []).map(s => {
                    const activeUsers = usersBySchool[s.school_id] || 0;
                    const pStats = plansBySchool[s.school_id] || { total: 0, fullyScored: 0, plans: [] };
                    const provName = s.school_province === '65'
                        ? 'พิษณุโลก'
                        : s.school_province === '53'
                            ? 'อุตรดิตถ์'
                            : (provinceMap[String(s.school_province)] || s.school_province || 'ไม่ระบุ');

                    return {
                        id: s.school_id,
                        name: s.school_name,
                        khet: khetMap[s.khet_code] || s.khet_code,
                        province: provName,
                        district: s.district_name || 'ไม่ระบุ',
                        usersCount: activeUsers,
                        teachers: teachersBySchool[s.school_id] || [],
                        isUsing: activeUsers > 0 || pStats.total > 0,
                        plansTotal: pStats.total,
                        plansEvaluated: pStats.fullyScored,
                        plansList: pStats.plans,
                    };
                });

                setSchools(schoolData);
                setCommitteeStats(Object.values(committeeWorkload).sort((a, b) => b.total - a.total));
                setLookups({ khet: khetMap, prefix: prefixMap, province: provinceMap });

            } catch (err) {
                console.error("Error loading monitor data:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
        return () => { mounted = false; };
    }, []);

    // Summary Statistics
    const summary = useMemo(() => {
        let using = 0;
        let notUsing = 0;
        let totalPlans = 0;
        let totalPlansEvaluated = 0;

        let plTotal = 0;
        let plUsing = 0;
        let utTotal = 0;
        let utUsing = 0;

        schools.forEach(s => {
            if (s.isUsing) using++;
            else notUsing++;

            totalPlans += s.plansTotal;
            totalPlansEvaluated += s.plansEvaluated;

            if (s.province === 'พิษณุโลก') {
                plTotal++;
                if (s.isUsing) plUsing++;
            } else if (s.province === 'อุตรดิตถ์') {
                utTotal++;
                if (s.isUsing) utUsing++;
            }
        });

        const usagePercent = schools.length > 0 ? (using / schools.length) * 100 : 0;
        const evalPercent = totalPlans > 0 ? (totalPlansEvaluated / totalPlans) * 100 : 0;

        return {
            total: schools.length,
            using,
            notUsing,
            usagePercent,
            totalPlans,
            totalPlansEvaluated,
            evalPercent,
            plTotal,
            plUsing,
            utTotal,
            utUsing,
        };
    }, [schools]);

    // Available Districts list (dynamic based on selected province)
    const availableDistricts = useMemo(() => {
        const districts = new Set();
        schools.forEach(s => {
            if (!s.district || s.district === 'ไม่ระบุ') return;
            if (!filterProvince || s.province === filterProvince) {
                districts.add(s.district);
            }
        });
        return Array.from(districts).sort();
    }, [schools, filterProvince]);

    // Filtered Schools
    const filteredSchools = useMemo(() => {
        return schools.filter(s => {
            const matchSearch = s.name.toLowerCase().includes(searchSchool.toLowerCase());
            const matchProvince = filterProvince ? s.province === filterProvince : true;
            const matchDistrict = filterDistrict ? s.district === filterDistrict : true;
            const matchKhet = filterKhet ? s.khet === filterKhet : true;
            let matchUsage = true;
            if (filterUsage === 'using') matchUsage = s.isUsing;
            if (filterUsage === 'not_using') matchUsage = !s.isUsing;
            return matchSearch && matchProvince && matchDistrict && matchKhet && matchUsage;
        });
    }, [schools, searchSchool, filterProvince, filterDistrict, filterKhet, filterUsage]);

    // Filtered Committees
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

    // Action: 1-Click LINE Reminder for a single School
    const handleRemindSchool = (school) => {
        const messageText = generateSchoolFollowUpMessage({ schoolName: school.name });
        showLineShareDialog({
            title: 'ส่งข้อความติดตามสถานศึกษาผ่าน LINE',
            subtitle: `แจ้งเตือนผู้บริหารและครูผู้สอน โรงเรียน${school.name} เพื่อจัดส่งแผนการจัดการเรียนรู้`,
            messageText,
        });
    };

    // Action: 1-Click LINE Reminder for a single Committee Member
    const handleRemindCommittee = (committee) => {
        const messageText = generateCommitteeReminderMessage({
            committeeName: committee.name,
            pendingCount: committee.pending,
        });
        showLineShareDialog({
            title: 'ส่งข้อความแจ้งเตือนกรรมการนิเทศผ่าน LINE',
            subtitle: `แจ้งเตือนอาจารย์ ${committee.name} ที่มีภาระงานค้างการประเมินจำนวน ${committee.pending} แผน`,
            messageText,
        });
    };

    // Action: Broadcast summary of unsubmitted schools to Director/Supervisor LINE Group
    const handleBroadcastPendingSchools = () => {
        const unsubmitted = filteredSchools.filter(s => !s.isUsing);
        if (unsubmitted.length === 0) {
            showLineShareDialog({
                title: 'สถานะการส่งแผนสมบูรณ์',
                subtitle: 'ทุกโรงเรียนในเงื่อนไขการค้นหาปัจจุบันได้จัดส่งแผนฯ ครบถ้วนแล้ว',
                messageText: '🎉 ยินดีด้วยครับ ทุกโรงเรียนในรายการค้นหานี้ได้จัดส่งแผนการจัดการเรียนรู้ครบ 100% แล้ว',
            });
            return;
        }

        const currentHost = window.location.origin;
        const schoolListText = unsubmitted
            .map((s, idx) => `  ${idx + 1}. โรงเรียน${s.name} (${s.district} จ.${s.province})`)
            .join('\n');

        const messageText =
            `📢 [รายงานติดตามสถานะการส่งแผนการจัดการเรียนรู้]\n` +
            `กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา สพม.พิษณุโลก อุตรดิตถ์\n\n` +
            `ณ วันที่ ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}\n` +
            `พบสถานศึกษาที่ยังไม่ได้จัดส่งแผนฯ เข้าระบบ จำนวน ${unsubmitted.length} โรงเรียน ดังนี้:\n\n` +
            `${schoolListText}\n\n` +
            `ขอความอนุเคราะห์ผู้บริหารสถานศึกษาและคณะครู ดำเนินการจัดส่งแผนฯ ในระบบนิเทศออนไลน์:\n` +
            `🔗 ${currentHost}/sendplan\n\n` +
            `ขอขอบพระคุณในความร่วมมือในการพัฒนาคุณภาพการศึกษาเป็นอย่างสูงครับ/ค่ะ`;

        showLineShareDialog({
            title: 'สรุปรายชื่อสถานศึกษาค้างส่งแผน (สำหรับกลุ่ม LINE)',
            subtitle: `คัดลอกหรือเปิดส่งเข้ากลุ่ม LINE ผู้บริหาร/ศึกษานิเทศก์ เพื่อติดตามผลรวม ${unsubmitted.length} โรงเรียน`,
            messageText,
        });
    };

    // Export Schools CSV
    const exportSchoolsCSV = () => {
        const headers = ['ลำดับ', 'จังหวัด', 'อำเภอ', 'สหวิทยาเขต', 'ชื่อโรงเรียน', 'สถานะการใช้งาน', 'จำนวนบุคลากร', 'แผนที่ส่ง (แผน)', 'ประเมินครบ (แผน)', 'อัตราประเมินเสร็จ'];
        const rows = filteredSchools.map((s, idx) => {
            const evalRate = s.plansTotal > 0 ? `${((s.plansEvaluated / s.plansTotal) * 100).toFixed(0)}%` : '0%';
            return [
                idx + 1,
                `"${s.province || ''}"`,
                `"${s.district || ''}"`,
                `"${s.khet || ''}"`,
                `"${s.name || ''}"`,
                s.isUsing ? 'ใช้งานแล้ว' : 'ยังไม่ได้ใช้งาน',
                s.usersCount,
                s.plansTotal,
                s.plansEvaluated,
                `"${evalRate}"`
            ];
        });
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `รายงานติดตามการใช้งานโรงเรียน_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export Committees CSV
    const exportCommitteesCSV = () => {
        const headers = ['ลำดับ', 'ชื่อ-นามสกุล กรรมการ', 'ตำแหน่ง/สิทธิ์', 'จำนวนแผนที่ได้รับมอบหมาย (แผน)', 'ประเมินแล้ว (แผน)', 'ค้างประเมิน (แผน)', 'ร้อยละความก้าวหน้า'];
        const rows = filteredCommittees.map((c, idx) => {
            const percent = c.total > 0 ? (c.scored / c.total) * 100 : 0;
            return [
                idx + 1,
                `"${c.name || ''}"`,
                `"${c.level || ''}"`,
                c.total,
                c.scored,
                c.pending,
                `${percent.toFixed(0)}%`
            ];
        });
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `รายงานภาระงานกรรมการนิเทศ_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <LoadingSpinner title="กำกับติดตามการใช้งาน" message="กำลังประมวลผลข้อมูลระดับเขตพื้นที่การศึกษา กรุณารอสักครู่..." />;
    }

    return (
        <div className="admin-monitor admin-monitor-container">
            {/* Top Action Bar */}
            <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 p-3 bg-white rounded-lg shadow-sm border">
                <div>
                    <h5 className="m-0 font-weight-bold text-dark">
                        <i className="fa-solid fa-chart-line text-primary mr-2"></i>
                        ศูนย์บัญชาการกำกับติดตามและประเมินผลการใช้งาน (Supervision Monitor)
                    </h5>
                    <p className="text-muted mb-0 small mt-1">
                        ติดตามความก้าวหน้าการจัดส่งแผนและการประเมินผลของ 57 สถานศึกษา สพม.พิษณุโลก อุตรดิตถ์
                    </p>
                </div>
                <div className="mt-2 mt-sm-0">
                    <button
                        type="button"
                        className="btn btn-outline-success font-weight-bold shadow-sm"
                        onClick={handleBroadcastPendingSchools}
                        title="ส่งข้อความสรุปติดตาม รร. ที่ยังไม่ส่งแผน เข้ากลุ่ม LINE ผู้บริหาร"
                    >
                        <i className="fa-brands fa-line mr-1 text-success"></i> สรุปติดตามค้างส่งเข้า LINE
                    </button>
                </div>
            </div>

            {/* Hero KPI Cards */}
            <div className="monitor-hero-grid">
                        <div className="monitor-kpi-card kpi-theme-indigo">
                            <div className="monitor-kpi-icon">
                                <i className="fa-solid fa-school"></i>
                            </div>
                            <div className="monitor-kpi-info">
                                <div className="monitor-kpi-title">สถานศึกษาทั้งหมด</div>
                                <div className="monitor-kpi-val">{summary.total} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>แห่ง</span></div>
                                <div className="monitor-kpi-sub">
                                    พิษณุโลก {summary.plTotal} แห่ง | อุตรดิตถ์ {summary.utTotal} แห่ง
                                </div>
                            </div>
                        </div>

                        <div className="monitor-kpi-card kpi-theme-success">
                            <div className="monitor-kpi-icon">
                                <i className="fa-solid fa-circle-check"></i>
                            </div>
                            <div className="monitor-kpi-info">
                                <div className="monitor-kpi-title">ส่งแผนการสอนแล้ว</div>
                                <div className="monitor-kpi-val text-success">
                                    {summary.using} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>แห่ง ({summary.usagePercent.toFixed(1)}%)</span>
                                </div>
                                <div className="monitor-kpi-sub">
                                    ความครอบคลุมการใช้งานระบบ
                                </div>
                            </div>
                        </div>

                        <div className="monitor-kpi-card kpi-theme-warning">
                            <div className="monitor-kpi-icon">
                                <i className="fa-solid fa-clock-rotate-left"></i>
                            </div>
                            <div className="monitor-kpi-info">
                                <div className="monitor-kpi-title">ยังไม่ได้จัดส่งแผน</div>
                                <div className="monitor-kpi-val text-danger">
                                    {summary.notUsing} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>แห่ง</span>
                                </div>
                                <div className="monitor-kpi-sub">
                                    รอการส่งแผนจัดการเรียนรู้
                                </div>
                            </div>
                        </div>

                        <div className="monitor-kpi-card kpi-theme-cyan">
                            <div className="monitor-kpi-icon">
                                <i className="fa-solid fa-file-signature"></i>
                            </div>
                            <div className="monitor-kpi-info">
                                <div className="monitor-kpi-title">ความก้าวหน้าการประเมิน</div>
                                <div className="monitor-kpi-val text-info">
                                    {summary.totalPlansEvaluated} / {summary.totalPlans}
                                </div>
                                <div className="monitor-kpi-sub">
                                    ประเมินครบ {summary.evalPercent.toFixed(1)}% ของแผนทั้งหมด
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Province Quick Comparison Banner */}
                    <div className="province-breakdown-card">
                        <div className="province-breakdown-title">
                            <i className="fa-solid fa-map-location-dot text-warning fa-lg"></i>
                            <span>สถานะรายจังหวัด (สพม.พิษณุโลก อุตรดิตถ์)</span>
                        </div>
                        <div className="province-breakdown-items">
                            <div className="province-pill-stat">
                                <span className="badge-dot bg-info"></span>
                                <span><strong>จ.พิษณุโลก:</strong> ส่งแล้ว {summary.plUsing} / {summary.plTotal} โรงเรียน ({summary.plTotal > 0 ? ((summary.plUsing / summary.plTotal) * 100).toFixed(0) : 0}%)</span>
                            </div>
                            <div className="province-pill-stat">
                                <span className="badge-dot bg-success"></span>
                                <span><strong>จ.อุตรดิตถ์:</strong> ส่งแล้ว {summary.utUsing} / {summary.utTotal} โรงเรียน ({summary.utTotal > 0 ? ((summary.utUsing / summary.utTotal) * 100).toFixed(0) : 0}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Tabs Card */}
                    <div className="card card-primary card-outline card-outline-tabs shadow-sm">
                        <div className="card-header p-0 border-bottom-0">
                            <ul className="nav nav-tabs" role="tablist">
                                <li className="nav-item">
                                    <a
                                        className={`nav-link font-weight-bold ${activeTab === 'school' ? 'active text-primary' : 'text-muted'}`}
                                        onClick={() => setActiveTab('school')}
                                        style={{ cursor: 'pointer', padding: '12px 20px' }}
                                    >
                                        <i className="fa-solid fa-school mr-2"></i>
                                        สรุปรายสถานศึกษา ({filteredSchools.length} แห่ง)
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a
                                        className={`nav-link font-weight-bold ${activeTab === 'committee' ? 'active text-primary' : 'text-muted'}`}
                                        onClick={() => setActiveTab('committee')}
                                        style={{ cursor: 'pointer', padding: '12px 20px' }}
                                    >
                                        <i className="fa-solid fa-user-check mr-2"></i>
                                        สรุปรายบุคคล (คณะกรรมการนิเทศ) ({filteredCommittees.length} ท่าน)
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div className="card-body">
                            {/* TAB 1: สรุปรายโรงเรียน */}
                            {activeTab === 'school' && (
                                <>
                                    {/* Advanced Filter Panel */}
                                    <div className="monitor-filter-panel">
                                        <div className="row align-items-center">
                                            {/* Search */}
                                            <div className="col-lg-3 col-md-6 mb-2">
                                                <div className="input-group">
                                                    <div className="input-group-prepend">
                                                        <span className="input-group-text bg-white border-right-0"><i className="fa-solid fa-search text-muted"></i></span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className="form-control border-left-0"
                                                        placeholder="ค้นหาชื่อโรงเรียน..."
                                                        value={searchSchool}
                                                        onChange={e => setSearchSchool(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Province Filter */}
                                            <div className="col-lg-2 col-md-3 mb-2">
                                                <select
                                                    className="form-control"
                                                    value={filterProvince}
                                                    onChange={e => {
                                                        setFilterProvince(e.target.value);
                                                        setFilterDistrict(''); // Reset district when province changes
                                                    }}
                                                >
                                                    <option value="">-- ทุกจังหวัด --</option>
                                                    <option value="พิษณุโลก">พิษณุโลก (35 โรงเรียน)</option>
                                                    <option value="อุตรดิตถ์">อุตรดิตถ์ (22 โรงเรียน)</option>
                                                </select>
                                            </div>

                                            {/* District Filter (Dynamic) */}
                                            <div className="col-lg-2 col-md-3 mb-2">
                                                <select
                                                    className="form-control"
                                                    value={filterDistrict}
                                                    onChange={e => setFilterDistrict(e.target.value)}
                                                >
                                                    <option value="">-- ทุกอำเภอ --</option>
                                                    {availableDistricts.map(d => (
                                                        <option key={d} value={d}>อ.{d}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Khet Filter */}
                                            <div className="col-lg-2 col-md-4 mb-2">
                                                <select
                                                    className="form-control"
                                                    value={filterKhet}
                                                    onChange={e => setFilterKhet(e.target.value)}
                                                >
                                                    <option value="">-- ทุกสหวิทยาเขต --</option>
                                                    {Object.values(lookups.khet).map((kName, i) => (
                                                        <option key={i} value={kName}>{kName}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Usage Status Filter */}
                                            <div className="col-lg-2 col-md-4 mb-2">
                                                <select
                                                    className="form-control"
                                                    value={filterUsage}
                                                    onChange={e => setFilterUsage(e.target.value)}
                                                >
                                                    <option value="">-- ทุกสถานะส่งแผน --</option>
                                                    <option value="using">ส่งแผนแล้ว</option>
                                                    <option value="not_using">ยังไม่ได้จัดส่งแผน</option>
                                                </select>
                                            </div>

                                            {/* CSV Export Button */}
                                            <div className="col-lg-1 col-md-4 mb-2 text-md-right">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-success btn-block font-weight-bold"
                                                    onClick={exportSchoolsCSV}
                                                    title="ส่งออกรายงานเป็นไฟล์ CSV (เปิดใน Excel ได้ภาษาไทยไม่เพี้ยน)"
                                                >
                                                    <i className="fa-solid fa-file-excel mr-1"></i> CSV
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* School Table */}
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-striped table-hover monitor-table">
                                            <thead>
                                                <tr className="text-center bg-light">
                                                    <th style={{ width: '4%' }}>ที่</th>
                                                    <th style={{ width: '12%' }}>จังหวัด / อำเภอ</th>
                                                    <th style={{ width: '14%' }}>สหวิทยาเขต</th>
                                                    <th>ชื่อโรงเรียน</th>
                                                    <th style={{ width: '12%' }}>สถานะการส่งแผน</th>
                                                    <th style={{ width: '9%' }}>ครูในระบบ</th>
                                                    <th style={{ width: '9%' }}>แผนที่ส่ง</th>
                                                    <th style={{ width: '9%' }}>ประเมินครบ</th>
                                                    <th style={{ width: '14%' }}>การติดตาม / ดำเนินการ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredSchools.length === 0 && (
                                                    <tr>
                                                        <td colSpan="9">
                                                            <EmptyState message="ไม่พบข้อมูลโรงเรียนที่ตรงตามเงื่อนไขการค้นหา" />
                                                        </td>
                                                    </tr>
                                                )}
                                                {filteredSchools.map((s, idx) => (
                                                    <tr key={s.id}>
                                                        <td className="text-center font-weight-bold">{idx + 1}</td>
                                                        <td>
                                                            <span className="badge badge-light border mr-1">{s.province}</span>
                                                            <small className="text-muted">อ.{s.district}</small>
                                                        </td>
                                                        <td><small>{s.khet}</small></td>
                                                        <td className="font-weight-bold text-dark">
                                                            <a
                                                                href="#"
                                                                onClick={(e) => { e.preventDefault(); setSelectedSchoolModal(s); }}
                                                                className="text-primary"
                                                                title="คลิกเพื่อดูรายละเอียดโรงเรียนและรายการแผน"
                                                            >
                                                                {s.name}
                                                            </a>
                                                        </td>
                                                        <td className="text-center">
                                                            {s.isUsing ? (
                                                                <span className="badge badge-success px-2 py-1">
                                                                    <i className="fa-solid fa-check mr-1"></i> ส่งแผนแล้ว
                                                                </span>
                                                            ) : (
                                                                <span className="badge badge-danger px-2 py-1">
                                                                    <i className="fa-solid fa-xmark mr-1"></i> ยังไม่ส่งแผน
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="text-center font-weight-bold">{s.usersCount} คน</td>
                                                        <td className="text-center text-primary font-weight-bold">{s.plansTotal} แผน</td>
                                                        <td className="text-center text-success font-weight-bold">{s.plansEvaluated} แผน</td>
                                                        <td className="text-center">
                                                            <div className="btn-group btn-group-sm">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-info"
                                                                    onClick={() => setSelectedSchoolModal(s)}
                                                                    title="ดูรายละเอียดแผนและรายชื่อครู"
                                                                >
                                                                    <i className="fa-solid fa-eye"></i>
                                                                </button>
                                                                {!s.isUsing && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-success"
                                                                        onClick={() => handleRemindSchool(s)}
                                                                        style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}
                                                                        title="ส่งข้อความติดตามผ่าน LINE"
                                                                    >
                                                                        <i className="fa-brands fa-line mr-1"></i> ติดตาม
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            {/* TAB 2: สรุปรายกรรมการนิเทศ */}
                            {activeTab === 'committee' && (
                                <>
                                    {/* Committee Filter Panel */}
                                    <div className="monitor-filter-panel">
                                        <div className="row align-items-center">
                                            <div className="col-md-5 mb-2">
                                                <div className="input-group">
                                                    <div className="input-group-prepend">
                                                        <span className="input-group-text bg-white border-right-0"><i className="fa-solid fa-search text-muted"></i></span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className="form-control border-left-0"
                                                        placeholder="ค้นหาชื่อ-นามสกุล กรรมการนิเทศ..."
                                                        value={searchCommittee}
                                                        onChange={e => setSearchCommittee(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4 mb-2">
                                                <select
                                                    className="form-control"
                                                    value={filterProgress}
                                                    onChange={e => setFilterProgress(e.target.value)}
                                                >
                                                    <option value="">-- ทุกสถานะภาระงาน --</option>
                                                    <option value="done">ประเมินครบ 100%</option>
                                                    <option value="pending">มีงานค้างการประเมิน</option>
                                                </select>
                                            </div>
                                            <div className="col-md-3 mb-2 text-md-right">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-success font-weight-bold"
                                                    onClick={exportCommitteesCSV}
                                                    title="ส่งออกรายงานภาระงานกรรมการเป็นไฟล์ CSV"
                                                >
                                                    <i className="fa-solid fa-file-excel mr-1"></i> ส่งออก CSV
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Committee Table */}
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-striped table-hover monitor-table">
                                            <thead>
                                                <tr className="text-center bg-light">
                                                    <th style={{ width: '4%' }}>ที่</th>
                                                    <th>ชื่อ - นามสกุล กรรมการ</th>
                                                    <th style={{ width: '14%' }}>ตำแหน่ง / สิทธิ์</th>
                                                    <th style={{ width: '12%' }}>แผนที่ได้รับมอบหมาย</th>
                                                    <th style={{ width: '10%' }}>ประเมินแล้ว</th>
                                                    <th style={{ width: '10%' }}>ค้างประเมิน</th>
                                                    <th style={{ width: '16%' }}>ความก้าวหน้า</th>
                                                    <th style={{ width: '14%' }}>การติดตาม / ดำเนินการ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCommittees.length === 0 && (
                                                    <tr>
                                                        <td colSpan="8">
                                                            <EmptyState message="ไม่พบข้อมูลกรรมการนิเทศที่ตรงตามเงื่อนไข" />
                                                        </td>
                                                    </tr>
                                                )}
                                                {filteredCommittees.map((c, idx) => {
                                                    const percent = c.total > 0 ? (c.scored / c.total) * 100 : 0;
                                                    let statusBadge = "badge-danger";
                                                    if (percent === 100) statusBadge = "badge-success";
                                                    else if (percent > 0) statusBadge = "badge-warning";

                                                    return (
                                                        <tr key={c.people_id}>
                                                            <td className="text-center font-weight-bold">{idx + 1}</td>
                                                            <td className="font-weight-bold">
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => { e.preventDefault(); setSelectedCommitteeModal(c); }}
                                                                    className="text-primary"
                                                                    title="คลิกเพื่อดูรายการแผนที่ได้รับมอบหมาย"
                                                                >
                                                                    {c.name}
                                                                </a>
                                                            </td>
                                                            <td className="text-center"><span className="badge badge-light border">{c.level}</span></td>
                                                            <td className="text-center font-weight-bold">{c.total} แผน</td>
                                                            <td className="text-center text-success font-weight-bold">{c.scored} แผน</td>
                                                            <td className="text-center text-danger font-weight-bold">{c.pending} แผน</td>
                                                            <td className="text-center">
                                                                <div className="progress progress-sm mb-1" style={{ height: '8px', borderRadius: '4px' }}>
                                                                    <div
                                                                        className={`progress-bar bg-${statusBadge === 'badge-success' ? 'success' : statusBadge === 'badge-warning' ? 'warning' : 'danger'}`}
                                                                        role="progressbar"
                                                                        style={{ width: `${percent}%` }}
                                                                        aria-valuenow={percent}
                                                                        aria-valuemin="0"
                                                                        aria-valuemax="100"
                                                                    ></div>
                                                                </div>
                                                                <span className={`badge ${statusBadge}`}>{percent.toFixed(0)}%</span>
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="btn-group btn-group-sm">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline-info"
                                                                        onClick={() => setSelectedCommitteeModal(c)}
                                                                        title="ดูรายการแผนที่ได้รับมอบหมาย"
                                                                    >
                                                                        <i className="fa-solid fa-eye mr-1"></i> ดูภาระงาน
                                                                    </button>
                                                                    {c.pending > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-success"
                                                                            onClick={() => handleRemindCommittee(c)}
                                                                            style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}
                                                                            title="ส่งข้อความแจ้งเตือนผ่าน LINE"
                                                                        >
                                                                            <i className="fa-brands fa-line mr-1"></i> เตือน
                                                                        </button>
                                                                    )}
                                                                </div>
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

            {/* ─── MODAL 1: รายละเอียดสถานศึกษา (School Detail Modal) ─── */}
            {selectedSchoolModal && (
                <div className="monitor-modal-overlay" onClick={() => setSelectedSchoolModal(null)}>
                    <div className="monitor-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="monitor-modal-header">
                            <div>
                                <h4 className="m-0 font-weight-bold text-dark">
                                    <i className="fa-solid fa-school text-primary mr-2"></i>
                                    โรงเรียน{selectedSchoolModal.name}
                                </h4>
                                <small className="text-muted">
                                    อ.{selectedSchoolModal.district} จ.{selectedSchoolModal.province} • สหวิทยาเขต {selectedSchoolModal.khet}
                                </small>
                            </div>
                            <button
                                type="button"
                                className="close text-muted"
                                onClick={() => setSelectedSchoolModal(null)}
                                style={{ fontSize: '28px' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Subtabs */}
                        <div className="bg-light px-4 pt-2 border-bottom">
                            <ul className="nav nav-tabs border-bottom-0">
                                <li className="nav-item">
                                    <a
                                        className={`nav-link font-weight-bold ${schoolModalTab === 'plans' ? 'active' : ''}`}
                                        onClick={() => setSchoolModalTab('plans')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="fa-solid fa-file-lines mr-1 text-primary"></i>
                                        แผนการสอนที่ส่ง ({selectedSchoolModal.plansList?.length || 0})
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a
                                        className={`nav-link font-weight-bold ${schoolModalTab === 'teachers' ? 'active' : ''}`}
                                        onClick={() => setSchoolModalTab('teachers')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="fa-solid fa-users mr-1 text-info"></i>
                                        รายชื่อครูในระบบ ({selectedSchoolModal.teachers?.length || 0})
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div className="monitor-modal-body">
                            {schoolModalTab === 'plans' && (
                                <>
                                    {(!selectedSchoolModal.plansList || selectedSchoolModal.plansList.length === 0) ? (
                                        <div className="text-center py-4">
                                            <EmptyState message="โรงเรียนนี้ยังไม่ได้จัดส่งแผนการจัดการเรียนรู้ในระบบ" />
                                            <button
                                                type="button"
                                                className="btn btn-success mt-3 font-weight-bold"
                                                onClick={() => handleRemindSchool(selectedSchoolModal)}
                                                style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}
                                            >
                                                <i className="fa-brands fa-line mr-1"></i> ส่งข้อความติดตามโรงเรียนนี้ผ่าน LINE
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered table-hover">
                                                <thead className="bg-light text-center">
                                                    <tr>
                                                        <th style={{ width: '5%' }}>ที่</th>
                                                        <th>ครูผู้สอน</th>
                                                        <th>วิชา / รหัสวิชา</th>
                                                        <th>ชื่อแผนการจัดการเรียนรู้</th>
                                                        <th style={{ width: '22%' }}>สถานะ</th>
                                                        <th style={{ width: '10%' }}>การจัดการ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedSchoolModal.plansList.map((p, idx) => (
                                                        <tr key={p.planid}>
                                                            <td className="text-center font-weight-bold">{idx + 1}</td>
                                                            <td>{p.teacherName}</td>
                                                            <td>{p.subject_name || '-'}</td>
                                                            <td>{p.subject_name_plan || p.subject_content || '-'}</td>
                                                            <td className="text-center">
                                                                <StatusBadge status={p.plan_status} />
                                                            </td>
                                                            <td className="text-center">
                                                                <Link
                                                                    to={`/view_scoring?planid=${p.planid}`}
                                                                    className="btn btn-xs btn-outline-primary"
                                                                    title="ดูผลการประเมิน"
                                                                >
                                                                    <i className="fa-solid fa-chart-simple mr-1"></i> ดูผล
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}

                            {schoolModalTab === 'teachers' && (
                                <>
                                    {(!selectedSchoolModal.teachers || selectedSchoolModal.teachers.length === 0) ? (
                                        <EmptyState message="ยังไม่พบบุคลากรที่ลงทะเบียนสังกัดโรงเรียนนี้" />
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered table-hover">
                                                <thead className="bg-light text-center">
                                                    <tr>
                                                        <th style={{ width: '6%' }}>ที่</th>
                                                        <th>ชื่อ - นามสกุล</th>
                                                        <th>ตำแหน่ง / สิทธิ์</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedSchoolModal.teachers.map((t, idx) => (
                                                        <tr key={t.people_id}>
                                                            <td className="text-center font-weight-bold">{idx + 1}</td>
                                                            <td>
                                                                {lookups.prefix[t.prefix] || ''}{t.name} {t.lastname}
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge badge-light border">{t.level || 'ครูผู้สอน'}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="monitor-modal-footer">
                            {!selectedSchoolModal.isUsing && (
                                <button
                                    type="button"
                                    className="btn btn-success font-weight-bold"
                                    onClick={() => handleRemindSchool(selectedSchoolModal)}
                                    style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}
                                >
                                    <i className="fa-brands fa-line mr-1"></i> ติดตามผ่าน LINE
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setSelectedSchoolModal(null)}
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL 2: รายละเอียดภาระงานกรรมการนิเทศ (Committee Detail Modal) ─── */}
            {selectedCommitteeModal && (
                <div className="monitor-modal-overlay" onClick={() => setSelectedCommitteeModal(null)}>
                    <div className="monitor-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="monitor-modal-header">
                            <div>
                                <h4 className="m-0 font-weight-bold text-dark">
                                    <i className="fa-solid fa-user-check text-success mr-2"></i>
                                    อาจารย์{selectedCommitteeModal.name}
                                </h4>
                                <small className="text-muted">
                                    สิทธิ์: {selectedCommitteeModal.level} • มอบหมายทั้งหมด {selectedCommitteeModal.total} แผน (ประเมินแล้ว {selectedCommitteeModal.scored} แผน / ค้าง {selectedCommitteeModal.pending} แผน)
                                </small>
                            </div>
                            <button
                                type="button"
                                className="close text-muted"
                                onClick={() => setSelectedCommitteeModal(null)}
                                style={{ fontSize: '28px' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div className="monitor-modal-body">
                            {(!selectedCommitteeModal.assignedPlans || selectedCommitteeModal.assignedPlans.length === 0) ? (
                                <EmptyState message="ไม่มีแผนที่ได้รับมอบหมายให้ประเมิน" />
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered table-hover">
                                        <thead className="bg-light text-center">
                                            <tr>
                                                <th style={{ width: '5%' }}>ที่</th>
                                                <th>โรงเรียน</th>
                                                <th>ครูผู้สอน</th>
                                                <th>วิชา / แผนการสอน</th>
                                                <th style={{ width: '16%' }}>สถานะการประเมิน</th>
                                                <th style={{ width: '12%' }}>การดำเนินการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCommitteeModal.assignedPlans.map((p, idx) => (
                                                <tr key={idx}>
                                                    <td className="text-center font-weight-bold">{idx + 1}</td>
                                                    <td><small>{p.schoolName}</small></td>
                                                    <td>{p.teacherName}</td>
                                                    <td>
                                                        <strong>{p.subject_name || '-'}</strong>
                                                        <br />
                                                        <small className="text-muted">{p.subject_name_plan || p.subject_content}</small>
                                                    </td>
                                                    <td className="text-center">
                                                        {p.isScored ? (
                                                            <span className="badge badge-success px-2 py-1">
                                                                <i className="fa-solid fa-check mr-1"></i> ประเมินแล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="badge badge-danger px-2 py-1">
                                                                <i className="fa-solid fa-clock mr-1"></i> รอการประเมิน
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {p.isScored ? (
                                                            <Link
                                                                to={`/view_scoring?planid=${p.planid}`}
                                                                className="btn btn-xs btn-outline-info"
                                                            >
                                                                <i className="fa-solid fa-eye mr-1"></i> ดูคะแนน
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                to={`/Plan_scoring?planid=${p.planid}`}
                                                                className="btn btn-xs btn-primary font-weight-bold"
                                                            >
                                                                <i className="fa-solid fa-pen-to-square mr-1"></i> ประเมิน
                                                            </Link>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="monitor-modal-footer">
                            {selectedCommitteeModal.pending > 0 && (
                                <button
                                    type="button"
                                    className="btn btn-success font-weight-bold"
                                    onClick={() => handleRemindCommittee(selectedCommitteeModal)}
                                    style={{ backgroundColor: '#06C755', borderColor: '#06C755' }}
                                >
                                    <i className="fa-brands fa-line mr-1"></i> ส่งข้อความเตือนภาระงานผ่าน LINE
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setSelectedCommitteeModal(null)}
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMonitor;
