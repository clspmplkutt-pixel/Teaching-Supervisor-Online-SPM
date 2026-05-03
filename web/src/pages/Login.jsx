import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { decryptLegacyPassword } from '../utils/legacyCrypto';
import Swal from 'sweetalert2';

const Login = () => {
    const [loginData, setLoginData] = useState({
        user: '',
        password: '',
        level: ''
    });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotId, setForgotId] = useState('');
    const [forgotDob, setForgotDob] = useState('');
    const [forgotInfo, setForgotInfo] = useState(null);
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotInfo(null);
        setForgotLoading(true);

        try {
            const { data: user, error } = await supabase
                .from('tbl_Users')
                .select('*')
                .eq('people_id', forgotId)
                .maybeSingle();

            if (error) throw error;

            if (!user) {
                setForgotError('ไม่พบข้อมูลผู้ใช้งานนี้ในระบบ หรือพิมพ์เลขประจำตัวผิด');
            } else {
                const checkBirthdayMatch = (dbDate, inputDate) => {
                    if (!dbDate || !inputDate) return false;
                    
                    // Normalize: trim whitespace and handle potential '/' separators
                    const normalizeDate = (d) => d.trim().replace(/\//g, '-');
                    const dbNorm = normalizeDate(dbDate);
                    const inNorm = normalizeDate(inputDate);
                    
                    // Direct match
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
                    
                    // Tolerance for Buddhist Era vs Christian Era (543 years shift)
                    return dbY === inY || Math.abs(dbY - inY) === 543;
                };

                if (!checkBirthdayMatch(user.birthday, forgotDob)) {
                    setForgotError('วัน/เดือน/ปีเกิด ไม่ตรงกับข้อมูลในระบบ');
                } else {
                let schoolName = 'ไม่ระบุ';
                if (user.school) {
                    const { data: sData } = await supabase.from('tbl_school').select('school_name').eq('school_id', user.school).maybeSingle();
                    if (sData) schoolName = sData.school_name;
                }
                
                let positionName = 'ไม่ระบุ';
                if (user.position_id) {
                    const { data: pData } = await supabase.from('tbl_system_PersonPositionType').select('position_name').eq('position_id', user.position_id).maybeSingle();
                    if (pData) positionName = pData.position_name;
                }

                let prefixName = '';
                if (user.prefix) {
                    const { data: preData } = await supabase.from('tbl_system_prefix').select('prefix').eq('prefix_id', user.prefix).maybeSingle();
                    if (preData) prefixName = preData.prefix;
                }

                const decryptedPass = decryptLegacyPassword(user.passwd);

                setForgotInfo({
                    name: `${prefixName}${user.name} ${user.lastname}`,
                    position: positionName,
                    school: schoolName,
                    password: decryptedPass || 'ไม่สามารถถอดรหัสได้ (กรุณาติดต่อแอดมินเพื่อรีเซ็ต)'
                });
                }
            }
        } catch (err) {
            console.error(err);
            setForgotError('เกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูล');
        } finally {
            setForgotLoading(false);
        }
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotId('');
        setForgotDob('');
        setForgotInfo(null);
        setForgotError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await login(loginData.user, loginData.password, loginData.level);
            
            // Check default password logic (DDMMYYYY or 123456)
            if (data && data.birthday) {
                const defaultPass = data.birthday.split('-').reverse().join('');
                if (loginData.password === defaultPass || loginData.password === '123456' || loginData.password === data.people_id) {
                    Swal.fire({
                        title: 'คำแนะนำด้านความปลอดภัย',
                        text: 'รหัสผ่านของคุณคาดเดาได้ง่ายเกินไป กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัยของข้อมูล!',
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
            setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้รับการยืนยันจากแอดมิน !');
            console.error(err);
        }
    };

    const handleChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    return (
        <div className="hold-transition login-page pace-primary" style={{ minHeight: '100vh' }}>
            <div className="login-box">
                <div className="login-logo">
                    <img src="/images/obec.png" width="125" alt="OBEC Logo" /><br />
                </div>
                {error && (
                    <div className="alert alert-danger alert-dismissable">
                        <button type="button" className="close" onClick={() => setError('')}>&times;</button>
                        {error}
                    </div>
                )}
                <div className="card">
                    <div className="card-body login-card-body">
                        <h4 className="login-box-msg text-danger">เข้าสู่ระบบ</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group mb-3">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="ชื่อผู้ใช้"
                                    name="user"
                                    value={loginData.user}
                                    onChange={handleChange}
                                    required
                                    autoFocus
                                />
                                <div className="input-group-append">
                                    <div className="input-group-text">
                                        <span className="fas fa-user"></span>
                                    </div>
                                </div>
                            </div>
                            <div className="input-group mb-3">
                                <input
                                    type="password"
                                    className="form-control"
                                    placeholder="รหัสผ่าน"
                                    name="password"
                                    value={loginData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <div className="input-group-append">
                                    <div className="input-group-text">
                                        <span className="fas fa-lock"></span>
                                    </div>
                                </div>
                            </div>
                            <div className="input-group mb-3">
                                <select
                                    name="level"
                                    className="custom-select form-control" // Added form-control for better BS5 compat if needed
                                    onChange={handleChange}
                                    value={loginData.level}
                                    required
                                >
                                    <option value="">เลือกระดับการใช้งาน</option>
                                    <option value="teacher">ครูผู้สอน</option>
                                    <option value="headdepartment">หัวหน้ากลุ่มสาระโรงเรียน</option>
                                    <option value="directorschool">ผู้อำนวยการโรงเรียน/รองผู้อำนวยการ</option>
                                    <option value="chairman">ประธานสหวิทยาเขต</option>
                                    <option value="supervision">ผู้นิเทศ</option>
                                    <option value="supervisor">ศึกษานิเทศ</option>
                                    <option value="districdirector">ผู้อำนวยการเขต/รอง ผอ. เขต</option>
                                    <option value="admin">ผู้ดูแลระบบ</option>
                                    {/* Root is usually hidden or debug only, omitting for standard user view unless requested */}
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
                                        <i className="fas fa-question-circle"></i> ลืมรหัสผ่าน?
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Banner Download */}
                <div className="row mt-3 text-center">
                    <div className="col-4 px-1">
                        <a href="https://drive.google.com/file/d/1sXUxzEqs4aFMq0Ca2rmlAOoo3Dd-s08N/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                            <img src="/images/manual1.jpg" alt="คู่มือครู" className="img-fluid rounded shadow-sm border hover-zoom" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                        </a>
                    </div>
                    <div className="col-4 px-1">
                        <a href="https://drive.google.com/file/d/1BYrvVIMwNmPkDWg22X05PDd1Wy77hjCD/view?usp=sharing" target="_blank" rel="noopener noreferrer">
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
                        <span className="mr-3"><i className="fas fa-code-branch mr-1"></i> Version 0.10 &copy; {new Date().getFullYear()}</span>
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

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-warning">
                                <h5 className="modal-title font-weight-bold"><i className="fas fa-key"></i> ค้นหารหัสผ่านของคุณ</h5>
                                <button type="button" className="close" onClick={closeForgotModal}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {!forgotInfo ? (
                                    <form onSubmit={handleForgotSubmit}>
                                        <div className="form-group mb-3">
                                            <label>กรอกเลขประจำตัวประชาชน 13 หลัก</label>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-lg mb-2" 
                                                value={forgotId} 
                                                onChange={(e) => setForgotId(e.target.value.replace(/[^0-9]/g, ''))}
                                                maxLength="13"
                                                required 
                                                autoFocus
                                                placeholder="เลข 13 หลัก"
                                            />
                                            <label>วัน/เดือน/ปีเกิด <span className="text-danger small">(ที่ใช้ลงทะเบียน)</span></label>
                                            <input 
                                                type="date" 
                                                className="form-control form-control-lg" 
                                                value={forgotDob} 
                                                onChange={(e) => setForgotDob(e.target.value)}
                                                required 
                                            />
                                        </div>
                                        {forgotError && <div className="alert alert-danger"><i className="fas fa-exclamation-triangle"></i> {forgotError}</div>}
                                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={forgotLoading || forgotId.length !== 13 || !forgotDob}>
                                            {forgotLoading ? 'กำลังค้นหา...' : <span><i className="fas fa-search"></i> ค้นหาข้อมูล</span>}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="alert alert-success shadow-sm">
                                        <h5 className="alert-heading border-bottom pb-2 mb-3 text-success"><i className="fas fa-check-circle"></i> พบข้อมูลของคุณ</h5>
                                        <p className="mb-2"><strong>ชื่อ-สกุล:</strong> {forgotInfo.name}</p>
                                        <p className="mb-2"><strong>ตำแหน่ง:</strong> {forgotInfo.position}</p>
                                        <p className="mb-2"><strong>โรงเรียน:</strong> {forgotInfo.school}</p>
                                        <hr />
                                        <div className="text-center mt-3">
                                            <span className="text-muted small">รหัสผ่านของคุณคือ</span>
                                            <h3 className="text-danger mb-0 mt-1 font-weight-bold" style={{ letterSpacing: '2px' }}>{forgotInfo.password}</h3>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                {forgotInfo && (
                                    <button type="button" className="btn btn-success" onClick={() => { closeForgotModal(); setLoginData({...loginData, user: forgotId}); }}>
                                        นำไปเข้าสู่ระบบ
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
