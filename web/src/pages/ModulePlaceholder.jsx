import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { allModules, roleModules, moduleLabels } from '../config/roleModules';

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
  const { user } = useAuth();
  const roleId = getRoleId(user);
  const moduleName = moduleOverride || params.module || 'info';

  const roleAllowed = roleModules[roleId] || [];
  const isKnownModule = allModules.includes(moduleName);
  const isAllowedForRole = roleAllowed.includes(moduleName);

  const pageTitle = humanizeModule(moduleName) || moduleName;

  return (
    <div className="module-placeholder">
      <div className="card card-primary">
        <div className="card-header">
          <h3 className="card-title">{pageTitle}</h3>
        </div>
        <div className="card-body">
          <p className="mb-2"><strong>สถานะ:</strong> หน้านี้เป็นเพลซโฮลเดอร์</p>
          <p className="mb-2"><strong>บทบาท:</strong> {roleId}</p>
          <p className="mb-2"><strong>โมดูล:</strong> {moduleName}</p>
          <p className="mb-2"><strong>อ้างอิงไฟล์เดิม:</strong> <code>_pages/{roleId}/{moduleName}.php</code></p>

          {!isKnownModule && (
            <div className="alert alert-warning mt-3">
              โมดูลนี้ไม่พบในรายการทั้งหมด โปรดตรวจสอบชื่อโมดูล
            </div>
          )}

          {isKnownModule && !isAllowedForRole && (
            <div className="alert alert-warning mt-3">
              บทบาทนี้อาจไม่ได้รับสิทธิ์เข้าถึงหน้านี้ตามโครงสร้างเดิม
            </div>
          )}

          <div className="mt-3">
            <Link to="/" className="btn btn-outline-primary btn-sm">กลับหน้าหลัก</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
