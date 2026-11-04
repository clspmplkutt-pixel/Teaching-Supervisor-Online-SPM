import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { allModules, roleModules, moduleLabels, roleLabels } from '../config/roleModules';

const humanizeModule = (moduleName) => {
  if (!moduleName) return '';
  const fromMap = moduleLabels[moduleName];
  if (fromMap) return fromMap;
  return moduleName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
};

const ModulePlaceholder = ({ moduleOverride }) => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleId = getRoleId(user);
  const moduleName = moduleOverride || params.module || 'info';

  const roleAllowed = roleModules[roleId] || [];
  const isKnownModule = allModules.includes(moduleName);
  const isAllowedForRole = roleAllowed.includes(moduleName);

  const pageTitle = humanizeModule(moduleName) || 'ไม่พบหน้าที่ต้องการ';
  const roleTitle = roleLabels[roleId] || roleId;

  const isRestricted = isKnownModule && !isAllowedForRole;

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-9 col-lg-7 col-xl-6">
          <div
            className="card border-0 shadow-sm text-center"
            style={{ borderRadius: '18px', overflow: 'hidden' }}
          >
            <div
              className="py-2"
              style={{
                background: isRestricted
                  ? 'linear-gradient(90deg, #f59e0b, #ea580c)'
                  : 'linear-gradient(90deg, #2563eb, #4f46e5)',
              }}
            />
            <div className="card-body p-4 p-sm-5">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
                style={{
                  width: '76px',
                  height: '76px',
                  backgroundColor: isRestricted ? '#fffbeb' : '#eef2ff',
                  color: isRestricted ? '#d97706' : '#4f46e5',
                  fontSize: '2rem',
                }}
              >
                <i className={`fa-solid ${isRestricted ? 'fa-shield-halved' : 'fa-compass-drafting'}`} />
              </div>

              <h4 className="font-weight-bold text-dark mb-2">
                {isRestricted
                  ? 'บัญชีของคุณไม่มีสิทธิ์เข้าถึงเมนูนี้'
                  : 'ไม่พบหน้าที่ต้องการ หรือฟีเจอร์นี้กำลังพัฒนา'}
              </h4>

              <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: 1.65 }}>
                {isRestricted ? (
                  <>
                    เมนู <strong>{pageTitle}</strong> สงวนสิทธิ์เฉพาะผู้ใช้งานบางบทบาท
                    ปัจจุบันคุณกำลังใช้งานในสิทธิ์ <strong>{roleTitle}</strong>
                  </>
                ) : (
                  <>
                    ไม่พบหน้าจอ <strong>{pageTitle}</strong> ที่คุณเปิดเรียก หรือระบบกำลังปรับปรุงฟีเจอร์นี้ให้สมบูรณ์ยิ่งขึ้น
                    กรุณาตรวจสอบลิงก์อีกครั้ง หรือกลับไปยังหน้าหลักของระบบ
                  </>
                )}
              </p>

              <div className="d-flex justify-content-center flex-wrap" style={{ gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn btn-outline-secondary font-weight-bold px-4 py-2"
                  style={{ borderRadius: '10px' }}
                >
                  <i className="fa-solid fa-arrow-left mr-2" />
                  ย้อนกลับ
                </button>
                <Link
                  to="/"
                  className="btn btn-primary font-weight-bold px-4 py-2 shadow-sm"
                  style={{ borderRadius: '10px' }}
                >
                  <i className="fa-solid fa-house mr-2" />
                  กลับหน้าหลัก
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
