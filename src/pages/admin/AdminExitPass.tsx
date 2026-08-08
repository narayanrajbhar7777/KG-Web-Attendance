import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchGatePassList, updateGatePass } from '../../api';
import Loader from '../../components/Loader';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';

const AdminExitPass: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [rejectingPass, setRejectingPass] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch all exit passes for admin
      const res = await fetchGatePassList({
        P_EMP_ID: "", // empty for all
        P_GP_DATE: "", // empty for all dates
        P_APRVR_ID: "", // or user.code if they only see their direct reports? Let's keep empty for Admin to see all
        P_APRVL_STATUS: "",
        P_FRM_FLG: "A"
      });
      const dataList = res?.DATA || res || [];
      setRequests(Array.isArray(dataList) ? dataList : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load exit pass requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleApprove = async (pass: any) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to approve the exit pass for ${pass.emp_name || pass.emp_id}?`)) return;

    try {
      const payload = {
        P_SEQNO: pass.seqno || pass.SEQNO,
        P_COID: pass.coid || "KG01",
        P_BRID: pass.brid || "FP02",
        P_UPD_ID: "M",
        P_EMP_ID: pass.emp_id,
        P_DEPT_NODE: pass.dept_node,
        P_PARENT_NODE: pass.parent_node || "1.1",
        P_GP_DATE: pass.gp_date,
        P_GP_FR_TIME: pass.gp_fr_time,
        P_GP_TO_TIME: pass.gp_to_time || "",
        P_RSN_CATEGORY: pass.rsn_category,
        P_REASON: pass.reason,
        P_BELONGINGS: pass.belongings,
        P_APPROVAL_STATUS: "A",
        P_APPROVER_ID: user.code,
        P_RJCT_RSN: "",
        P_UPD_TERM: "172.16.37.219", // hardcoded terminal for now
        P_UPD_USER: user.code
      };

      const res = await updateGatePass(payload);
      if (res && res[0]?.P_FLG === 'Y') {
        toast.success(res[0]?.P_MSG || "Gate Pass Approved Successfully");
        loadData();
      } else {
        toast.error("Failed to approve Gate Pass");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error approving request");
    }
  };

  const handleRejectSubmit = async () => {
    if (!user || !rejectingPass) return;
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      const pass = rejectingPass;
      const payload = {
        P_SEQNO: pass.seqno || pass.SEQNO,
        P_COID: pass.coid || "KG01",
        P_BRID: pass.brid || "FP02",
        P_UPD_ID: "M",
        P_EMP_ID: pass.emp_id,
        P_DEPT_NODE: pass.dept_node,
        P_PARENT_NODE: pass.parent_node || "1.1",
        P_GP_DATE: pass.gp_date,
        P_GP_FR_TIME: pass.gp_fr_time,
        P_GP_TO_TIME: pass.gp_to_time || "",
        P_RSN_CATEGORY: pass.rsn_category,
        P_REASON: pass.reason,
        P_BELONGINGS: pass.belongings,
        P_APPROVAL_STATUS: "R",
        P_APPROVER_ID: user.code,
        P_RJCT_RSN: rejectReason,
        P_UPD_TERM: "172.16.37.219", // hardcoded terminal for now
        P_UPD_USER: user.code
      };

      const res = await updateGatePass(payload);
      if (res && res[0]?.P_FLG === 'Y') {
        toast.success(res[0]?.P_MSG || "Gate Pass Rejected Successfully");
        setRejectingPass(null);
        setRejectReason('');
        loadData();
      } else {
        toast.error("Failed to reject Gate Pass");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error rejecting request");
    }
  };

  if (loading && requests.length === 0) {
    return <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>;
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Exit Pass Management</h1>
            <p className="text-slate-500 dark:text-slate-400">Review and manage employee exit pass requests</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Pass No</th>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Dept</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Category & Reason</th>
                  <th className="p-4">Auth Person</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {requests.length > 0 ? requests.map((req, i) => (
                  <tr key={req.seqno || req.SEQNO || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-sm text-slate-800 dark:text-slate-200">{req.seqno || req.SEQNO || '-'}</td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{req.emp_name || '-'}</div>
                      <div className="text-xs text-slate-500">{req.emp_id || '-'}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{req.dept_node || '-'}</td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{req.gp_date || '-'}</div>
                      <div className="text-xs text-slate-500">{req.gp_fr_time || '-'} to {req.gp_to_time || '-'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{req.rsn_category || '-'}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[150px]" title={req.reason || ''}>{req.reason || '-'}</div>
                      {req.belongings && <div className="text-xs text-blue-500 truncate max-w-[150px]" title={req.belongings}>Items: {req.belongings}</div>}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{req.approver_id || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.approval_status === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          req.approval_status === 'R' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                        {req.approval_status === 'A' ? 'Approved' : req.approval_status === 'R' ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {(req.approval_status === 'P' || !req.approval_status) && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleApprove(req)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button onClick={() => setRejectingPass(req)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No exit pass requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Reject Exit Pass</h3>
              <p className="text-sm text-slate-500 mb-4">
                Please provide a reason for rejecting the exit pass request for {rejectingPass.emp_name || rejectingPass.emp_id}.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason (Required)..."
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                required
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setRejectingPass(null); setRejectReason(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExitPass;
