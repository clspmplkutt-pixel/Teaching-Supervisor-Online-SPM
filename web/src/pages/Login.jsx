import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [loginData, setLoginData] = useState({
        user: '',
        password: '',
        level: ''
    });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(loginData.user, loginData.password, loginData.level);
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
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Banner Download */}
                <div className="row mt-3 text-center">
                    <div className="col-4 px-1">
                        <a href="https://drive.google.com/file/d/1sXUxzEqs4aFMq0Ca2rmlAOoo3Dd-s08N/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                            <img src="https://img5.pic.in.th/file/secure-sv1/26fbc408351b05058.jpg" alt="คู่มือครู" className="img-fluid rounded shadow-sm border hover-zoom" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                        </a>
                    </div>
                    <div className="col-4 px-1">
                        <a href="https://drive.google.com/file/d/1BYrvVIMwNmPkDWg22X05PDd1Wy77hjCD/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                            <img src="https://img5.pic.in.th/file/secure-sv1/448f891ead28ce35d.jpg" alt="คู่มือผู้นิเทศ" className="img-fluid rounded shadow-sm border hover-zoom" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                        </a>
                    </div>
                    <div className="col-4 px-1">
                        <a href="https://drive.google.com/file/d/1Q2x2mGiqbTy_O5J8sQGohyvBODhfzPG-/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                            <img src="https://img2.pic.in.th/683ef849b5b649b4a.jpg" alt="คู่มือผู้บริหารสถานศึกษา" className="img-fluid rounded shadow-sm border hover-zoom" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
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
        </div>
    );
}

export default Login;
