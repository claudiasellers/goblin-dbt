import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { logIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await logIn(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to log in. Please check your email and password.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-warm-50)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">🌿</span>
          <h1 className="text-2xl font-bold text-[var(--color-sage-800)] mb-2">
            Welcome back
          </h1>
          <p className="text-[var(--color-sage-600)]">
            Log in to continue your journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-[var(--color-sage-700)] mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-lg border border-[var(--color-sage-300)] bg-white text-[var(--color-sage-800)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-[var(--color-sage-700)] mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-lg border border-[var(--color-sage-300)] bg-white text-[var(--color-sage-800)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-sage-600)]">
          Don't have an account?{' '}
          <Link 
            to="/signup" 
            className="text-[var(--color-sage-700)] font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link 
            to="/tools" 
            className="text-sm text-[var(--color-sage-500)] hover:underline"
          >
            Continue without an account →
          </Link>
        </p>
      </div>
    </div>
  );
}
