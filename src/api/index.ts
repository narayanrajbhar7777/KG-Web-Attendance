import { KG_WEB_APP0_API_URL } from '../constants';
import type { AppRequest } from '../types';
import { format } from 'date-fns';

export const fetchUsers = async () => {
  return null;
  // const res = await fetchWithAuth(`${API_BASE_URL}/users`);
  // return res.json();
};

export const fetchRequests = async (managerId?: string) => {
  try {
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpReq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

export const fetchNotifications = async () => {
  return null;
  // const res = await fetch(`${API_BASE_URL}/notifications`);
  // return res.json();
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
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertRequest`, {
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

export const updateRequestStatusAPI = async (id: string, status: AppRequest['status'], reason: string, req?: AppRequest) => {
  try {
    let reqData: any = { id: Number(id), status, reason, approver_notes: "OK" };
    if (req?.type === 'Misspunch') {
      reqData.request_date = req.date ? format(new Date(req.date), 'dd-MMM-yyyy') : undefined;
      reqData.in_time = req.inTime;
      reqData.out_time = req.outTime;
    }

    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateRequest?P_ID=${id}`, {
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
    if (data.type === 'Misspunch') {
      payload.in_time = data.inTime;
      payload.out_time = data.outTime;
    }

    Object.keys(payload).forEach(key => (payload[key] === undefined || payload[key] === '') && delete payload[key]);

    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateRequest?P_ID=${id}`, {
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
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteRequest`, {
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
  // const res = await fetchWithAuth(`${API_BASE_URL}/notifications`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ message, targetUserId })
  // });
  // return res.json();
};

export const markNotificationsAsReadAPI = async (userId: string) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/notifications/read/${userId}`, { method: 'PATCH' });
  // return res.json();
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



export const fetchEmployeeRequests = async (userId: string) => {
  try {
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpReq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      updatedAt: req.updated_at ? req.updated_at.replace('[UTC]', '') : undefined
    }));
    return { requests: mappedRequests };
  } catch (err) {
    console.error("Error fetching employee requests:", err);
    return { requests: [] };
  }
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
  // const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes`);
  // return res.json();
};

export const addLeaveType = async (data: any) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data)
  // });
  // return res.json();
};

export const updateLeaveType = async (id: string, data: any) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes/${id}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data)
  // });
  // return res.json();
};

export const deleteLeaveType = async (id: string) => {
  // const res = await fetchWithAuth(`${API_BASE_URL}/leaveTypes/${id}`, {
  //   method: 'DELETE'
  // });
  // return res.json();
};

export const fetchEmployeeLeaves = async (managerId: string = "") => {
  try {
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/FetchEmpReq`, {
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
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/EMPInsertRequest`, {
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
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/EMPUpdateRequest?P_ID=${id}`, {
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
    const res = await fetch(`${KG_WEB_APP0_API_URL}/RptComProd/EMPDeleteRequest`, {
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
