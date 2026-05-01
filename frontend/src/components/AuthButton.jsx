import { useState } from 'react';
import { signInWithGoogle, signOutUser } from '../gcp/auth';
import { LogIn, LogOut, User } from 'lucide-react';

export default function AuthButton({ user, onLogin, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleLogin() {
    setLoading(true); setError('');
    try {
      await signInWithGoogle();
      if (onLogin) onLogin();
    } catch (e) {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOutUser();
    if (onLogout) onLogout();
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-8 h-8 rounded-full border-2 border-primary"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        )}
        <span className="text-sm text-textMuted hidden sm:block max-w-[120px] truncate">
          {user.displayName || user.email}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-textMuted hover:text-primary transition-colors"
          title="Sign out"
          id="btn-signout"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">Out</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        id="btn-google-signin"
        onClick={handleLogin}
        disabled={loading}
        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
      >
        <LogIn size={16} />
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
