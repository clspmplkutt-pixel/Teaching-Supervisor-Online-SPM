import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
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

const AppLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed', 'layout-footer-fixed', 'pace-minimal');
    return () => {
      // Cleanup if needed
    };
  }, []);

  if (loading) {
    return (
      <div className="preloader flex-column justify-content-center align-items-center">
        <img className="animation__shake" src="/images/obec.png" alt="PNS2" height="60" width="60" />
      </div>
    );
  }

  if (!user && !loading) {
    return <Navigate to="/login" replace />;
  }

  const pathParts = location.pathname.split('/').filter(Boolean);
  const moduleName = pathParts[0] || 'info';
  const pageTitle = humanizeModule(moduleName);

  // Security: Protect admin-only routes from other roles
  const roleId = user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
  const isAdminOrRoot = roleId === 'admin' || roleId === 'root';

  const adminOnlyModules = [
    'userteacher', 'userdirectorschool', 'userheadDepartment', 'userchairman',
    'usersupervisor', 'usersupervision', 'userDistricDirector', 'confirmUser',
    'checkupUser', 'checkupUserduplicate', 'ManageUserAdmin', 'UserAdmin_Add',
    'UserAdmin_Edit', 'UserAdmin_Chgpwd', 'change_position', 'khet', 'school',
    'teacher_edit', 'directorschool_edit', 'supervisor_edit', 'dd_edit', 'user_remove',
    'resetPwd', 'updatepwd', 'importDMC'
  ];

  if (adminOnlyModules.includes(moduleName) && !isAdminOrRoot) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="wrapper">
      <Header />
      <Sidebar />

      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">{pageTitle}</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active">{pageTitle}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <section className="content">
          <div className="container-fluid">
            <Outlet />
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default AppLayout;
