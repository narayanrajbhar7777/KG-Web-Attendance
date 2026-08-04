import { EMAIL_TOKEN, KG_WEB_APP0_API_URL, KG_WEB_APP_API_URL, KG_WEB_MAIL_API_URL } from '../constants';
import type { AppRequest } from '../types';
import { format } from 'date-fns';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const userStr = localStorage.getItem('attendance_auth_user');
  let token = localStorage.getItem('attendance_auth_token');
  if (!token && userStr) {
    try {
      const user = JSON.parse(userStr);
      token = user.token;
    } catch (e) { }
  }
  const headers = new Headers(options.headers || {});
  if (token && !url.includes("/LOGIN/authantication_EMP")) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('attendance_auth_token');
    localStorage.removeItem('attendance_auth_user');
    window.dispatchEvent(new Event('auth_unauthorized'));
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
  return response;
};

export const fetchUsers = async () => {
  return [];
};

export const fetchRequests = async (managerId?: string, silent = false) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpReq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(silent && { 'X-Silent-Fetch': 'true' }) },
      body: JSON.stringify({ P_MANAGER_ID: managerId || "" })
    });
    const data = await res.json();
    const mappedRequests = (data.DATA || []).map((req: any) => ({
      id: req.id,
      userId: req.user_id,
      type: req.request_type,
      date: req.request_date,
      toDate: req.to_date,
      reason: req.reason,
      leaveType: req.leave_type,
      status: req.status,
      inTime: req.in_time,
      outTime: req.out_time,
      createdAt: req.created_at ? req.created_at.replace('[UTC]', '') : undefined,
      updatedAt: req.updated_at ? req.updated_at.replace('[UTC]', '') : undefined
    }));
    return mappedRequests;
  } catch (err) {
    console.error("Error fetching requests:", err);
    return [];
  }
};

const parseNotificationDate = (dateStr: string) => {
  if (!dateStr) return new Date().toISOString();
  try {
    const parts = dateStr.split(' ');
    if (parts.length >= 4) {
      const [datePart, timePart, ampm, tz] = parts;
      const [dd, mm, yy] = datePart.split('-');
      const [hourStr, minStr, secStr] = timePart.split(':');

      let hour = parseInt(hourStr, 10);
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;

      const formattedDate = `20${yy}-${mm}-${dd}T${hour.toString().padStart(2, '0')}:${minStr}:${secStr.substring(0, 2)}${tz}`;
      const d = new Date(formattedDate);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
};

export const fetchNotifications = async (userId: string, silent = false) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpNotifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(silent && { 'X-Silent-Fetch': 'true' }) },
      body: JSON.stringify({ user_id: userId })
    });
    const data = await res.json();
    return (data.P_CURSOR || []).map((n: any) => ({
      id: n.id,
      targetUserId: n.target_user_id,
      message: n.message,
      isRead: Boolean(n.is_read),
      createdAt: parseNotificationDate(n.created_at)
    }));
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return [];
  }
};

export const createRequest = async (req: any) => {
  try {
    const formatDate = (dateStr: string) => dateStr ? format(new Date(dateStr), 'dd-MMM-yyyy') : "";
    const payload = {
      user_id: req.userId,
      manager_id: req.managerId,
      request_type: req.type,
      status: "Pending",
      request_date: formatDate(req.date),
      to_date: formatDate(req.toDate || req.date),
      reason: req.reason,
      leave_type: req.leaveType || "",
      in_time: req.inTime || "",
      out_time: req.outTime || ""
    };
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestList: [payload] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error creating request:', err);
    throw err;
  }
};

export const updateRequestStatusAPI = async (id: string, status: AppRequest['status'], reason: string, req?: AppRequest, approverNotes?: string) => {
  try {
    let reqData: any = { id: Number(id), status, reason, approver_notes: approverNotes || "" };
    if (req?.type === 'Missed Punch' || req?.type === 'Misspunch') {
      reqData.request_date = req.date ? format(new Date(req.date), 'dd-MMM-yyyy') : undefined;
      reqData.in_time = req.inTime;
      reqData.out_time = req.outTime;
    }

    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateRequest?P_ID=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestList: [reqData] })
    });
    return await res.json();
  } catch (err) {
    console.error("Error updating request status:", err);
    throw err;
  }
};

export const updateRequestAPI = async (id: string, data: any) => {
  try {
    const formatDate = (dateStr?: string) => dateStr ? format(new Date(dateStr), 'dd-MMM-yyyy') : undefined;
    const payload: any = {
      id: Number(id),
      status: data.status,
      reason: data.reason,
      request_date: formatDate(data.date),
      to_date: formatDate(data.toDate),
      request_type: data.type,
      leave_type: data.leaveType
    };
    if (data.type === 'Missed Punch' || data.type === 'Misspunch') {
      payload.in_time = data.inTime;
      payload.out_time = data.outTime;
    }

    Object.keys(payload).forEach(key => (payload[key] === undefined || payload[key] === '') && delete payload[key]);

    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateRequest?P_ID=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestList: [payload] })
    });
    return await res.json();
  } catch (err) {
    console.error("Error updating request:", err);
    throw err;
  }
};

export const deleteRequestAPI = async (id: string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestList: [{ id: Number(id) }] })
    });
    return await res.json();
  } catch (err) {
    console.error("Error deleting request:", err);
    throw err;
  }
};

export const createNotification = async (message: string, targetUserId?: string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NotificationList: [
          {
            target_user_id: targetUserId || "",
            message,
            is_read: 0
          }
        ]
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error creating notification:", err);
    throw err;
  }
};

export const markNotificationsAsReadAPI = async (ids: (number | string)[]) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NotificationList: ids.map(id => ({
          id: Number(id),
          is_read: 1
        }))
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error updating notification:", err);
    throw err;
  }
};

export const deleteNotificationAPI = async (id: number | string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NotificationList: [
          {
            id: Number(id),
            is_read: 1
          }
        ]
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error deleting notification:", err);
    throw err;
  }
};

export const sendEmailNotification = async (email: string, subject: string, message: string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_MAIL_API_URL}/scheduler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${EMAIL_TOKEN}`
      },
      body: JSON.stringify({
        platform: "email",
        schedulerName: subject,
        scheduleType: "now",
        customMessage: message,
        receiverData: email
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error sending email notification:", err);
  }
};

export const fetchSettings = async (userId: string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpUserSettings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const data = await res.json();
    if (data.UserSettings && data.UserSettings.length > 0) {
      const setting = data.UserSettings[0];
      let customColors = {};
      try {
        customColors = typeof setting.custom_colors === 'string' ? JSON.parse(setting.custom_colors) : (setting.custom_colors || {});
      } catch (e) {
        // fallback
      }
      return { theme: setting.theme, customColors };
    }
    return { customColors: {}, theme: 'dark' };
  } catch (err) {
    console.error("Error fetching user settings:", err);
    return { customColors: {}, theme: 'dark' };
  }
};

export const insertSettings = async (userId: string, data: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertUserSettings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SettingsList: [
          {
            user_id: userId,
            theme: data.theme || 'dark',
            custom_colors: data.customColors || {}
          }
        ]
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error inserting user settings:", err);
    throw err;
  }
};

export const updateSettings = async (userId: string, data: any) => {
  try {
    const fetchRes = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpUserSettings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const fetchedData = await fetchRes.json();
    const settingsExist = fetchedData.UserSettings && fetchedData.UserSettings.length > 0;

    let currentTheme = 'light';
    let currentCustomColors = {};

    if (settingsExist) {
      const setting = fetchedData.UserSettings[0];
      currentTheme = setting.theme;
      try {
        currentCustomColors = typeof setting.custom_colors === 'string' ? JSON.parse(setting.custom_colors) : (setting.custom_colors || {});
      } catch (e) { }
    }

    const theme = data.theme !== undefined ? data.theme : currentTheme;
    const customColors = data.customColors !== undefined ? data.customColors : currentCustomColors;

    const endpoint = settingsExist ? 'EMPUpdateUserSettings' : 'EMPInsertUserSettings';
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SettingsList: [
          {
            user_id: userId,
            theme: theme,
            custom_colors: customColors
          }
        ]
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error updating user settings:", err);
    return data;
  }
};

export const deleteSettings = async (userId: string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteUserSettings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SettingsList: [
          {
            user_id: userId
          }
        ]
      })
    });
    return await res.json();
  } catch (err) {
    console.error("Error deleting user settings:", err);
    throw err;
  }
};

export const fetchMasterConfig = async () => {
  return null;
  // const res = await fetchWithAuth(`${API_BASE_URL}/master`);
  // return res.json();
};

export const updateMasterConfig = async (config: any) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/master`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(config)
  // });
  // return res.json();
  return config;
};

export const fetchEmployeePolicies = async () => {
  return [];
  // try {
  //   const res = await fetchWithAuth(`${API_BASE_URL}/employeePolicies`);
  //   if (!res.ok) return [];
  //   return res.json();
  // } catch (err) {
  //   return [];
  // }
};

export const createEmployeePolicy = async (_policy: any) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/employeePolicies`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(policy)
  // });
  // return res.json();
};

export const updateEmployeePolicy = async (_id: string, _policy: any) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/employeePolicies/${id}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(policy)
  // });
  // return res.json();
};

export const fetchAdminDashboard = async () => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/admin/dashboard`);
  // return res.json();
};

export const fetchAdminAttendanceSummary = async () => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/admin/attendance-summary`);
  // return res.json();
};

export const fetchAdminAttendanceDetails = async () => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/admin/attendance-details`);
  // return res.json();
};



export const fetchEmployeeRequests = async (userId: string, silent = false) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpReq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(silent && { 'X-Silent-Fetch': 'true' }) },
      body: JSON.stringify({ P_MANAGER_ID: userId })
    });
    const data = await res.json();
    const mappedRequests = (data.DATA || []).map((req: any) => ({
      id: req.id,
      userId: req.user_id,
      type: req.request_type,
      date: req.request_date,
      toDate: req.to_date,
      reason: req.reason,
      leaveType: req.leave_type,
      status: req.status,
      inTime: req.in_time,
      outTime: req.out_time,
      createdAt: req.created_at ? req.created_at.replace('[UTC]', '') : undefined,
      updatedAt: req.updated_at ? req.updated_at.replace('[UTC]', '') : undefined,
      approver_notes: req.approver_notes
    }));
    return { requests: mappedRequests };
  } catch (err) {
    console.error("Error fetching employee requests:", err);
    return { requests: [] };
  }
};

export const loginEmployeeExternal = async (credentials: any) => {
  const res = await fetchWithAuth(`${KG_WEB_APP_API_URL}/LOGIN/authantication_EMP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return res.json();
};

export const fetchEmployeeDetails = async (empId: string = '', silent = false) => {
  const comp = empId ? empId.substring(0, 2) : '';
  const code = empId ? empId.substring(2) : '';

  const res = await fetch(`${KG_WEB_APP_API_URL}/powerbi/GetEmpDet?p_E_COMP=${comp}&p_E_CODE=${code}`, {
    headers: silent ? { 'X-Silent-Fetch': 'true' } : {}
  });
  return res.json();
};

export const fetchEmployeePunchData = async (empId: string, frDate: string, toDate: string, silent = false) => {
  let punchDet = null;
  try {
    const punchDetRes = await fetch(`${KG_WEB_APP_API_URL}/powerbi/GetEmpPunchDet?p_Frdate=${frDate}&p_Todate=${toDate}&P_EMP_ID=${empId}`, {
      headers: silent ? { 'X-Silent-Fetch': 'true' } : {}
    });
    punchDet = await punchDetRes.json();
  } catch (e) {
    console.error('Failed to fetch punchDet:', e);
  }

  return punchDet;
};

export const fetchLeaveTypes = async () => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpLeaveTypes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    return (data.LeaveTypes || []).map((lt: any) => ({
      id: lt.id,
      code: lt.code,
      name: lt.name,
      isActive: lt.is_active === 1
    }));
  } catch (err) {
    console.error('Error fetching leave types:', err);
    return [];
  }
};

export const addLeaveType = async (data: any) => {
  try {
    const payload = {
      code: data.code,
      name: data.name,
      is_active: data.isActive ? 1 : 0
    };
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertLeaveType`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LeaveTypeList: [payload] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error adding leave type:', err);
    throw err;
  }
};

export const updateLeaveType = async (id: number | string, data: any) => {
  try {
    const payload = {
      id: Number(id),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isActive !== undefined && { is_active: data.isActive ? 1 : 0 })
    };
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateLeaveType`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LeaveTypeList: [payload] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating leave type:', err);
    throw err;
  }
};

export const deleteLeaveType = async (id: number | string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteLeaveType`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LeaveTypeList: [{ id: Number(id) }] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting leave type:', err);
    throw err;
  }
};

export const fetchEmployeeLeaves = async (managerId: string = "") => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpReq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ P_MANAGER_ID: managerId })
    });
    const data = await res.json();
    return data.DATA || [];
  } catch (err) {
    console.error('Error fetching employee leaves:', err);
    return [];
  }
};

export const addEmployeeLeave = async (data: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestList: [data] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error adding employee leave:', err);
    throw err;
  }
};

export const updateEmployeeLeave = async (id: string, data: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateRequest?P_ID=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestList: [{ id: Number(id), ...data }] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating employee leave:', err);
    throw err;
  }
};

export const deleteEmployeeLeave = async (id: string) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestList: [{ id: Number(id) }] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting employee leave:', err);
    throw err;
  }
};

// Cut Off Master APIs
export const fetchDeptMgrCutoff = async (payload = {}) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpDeptMgrCutoffAuto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.DeptMgrCutoffList || [];
  } catch (err) {
    console.error('Error fetching Cut Off Master data:', err);
    throw err;
  }
};

export const updateDeptMgrCutoff = async (cutoffData: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateDeptMgrCutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DeptMgrCutoffList: [cutoffData] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating Cut Off Master data:', err);
    throw err;
  }
};

// Manager Cut Off APIs
export const fetchManagerCutoff = async (payload = {}) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpDeptMgrCutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.DeptMgrCutoffList || [];
  } catch (err) {
    console.error('Error fetching Manager Cut Off data:', err);
    throw err;
  }
};

export const insertManagerCutoff = async (cutoffData: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertDeptMgrCutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DeptMgrCutoffList: [cutoffData] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error inserting Manager Cut Off data:', err);
    throw err;
  }
};

export const updateManagerCutoff = async (cutoffData: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateDeptMgrCutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DeptMgrCutoffList: [cutoffData] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating Manager Cut Off data:', err);
    throw err;
  }
};

export const deleteManagerCutoff = async (cutoffData: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteDeptMgrCutoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DeptMgrCutoffList: [cutoffData] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting Manager Cut Off data:', err);
    throw err;
  }
};

// Worker Cut Off APIs
export const fetchWorkerCutoff = async (payload = {}) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpMgrWkrExtend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.MgrWkrExtendList || [];
  } catch (err) {
    console.error('Error fetching Worker Cut Off data:', err);
    throw err;
  }
};

export const insertWorkerCutoff = async (cutoffData: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertMgrWkrExtend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MgrWkrExtendList: Array.isArray(cutoffData) ? cutoffData : [cutoffData] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error inserting Worker Cut Off data:', err);
    throw err;
  }
};

export const updateWorkerCutoff = async (cutoffData: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateMgrWkrExtend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MgrWkrExtendList: Array.isArray(cutoffData) ? cutoffData : [cutoffData] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating Worker Cut Off data:', err);
    throw err;
  }
};

export const deleteWorkerCutoff = async (cutoffData: any) => {
  try {
    const res = await fetchWithAuth(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteMgrWkrExtend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MgrWkrExtendList: Array.isArray(cutoffData) ? cutoffData : [cutoffData] })
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting Worker Cut Off data:', err);
    throw err;
  }
};



