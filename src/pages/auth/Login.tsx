import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AnimatedGearsOverlay = () => (
  <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-30 absolute inset-0 z-0 mix-blend-screen pointer-events-none">
    <style>
      {`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes spin-reverse { 100% { transform: rotate(-360deg); } }
        .gear-1 { animation: spin 20s linear infinite; transform-origin: center; }
        .gear-2 { animation: spin-reverse 15s linear infinite; transform-origin: center; }
        .gear-3 { animation: spin 12s linear infinite; transform-origin: center; }
        .gear-4 { animation: spin-reverse 25s linear infinite; transform-origin: center; }
      `}
    </style>
    
    {/* Center huge gear */}
    <g transform="translate(200,200)">
      <g className="gear-1">
        <circle r="90" fill="none" stroke="#ef4444" strokeWidth="15"/>
        <circle r="40" fill="none" stroke="#ef4444" strokeWidth="8"/>
        {[...Array(16)].map((_, i) => (
          <rect key={i} x="-12" y="-110" width="24" height="30" rx="4"
            fill="#ef4444" transform={`rotate(${i * (360/16)})`}/>
        ))}
        {[...Array(8)].map((_, i) => (
          <line key={i} x1="0" y1="0" x2="0" y2="-32"
            stroke="#ef4444" strokeWidth="4" transform={`rotate(${i * 45})`}/>
        ))}
      </g>
    </g>

    {/* Top-left medium gear */}
    <g transform="translate(70,90)">
      <g className="gear-2">
        <circle r="50" fill="none" stroke="#ef4444" strokeWidth="10"/>
        <circle r="20" fill="none" stroke="#ef4444" strokeWidth="6"/>
        {[...Array(12)].map((_, i) => (
          <rect key={i} x="-8" y="-65" width="16" height="25" rx="3"
            fill="#ef4444" transform={`rotate(${i * 30})`}/>
        ))}
      </g>
    </g>

    {/* Bottom-right small gear */}
    <g transform="translate(330,310)">
      <g className="gear-3">
        <circle r="45" fill="none" stroke="#ef4444" strokeWidth="8"/>
        <circle r="18" fill="none" stroke="#ef4444" strokeWidth="5"/>
        {[...Array(10)].map((_, i) => (
          <rect key={i} x="-6" y="-55" width="12" height="20" rx="2"
            fill="#ef4444" transform={`rotate(${i * 36})`}/>
        ))}
      </g>
    </g>

    {/* Top-right tiny gear */}
    <g transform="translate(340,70)">
      <g className="gear-4">
        <circle r="25" fill="none" stroke="#ef4444" strokeWidth="5"/>
        <circle r="10" fill="none" stroke="#ef4444" strokeWidth="3"/>
        {[...Array(8)].map((_, i) => (
          <rect key={i} x="-4" y="-32" width="8" height="12" rx="1.5"
            fill="#ef4444" transform={`rotate(${i * 45})`}/>
        ))}
      </g>
    </g>
  </svg>
);

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login');
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── LEFT PANEL — Mechanical Visual ────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-zinc-950 items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 opacity-70 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/images/login-bg.jpg')" }}
        />
        
        {/* dark red gradient overlays to blend with theme */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-rex-950/90 via-zinc-950/80 to-zinc-950/95" />
        <div className="absolute top-0 left-0 w-full h-full bg-rex-700/10 mix-blend-overlay" />
        
        {/* Animated SVG Gears on top */}
        <AnimatedGearsOverlay />

        {/* Brand text over illustration */}
        <div className="absolute bottom-16 left-0 right-0 text-center z-10 px-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-rex-700/50" />
            <span className="text-rex-500 text-[10px] font-bold tracking-[0.3em] uppercase drop-shadow-md">Manufacturing ERP</span>
            <div className="h-px flex-1 bg-rex-700/50" />
          </div>
          <h2 className="text-5xl font-black text-white tracking-tight leading-none drop-shadow-lg">REX INDUSTRIES</h2>
          <p className="text-zinc-400 text-sm mt-3 tracking-widest uppercase font-semibold">Precision · Production · Performance</p>
        </div>

        {/* Top-left badge */}
        <div className="absolute top-8 left-8 z-10 flex items-center gap-2 bg-zinc-900/60 backdrop-blur px-3 py-1.5 rounded-sm border border-zinc-800">
          <div className="w-6 h-6 bg-rex-700 flex items-center justify-center rounded-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <span className="text-white text-[10px] font-bold tracking-widest uppercase">Rex ERP</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        {/* Mobile background overlay */}
        <div 
          className="lg:hidden absolute inset-0 z-0 opacity-10 bg-cover bg-center grayscale"
          style={{ backgroundImage: "url('/assets/images/login-bg.jpg')" }}
        />
        
        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo (only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-rex-700 mx-auto flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h1 className="text-3xl font-black text-primary tracking-tight">REX ERP</h1>
          </div>

          <div className="mb-10">
            <h3 className="text-xs font-bold text-rex-500 uppercase tracking-[0.25em] mb-2">Welcome back</h3>
            <h1 className="text-3xl font-black text-primary tracking-tight leading-none">Sign In</h1>
            <p className="text-secondary text-sm mt-2">Enter your credentials to access the system</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-[0.2em]">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your.username"
                className="w-full bg-surface border border-theme-subtle px-4 py-3 rounded text-primary placeholder-muted focus:border-rex-500 focus:ring-1 focus:ring-rex-500/30 outline-none transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-[0.2em]">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface border border-theme-subtle px-4 py-3 rounded text-primary placeholder-muted focus:border-rex-500 focus:ring-1 focus:ring-rex-500/30 outline-none transition-all text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rex-600 hover:bg-rex-700 rounded disabled:opacity-60 text-white font-bold py-3 px-4 transition-colors tracking-wider text-sm uppercase flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-faint mt-12 tracking-widest uppercase">
            © 2026 Rex Industries · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};
