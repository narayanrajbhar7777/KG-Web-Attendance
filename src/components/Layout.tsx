import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppContext';
import { ATTENDANCE_STATUSES } from '../constants';
import { LogOut, LayoutDashboard, CalendarCheck, FileText, Bell, HelpCircle, Building2, Moon, Sun, Clock, Settings } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ToggleLeft, ToggleRight, ArrowRightLeft, Mail } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    notifications,
    markNotificationsAsRead,
    customColors,
    updateCustomColor,
    theme,
    toggleTheme,
    isNotificationsEnabled,
    setIsNotificationsEnabled,
    isEmailNotificationsEnabled,
    setIsEmailNotificationsEnabled
  } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(() => {
    return localStorage.getItem('time_format_24') === 'true';
  });
  const [isTimeVisible, setIsTimeVisible] = useState(() => {
    return localStorage.getItem('time_visible') !== 'false';
  });

  const toggleTimeFormat = () => {
    const newVal = !is24Hour;
    setIs24Hour(newVal);
    localStorage.setItem('time_format_24', String(newVal));
  };

  const toggleTimeVisibility = () => {
    const newVal = !isTimeVisible;
    setIsTimeVisible(newVal);
    localStorage.setItem('time_visible', String(newVal));
  };

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNotificationsEnabled(!isNotificationsEnabled);
  };

  const toggleEmailNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEmailNotificationsEnabled(!isEmailNotificationsEnabled);
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const adminLinks = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Punch-In Logs', path: '/admin/summary', icon: CalendarCheck },
    { label: 'Attendance Tracker', path: '/admin/details', icon: FileText },
  ];

  const employeeLinks = [
    { label: 'Employee Dashboard', path: '/employee', icon: LayoutDashboard },
    { label: 'My Requests', path: '/employee/requests', icon: FileText },
  ];

  const links = user.role === 'Admin' ? [...adminLinks, ...employeeLinks] : employeeLinks;

  const currentLink = links.find(link => location.pathname === link.path);
  let pageTitle = currentLink ? currentLink.label : 'KG-Web Attendance';

  if (location.pathname.startsWith('/employee/attendance')) {
    pageTitle = 'Employee Dashboard';
  } else if (location.pathname.startsWith('/admin/leave-requests-report') || location.pathname.startsWith('/admin/missing-punch-report')) {
    pageTitle = 'Admin Dashboard';
  }

  const myNotifications = notifications.filter(n => {
    if (user.role === 'Admin') return !n.targetUserId;
    return n.targetUserId === user.id;
  }).slice(0, 5); // Show latest 5

  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const handleNotifClick = () => {
    setIsNotifOpen(!isNotifOpen);
    setIsSettingsOpen(false);
    setIsAdminMenuOpen(false);
    if (!isNotifOpen && unreadCount > 0) {
      markNotificationsAsRead(user.id, user.role);
    }
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(!isSettingsOpen);
    setIsNotifOpen(false);
    setIsAdminMenuOpen(false);
  };

  const handleAdminMenuClick = () => {
    setIsAdminMenuOpen(!isAdminMenuOpen);
    setIsNotifOpen(false);
    setIsSettingsOpen(false);
  };

  const getProfileImageSrc = (imgStr: string) => {
    if (imgStr.startsWith('http') || imgStr.startsWith('data:image')) {
      return imgStr;
    }
    return `data:image/jpeg;base64,${imgStr}`;
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f4f7f6] dark:bg-[#0b1120] flex transition-colors duration-300 font-sans text-slate-800 dark:text-slate-200">
      {/* Sidebar */}
      <div className="w-[260px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0 transition-colors duration-300 relative z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded flex items-center justify-center overflow-hidden shrink-0">
            <img src="/favicon.svg" alt="KG Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold text-lg leading-tight">KG-Web</h1>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">Attendance</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5">
          {links.map((link) => {
            const active = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'}`} />
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {format(currentTime, 'EEEE, MMMM dd, yyyy')}
            </p>
            <button
              onClick={toggleTimeVisibility}
              className={`p-1 rounded-lg transition-colors ${isTimeVisible ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'text-slate-400 hover:bg-slate-200 dark:text-slate-500 dark:hover:bg-slate-700'}`}
              title={isTimeVisible ? "Hide Time" : "Show Time"}
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
          {isTimeVisible && (
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {format(currentTime, is24Hour ? 'HH:mm:ss' : 'hh:mm:ss a')}
              </p>
              <button
                onClick={toggleTimeFormat}
                className="flex items-center gap-1 p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-400 transition-colors"
                title={`Switch to ${is24Hour ? '12-Hour' : '24-Hour'} Format`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

        {/* Topbar */}
        <header className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white hidden md:block">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <button
              title="Toggle Theme"
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative" ref={notifRef}>
              <button
                title="Notifications"
                onClick={handleNotifClick}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {isNotificationsEnabled && unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#111827]"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/60 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-[#182333]/50">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
                    <div className="flex items-center gap-3">
                      {isNotificationsEnabled && unreadCount > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleEmailNotifications}
                          title={isEmailNotificationsEnabled ? "Disable Email Notifications" : "Enable Email Notifications"}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          {isEmailNotificationsEnabled ? <ToggleRight className="w-5 h-5 text-blue-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                        <button
                          onClick={toggleNotifications}
                          title={isNotificationsEnabled ? "Disable App Notifications" : "Enable App Notifications"}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                          <Bell className="w-4 h-4" />
                          {isNotificationsEnabled ? <ToggleRight className="w-5 h-5 text-blue-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {!isNotificationsEnabled ? (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Notifications are disabled.
                      </div>
                    ) : myNotifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        You're all caught up!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {myNotifications.map((notif) => {
                          const notifDate = new Date(notif.createdAt);
                          const diffInMinutes = (Date.now() - notifDate.getTime()) / 60000;

                          // Handle server clock being slightly behind or ahead of client clock
                          const timeDisplay = Math.abs(diffInMinutes) < 5
                            ? 'just now'
                            : formatDistanceToNow(notifDate, { addSuffix: true });

                          return (
                            <div key={notif.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                              <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{notif.message}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3" />
                                {timeDisplay}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {user.role === 'Admin' && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  title="Admin Settings"
                  onClick={handleAdminMenuClick}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {isAdminMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/60 overflow-hidden z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/admin/master');
                          setIsAdminMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Master Configuration
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/policy');
                          setIsAdminMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700"
                      >
                        Attendance Policy
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/leave-policy');
                          setIsAdminMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700"
                      >
                        Leave Policy
                      </button>
                      <button
                        onClick={() => {
                          navigate('/admin/leave-master');
                          setIsAdminMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-700"
                      >
                        Leave Master
                      </button>
                      <button
                        onClick={() => {
                          navigate('/settings/email-configuration');
                          setIsAdminMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Email Configuration
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative" ref={settingsRef}>
              <button
                title="Attendance Colors"
                onClick={handleSettingsClick}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/60 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-[#182333]/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Attendance Colors</h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {[...ATTENDANCE_STATUSES].sort((a, b) => a.code.localeCompare(b.code)).map(status => (
                      <div key={status.code} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {status.code} - {status.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customColors[status.code] || '#cbd5e1'}
                            onChange={(e) => updateCustomColor(status.code, e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                          />
                          {customColors[status.code] && (
                            <button
                              onClick={() => updateCustomColor(status.code, '')}
                              className="text-[10px] text-red-500 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-200 dark:border-slate-700 h-8">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{user.name}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 leading-tight tracking-wider">{user.code} {user.designation || user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold overflow-hidden shadow-sm shadow-blue-500/30 ring-2 ring-white dark:ring-[#111827]">
                {user.image ? (
                  <img
                    src={getProfileImageSrc(user.image)}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to removing the image if it completely fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <button
                title="Logout"
                onClick={handleLogout}
                className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:text-slate-400 transition-colors ml-1"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{pageTitle}</h1>
          </div>
          <button onClick={handleLogout} className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafb] dark:bg-[#0b1120] transition-colors duration-300 p-4 md:p-6">
          <div className="h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
