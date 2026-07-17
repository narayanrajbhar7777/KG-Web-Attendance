import { API_BASE_URL, KG_WEB_APP0_API_URL } from '../constants';
import type { AppRequest } from '../types';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('attendance_auth_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers, cache: 'no-store' });
};

export const loginUser = async (credentials: any) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return res.json();
};

export const fetchUsers = async () => {
  return null;
  // const res = await fetchWithAuth(`${API_BASE_URL}/users`);
  // return res.json();
};

export const fetchRequests = async () => {
  return null;
  // const res = await fetchWithAuth(`${API_BASE_URL}/requests`);
  // return res.json();
};

export const fetchAttendance = async () => {
  return null;
  // const res = await fetchWithAuth(`${API_BASE_URL}/attendance`);
  // return res.json();
};

export const fetchNotifications = async () => {
  return null;
  // const res = await fetch(`${API_BASE_URL}/notifications`);
  // return res.json();
};

export const createRequest = async (req: Omit<AppRequest, 'id' | 'status'>) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  return res.json();
};

export const updateRequestStatusAPI = async (id: string, status: AppRequest['status']) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
};

export const updateRequestAPI = async (id: string, data: Partial<AppRequest>) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteRequestAPI = async (id: string) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/requests/${id}`, { method: 'DELETE' });
  return res.json();
};

export const createNotification = async (message: string, targetUserId?: string) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, targetUserId })
  });
  return res.json();
};

export const markNotificationsAsReadAPI = async (userId: string) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/notifications/read/${userId}`, { method: 'PATCH' });
  return res.json();
};

export const fetchSettings = async (userId: string) => {
  return { customColors: {} };
  // try {
  //   const response = await fetchWithAuth(`${API_BASE_URL}/settings/${userId}`);
  //   return await response.json();
  // } catch (err) {
  //   return { customColors: {} };
  // }
};

export const updateSettings = async (userId: string, data: any) => {
  return data;
  // try {
  //   const response = await fetchWithAuth(`${API_BASE_URL}/settings/${userId}`, {
  //     method: 'PUT',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(data),
  //   });
  //   return await response.json();
  // } catch (err) {
  //   return data;
  // }
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

export const createEmployeePolicy = async (policy: any) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/employeePolicies`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(policy)
  // });
  // return res.json();
};

export const updateEmployeePolicy = async (id: string, policy: any) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/employeePolicies/${id}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(policy)
  // });
  // return res.json();
};

export const fetchAdminDashboard = async () => {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/dashboard`);
  return res.json();
};

export const fetchAdminAttendanceSummary = async () => {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/attendance-summary`);
  return res.json();
};

export const fetchAdminAttendanceDetails = async () => {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/attendance-details`);
  return res.json();
};



export const fetchEmployeeRequests = async (userId: string) => {
  return { requests: [] };

  // try {
  //   const res = await fetch(`${API_BASE_URL}/employee/requests?userId=${userId}`);
  //   if (!res.ok) return { requests: [] };
  //   return await res.json();
  // } catch (err) {
  //   return { requests: [] };
  // }
};

export const loginEmployeeExternal = async (credentials: any) => {
  const res = await fetch(`${KG_WEB_APP0_API_URL}/LOGIN/authantication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return res.json();
};

export const fetchEmployeeDetails = async (empId: string) => {
  const comp = empId.substring(0, 2);
  const code = empId.substring(2);
  const res = await fetch(`${KG_WEB_APP0_API_URL}/powerbi/GetEmpDet?p_E_COMP=${comp}&p_E_CODE=${code}`);
  return res.json();
};

export const fetchEmployeeDataExternal = async (empId: string, frDate: string, toDate: string) => {
  // Extract comp and code assuming format like FP13309
  const comp = empId.substring(0, 2);
  const code = empId.substring(2);

  let empDet = null;
  try {
    const empDetRes = await fetch(`${KG_WEB_APP0_API_URL}/powerbi/GetEmpDet?p_E_COMP=${comp}&p_E_CODE=${code}`);
    empDet = await empDetRes.json();
  } catch (e) {
    console.error('Failed to fetch empDet:', e);
  }

  let punchDet = null;
  try {
    const punchDetRes = await fetch(`${KG_WEB_APP0_API_URL}/powerbi/GetEmpPunchDet?p_Frdate=${frDate}&p_Todate=${toDate}&P_EMP_ID=${empId}`);
    punchDet = await punchDetRes.json();
  } catch (e) {
    console.error('Failed to fetch punchDet:', e);
  }

  return { empDet, punchDet };
};

export const fetchEmployeeDetailsExternal = async (empId: string) => {
  const comp = empId.substring(0, 2);
  const code = empId.substring(2);
  const res = await fetch(`${KG_WEB_APP0_API_URL}/powerbi/GetEmpDet?p_E_COMP=${comp}&p_E_CODE=${code}`);
  return res.json();
};

export const fetchEmployeePunchDataExternal = async (empId: string, frDate: string, toDate: string) => {
  const res = await fetch(`${KG_WEB_APP0_API_URL}/powerbi/GetEmpPunchDet?p_Frdate=${frDate}&p_Todate=${toDate}&P_EMP_ID=${empId}`);
  return res.json();
};

// Leave Management APIs
export const fetchLeaveTypes = async () => {
  const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes`);
  return res.json();
};

export const addLeaveType = async (data: any) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateLeaveType = async (id: string, data: any) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteLeaveType = async (id: string) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes/${id}`, {
    method: 'DELETE'
  });
  return res.json();
};

export const fetchEmployeeLeaves = async () => {
  const res = await fetchWithAuth(`${API_BASE_URL}/employeeLeaves`);
  return res.json();
};

export const addEmployeeLeave = async (data: any) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/employeeLeaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateEmployeeLeave = async (id: string, data: any) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/employeeLeaves/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteEmployeeLeave = async (id: string) => {
  const res = await fetchWithAuth(`${API_BASE_URL}/employeeLeaves/${id}`, {
    method: 'DELETE'
  });
  return res.json();
};
