/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword, encryptLegacyPasswordPHP } from '../utils/legacyCrypto';
import { findUsersByPeopleId, matchUserPassword, pickBestMatch } from '../utils/userLookup';
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

            let table = 'tbl_Users';
            let userCol = 'people_id';

            if (level === 'admin' || level === 'root' || cleanEmail === 'admin' || cleanEmail === 'root') {
                table = 'tbl_user';
                userCol = 'user';
            }

            console.log('🔍 Login Debug Info:');
            console.log('  - Table:', table, '| Column:', userCol, '| User:', cleanEmail);

            let data = null;
            let error = null;

            if (table === 'tbl_user') {
                // Admin accounts: exact password match only (JS or PHP format)
                const encryptedJS = encryptLegacyPassword(cleanPassword);
                const encryptedPHP = encryptLegacyPasswordPHP(cleanPassword);
                ({ data, error } = await supabase
                    .from(table).select('*')
                    .eq(userCol, cleanEmail).eq('passwd', encryptedJS).maybeSingle());
                if (!data && !error) {
                    ({ data, error } = await supabase
                        .from(table).select('*')
                        .eq(userCol, cleanEmail).eq('passwd', encryptedPHP).maybeSingle());
                }
            } else {
                // Teacher accounts: tolerate duplicate IDs and IDs stored as 12 digits
                const { data: rows, error: lookupError } = await findUsersByPeopleId(supabase, cleanEmail);
                error = lookupError;
                if (!error) {
                    if (rows.length > 1) console.warn(`⚠️ ${rows.length} accounts share people_id ${cleanEmail}`);
                    const matched = rows
                        .map((r) => ({ row: r, how: matchUserPassword(r, cleanPassword) }))
                        .filter((m) => m.how);
                    const best = pickBestMatch(matched.map((m) => m.row), cleanPassword);
                    if (best) {
                        data = best;
                        const how = matched.find((m) => m.row.id === best.id)?.how;
                        console.log(`✅ Password matched (${how})`);
                        // Normalise the default password to YYYYMMDD (ค.ศ.) for this account only
                        if (how === 'birthday' && best.birthday) {
                            const newEncrypted = encryptLegacyPassword(String(best.birthday).replace(/-/g, ''));
                            await supabase.from(table).update({ passwd: newEncrypted }).eq('id', best.id);
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
                    // Use the stored ID so later queries match this exact DB record
                    email: table === 'tbl_Users' ? (data.people_id || cleanEmail) : email,
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
