import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppContext';
import { LogOut, LayoutDashboard, CalendarCheck, FileText, Search, Bell, HelpCircle, Building2, Moon, Sun, Clock, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, markNotificationsAsRead, customColors, updateCustomColor } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const statusMap = [
    { code: 'P', label: 'Present' },
    { code: 'A', label: 'Absent' },
    { code: 'WO', label: 'Weekly Off' },
    { code: 'H', label: 'Holiday' },
    { code: 'HD', label: 'Half Day' },
    { code: 'PH', label: 'Present on Holiday' },
    { code: 'EL', label: 'Earned Leave' },
    { code: 'HDEL', label: 'Half Day Earned Leave' },
    { code: 'L', label: 'Late' },
    { code: 'EO', label: 'Early Out' },
    { code: 'NJ', label: 'Not Joined' },
    { code: 'LWP', label: 'Leave without Pay' },
    { code: 'P/MP', label: 'Present/Misspunch' }
  ];

  if (!user) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const adminLinks = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Attendance Summary', path: '/admin/summary', icon: CalendarCheck },
    { label: 'Detail Views', path: '/admin/details', icon: FileText },
  ];

  const employeeLinks = [
    { label: 'Dashboard', path: '/employee', icon: LayoutDashboard },
    { label: 'My Requests', path: '/employee/requests', icon: FileText },
  ];

  const links = user.role === 'Admin' ? adminLinks : employeeLinks;

  const currentLink = links.find(link => location.pathname === link.path);
  const pageTitle = currentLink ? currentLink.label : 'KG-Web Attendance';

  const myNotifications = notifications.filter(n => {
    if (user.role === 'Admin') return !n.targetUserId;
    return n.targetUserId === user.id;
  }).slice(0, 5); // Show latest 5

  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const handleNotifClick = () => {
    setIsNotifOpen(!isNotifOpen);
    setIsSettingsOpen(false);
    if (!isNotifOpen && unreadCount > 0) {
      markNotificationsAsRead(user.id);
    }
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(!isSettingsOpen);
    setIsNotifOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f4f7f6] dark:bg-[#0b1120] flex transition-colors duration-300 font-sans text-slate-800 dark:text-slate-200">
      {/* Sidebar */}
      <div className="w-[260px] bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex shrink-0 transition-colors duration-300 relative z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Building2 className="w-6 h-6" />
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

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
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
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={handleNotifClick}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#111827]"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/60 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-[#182333]/50">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        You're all caught up!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {myNotifications.map((notif) => (
                          <div key={notif.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={handleSettingsClick}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/60 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-[#182333]/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Attendance Colors</h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {statusMap.map(status => (
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

            <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-200 dark:border-slate-700 h-8">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{user.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold overflow-hidden shadow-sm shadow-blue-500/30 ring-2 ring-white dark:ring-[#111827]">
                {user.name.charAt(0)}
              </div>
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
