import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Loader from './components/Loader';

const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const ManagerCutOff = React.lazy(() => import('./pages/admin/settings/ManagerCutOff'));
const WorkerCutOff = React.lazy(() => import('./pages/admin/settings/WorkerCutOff'));
const AdminMaster = React.lazy(() => import('./pages/admin/settings/AdminMaster'));
const AttendancePolicy = React.lazy(() => import('./pages/admin/settings/AttendancePolicy'));
const AttendanceSummary = React.lazy(() => import('./pages/admin/AttendanceSummary'));
const AttendanceDetails = React.lazy(() => import('./pages/admin/AttendanceDetails'));
const LeavePolicy = React.lazy(() => import('./pages/admin/settings/LeavePolicy'));
const LeaveMaster = React.lazy(() => import('./pages/admin/settings/LeaveMaster'));
const LeaveRequestsReportPage = React.lazy(() => import('./pages/admin/LeaveRequestsReportPage'));
const MissingPunchReportPage = React.lazy(() => import('./pages/admin/MissingPunchReportPage'));

const EmployeeDashboard = React.lazy(() => import('./pages/employee/EmployeeDashboard'));
const EmployeeRequests = React.lazy(() => import('./pages/employee/EmployeeRequests'));
const MyAttendance = React.lazy(() => import('./pages/employee/MyAttendance'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] dark:bg-[#0b1120] text-slate-500">
    <Loader />
  </div>
);

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <React.Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<LoginPage />} />

                <Route element={<Layout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/master" element={<AdminMaster />} />
                  <Route path="/admin/policy" element={<AttendancePolicy />} />
                  <Route path="/admin/summary" element={<AttendanceSummary />} />
                  <Route path="/admin/details" element={<AttendanceDetails />} />
                  <Route path="/admin/leave-policy" element={<LeavePolicy />} />
                  <Route path="/admin/leave-master" element={<LeaveMaster />} />
                  <Route path="/admin/leave-requests-report" element={<LeaveRequestsReportPage />} />
                  <Route path="/admin/missing-punch-report" element={<MissingPunchReportPage />} />
                  <Route path="/admin/settings/manager-cut-off" element={<ManagerCutOff />} />
                  <Route path="/admin/settings/worker-cut-off" element={<WorkerCutOff />} />

                  <Route path="/employee" element={<EmployeeDashboard />} />
                  <Route path="/employee/attendance" element={<MyAttendance />} />
                  <Route path="/employee/requests" element={<EmployeeRequests />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </>
  );
}

export default App;
