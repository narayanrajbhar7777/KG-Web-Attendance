import React, { useState } from 'react';
import { Mail, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const EmailConfiguration: React.FC = () => {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number | ''>(587);
  const [emailAddress, setEmailAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [senderName, setSenderName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!smtpHost) newErrors.smtpHost = 'SMTP Host is required';
    if (!smtpPort) newErrors.smtpPort = 'SMTP Port is required';
    else if (Number(smtpPort) <= 0) newErrors.smtpPort = 'SMTP Port must be greater than 0';
    
    if (!emailAddress) newErrors.emailAddress = 'Email Address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) newErrors.emailAddress = 'Enter a valid email address';
    
    if (!appPassword) newErrors.appPassword = 'App Password is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Email configuration saved successfully.');
    }, 800);
  };

  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove your email configuration?')) {
      setSmtpHost('');
      setSmtpPort(587);
      setEmailAddress('');
      setAppPassword('');
      setSenderName('');
      setErrors({});
      toast.success('Email configuration removed successfully.');
    }
  };

  return (
    <div className="flex flex-col animate-fade-in-up gap-4 max-w-4xl mx-auto pb-6">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Email Configuration</h1>
      </div>

      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg text-blue-600 dark:text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">SMTP Server Settings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure your email provider to send scheduled emails</p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                SMTP Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className={`w-full px-4 py-2.5 rounded-xl border ${errors.smtpHost ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} bg-white dark:bg-[#0b1120] text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 transition-shadow`}
              />
              {errors.smtpHost && <p className="text-xs text-red-500 font-medium">{errors.smtpHost}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                SMTP Port <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value ? Number(e.target.value) : '')}
                placeholder="587"
                className={`w-full px-4 py-2.5 rounded-xl border ${errors.smtpPort ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} bg-white dark:bg-[#0b1120] text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 transition-shadow`}
              />
              {errors.smtpPort && <p className="text-xs text-red-500 font-medium">{errors.smtpPort}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="user@gmail.com"
                className={`w-full px-4 py-2.5 rounded-xl border ${errors.emailAddress ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} bg-white dark:bg-[#0b1120] text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 transition-shadow`}
              />
              {errors.emailAddress && <p className="text-xs text-red-500 font-medium">{errors.emailAddress}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                App Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 pr-10 rounded-xl border ${errors.appPassword ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} bg-white dark:bg-[#0b1120] text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 transition-shadow`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">If using Gmail, use an App Password, not your real password.</p>
              {errors.appPassword && <p className="text-xs text-red-500 font-medium">{errors.appPassword}</p>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Sender Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="KG Workforce Portal"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm shadow-blue-500/30"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={handleRemove}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-[#1e293b] hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-500/20 font-bold py-2.5 px-6 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfiguration;
