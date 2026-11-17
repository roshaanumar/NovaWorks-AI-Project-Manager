import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState('admin@novaworks.example');
  const [password, setPassword] = useState('Demo123!');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo123!');
    setLocalError('');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-tertiary-container/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 p-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-lg shadow-primary/25 mb-3">
            <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-on-surface tracking-tight">NovaWorks AI CRM</h1>
          <p className="text-sm text-on-surface-variant mt-1">Autonomous Project Delivery System</p>
        </div>

        {/* Error Notification */}
        {(localError || authError) && (
          <div className="mb-6 p-3 rounded-xl bg-error-container text-on-error-container text-sm flex items-center gap-2 border border-error/20">
            <span className="material-symbols-outlined text-[20px] text-error">error</span>
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@novaworks.example"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 focus:border-primary focus:bg-white focus:outline-none text-sm transition-all text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-[18px] text-on-surface-variant">
                lock
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 focus:border-primary focus:bg-white focus:outline-none text-sm transition-all text-on-surface"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Sign In to CRM</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Strip */}
        <div className="mt-8 pt-6 border-t border-outline-variant/30">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant text-center mb-3">
            Quick 1-Click Demo Accounts (Password: Demo123!)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@novaworks.example')}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-left transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <span className="font-medium text-on-surface truncate">Admin (Full Access)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ayesha@novaworks.example')}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-left transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="font-medium text-on-surface truncate">Ayesha (Web PM)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('bilal@novaworks.example')}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-left transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="font-medium text-on-surface truncate">Bilal (Mobile PM)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ali@novaworks.example')}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-left transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="font-medium text-on-surface truncate">Ali (Full-Stack Agent)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
