import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Cloud, Briefcase } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { users } = useAppData();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'Employee' | 'Admin'>('Employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'Admin') {
      if ((email === 'admin1' && password === 'admin1') || (email === 'admin2' && password === 'admin2')) {
        const userToLogin = users.find(u => u.id === email);
        if (userToLogin) {
          login(userToLogin);
          navigate('/admin');
          return;
        }
      }
      setError('Invalid admin credentials');
    } else {
      // Employee
      if (password === '123') {
        const userToLogin = users.find(u => u.role === 'Employee' && u.code.toLowerCase() === email.toLowerCase());
        if (userToLogin) {
          login(userToLogin);
          navigate('/employee');
          return;
        }
      }
      setError('Invalid employee credentials');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80")' }}
    >
      {/* Overlay to fade the background slightly */}
      <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-[2px] transition-colors duration-300"></div>

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">KG International Pvt. Ltd.</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 transition-colors">Enterprise Resource Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#ebebeb] dark:bg-[#1e293b] rounded-xl shadow-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors duration-300">

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => { setActiveTab('Employee'); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'Employee' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#182333]/50'}`}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('Admin'); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'Admin' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#182333]/50'}`}
            >
              Admin
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 pb-6 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-xs font-bold text-center border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase mb-1.5">Email or Username</label>
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
                <a href="#" className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Forgot Password?</a>
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

            <div className="flex items-center gap-2 pb-2">
              <input type="checkbox" id="remember" className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-[#0b1120] cursor-pointer" />
              <label htmlFor="remember" className="text-[11px] font-medium text-slate-500 dark:text-slate-400 cursor-pointer">Remember this session</label>
            </div>

            <button
              type="submit"
              className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center gap-2 text-sm"
            >
              Sign In <LogIn className="w-4 h-4" />
            </button>

            <p className="text-center text-[10px] text-slate-400 mt-2">
              {activeTab === 'Admin'
                ? 'Admin: Username (admin1 or admin2) / Password (admin1 or admin2)'
                : 'Employee: Username (e.g. EMP001) / Password (123)'}
            </p>
          </form>

          {/* Footer Area */}
          <div className="px-8 pb-8">
            <div className="text-center mb-5">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Need assistance? <a href="#" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Contact HR Support</a></p>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60"></div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">OR SINGLE SIGN-ON</span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Cloud className="w-4 h-4 text-blue-500" /> Microsoft 365
              </button>
              <button type="button" className="flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Briefcase className="w-4 h-4 text-red-500" /> Google Work
              </button>
            </div>
          </div>

          {/* System Status Footer */}
          <div className="bg-slate-50 dark:bg-[#182333]/50 p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">System Operational</span>
            </div>
            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">v2.4.1 Build 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
