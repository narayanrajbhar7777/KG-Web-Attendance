import React, { createContext, useContext, useState, useEffect } from 'react';
import Loader from '../components/Loader';
import type { AppRequest, AppNotification } from '../types';
import { fetchNotifications, fetchSettings, updateSettings, createNotification, markNotificationsAsReadAPI, createRequest, updateRequestStatusAPI, fetchMasterConfig, updateMasterConfig as updateMasterConfigAPI, sendEmailNotification } from '../api';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { FETCH_API_INTERVAL } from '../constants';

type Theme = 'dark' | 'light';

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
  isEmailNotificationsEnabled: boolean;
  setIsEmailNotificationsEnabled: (enabled: boolean) => void;
  masterConfig: any;
  setMasterConfig: (config: any) => void;
  cutoffSettings: Record<string, string>;
  updateCutoffSettings: (settings: Record<string, string>) => void;
  applyRequest: (req: Omit<AppRequest, 'id' | 'status'>) => Promise<void>;
  updateRequestStatus: (id: string, status: AppRequest['status'], reason: string, req?: AppRequest, approverNotes?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<Theme>('dark');
  const [isNotificationsEnabled, setIsNotificationsEnabledState] = useState(() => {
    return localStorage.getItem('notifications_enabled') !== 'false';
  });
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabledState] = useState(() => {
    return localStorage.getItem('email_notifications_enabled') !== 'false';
  });
  const [masterConfig, setMasterConfigState] = useState<any>(null);

  const setIsNotificationsEnabled = (enabled: boolean) => {
    setIsNotificationsEnabledState(enabled);
    localStorage.setItem('notifications_enabled', String(enabled));
  };

  const setIsEmailNotificationsEnabled = (enabled: boolean) => {
    setIsEmailNotificationsEnabledState(enabled);
    localStorage.setItem('email_notifications_enabled', String(enabled));
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
        const [s, mConfig] = await Promise.all([
          fetchSettings(user.id),
          fetchMasterConfig()
        ]);
        if (s && s.customColors) {
          setCustomColors(s.customColors);
        }
        if (s && (s as any).theme) {
          setTheme((s as any).theme);
        } else {
          setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
        if (mConfig && !(mConfig as any).message) {
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
  }, [user]);

  useEffect(() => {
    if (!user || !isNotificationsEnabled) {
      return;
    }

    const fetchNotifs = async () => {
      try {
        const n = await fetchNotifications(user.id);
        if (n && !(n as any).message) {
          setNotifications(n as any);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifs();

    const intervalId = setInterval(async () => {
      try {
        const n = await fetchNotifications(user.id, true);
        if (n && !(n as any).message) {
          setNotifications(n as any);
        }
      } catch (err) {
        console.error("Failed to poll notifications", err);
      }
    }, FETCH_API_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user, isNotificationsEnabled]);

  const applyRequest = async (req: Omit<AppRequest, 'id' | 'status'>) => {
    try {
      await createRequest(req);
    } catch (err) {
      console.error(err);
    }
  };

  const updateRequestStatus = async (id: string, status: AppRequest['status'], reason: string, req?: AppRequest, approverNotes?: string) => {
    try {
      await updateRequestStatusAPI(id, status, reason, req, approverNotes);
      toast.success(`Request ${status.toLowerCase()} successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update request.");
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
      await createNotification(message, targetUserId);
      if (user && ((targetUserId && targetUserId === user.id) || (!targetUserId && user.role === 'Admin'))) {
        const newNotif: AppNotification = {
          id: Date.now().toString(),
          message,
          targetUserId,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        setNotifications(prev => [newNotif, ...prev]);
      }

      if (targetUserId) {
        try {
          const email = user?.employee_list?.find((emp: any) => emp.id === targetUserId)?.e_email;
          if (email) {
            await sendEmailNotification(email, "New Notification from KG Workforce Portal", message);
          }
        } catch (e) {
          console.error("Failed to send email notification", e);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationsAsRead = async (userId: string, role: string) => {
    try {
      const unreadNotifs = notifications.filter(n => !n.isRead && (n.targetUserId === userId || (!n.targetUserId && role === 'Admin')));
      if (unreadNotifs.length > 0) {
        // Here we could call markNotificationsAsReadAPI with all unreadNotifs if the API supports it.
        // For now we will update them individually or send an array depending on our api/index.ts implementation.
        // Assuming we update api/index.ts to accept an array of IDs.
        await markNotificationsAsReadAPI(unreadNotifs.map(n => n.id));
      }

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

  const updateCutoffSettings = async (settings: Record<string, string>) => {
    if (!user) return;
    const newColors = { ...customColors, ...settings };
    setCustomColors(newColors);
    try {
      await updateSettings(user.id, { customColors: newColors });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save attendance rules');
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
        <Loader />
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      notifications, addNotification, markNotificationsAsRead,
      isNotificationsEnabled, setIsNotificationsEnabled,
      isEmailNotificationsEnabled, setIsEmailNotificationsEnabled,
      customColors, updateCustomColor, theme, toggleTheme,
      applyRequest, updateRequestStatus, masterConfig, setMasterConfig,
      cutoffSettings: customColors, updateCutoffSettings
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
