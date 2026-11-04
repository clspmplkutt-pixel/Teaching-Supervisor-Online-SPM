import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  roleModules,
  roleMenuSections,
  adminMenuGroups,
  moduleLabels,
  moduleIcons,
  roleLabels,
} from '../config/roleModules';
import { useNotificationContext } from '../contexts/NotificationContext';

const humanizeModule = (moduleName) => {
  if (moduleLabels[moduleName]) return moduleLabels[moduleName];
  return moduleName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

const getRoleId = (user) =>
  user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';

const SUBMENU_SUFFIXES = [
  '_add',
  '_edit',
  '_remove',
  '_set',
  'Admin_Add',
  'Admin_Edit',
  'Admin_Chgpwd',
  '_scoring',
  'statusplan_clip',
];

const isSubmenuPage = (moduleName) =>
  SUBMENU_SUFFIXES.some((suffix) => moduleName.endsWith(suffix));

const SidebarRole = () => {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const location = useLocation();
  const notif = useNotificationContext();
  const roleId = getRoleId(user);

  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    adminMenuGroups.forEach((g) => {
      initial[g.id] = Boolean(g.defaultOpen);
    });
    return initial;
  });

  const closeMobileSidebar = () => {
    if (window.innerWidth < 992 && document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      document.body.classList.add('sidebar-collapse');
    }
  };

  const getModuleBadgeCount = (moduleName) => {
    if (!notif) return 0;
    if (moduleName === 'statusplan') {
      return (notif.teacherRejectedCount || 0) + (notif.teacherNeedClipCount || 0);
    }
    if (moduleName === 'Plan_Check') {
      return roleId === 'directorschool'
        ? notif.directorPendingCount || 0
        : notif.committeePendingCount || 0;
    }
    if (moduleName === 'confirmUser') return notif.adminPendingUsersCount || 0;
    if (moduleName === 'approve_evaluator') return notif.adminPendingEvaluatorsCount || 0;
    return 0;
  };

  const isActive = (path) => {
    if (path === '/' || path.toLowerCase() === '/info') {
      return location.pathname === '/' || location.pathname.toLowerCase() === '/info';
    }
    return location.pathname.toLowerCase() === path.toLowerCase();
  };

  const isEvaluator = Boolean(user?.is_evaluator || user?.user_metadata?.is_evaluator);

  // All permitted modules for this role (for search)
  const allPermittedModules = useMemo(() => {
    const list = [...(roleModules[roleId] || [])];
    if (isEvaluator && !['supervision', 'supervisor', 'chairman'].includes(roleId)) {
      ['Plan_Check', 'Plan_scoring'].forEach((m) => {
        if (!list.includes(m)) list.push(m);
      });
    }
    return list.filter((m) => !isSubmenuPage(m));
  }, [roleId, isEvaluator]);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return allPermittedModules.filter((m) => {
      const label = humanizeModule(m).toLowerCase();
      return label.includes(trimmedQuery) || m.toLowerCase().includes(trimmedQuery);
    });
  }, [allPermittedModules, trimmedQuery]);

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async (e) => {
    if (e) e.preventDefault();
    const result = await Swal.fire({
      title: 'ออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบ LMSS Online ใช่หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      logout();
    }
  };

  const renderMenuLink = (moduleName, compact = false) => {
    const badgeCount = getModuleBadgeCount(moduleName);
    const targetPath = moduleName === 'info' ? '/' : `/${moduleName}`;
    const active = isActive(targetPath);
    const label = humanizeModule(moduleName);
    const icon = moduleIcons[moduleName] || 'nav-icon far fa-circle text-muted';

    return (
      <li className="nav-item" key={moduleName}>
        <Link
          to={targetPath}
          onClick={closeMobileSidebar}
          className={`nav-link ${active ? 'active' : ''}`}
          style={compact ? { paddingLeft: '1.5rem', fontSize: '0.84rem' } : undefined}
          title={label}
        >
          <i className={`${icon} nav-icon`}></i>
          <p className="d-flex align-items-center justify-content-between m-0 w-100">
            <span className="sidebar-link-text">{label}</span>
            {badgeCount > 0 && (
              <span
                className="badge badge-danger ml-auto font-weight-bold"
                style={{ fontSize: '10px', borderRadius: '10px', padding: '3px 7px' }}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </p>
        </Link>
      </li>
    );
  };

  // User Profile details
  const displayName = profile?.name
    ? `${profile.name} ${profile.lastname || ''}`.trim()
    : user?.user_metadata?.name || user?.name || 'ผู้ใช้งานระบบ';
  const roleTitle = roleLabels[roleId] || roleId;
  const userInitials = displayName ? displayName.charAt(0) : 'U';
  const schoolOrOrg = profile?.school_name || 'สพม.พิษณุโลก อุตรดิตถ์';

  // Sections for non-admin roles
  const currentSections = useMemo(() => {
    const rawSections = roleMenuSections[roleId] || [];
    const sections = rawSections.map((sec) => ({
      ...sec,
      items: sec.items.filter((m) => !isSubmenuPage(m)),
    }));

    // If evaluator and not already in supervision roles, inject evaluator section
    if (isEvaluator && !['supervision', 'supervisor', 'chairman'].includes(roleId)) {
      const alreadyHasPlanCheck = sections.some((s) => s.items.includes('Plan_Check'));
      if (!alreadyHasPlanCheck) {
        sections.splice(1, 0, {
          title: 'งานคณะกรรมการประเมิน',
          icon: 'fa-solid fa-clipboard-check text-warning',
          items: ['Plan_Check', 'Plan_scoring'],
        });
      }
    }
    return sections;
  }, [roleId, isEvaluator]);

  return (
    <>
      <div className="sidebar pt-2">
        {/* ── User Profile Identity Card in Sidebar ── */}
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">
            {userInitials}
          </div>
          <div className="d-flex flex-column" style={{ minWidth: 0, flex: 1 }}>
            <span className="sidebar-user-name" title={displayName}>
              {displayName}
            </span>
            <span className="sidebar-user-role" title={schoolOrOrg}>
              <span className="sidebar-online-dot"></span>
              <span className="text-truncate">{roleTitle}</span>
            </span>
          </div>
        </div>

        {/* ── Live Quick Search Box ── */}
        <div className="px-1 mb-2">
          <div className="input-group input-group-sm">
            <input
              className="form-control form-control-sidebar"
              type="search"
              placeholder="ค้นหาเมนู..."
              aria-label="ค้นหาเมนู"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                borderRadius: '8px 0 0 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.84rem',
              }}
            />
            <div className="input-group-append">
              <button
                className="btn btn-sidebar"
                type="button"
                onClick={() => searchQuery && setSearchQuery('')}
                style={{
                  borderRadius: '0 8px 8px 0',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                }}
                aria-label="ล้างคำค้นหา"
              >
                <i className={`fas ${searchQuery ? 'fa-times' : 'fa-search'} fa-fw`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* ── Navigation Tree ── */}
        <nav className="mt-1 pb-3">
          <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
            {/* Search Filter Active */}
            {trimmedQuery ? (
              searchResults.length === 0 ? (
                <li className="px-3 py-4 text-center text-muted small">
                  <i className="fa-regular fa-folder-open d-block mb-2 fa-2x"></i>
                  ไม่พบเมนูที่ตรงกับ "{searchQuery}"
                </li>
              ) : (
                <>
                  <li className="sidebar-section-header">
                    <i className="fa-solid fa-magnifying-glass text-info mr-1"></i>
                    ผลการค้นหา ({searchResults.length})
                  </li>
                  {searchResults.map((m) => renderMenuLink(m, false))}
                </>
              )
            ) : roleId === 'admin' ? (
              /* District Admin Accordion Menu */
              adminMenuGroups.map((group) => {
                const hasActiveChild = group.items.some((m) => isActive(m === 'info' ? '/' : `/${m}`));
                const isOpen = openGroups[group.id] || hasActiveChild;
                const groupBadge = group.items.reduce((sum, m) => sum + getModuleBadgeCount(m), 0);

                return (
                  <li key={group.id} className={`nav-item ${isOpen ? 'menu-open' : ''} mb-1`}>
                    <a
                      href={`#group-${group.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleGroup(group.id);
                      }}
                      className="nav-link d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        color: '#e2e8f0',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                      }}
                    >
                      <span className="text-truncate">
                        <i className={`nav-icon ${group.icon} mr-2`}></i>
                        {group.title}
                      </span>
                      <span className="d-inline-flex align-items-center">
                        {groupBadge > 0 && (
                          <span className="badge badge-warning text-dark mr-2" style={{ fontSize: '10px' }}>
                            {groupBadge}
                          </span>
                        )}
                        <i
                          className={`fas fa-angle-${isOpen ? 'down' : 'left'}`}
                          style={{ fontSize: '11px', opacity: 0.75 }}
                        ></i>
                      </span>
                    </a>
                    {isOpen && (
                      <ul className="nav nav-treeview d-block pl-1 mt-1">
                        {group.items.map((m) => renderMenuLink(m, true))}
                      </ul>
                    )}
                  </li>
                );
              })
            ) : (
              /* All Other Roles: Categorized Section Headers */
              currentSections.map((sec, idx) => (
                <React.Fragment key={sec.title || idx}>
                  <li className="sidebar-section-header">
                    {sec.icon && <i className={`${sec.icon} mr-1`}></i>}
                    {sec.title}
                  </li>
                  {sec.items.map((m) => renderMenuLink(m, false))}
                </React.Fragment>
              ))
            )}
          </ul>
        </nav>
      </div>

      {/* ── Sidebar Pinned Footer ── */}
      <div className="sidebar-footer">
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-logout-btn"
          title="ออกจากระบบ"
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );
};

export default SidebarRole;
