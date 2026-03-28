import { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await api.auth.login(email, password);
      } else {
        result = await api.auth.register(email, password, displayName);
      }
      setAuth(result.token, result.user_id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
      <div className="w-full max-w-md p-8 bg-[var(--bg-secondary)] rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-[var(--ws-primary-500)]">Enryo</h1>
        
        <h2 className="text-xl font-semibold mb-6 text-center text-[var(--text-primary)]">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded focus:border-[var(--ws-primary-500)] focus:outline-none text-[var(--text-primary)]"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded focus:border-[var(--ws-primary-500)] focus:outline-none text-[var(--text-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded focus:border-[var(--ws-primary-500)] focus:outline-none text-[var(--text-primary)]"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-[var(--ws-primary-500)] text-[var(--ws-primary-bg)] font-semibold rounded hover:opacity-90 transition-colors"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[var(--ws-primary-500)] hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
