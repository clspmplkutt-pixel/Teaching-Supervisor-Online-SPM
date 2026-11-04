import React, { useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PendingWorkAlert from '../components/PendingWorkAlert';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { moduleLabels } from '../config/roleModules';

const humanizeModule = (moduleName) => {
  if (!moduleName) return 'หน้าหลัก';
  const fromMap = moduleLabels[moduleName];
  if (fromMap) return fromMap;
  return moduleName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

// Pages that render their own full-width custom Hero/Title Banner
const CUSTOM_HERO_MODULES = new Set([
  'info',
  'admin_monitor',
  'supervision_summary',
  'Plan_scoring',
]);

const AppLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed');
  }, []);

  // Automatically close mobile sidebar overlay whenever route changes
  useEffect(() => {
    if (window.innerWidth < 992 && document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      document.body.classList.add('sidebar-collapse');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light">
        <img src="/images/obec.png" alt="LMSS" height="64" width="64" className="mb-3" />
        <div className="spinner-border text-primary spinner-border-sm" role="status" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pathParts = location.pathname.split('/').filter(Boolean);
  const moduleName = pathParts[0] || 'info';
  const pageTitle = humanizeModule(moduleName);

  // Role-Based Route Protection
  const roleId = user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
  const isAdminOrRoot = roleId === 'admin' || roleId === 'root';
  const isAdminSchool = roleId === 'admin_school';

  const schoolAdminAllowedModules = new Set([
    'info',
    'supervision_summary',
    'confirmUser',
    'userteacher',
    'userheadDepartment',
    'teacher_edit',
    'reset_user_password',
    'nominate_evaluator',
    'editprofile',
    'chgpasswd',
  ]);

  const adminOnlyModules = new Set([
    'userteacher',
    'userdirectorschool',
    'userheadDepartment',
    'userchairman',
    'usersupervisor',
    'usersupervision',
    'userDistricDirector',
    'userSchoolAdmin',
    'confirmUser',
    'approve_evaluator',
    'checkupUser',
    'checkupUserduplicate',
    'ManageUserAdmin',
    'UserAdmin_Add',
    'UserAdmin_Edit',
    'UserAdmin_Chgpwd',
    'change_position',
    'reset_user_password',
    'khet',
    'khet_add',
    'khet_edit',
    'school',
    'school_add',
    'school_edit',
    'school_size',
    'schoolsize_edit',
    'teacher_edit',
    'directorschool_edit',
    'supervisor_edit',
    'dd_edit',
    'importDMC',
    'budget_year',
    'education_year',
    'prefix',
    'gender',
    'person_position_type',
    'person_type',
    'academic_standing',
    'education_level',
    'teach_subject',
    'subject_type',
    'grade_level',
    'tbl_config',
    'ability21',
    'competency',
    'desirable',
    'learningModel',
    'learningModel_add',
    'learningModel_edit',
    'strands',
    'strands_add',
    'strands_edit',
    'content_standards',
    'content_standards_add',
    'content_standards_edit',
    'indicators',
    'indicators_add',
    'indicators_edit',
    'type_benchmarks',
    'policy_side',
    'policy_number',
    'policy_items',
    'log',
    'profile',
  ]);

  if (adminOnlyModules.has(moduleName)) {
    if (isAdminSchool && schoolAdminAllowedModules.has(moduleName)) {
      // Allowed for school admin
    } else if (!isAdminOrRoot) {
      return <Navigate to="/" replace />;
    }
  }

  const showStandardHeader = !CUSTOM_HERO_MODULES.has(moduleName);

  return (
    <NotificationProvider>
      <div className="wrapper">
        <Header />
        <Sidebar />

        <div className="content-wrapper">
          {showStandardHeader && (
            <div className="content-header pb-2">
              <div className="container-fluid">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <h1 className="m-0" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
                    {pageTitle}
                  </h1>
                  <ol className="breadcrumb m-0 bg-transparent p-0 small">
                    <li className="breadcrumb-item">
                      <Link to="/" className="text-primary">
                        <i className="fa-solid fa-house mr-1"></i>หน้าหลัก
                      </Link>
                    </li>
                    <li className="breadcrumb-item active text-muted">{pageTitle}</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          <section className={`content ${!showStandardHeader ? 'pt-3' : ''}`}>
            <div className="container-fluid">
              <PendingWorkAlert />
              <Outlet />
            </div>
          </section>
        </div>

        <Footer />
        <BottomNav />
      </div>
    </NotificationProvider>
  );
};

export default AppLayout;
