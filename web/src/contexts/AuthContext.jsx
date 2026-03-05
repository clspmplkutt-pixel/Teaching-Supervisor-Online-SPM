/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CryptoJS from 'crypto-js';
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
                    if (mounted) {
                        setUser(session?.user ?? null);
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
                    setUser(session?.user ?? null);
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
            // 1. Encrypt Password
            // PHP: hash('sha256', 'PNS2AREA') -> hex string (64 chars). AES-256 takes 32 bytes.
            const secret_key = 'PNS2AREA';
            const secret_iv = 'SyS4School';

            const keyHash = CryptoJS.SHA256(secret_key).toString(CryptoJS.enc.Hex);
            const ivHash = CryptoJS.SHA256(secret_iv).toString(CryptoJS.enc.Hex);

            // Use CryptoJS Utf8 parse to treat the hex string slice as the key bytes
            const key = CryptoJS.enc.Utf8.parse(keyHash.substring(0, 32));
            const iv = CryptoJS.enc.Utf8.parse(ivHash.substring(0, 16));

            const encryptedPass = CryptoJS.AES.encrypt(password, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }).toString();


            // 2. Select Table based on Level
            // Note: Supabase table names preserve case, use exact names from database
            let table = 'tbl_Users'; // Default for teachers etc. (U uppercase)
            let userCol = 'people_id';

            if (level === 'admin' || level === 'root') {
                table = 'tbl_user'; // Admin table (u lowercase)
                userCol = 'user';
            }

            // 3. Query Supabase — ลองทั้ง JS format (single base64) และ PHP format (double base64)
            const encryptedJS = encryptLegacyPassword(password);   // JS: single base64
            const encryptedPHP = encryptLegacyPasswordPHP(password); // PHP: double base64

            console.log('🔍 Login Debug Info:');
            console.log('  - Table:', table, '| Column:', userCol, '| User:', email);
            console.log('  - JS  format:', encryptedJS);
            console.log('  - PHP format:', encryptedPHP);

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

            console.log('📊 Query Result:', { data, error });

            if (error) {
                console.error("Legacy Login Error:", error);
                // Fallback to standar auth if table login fails? No, strict mode.
                throw error;
            }

            if (data) {
                // Security Check: Verify that the user's database level matches the selected role
                if (table === 'tbl_Users' && data.level && data.level !== level) {
                    console.error('❌ Role mismatch. User is', data.level, 'but tried to login as', level);
                    throw new Error('Invalid role selected for this user');
                }

                // Success!
                console.log('✅ Login successful!');
                // Map legacy user data to session-like object
                const userData = {
                    id: data.id,
                    email: email, // or data.email
                    user_metadata: {
                        name: data.name + ' ' + (data.lastname || ''),
                        role: data.level || level,
                        people_id: data.people_id || email,
                        school: data.school || null
                    },
                    level_id: data.level || level
                };
                setUser(userData);

                return data;
            } else {
                console.error('❌ No matching user found in database');
                // Let's also try to query without password to see if user exists
                const { data: userCheck } = await supabase
                    .from(table)
                    .select('*')
                    .eq(userCol, email)
                    .maybeSingle();

                if (userCheck) {
                    console.log('👤 User exists but password mismatch');
                    console.log('  - Stored password:', userCheck.passwd);
                    console.log('  - Tried password:', encryptedPass);
                } else {
                    console.log('👤 User not found with username:', email);
                }

                throw new Error('Invalid credentials');
            }

        } catch (err) {
            console.error("Login Failed:", err);
            throw err;
        }
    };

    const logout = async () => {
        const storageUrl = String(supabase.storageUrl || '');
        const isPlaceholder = !storageUrl || storageUrl.includes('placeholder.supabase.co');

        if (isPlaceholder) {
            setUser(null);
            navigate('/login');
            return;
        }

        await supabase.auth.signOut();
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
                <img className="animation__shake" src="/images/obec.png" alt="PNS2" height="60" width="60" />
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
