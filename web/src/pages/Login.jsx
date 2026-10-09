import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';
import { formatThaiId, cleanThaiId, getThaiIdInfo } from '../utils/thaiId';
import Swal from 'sweetalert2';

const Login = () => {
    const [loginData, setLoginData] = useState({
        user: '',
        password: '',
        level: ''
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotId, setForgotId] = useState('');
    const [forgotDob, setForgotDob] = useState('');
    const [forgotResult, setForgotResult] = useState(null); // { success: true, name, school } or null
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotResult(null);
        setForgotLoading(true);

        const cleanForgotId = cleanThaiId(forgotId);
        try {
            const { data: user, error } = await supabase
                .from('tbl_Users')
                .select('*')
                .eq('people_id', cleanForgotId)
                .maybeSingle();

            if (error) throw error;

            if (!user) {
                setForgotError('ไม่พบข้อมูลผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบเลขประจำตัวประชาชน');
            } else {
                const checkBirthdayMatch = (dbDate, inputDate) => {
                    if (!dbDate || !inputDate) return false;
                    
                    const normalizeDate = (d) => d.trim().replace(/\//g, '-');
                    const dbNorm = normalizeDate(dbDate);
                    const inNorm = normalizeDate(inputDate);
                    
                    if (dbNorm === inNorm) return true;
                    
                    const dbParts = dbNorm.split('-');
                    const inParts = inNorm.split('-');
                    
                    if (dbParts.length !== 3 || inParts.length !== 3) return false;
                    
                    const dbY = parseInt(dbParts[0], 10);
                    const dbM = parseInt(dbParts[1], 10);
                    const dbD = parseInt(dbParts[2], 10);
                    const inY = parseInt(inParts[0], 10);
                    const inM = parseInt(inParts[1], 10);
                    const inD = parseInt(inParts[2], 10);
                    
                    if (dbM !== inM || dbD !== inD) return false;
                    
                    return dbY === inY || Math.abs(dbY - inY) === 543;
                };

                if (!checkBirthdayMatch(user.birthday, forgotDob)) {
                    setForgotError('วัน/เดือน/ปีเกิด ไม่ตรงกับข้อมูลในระบบ');
                } else {
                    // Reset password to YYYYMMDD (Christian Era) automatically
                    const birthday = String(user.birthday || '').replace(/-/g, '');
                    const encrypted = encryptLegacyPassword(birthday);
                    
                    const { error: updateError } = await supabase
                        .from('tbl_Users')
                        .update({ passwd: encrypted })
                        .eq('people_id', cleanForgotId);
                    
                    if (updateError) throw updateError;

                    let prefixName = '';
                    if (user.prefix) {
                        const { data: preData } = await supabase.from('tbl_system_prefix').select('prefix').eq('prefix_id', user.prefix).maybeSingle();
                        if (preData) prefixName = preData.prefix;
                    }

                    let schoolName = 'ไม่ระบุ';
                    if (user.school) {
                        const { data: sData } = await supabase.from('tbl_school').select('school_name').eq('school_id', user.school).maybeSingle();
                        if (sData) schoolName = sData.school_name;
                    }

                    setForgotResult({
                        success: true,
                        name: `${prefixName}${user.name} ${user.lastname}`,
                        school: schoolName,
                        newPassword: birthday,
                    });
                }
            }
        } catch (err) {
            console.error(err);
            setForgotError('เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่');
        } finally {
            setForgotLoading(false);
        }
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotId('');
        setForgotDob('');
        setForgotResult(null);
        setForgotError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const rawUser = (loginData.user || '').trim();
        const effectiveUser = /^[\d-]/.test(rawUser) ? cleanThaiId(rawUser) : rawUser;

        // ถ้าไม่ได้เลือกระดับ → ลองตรวจ auto-detect
        let effectiveLevel = loginData.level;

        if (!effectiveLevel) {
            // Admin login check
            if (effectiveUser === 'admin' || effectiveUser === 'root') {
                effectiveLevel = effectiveUser;
            } else {
                // ดึง level จาก DB ก่อน
                try {
                    const { data: userData } = await supabase
                        .from('tbl_Users')
                        .select('level, headDepartment, register_isConfirm, people_id')
                        .eq('people_id', effectiveUser)
                        .maybeSingle();

                    if (!userData) {
                        // ลองค้นหาใน tbl_user (admin table)
                        const { data: adminData } = await supabase
                            .from('tbl_user')
                            .select('user, level_id')
                            .eq('user', effectiveUser)
                            .maybeSingle();
                        
                        if (adminData) {
                            effectiveLevel = adminData.level_id || 'admin';
                        } else {
                            setError('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบเลขประจำตัวประชาชน หรือลงทะเบียนก่อน');
                            return;
                        }
                    } else {
                        // ตรวจสอบว่ายังไม่ได้อนุมัติ
                        if (String(userData.register_isConfirm) === '0') {
                            setError('บัญชีของคุณยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ กรุณารอการอนุมัติ หรือติดต่อผู้ดูแลระบบสถานศึกษา');
                            return;
                        }
                        effectiveLevel = userData.level || 'teacher';
                    }
                } catch {
                    // ถ้าดึงไม่ได้ ให้ลอง login ปกติ
                    effectiveLevel = 'teacher';
                }
            }
        }

        const effectivePassword = (loginData.password || '').trim();
        try {
            const data = await login(effectiveUser, effectivePassword, effectiveLevel);
            
            // Check default password logic (YYYYMMDD or DDMMYYYY or 123456)
            if (data && data.birthday) {
                const bdayNoHyphen = data.birthday.replace(/-/g, '');
                const defaultPassAD = bdayNoHyphen; // YYYYMMDD
                const defaultPassReverse = data.birthday.split('-').reverse().join(''); // DDMMYYYY
                const bdParts = String(data.birthday).split('-');
                const thaiYear = bdParts.length === 3 ? String(parseInt(bdParts[0], 10) + 543) : '';
                const defaultPassThai = bdParts.length === 3 ? `${bdParts[2]}${bdParts[1]}${thaiYear}` : '';

                if (
                    effectivePassword === defaultPassAD || 
                    effectivePassword === defaultPassReverse || 
                    effectivePassword === defaultPassThai ||
                    effectivePassword === '123456' || 
                    effectivePassword === data.people_id ||
                    effectivePassword.replace(/\D/g, '') === data.people_id
                ) {
                    Swal.fire({
                        title: 'คำแนะนำด้านความปลอดภัย',
                        text: 'คุณกำลังใช้รหัสผ่านเริ่มต้น ซึ่งคาดเดาได้ง่าย กรุณาเปลี่ยนรหัสผ่านใหม่เพื่อความปลอดภัยของข้อมูล!',
                        icon: 'warning',
                        confirmButtonText: 'เปลี่ยนรหัสผ่าน',
                        allowOutsideClick: false
                    }).then(() => {
                        navigate('/chgpasswd');
                    });
                    return;
                }
            }

            navigate('/');
        } catch (err) {
            console.error(err);
            // ให้ error message ชัดเจนขึ้น
            if (err.message === 'Invalid role selected for this user') {
                setError('ระดับการใช้งานที่เลือกไม่ตรงกับบัญชีของคุณ ลองเลือกระดับอื่น หรือเว้นว่างไว้เพื่อให้ระบบตรวจอัตโนมัติ');
            } else if (err.message === 'Invalid credentials') {
                setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่ หรือกดปุ่ม "ลืมรหัสผ่าน" เพื่อรีเซ็ตรหัสผ่าน');
            } else {
                setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้รับการยืนยันจากแอดมิน');
            }
        }
    };

    const handleUserChange = (e) => {
        const val = e.target.value;
        if (/^[\d-]/.test(val)) {
            setLoginData(prev => ({ ...prev, user: formatThaiId(val) }));
        } else {
            setLoginData(prev => ({ ...prev, user: val }));
        }
    };

    const handleChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const isIdInput = /^[\d-]/.test(loginData.user || '');
    const idInfo = isIdInput ? getThaiIdInfo(loginData.user) : null;

    return (
        <div className="hold-transition login-page pace-primary" style={{ minHeight: '100vh' }}>
            <div className="login-box">
                <div className="login-logo">
                    <img src="/images/obec.png" width="125" alt="OBEC Logo" /><br />
                </div>
                {error && (
                    <div className="alert alert-danger alert-dismissable">
                        <button type="button" className="close" onClick={() => setError('')}>&times;</button>
                        <i className="fas fa-exclamation-triangle mr-1"></i> {error}
                    </div>
                )}
                <div className="card">
                    <div className="card-body login-card-body">
                        <h4 className="login-box-msg text-danger">เข้าสู่ระบบ</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group mb-1">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="เลขประจำตัวประชาชน 13 หลัก"
                                    name="user"
                                    value={loginData.user}
                                    onChange={handleUserChange}
                                    required
                                    autoFocus
                                />
                                <div className="input-group-append">
                                    <div className="input-group-text">
                                        <span className="fas fa-user"></span>
                                    </div>
                                </div>
                            </div>
                            {idInfo && idInfo.length > 0 && (
                                <div className="mb-2 pl-1 small">
                                    {idInfo.isComplete && idInfo.isValid && (
                                        <span className="text-success font-weight-bold">
                                            <i className="fas fa-check-circle mr-1"></i>เลขประจำตัวประชาชนถูกต้อง
                                        </span>
                                    )}
                                    {idInfo.isComplete && !idInfo.isValid && (
                                        <span className="text-warning font-weight-bold">
                                            <i className="fas fa-triangle-exclamation mr-1"></i>เลขบัตรไม่ถูกต้องตามหลักตรวจสอบ
                                        </span>
                                    )}
                                    {!idInfo.isComplete && (
                                        <span className="text-muted">
                                            <i className="fas fa-id-card mr-1"></i>ระบุแล้ว {idInfo.length}/13 หลัก
                                        </span>
                                    )}
                                </div>
                            )}
                            {(!idInfo || idInfo.length === 0) && <div className="mb-2"></div>}
                            <div className="input-group mb-3">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="รหัสผ่าน (วันเกิด YYYYMMDD เช่น 19820930)"
                                    name="password"
                                    value={loginData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <div className="input-group-append">
                                    <button
                                        type="button"
                                        className="btn input-group-text"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                            <div className="input-group mb-3">
                                <select
                                    name="level"
                                    className="custom-select form-control"
                                    onChange={handleChange}
                                    value={loginData.level}
                                >
                                    <option value="">ตรวจอัตโนมัติ (ไม่ต้องเลือกก็ได้)</option>
                                    <option value="teacher">ครูผู้สอน</option>
                                    <option value="headdepartment">หัวหน้ากลุ่มสาระโรงเรียน</option>
                                    <option value="admin_school">ผู้ดูแลระบบสถานศึกษา (School Admin)</option>
                                    <option value="directorschool">ผู้อำนวยการโรงเรียน/รองผู้อำนวยการ</option>
                                    <option value="chairman">ประธานสหวิทยาเขต</option>
                                    <option value="supervision">ผู้นิเทศ</option>
                                    <option value="supervisor">ศึกษานิเทศ</option>
                                    <option value="districdirector">ผู้อำนวยการเขต/รอง ผอ. เขต</option>
                                    <option value="admin">ผู้ดูแลระบบเขตพื้นที่ (Admin เขต)</option>
                                </select>
                            </div>



                            <div className="row">
                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary btn-block">
                                        <span className="fas fa-lock"></span> เข้าสู่ระบบ
                                    </button>
                                    <a href="/register" className="btn btn-danger btn-block" style={{ marginTop: '5px' }}>
                                        <i className="fas fa-user-plus"></i> บุคลากรลงทะเบียน
                                    </a>
                                    <button 
                                        type="button" 
                                        className="btn btn-warning btn-block" 
                                        style={{ marginTop: '5px' }}
                                        onClick={() => setShowForgotModal(true)}
                                    >
                                        <i className="fas fa-key"></i> ลืมรหัสผ่าน? (รีเซ็ตเอง)
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Login Help */}
                        <div className="mt-3 p-2 bg-light rounded border" style={{ fontSize: '0.82rem' }}>
                            <p className="mb-1 font-weight-bold text-info"><i className="fas fa-info-circle mr-1"></i> วิธีเข้าสู่ระบบ</p>
                            <p className="mb-1">• <strong>ชื่อผู้ใช้:</strong> เลขประจำตัวประชาชน 13 หลัก</p>
                            <p className="mb-1">• <strong>รหัสผ่าน:</strong> วันเกิด ค.ศ. <code>YYYYMMDD</code> (เช่น <code>19820930</code>) หรือ วันเกิด พ.ศ. <code>DDMMYYYY</code> (เช่น <code>30092525</code>)</p>
                            <p className="mb-0">• <strong>ระดับ:</strong> ตรวจอัตโนมัติ (ไม่ต้องเลือกก็ได้)</p>
                        </div>
                    </div>
                </div>

                {/* Banner Download */}
                <div className="row mt-3 text-center">
                    <div className="col-4 px-1">
                        <a href="https://img2.pic.in.th/2078e38cfd7ff5093.jpg" target="_blank" rel="noopener noreferrer">
                            <img src="/images/manual1.jpg" alt="คู่มือครู" className="img-fluid rounded shadow-sm border hover-zoom" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                        </a>
                    </div>
                    <div className="col-4 px-1">
                        <a href="https://img1.pic.in.th/images/4924ed7f823622c84.jpg" target="_blank" rel="noopener noreferrer">
                            <img src="/images/manual2.jpg" alt="คู่มือผู้นิเทศ" className="img-fluid rounded shadow-sm border hover-zoom" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                        </a>
                    </div>
                    <div className="col-4 px-1">
                        <a href="https://drive.google.com/file/d/1Q2x2mGiqbTy_O5J8sQGohyvBODhfzPG-/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                            <img src="/images/manual3.jpg" alt="คู่มือผู้บริหารสถานศึกษา" className="img-fluid rounded shadow-sm border hover-zoom" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                        </a>
                    </div>
                </div>

                <div className="mt-4 text-center text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.9 }}>
                    <div className="mb-3">
                        <h6 className="font-weight-bold mb-1" style={{ color: '#555' }}>ระบบนิเทศการศึกษาแบบออนไลน์</h6>
                        <div className="small text-muted" style={{ letterSpacing: '0.5px' }}>Online Educational Supervision System</div>
                        <div className="small text-muted">The Secondary Educational Service Area Office Phitsanulok Uttaradit</div>
                    </div>

                    <div className="mb-3">
                        <span className="badge badge-light border px-3 py-2 text-muted" style={{ fontSize: '0.85rem' }}>
                            <i className="fas fa-building mr-2"></i> สพม.พิษณุโลก อุตรดิตถ์
                        </span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', width: '60%', margin: '0 auto 15px auto' }}></div>

                    <p className="mb-0 small text-muted">
                        <span className="mr-3"><i className="fas fa-code-branch mr-1"></i> Version 0.11 &copy; {new Date().getFullYear()}</span>
                    </p>
                    <p className="mb-0 small">
                        <span className="text-muted mr-1">Developed by</span>
                        <span className="font-weight-bold" style={{ color: '#444' }}>ดร.อิทธิพงษ์ ตั้งสกุลเรืองไล</span>
                    </p>
                    <p className="small text-muted" style={{ fontSize: '0.75rem' }}>
                        ศึกษานิเทศก์ชำนาญการพิเศษ
                    </p>
                </div>
            </div>

            {/* Forgot Password Modal - Auto Reset */}
            {showForgotModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-warning">
                                <h5 className="modal-title font-weight-bold"><i className="fas fa-key"></i> รีเซ็ตรหัสผ่าน (Self-Service)</h5>
                                <button type="button" className="close" onClick={closeForgotModal}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {!forgotResult ? (
                                    <form onSubmit={handleForgotSubmit}>
                                        <div className="alert alert-info small mb-3">
                                            <i className="fas fa-info-circle mr-1"></i>
                                            ยืนยันตัวตนด้วยเลขประจำตัวประชาชนและวันเกิด ระบบจะรีเซ็ตรหัสผ่านให้ทันที
                                        </div>
                                        <div className="form-group mb-3">
                                            <label>กรอกเลขประจำตัวประชาชน 13 หลัก</label>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-lg mb-1" 
                                                value={forgotId} 
                                                onChange={(e) => setForgotId(formatThaiId(e.target.value))}
                                                required 
                                                autoFocus
                                                placeholder="X-XXXX-XXXXX-XX-X"
                                            />
                                            {forgotId && (
                                                <div className="small mb-2 pl-1">
                                                    {getThaiIdInfo(forgotId).isComplete && getThaiIdInfo(forgotId).isValid && (
                                                        <span className="text-success font-weight-bold">
                                                            <i className="fas fa-check-circle mr-1"></i>เลขประจำตัวประชาชนถูกต้อง
                                                        </span>
                                                    )}
                                                    {getThaiIdInfo(forgotId).isComplete && !getThaiIdInfo(forgotId).isValid && (
                                                        <span className="text-warning font-weight-bold">
                                                            <i className="fas fa-triangle-exclamation mr-1"></i>เลขบัตรไม่ถูกต้องตามหลักตรวจสอบ
                                                        </span>
                                                    )}
                                                    {!getThaiIdInfo(forgotId).isComplete && (
                                                        <span className="text-muted">
                                                            ระบุแล้ว {getThaiIdInfo(forgotId).length}/13 หลัก
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <label className="mt-2">วัน/เดือน/ปีเกิด <span className="text-danger small">(ค.ศ. ที่ใช้ลงทะเบียน)</span></label>
                                            <input 
                                                type="date" 
                                                className="form-control form-control-lg" 
                                                value={forgotDob} 
                                                onChange={(e) => setForgotDob(e.target.value)}
                                                required 
                                            />
                                        </div>
                                        {forgotError && <div className="alert alert-danger"><i className="fas fa-exclamation-triangle"></i> {forgotError}</div>}
                                        <button type="submit" className="btn btn-danger btn-block btn-lg" disabled={forgotLoading || cleanThaiId(forgotId).length !== 13 || !forgotDob}>
                                            {forgotLoading ? 'กำลังดำเนินการ...' : <span><i className="fas fa-sync-alt"></i> รีเซ็ตรหัสผ่าน</span>}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="alert alert-success shadow-sm mb-0">
                                        <h5 className="alert-heading border-bottom pb-2 mb-3 text-success"><i className="fas fa-check-circle"></i> รีเซ็ตรหัสผ่านสำเร็จ!</h5>
                                        <p className="mb-2"><strong>ชื่อ-สกุล:</strong> {forgotResult.name}</p>
                                        <p className="mb-2"><strong>โรงเรียน:</strong> {forgotResult.school}</p>
                                        <hr />
                                        <div className="text-center mt-3">
                                            <p className="text-muted small mb-1">รหัสผ่านใหม่ของคุณคือ <strong>วันเกิด (ค.ศ.)</strong></p>
                                            <h3 className="text-danger mb-1 font-weight-bold" style={{ letterSpacing: '3px' }}>{forgotResult.newPassword}</h3>
                                            <p className="text-muted small">(รูปแบบ YYYYMMDD เช่น 19820930)</p>
                                        </div>
                                        <div className="alert alert-warning small mt-2 mb-0">
                                            <i className="fas fa-lightbulb mr-1"></i>
                                            <strong>แนะนำ:</strong> หลังเข้าสู่ระบบ ควรเปลี่ยนรหัสผ่านใหม่เพื่อความปลอดภัย
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                {forgotResult && (
                                    <button type="button" className="btn btn-success" onClick={() => { closeForgotModal(); setLoginData({...loginData, user: formatThaiId(forgotId), password: forgotResult.newPassword}); }}>
                                        <i className="fas fa-sign-in-alt mr-1"></i> นำไปเข้าสู่ระบบ
                                    </button>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={closeForgotModal}>ปิดหน้าต่าง</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;
