import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Register = () => {
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');
      
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-surface/50 backdrop-blur-md p-8 rounded-2xl border border-theme-subtle shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary tracking-tight">Create Account</h1>
          <p className="text-secondary mt-2">Register for REX ERP</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm text-center">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Full Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface border border-theme-subtle rounded px-4 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Username</label>
            <input 
              type="text" 
              value={formData.username} 
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              className="w-full bg-surface border border-theme-subtle rounded px-4 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Role</label>
            <select 
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-surface border border-theme-subtle rounded px-4 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              value={formData.password} 
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-surface border border-theme-subtle rounded px-4 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-rex-600 hover:bg-rex-700 text-white font-bold py-3 px-4 rounded transition-colors mt-6"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-secondary">
          Already have an account? <span className="text-rex-500 cursor-pointer hover:underline" onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </div>
    </div>
  );
};
