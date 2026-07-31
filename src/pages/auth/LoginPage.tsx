import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { loginEmployeeExternal, fetchEmployeeDetails } from '../../api';
import type { Role } from '../../types';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        username: email,
        password: password,
        ClientIp: "172.16.32.193",
        UserName: email,
        Password: password
      };

      const userLoginData = await loginEmployeeExternal(payload);

      if (userLoginData && userLoginData.p_flg === 'Y' && userLoginData.token) {
        localStorage.setItem('attendance_auth_token', userLoginData.token);

        const empDetails = await fetchEmployeeDetails(userLoginData.p_emp_id || userLoginData.p_user_name);
        const empDataArr = empDetails?.EMP_DATA || [];
        const loginUser = empDataArr.find((emp: any) => emp.e_code === userLoginData.p_emp_id);
        const isManager = empDataArr.some((emp: any) => emp.manager_code === userLoginData.p_emp_id);

        const loginUserRole: Role = isManager ? 'Admin' : 'Employee';
        const userObj = {
          token: userLoginData.token,
          id: userLoginData.p_emp_id || userLoginData.p_user_name,
          code: userLoginData.p_emp_id || userLoginData.p_user_name,
          name: userLoginData.p_emp_name,
          role: loginUserRole,

          image: userLoginData.p_img || '',
          designation: loginUser?.e_desg || 'NA',
          employee_list: empDataArr,
          manager_code: loginUser?.s_mgrcd || null,
          manager_name: loginUser?.mgrname || null,
        };

        login(userObj);
        navigate(loginUserRole === 'Admin' ? '/admin' : '/employee');
      } else {
        setError(userLoginData?.message || 'Invalid credentials from external API');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url("/main.avif")' }}
    >
      {/* Overlay to fade the background slightly */}
      <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-[2px] transition-colors duration-300"></div>

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">K. Girdharlal International Pvt. Ltd.</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 transition-colors">Enterprise Resource Management</p>
        </div>
        {/* Login Card */}
        <div className="bg-[#ebebeb] dark:bg-[#1e293b] rounded-xl shadow-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors duration-300">
          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 pb-6 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-xs font-bold text-center border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase mb-1.5">Username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your credentials"
                className="w-full px-3 py-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                {/* <input type="checkbox" id="remember" className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-[#0b1120] cursor-pointer" />
                <label htmlFor="remember" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 cursor-pointer">Remember this session</label> */}
              </div>
              <a href="#" className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {isSubmitting ? 'Signing In...' : <>Sign In <LogIn className="w-4 h-4" /></>}
            </button>
          </form>
          <div className="px-8 pb-8">
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
