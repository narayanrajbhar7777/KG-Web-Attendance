import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AppRequest, EmployeeAttendance, AppNotification } from '../types';
import { generateMockUsers, generateMockRequests, generateMockAttendance } from '../mockData/generate';

interface AppContextType {
  users: User[];
  requests: AppRequest[];
  attendance: EmployeeAttendance[];
  notifications: AppNotification[];
  applyRequest: (req: Omit<AppRequest, 'id' | 'status'>) => void;
  updateRequestStatus: (id: string, status: AppRequest['status']) => void;
  deleteRequest: (id: string) => void;
  updateRequest: (id: string, req: Partial<AppRequest>) => void;
  addNotification: (message: string, targetUserId?: string) => void;
  markNotificationsAsRead: (userId: string) => void;
  customColors: Record<string, string>;
  updateCustomColor: (status: string, color: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users] = useState<User[]>(() => {
    const saved = localStorage.getItem('attendance_users');
    if (saved) return JSON.parse(saved);
    const generated = generateMockUsers();
    localStorage.setItem('attendance_users', JSON.stringify(generated));
    return generated;
  });

  const [requests, setRequests] = useState<AppRequest[]>(() => {
    const saved = localStorage.getItem('attendance_requests_v2');
    if (saved) return JSON.parse(saved);
    const generated = generateMockRequests(users);
    localStorage.setItem('attendance_requests_v2', JSON.stringify(generated));
    return generated;
  });

  const [attendance] = useState<EmployeeAttendance[]>(() => {
    const saved = localStorage.getItem('attendance_records');
    if (saved) return JSON.parse(saved);
    const generated = generateMockAttendance(users);
    localStorage.setItem('attendance_records', JSON.stringify(generated));
    return generated;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('attendance_notifications');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('attendance_custom_colors');
    if (saved) return JSON.parse(saved);
    return {};
  });

  useEffect(() => {
    localStorage.setItem('attendance_custom_colors', JSON.stringify(customColors));
  }, [customColors]);

  useEffect(() => {
    localStorage.setItem('attendance_requests_v2', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('attendance_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const applyRequest = (req: Omit<AppRequest, 'id' | 'status'>) => {
    const newRequest: AppRequest = {
      ...req,
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      status: 'Pending'
    };
    setRequests(prev => [newRequest, ...prev]);
  };

  const updateRequestStatus = (id: string, status: AppRequest['status']) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deleteRequest = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const updateRequest = (id: string, data: Partial<AppRequest>) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const addNotification = (message: string, targetUserId?: string) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      targetUserId,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationsAsRead = (userId: string) => {
    const userRole = users.find(u => u.id === userId)?.role;
    setNotifications(prev => prev.map(n => {
      // If it's an admin notification (targetUserId is undefined) and current user is Admin
      if (!n.targetUserId && userRole === 'Admin') {
        return { ...n, isRead: true };
      }
      // If it's a specific user's notification
      if (n.targetUserId === userId) {
        return { ...n, isRead: true };
      }
      return n;
    }));
  };

  const updateCustomColor = (status: string, color: string) => {
    setCustomColors(prev => ({ ...prev, [status]: color }));
  };

  return (
    <AppContext.Provider value={{
      users, requests, attendance, notifications, customColors,
      applyRequest, updateRequestStatus, deleteRequest, updateRequest, addNotification, markNotificationsAsRead, updateCustomColor
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
