
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import CryptoJS from 'crypto-js';

const Register = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1 Data
    const [peopleId, setPeopleId] = useState('');
    const [peopleIdError, setPeopleIdError] = useState('');
    const [isIdValid, setIsIdValid] = useState(false);

    // Step 2 Data & Form State
    const [formData, setFormData] = useState({
        prefix: '',
        name: '',
        lastname: '',
        gender: '',
        birthday: '', // Will handle Thai date format conversion
        edu_level: '',
        phone: '',
        email: '',
        persontype_id: '',
        position_id: '',
        academic_id: '',
        school: '',
        teach_subject: '',
        headDepartment: '0',
        teach_subject_name: '',
        teach_level: ''
    });

    // Dropdown Data
    const [options, setOptions] = useState({
        prefixes: [],
        genders: [],
        eduLevels: [],
        personTypes: [],
        positions: [],
        academics: [],
        schools: [],
        studyGroups: [],
        gradeLevels: []
    });

    // Validates Thai National ID
    const checkID = (id) => {
        if (id.length !== 13) return false;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseFloat(id.charAt(i)) * (13 - i);
        }
        if ((11 - sum % 11) % 10 !== parseFloat(id.charAt(12))) return false;
        return true;
    };

    // Handle People ID Input (Step 1)
    const handlePeopleIdChange = async (e) => {
        const val = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
        if (val.length > 13) return;
        setPeopleId(val);

        if (val.length === 13) {
            if (checkID(val)) {
                // Check duplication in DB
                setLoading(true);
                const { data } = await supabase
                    .from('tbl_Users')
                    .select('id')
                    .eq('people_id', val)
                    .maybeSingle();
                setLoading(false);

                if (data) {
                    setPeopleIdError('เป็นสมาชิกอยู่แล้ว ไม่สามารถสมัครได้');
                    setIsIdValid(false);
                } else {
                    setPeopleIdError('เลขประจำตัวประชาชนถูกต้อง'); // Success message handled in UI
                    setIsIdValid(true);
                }
            } else {
                setPeopleIdError('เลขประจำตัวประชาชนไม่ถูกต้อง');
                setIsIdValid(false);
            }
        } else {
            setPeopleIdError('');
            setIsIdValid(false);
        }
    };

    // Load Dropdown Data (on mount)
    useEffect(() => {
        const fetchOptions = async () => {
            // Helper for parallel fetching
            const fetchTable = (table, orderCol) =>
                supabase.from(table).select('*').order(orderCol, { ascending: true });

            const [
                prefixRes, genderRes, eduRes, personTypeRes,
                posRes, acadRes, schoolRes, subjRes, gradeRes
            ] = await Promise.all([
                fetchTable('tbl_system_prefix', 'id'),
                fetchTable('tbl_system_gender', 'id'),
                fetchTable('tbl_system_EducationLevel', 'id'),
                fetchTable('tbl_system_PersonType', 'persontype_id'),
                fetchTable('tbl_system_PersonPositionType', 'position_id'),
                fetchTable('tbl_system_Academic_Standing', 'academic_id'),
                fetchTable('tbl_school', 'school_name'),
                fetchTable('tbl_system_Teach_Subject', 'teach_subject_id'),
                fetchTable('tbl_system_GradeLevel', 'grade_level_id')
            ]);

            setOptions({
                prefixes: prefixRes.data || [],
                genders: genderRes.data || [],
                eduLevels: eduRes.data || [],
                personTypes: personTypeRes.data || [],
                positions: posRes.data || [],
                academics: acadRes.data || [],
                schools: schoolRes.data || [],
                studyGroups: subjRes.data || [],
                gradeLevels: gradeRes.data || []
            });
        };
        fetchOptions();
    }, []);

    // Handle Step 1 Submit
    const handleNextStep = () => {
        if (isIdValid) setStep(2);
    };

    // Handle Step 2 Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Determine Level based on Position (Logic from register_2.php)
            let level = 'teacher';
            let school = formData.school;
            const posId = parseInt(formData.position_id);

            // Logic map from PHP
            // 10001, 10000, 10999 -> teacher (already default)
            // 10006, 10007 -> directorschool
            if ([10006, 10007].includes(posId)) level = 'directorschool';
            // 10008, 10009 -> districdirector (school fixed to 1000650001)
            if ([10008, 10009].includes(posId)) {
                level = 'districdirector';
                school = '1000650001';
            }
            // 10010 -> supervisor (school fixed to 1000650001)
            if (posId === 10010) {
                level = 'supervisor';
                school = '1000650001';
            }

            // 2. Encrypt Password (DDMMYYYY from Birthday)
            // Assuming input is YYYY-MM-DD (standard date input) -> convert to DDMMYYYY
            // Note: PHP uses Thai date input, so we might need to adjust logic if we use standard date input.
            // Let's assume standard YYYY-MM-DD input for now.
            const dateParts = formData.birthday.split('-');
            const pwdRaw = `${dateParts[2]}${dateParts[1]}${parseInt(dateParts[0]) + 543}`; // DDMMYYYY (Thai Year)

            // Encryption Logic (Same as Login)
            const secret_key = 'PNS2AREA';
            const secret_iv = 'SyS4School';
            const keyHash = CryptoJS.SHA256(secret_key).toString(CryptoJS.enc.Hex);
            const ivHash = CryptoJS.SHA256(secret_iv).toString(CryptoJS.enc.Hex);
            const key = CryptoJS.enc.Utf8.parse(keyHash.substring(0, 32));
            const iv = CryptoJS.enc.Utf8.parse(ivHash.substring(0, 16));

            const encryptedPass = CryptoJS.AES.encrypt(pwdRaw, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }).toString();

            // 3. Insert to Supabase
            const { error } = await supabase.from('tbl_Users').insert([{
                people_id: peopleId,
                prefix: formData.prefix,
                name: formData.name,
                lastname: formData.lastname,
                persontype_id: formData.persontype_id,
                position_id: formData.position_id,
                academic_id: formData.academic_id,
                gender: formData.gender,
                birthday: formData.birthday, // Store as YYYY-MM-DD
                passwd: encryptedPass,
                school: school,
                edu_level: formData.edu_level,
                headDepartment: formData.headDepartment,
                chairman: "0",
                teach_subject: formData.teach_subject,
                teach_subject_name: formData.teach_subject_name,
                teach_level: formData.teach_level,
                phone: formData.phone,
                email: formData.email,
                level: level,
                register_isConfirm: 0,
                register_date: new Date().toISOString()
            }]);

            if (error) throw error;

            alert('สมัครสมาชิกสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติ');
            navigate('/login');

        } catch (err) {
            console.error("Registration Error:", err);
            alert('เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" style={{ minHeight: '100vh', justifyContent: 'flex-start' }}>
            <div className="container-fluid bg-primary text-white text-center p-3 mb-5" style={{ width: '100%' }}>
                <h1><i className="fas fa-user-pen fa-xl"></i> สมัครสมาชิก</h1>
            </div>

            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-header bg-success text-white">
                                <h4 className="card-title m-0">สมัครสมาชิก (คุณครู)</h4>
                            </div>
                            <div className="card-body">
                                {step === 1 ? (
                                    /* STEP 1: ID Card Check */
                                    <div className="mb-3 mt-3">
                                        <label htmlFor="people_id" className="form-label">เลขประจำตัวประชาชน **
                                            <span className={isIdValid ? "text-success ml-2" : "text-danger ml-2"}>
                                                {peopleIdError}
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${isIdValid ? 'is-valid' : peopleIdError ? 'is-invalid' : ''}`}
                                            id="people_id"
                                            value={peopleId}
                                            onChange={handlePeopleIdChange}
                                            placeholder="กรอกเลข 13 หลัก"
                                        />
                                    </div>
                                ) : (
                                    /* STEP 2: Full Form */
                                    <form onSubmit={handleSubmit}>
                                        <div className="mb-3">
                                            <label className="form-label">เลขประจำตัวประชาชน</label>
                                            <input type="text" className="form-control" value={peopleId} readOnly disabled />
                                        </div>

                                        <div className="row">
                                            <div className="col-lg-2 mb-3">
                                                <label>คำนำหน้า</label>
                                                <select name="prefix" className="form-control" required onChange={handleChange}>
                                                    <option value="">คำนำหน้า</option>
                                                    {options.prefixes.map(opt => (
                                                        <option key={opt.prefix_id || opt.id} value={opt.prefix_id || opt.id}>{opt.prefix}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-lg-5 mb-3">
                                                <label>ชื่อ</label>
                                                <input type="text" name="name" className="form-control" required onChange={handleChange} />
                                            </div>
                                            <div className="col-lg-5 mb-3">
                                                <label>นามสกุล</label>
                                                <input type="text" name="lastname" className="form-control" required onChange={handleChange} />
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-lg-4 mb-3">
                                                <label>เพศ</label>
                                                <select name="gender" className="form-control" required onChange={handleChange}>
                                                    <option value="">เพศ</option>
                                                    {options.genders.map(opt => (
                                                        <option key={opt.gender_id || opt.id} value={opt.gender_id || opt.id}>{opt.gender}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-lg-4 mb-3">
                                                <label>วันเกิด</label>
                                                <input type="date" name="birthday" className="form-control" required onChange={handleChange} />
                                                <small className="text-danger">รหัสผ่านจะเป็น วว/ดด/พ.ศ. (เช่น 19072522)</small>
                                            </div>
                                            <div className="col-lg-4 mb-3">
                                                <label>วุฒิการศึกษาสูงสุด</label>
                                                <select name="edu_level" className="form-control" required onChange={handleChange}>
                                                    <option value="">วุฒิการศึกษาสูงสุด</option>
                                                    {options.eduLevels.map(opt => (
                                                        <option key={opt.educationlevel_id || opt.id} value={opt.educationlevel_id || opt.id}>{opt.educationlevel_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-lg-6 mb-3">
                                                <label>เบอร์โทรศัพท์</label>
                                                <input type="text" name="phone" className="form-control" required onChange={handleChange} />
                                            </div>
                                            <div className="col-lg-6 mb-3">
                                                <label>Email</label>
                                                <input type="email" name="email" className="form-control" required onChange={handleChange} />
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-lg-4 mb-3">
                                                <label>ประเภทบุคลากร</label>
                                                <select name="persontype_id" className="form-control" required onChange={handleChange}>
                                                    <option value="">ประเภทบุคลากร</option>
                                                    {options.personTypes.map(opt => (
                                                        <option key={opt.persontype_id || opt.id} value={opt.persontype_id || opt.id}>{opt.persontype_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-lg-4 mb-3">
                                                <label>ตำแหน่ง</label>
                                                <select name="position_id" className="form-control" required onChange={handleChange}>
                                                    <option value="">ตำแหน่ง</option>
                                                    {options.positions.map(opt => (
                                                        <option key={opt.position_id || opt.id} value={opt.position_id || opt.id}>{opt.position_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-lg-4 mb-3">
                                                <label>วิทยฐานะ</label>
                                                <select name="academic_id" className="form-control" required onChange={handleChange}>
                                                    <option value="">วิทยฐานะ</option>
                                                    {options.academics.map(opt => (
                                                        <option key={opt.academic_id || opt.id} value={opt.academic_id || opt.id}>{opt.academic_standing}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-lg-4 mb-3">
                                                <label>โรงเรียน</label>
                                                <select name="school" className="form-control" required={!['10008', '10009', '10010'].includes(formData.position_id)} disabled={['10008', '10009', '10010'].includes(formData.position_id)} onChange={handleChange}>
                                                    <option value="">โรงเรียน</option>
                                                    {options.schools.map(opt => (
                                                        <option key={opt.school_id || opt.id} value={opt.school_id || opt.id}>{opt.school_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-lg-4 mb-3">
                                                <label>กลุ่มสาระ</label>
                                                <select name="teach_subject" className="form-control" required={!['10008', '10009', '10010'].includes(formData.position_id)} onChange={handleChange}>
                                                    <option value="">กลุ่มสาระ</option>
                                                    {options.studyGroups.map(opt => (
                                                        <option key={opt.teach_subject_id || opt.id} value={opt.teach_subject_id || opt.id}>{opt.teach_subject}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-lg-4 mb-3">
                                                <label>หัวหน้ากลุ่มสาระ</label>
                                                <select name="headDepartment" className="form-control" onChange={handleChange}>
                                                    <option value="0">ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                                                    <option value="1">เป็นหัวหน้ากลุ่มสาระ</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-lg-4 mb-3">
                                                <label>วิชาที่ทำการสอน</label>
                                                <input type="text" name="teach_subject_name" className="form-control" onChange={handleChange} />
                                            </div>
                                            <div className="col-lg-4 mb-3">
                                                <label>ระดับชั้นที่ทำการสอน</label>
                                                <select name="teach_level" className="form-control" onChange={handleChange}>
                                                    <option value="">ระดับชั้นที่ทำการสอน</option>
                                                    {options.gradeLevels.map(opt => (
                                                        <option key={opt.grade_level_id || opt.id} value={opt.grade_level_id || opt.id}>{opt.grade_level_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-lg-4 pt-4 text-right">
                                                <button type="submit" className="btn btn-success mr-2" disabled={loading}>
                                                    <i className="fas fa-save"></i> สมัครสมาชิก
                                                </button>
                                                <Link to="/" className="btn btn-danger">ยกเลิก</Link>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                            {step === 1 && (
                                <div className="card-footer text-center">
                                    <button
                                        className="btn btn-success mr-2"
                                        disabled={!isIdValid || loading}
                                        onClick={handleNextStep}
                                    >
                                        <i className="fas fa-user-pen"></i> ต่อไป
                                    </button>
                                    <Link to="/login" className="btn btn-danger"><i className="fas fa-ban"></i> ยกเลิก</Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
