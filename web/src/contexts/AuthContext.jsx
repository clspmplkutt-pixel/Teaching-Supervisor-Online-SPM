/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword, encryptLegacyPasswordPHP } from '../utils/legacyCrypto';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        // *** AUTH CHECK ***
        const checkUser = async () => {
            try {
                // If the URL is just placeholder, we don't try to query Supabase
                // Safe check: supabase.storageUrl might be undefined or empty
                const storageUrl = String(supabase.storageUrl || '');
                const isPlaceholder = !storageUrl || storageUrl.includes('placeholder.supabase.co');

                if (isPlaceholder) {
                    console.warn("Supabase keys not configured. Running in Demo Mode.");
                } else {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        if (mounted) setUser(session.user);
                    } else {
                        const savedUser = localStorage.getItem('lmss_user_session');
                        if (savedUser) {
                            try {
                                if (mounted) setUser(JSON.parse(savedUser));
                            } catch {
                                localStorage.removeItem('lmss_user_session');
                            }
                        } else if (mounted) {
                            setUser(null);
                        }
                    }
                }

                if (mounted) setLoading(false);
            } catch (error) {
                console.error("Auth check error:", error);
                if (mounted) setLoading(false);
            }
        };

        checkUser();

        // Skip listener if in demo/placeholder mode
        const storageUrl = String(supabase.storageUrl || '');
        const isPlaceholder = !storageUrl || storageUrl.includes('placeholder.supabase.co');
        let listener = null;

        if (!isPlaceholder) {
            const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                    } else {
                        const savedUser = localStorage.getItem('lmss_user_session');
                        if (savedUser) {
                            try {
                                setUser(JSON.parse(savedUser));
                            } catch {
                                setUser(null);
                            }
                        } else {
                            setUser(null);
                        }
                    }
                    setLoading(false);
                }
            });
            listener = data;
        }

        return () => {
            mounted = false;
            if (listener?.subscription) listener.subscription.unsubscribe();
        };
    }, []);

    const login = async (email, password, level) => {
        const storageUrl = String(supabase.storageUrl || '');
        const isPlaceholder = !storageUrl || storageUrl.includes('placeholder.supabase.co');

        // *** DEMO LOGIN ***
        if (isPlaceholder) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Allow 'admin' / 'Riupky45!' specifically for demo
            if (email === 'admin' && password === 'Riupky45!') {
                const mockRef = { id: 1, user: 'admin', name: 'Administrator', level_id: 'admin' };
                setUser(mockRef);
                return mockRef;
            }

            // Always succeed in demo mode for other inputs (fallback)
            const mockUser = {
                id: 'demo-user-123',
                email: email,
                user_metadata: {
                    name: 'Demo User',
                    role: level || 'teacher'
                }
            };
            setUser(mockUser);
            navigate('/');
            return { user: mockUser, session: {} };
        }

        // *** LEGACY SYSTEM LOGIN (Match PHP Logic) ***
        try {

            // ลองทั้ง JS format (single base64) และ PHP format (double base64)
            const encryptedJS = encryptLegacyPassword(password);
            const encryptedPHP = encryptLegacyPasswordPHP(password);

            let table = 'tbl_Users';
            let userCol = 'people_id';

            if (level === 'admin' || level === 'root') {
                table = 'tbl_user';
                userCol = 'user';
            }

            console.log('🔍 Login Debug Info:');
            console.log('  - Table:', table, '| Column:', userCol, '| User:', email);

            // ลองด้วย JS format ก่อน
            let { data, error } = await supabase
                .from(table).select('*')
                .eq(userCol, email).eq('passwd', encryptedJS).maybeSingle();

            // ถ้าไม่เจอ ลองด้วย PHP format (user เก่าที่ migrate มา)
            if (!data && !error) {
                ({ data, error } = await supabase
                    .from(table).select('*')
                    .eq(userCol, email).eq('passwd', encryptedPHP).maybeSingle());
                if (data) console.log('✅ Matched PHP format (double base64)');
            } else if (data) {
                console.log('✅ Matched JS format (single base64)');
            }

            // ถ้ายังไม่เจอ ลอง convert password format เผื่อผู้ใช้ป้อนแบบเก่า
            // เช่น ผู้ใช้ป้อน DDMMYYYY (พ.ศ.) แต่ระบบ Reset เป็น YYYYMMDD (ค.ศ.)
            if (!data && !error && table === 'tbl_Users') {
                // ดึง user ข้อมูลมาเช็ค birthday
                const { data: userRec } = await supabase
                    .from(table).select('*')
                    .eq(userCol, email).maybeSingle();

                if (userRec && userRec.birthday) {
                    const bday = String(userRec.birthday).replace(/-/g, '');
                    // สร้างรหัสทุกรูปแบบที่เป็นไปได้จากวันเกิด
                    const bdParts = String(userRec.birthday).split('-');
                    if (bdParts.length === 3) {
                        const yyyy = bdParts[0];
                        const mm = bdParts[1];
                        const dd = bdParts[2];
                        const thaiYear = String(parseInt(yyyy, 10) + 543);
                        
                        const possiblePasswords = [
                            bday,                       // YYYYMMDD ค.ศ. (19820930)
                            `${dd}${mm}${thaiYear}`,    // DDMMYYYY พ.ศ. (30092525) - format เก่า
                            `${dd}${mm}${yyyy}`,        // DDMMYYYY ค.ศ. (30091982)
                        ];

                        // ถ้า password ที่ผู้ใช้กรอกตรงกับรูปแบบใดรูปแบบหนึ่ง → ปล่อยเข้า
                        if (possiblePasswords.includes(password)) {
                            data = userRec;
                            console.log('✅ Matched via birthday format conversion');
                            
                            // อัพเดทรหัสผ่านให้เป็น format ใหม่ (YYYYMMDD ค.ศ.)
                            const newEncrypted = encryptLegacyPassword(bday);
                            await supabase.from(table).update({ passwd: newEncrypted }).eq(userCol, email);
                            console.log('🔄 Auto-migrated password to new format');
                        }
                    }
                }
            }

            console.log('📊 Query Result:', { found: !!data, error });

            if (error) {
                console.error("Legacy Login Error:", error);
                throw error;
            }

            if (data) {
                // ตรวจสอบว่ายังไม่ได้อนุมัติ
                if (table === 'tbl_Users' && String(data.register_isConfirm) === '0') {
                    throw new Error('Account not confirmed');
                }

                // Check if user is an evaluator
                let is_evaluator = false;
                const roleId = data.level || level;
                if (roleId === 'districdirector' || roleId === 'supervisor' || roleId === 'admin' || roleId === 'root') {
                    is_evaluator = true;
                } else if (table === 'tbl_Users' && data.people_id) {
                    const { data: nomData } = await supabase
                        .from('tbl_EvaluatorNominations')
                        .select('id')
                        .eq('nominee_people_id', data.people_id)
                        .eq('status', 'approved')
                        .maybeSingle();
                    if (nomData) is_evaluator = true;
                }

                // Security Check: Verify that the user's database level matches the selected role
                // Skip this check if level was auto-detected (the Login page already resolved it)
                if (table === 'tbl_Users' && data.level && data.level !== level && level) {
                    // Allow login as 'supervision' (ผู้นิเทศ) if the user has evaluator rights
                    const isAllowedEvaluatorLogin = (level === 'supervision' && is_evaluator);
                    // Allow login as 'teacher' if user has level === 'admin_school'
                    const isAllowedAdminSchoolTeacherLogin = (data.level === 'admin_school' && level === 'teacher');
                    // Allow login as 'headdepartment' if user is a teacher with headDepartment flag
                    const isAllowedHeadDeptLogin = (data.level === 'teacher' && level === 'headdepartment' && String(data.headDepartment) === '1');
                    
                    if (!isAllowedEvaluatorLogin && !isAllowedAdminSchoolTeacherLogin && !isAllowedHeadDeptLogin) {
                        console.error('❌ Role mismatch. User is', data.level, 'but tried to login as', level);
                        throw new Error('Invalid role selected for this user');
                    }
                }

                // Success!
                console.log('✅ Login successful!');
                
                // Determine the effective role for this session
                const currentRole = (data.level === 'admin_school' && level === 'teacher') ? 'teacher'
                    : (data.level === 'teacher' && level === 'headdepartment' && String(data.headDepartment) === '1') ? 'headdepartment'
                    : (data.level || level);

                // Map legacy user data to session-like object
                const userData = {
                    id: data.id,
                    email: email, // or data.email
                    user_metadata: {
                        name: data.name + ' ' + (data.lastname || ''),
                        role: currentRole,
                        people_id: data.people_id || email,
                        school: data.school || null,
                        is_evaluator: is_evaluator
                    },
                    level_id: currentRole,
                    is_evaluator: is_evaluator
                };
                try {
                    localStorage.setItem('lmss_user_session', JSON.stringify(userData));
                } catch (e) {
                    console.warn('Could not save session to localStorage', e);
                }
                setUser(userData);

                return data;
            } else {
                console.error('❌ No matching user found in database');
                throw new Error('Invalid credentials');
            }

        } catch (err) {
            console.error("Login Failed:", err);
            throw err;
        }
    };

    const logout = async () => {
        try {
            localStorage.removeItem('lmss_user_session');
        } catch {}

        const storageUrl = String(supabase.storageUrl || '');
        const isPlaceholder = !storageUrl || storageUrl.includes('placeholder.supabase.co');

        if (isPlaceholder) {
            setUser(null);
            navigate('/login');
            return;
        }

        try {
            await supabase.auth.signOut();
        } catch {}
        setUser(null);
        navigate('/login');
    };

    const value = {
        user,
        login,
        logout,
        loading
    };

    if (loading) {
        // Show loading spinner while checking auth
        return (
            <div className="preloader flex-column justify-content-center align-items-center" style={{ height: '100vh', display: 'flex' }}>
                <img className="animation__shake" src="/images/obec.png" alt="LMSS" height="60" width="60" />
                <p className="mt-2">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
