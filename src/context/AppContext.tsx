import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AppRequest, EmployeeAttendance, AppNotification } from '../types';
import { fetchNotifications, fetchSettings, updateSettings, createNotification, markNotificationsAsReadAPI, createRequest, updateRequestStatusAPI, fetchMasterConfig, updateMasterConfig as updateMasterConfigAPI } from '../api';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface AppContextType {
  notifications: AppNotification[];
  addNotification: (message: string, targetUserId?: string) => void;
  markNotificationsAsRead: (userId: string, role: string) => void;
  customColors: Record<string, string>;
  updateCustomColor: (status: string, color: string) => void;
  theme: Theme;
  toggleTheme: () => void;
  isNotificationsEnabled: boolean;
  setIsNotificationsEnabled: (enabled: boolean) => void;
  masterConfig: any;
  setMasterConfig: (config: any) => void;

  // Expose these via context to make it easier for components to call the API 
  // without importing the API directly, or they can just import the API directly.
  applyRequest: (req: Omit<AppRequest, 'id' | 'status'>) => Promise<void>;
  updateRequestStatus: (id: string, status: AppRequest['status'], reason: string, req?: AppRequest) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<Theme>('light');
  const [isNotificationsEnabled, setIsNotificationsEnabledState] = useState(() => {
    return localStorage.getItem('notifications_enabled') !== 'false';
  });
  const [masterConfig, setMasterConfigState] = useState<any>(null);

  const setIsNotificationsEnabled = (enabled: boolean) => {
    setIsNotificationsEnabledState(enabled);
    localStorage.setItem('notifications_enabled', String(enabled));
  };
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [n, s, mConfig] = await Promise.all([
          isNotificationsEnabled ? fetchNotifications() : Promise.resolve([]),
          user.role === 'Admin' ? fetchSettings(user.id) : Promise.resolve(null),
          fetchMasterConfig()
        ]);
        if (n && !n.message) {
          setNotifications(n);
        }
        if (s && s.customColors) {
          setCustomColors(s.customColors);
        }
        if (s && s.theme) {
          setTheme(s.theme);
        } else {
          setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
        if (mConfig && !mConfig.message) {
          setMasterConfigState(mConfig);
        }
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadData();

    if (!isNotificationsEnabled) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const n = await fetchNotifications();
        if (n && !n.message) {
          setNotifications(n);
        }
      } catch (err) {
        console.error("Failed to poll notifications", err);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user, isNotificationsEnabled]);

  const applyRequest = async (req: Omit<AppRequest, 'id' | 'status'>) => {
    try {
      await createRequest(req);
    } catch (err) {
      console.error(err);
    }
  };

  const updateRequestStatus = async (id: string, status: AppRequest['status'], reason: string, req?: AppRequest) => {
    try {
      await updateRequestStatusAPI(id, status, reason, req);
    } catch (err) {
      console.error(err);
    }
  };

  const setMasterConfig = async (newConfig: any) => {
    try {
      const result = await updateMasterConfigAPI(newConfig);
      if (result) {
        setMasterConfigState(result.masterConfig || result);
      }
    } catch (error) {
      console.error('Failed to update master config:', error);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const addNotification = async (message: string, targetUserId?: string) => {
    try {
      const newNotif = await createNotification(message, targetUserId);
      // setNotifications(prev => [newNotif, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationsAsRead = async (userId: string, role: string) => {
    try {
      await markNotificationsAsReadAPI(userId);
      setNotifications(prev => prev.map(n => {
        if (!n.targetUserId && role === 'Admin') return { ...n, isRead: true };
        if (n.targetUserId === userId) return { ...n, isRead: true };
        return n;
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const updateCustomColor = async (status: string, color: string) => {
    if (!user) return;
    const newColors = { ...customColors, [status]: color };
    setCustomColors(newColors);
    try {
      await updateSettings(user.id, { customColors: newColors });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTheme = async () => {
    if (!user) return;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await updateSettings(user.id, { theme: newTheme });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] dark:bg-[#0b1120] text-slate-500">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold">Connecting to backend server...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      notifications, addNotification, markNotificationsAsRead,
      isNotificationsEnabled, setIsNotificationsEnabled,
      customColors, updateCustomColor, theme, toggleTheme,
      applyRequest, updateRequestStatus, masterConfig, setMasterConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppData must be used within AppProvider');
  return context;
};
