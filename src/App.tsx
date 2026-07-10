import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AttendanceSummary from './pages/admin/AttendanceSummary';
import AttendanceDetails from './pages/admin/AttendanceDetails';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeRequests from './pages/employee/EmployeeRequests';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/summary" element={<AttendanceSummary />} />
              <Route path="/admin/details" element={<AttendanceDetails />} />
              
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/employee/requests" element={<EmployeeRequests />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
