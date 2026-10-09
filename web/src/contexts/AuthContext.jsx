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
            const cleanPassword = String(password || '').trim();
            const cleanEmail = String(email || '').trim().replace(/[-\s]/g, '');

            // ลองทั้ง JS format (single base64) และ PHP format (double base64)
            const encryptedJS = encryptLegacyPassword(cleanPassword);
            const encryptedPHP = encryptLegacyPasswordPHP(cleanPassword);

            let table = 'tbl_Users';
            let userCol = 'people_id';

            if (level === 'admin' || level === 'root' || cleanEmail === 'admin' || cleanEmail === 'root') {
                table = 'tbl_user';
                userCol = 'user';
            }

            console.log('🔍 Login Debug Info:');
            console.log('  - Table:', table, '| Column:', userCol, '| User:', cleanEmail);

            // ลองด้วย JS format ก่อน
            let { data, error } = await supabase
                .from(table).select('*')
                .eq(userCol, cleanEmail).eq('passwd', encryptedJS).maybeSingle();

            // ถ้าไม่เจอ ลองด้วย PHP format (user เก่าที่ migrate มา)
            if (!data && !error) {
                ({ data, error } = await supabase
                    .from(table).select('*')
                    .eq(userCol, cleanEmail).eq('passwd', encryptedPHP).maybeSingle());
                if (data) console.log('✅ Matched PHP format (double base64)');
            } else if (data) {
                console.log('✅ Matched JS format (single base64)');
            }

            // ถ้ายังไม่เจอ ลอง convert password format เผื่อผู้ใช้ป้อนแบบยืดหยุ่น
            // เช่น ผู้ใช้ป้อน DDMMYYYY (พ.ศ.), DD/MM/YYYY, YYYY-MM-DD, เลขบัตร 13 หลัก หรือ 123456
            if (!data && !error && table === 'tbl_Users') {
                const { data: userRec } = await supabase
                    .from(table).select('*')
                    .eq(userCol, cleanEmail).maybeSingle();

                if (userRec) {
                    let isMatched = false;
                    const bday = userRec.birthday ? String(userRec.birthday).replace(/-/g, '') : '';
                    
                    if (userRec.birthday) {
                        const digitsOnly = cleanPassword.replace(/\D/g, '');
                        const bdParts = String(userRec.birthday).split('-');
                        
                        if (bdParts.length === 3) {
                            const yyyy = bdParts[0];
                            const mm = bdParts[1];
                            const dd = bdParts[2];
                            const m = String(parseInt(mm, 10));
                            const d = String(parseInt(dd, 10));
                            const thaiYear = String(parseInt(yyyy, 10) + 543);

                            const possibleDigitForms = new Set([
                                `${yyyy}${mm}${dd}`,      // YYYYMMDD ค.ศ. (19760201)
                                `${thaiYear}${mm}${dd}`,  // YYYYMMDD พ.ศ. (25190201)
                                `${dd}${mm}${thaiYear}`,  // DDMMYYYY พ.ศ. (01022519)
                                `${dd}${mm}${yyyy}`,      // DDMMYYYY ค.ศ. (01021976)
                                `${d}${mm}${thaiYear}`,   // DMMYYYY พ.ศ. (1022519)
                                `${d}${m}${thaiYear}`,    // DMYYYY พ.ศ. (122519)
                                `${d}${mm}${yyyy}`,       // DMMYYYY ค.ศ. (1021976)
                                `${d}${m}${yyyy}`,        // DMYYYY ค.ศ. (121976)
                            ]);

                            const rawVariations = new Set([
                                `${dd}/${mm}/${thaiYear}`, `${d}/${m}/${thaiYear}`, `${d}/${mm}/${thaiYear}`, `${dd}/${m}/${thaiYear}`,
                                `${dd}-${mm}-${thaiYear}`, `${d}-${m}-${thaiYear}`, `${d}-${mm}-${thaiYear}`,
                                `${dd}.${mm}.${thaiYear}`, `${d}.${m}.${thaiYear}`,
                                `${yyyy}-${mm}-${dd}`, `${yyyy}/${mm}/${dd}`,
                                `${thaiYear}-${mm}-${dd}`, `${thaiYear}/${mm}/${dd}`,
                            ]);

                            if (possibleDigitForms.has(digitsOnly) || rawVariations.has(cleanPassword)) {
                                isMatched = true;
                            }
                        }
                    }

                    // Default fallbacks for users logging in with ID or default password
                    if (!isMatched) {
                        if (userRec.people_id && (cleanPassword === userRec.people_id || cleanPassword.replace(/\D/g, '') === userRec.people_id)) {
                            isMatched = true;
                        } else if (cleanPassword === '123456') {
                            isMatched = true;
                        }
                    }

                    if (isMatched) {
                        data = userRec;
                        console.log('✅ Matched via flexible birthday / default credentials');

                        // อัพเดทรหัสผ่านให้เป็น format มาตรฐาน (YYYYMMDD ค.ศ.)
                        if (bday) {
                            const newEncrypted = encryptLegacyPassword(bday);
                            await supabase.from(table).update({ passwd: newEncrypted }).eq(userCol, cleanEmail);
                            console.log('🔄 Auto-migrated password to standard format');
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

                // Security Check & Safe Role Fallback:
                // Verify that the user's database level matches the requested role
                let effectiveRole = data.level || level || 'teacher';
                if (table === 'tbl_Users' && level) {
                    const isAllowedEvaluatorLogin = (level === 'supervision' && is_evaluator);
                    const isAllowedAdminSchoolTeacherLogin = (data.level === 'admin_school' && level === 'teacher');
                    const isAllowedHeadDeptLogin = (data.level === 'teacher' && level === 'headdepartment' && String(data.headDepartment) === '1');

                    if (level === data.level) {
                        effectiveRole = data.level;
                    } else if (isAllowedEvaluatorLogin) {
                        effectiveRole = 'supervision';
                    } else if (isAllowedAdminSchoolTeacherLogin) {
                        effectiveRole = 'teacher';
                    } else if (isAllowedHeadDeptLogin) {
                        effectiveRole = 'headdepartment';
                    } else {
                        // User selected a role not assigned to them; gracefully fallback to their authorized role in DB
                        console.warn(`⚠️ User is ${data.level} but selected ${level}. Gracefully falling back to authorized role: ${data.level || 'teacher'}`);
                        effectiveRole = data.level || 'teacher';
                    }
                }

                // Success!
                console.log('✅ Login successful!');
                
                // Map legacy user data to session-like object
                const userData = {
                    id: data.id,
                    email: email, // or data.email
                    user_metadata: {
                        name: data.name + ' ' + (data.lastname || ''),
                        role: effectiveRole,
                        people_id: data.people_id || cleanEmail,
                        school: data.school || null,
                        is_evaluator: is_evaluator
                    },
                    level_id: effectiveRole,
                    is_evaluator: is_evaluator
                };
                try {
                    localStorage.setItem('lmss_user_session', JSON.stringify(userData));
                } catch (e) {
                    console.warn('Could not save session to localStorage', e);
                }
                setUser(userData);

                // Update lastlogin timestamp
                try {
                    await supabase.from(table).update({ lastlogin: new Date().toISOString() }).eq('id', data.id);
                } catch (e) {
                    console.warn('Could not update lastlogin:', e);
                }

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
