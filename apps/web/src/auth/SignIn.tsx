import { useState } from 'react';
import type { FormEvent } from 'react';
import { APP_NAME } from '@regain/core';
import { Logo } from '../components/icons';
import { useAuth } from './AuthProvider';

export function SignIn() {
  const { configured, signInWithGoogle, signInWithPassword } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const google = async () => setMessage(await signInWithGoogle());

  // Local development only: there is no Google client locally until you add credentials.
  const devSubmit = async (e: FormEvent, create: boolean) => {
    e.preventDefault();
    setMessage(await signInWithPassword(email, password, create));
  };

  return (
    <main className="signin">
      <h1 className="m-title">
        <Logo />
        <span>{APP_NAME}</span>
      </h1>
      <p className="m-helper">Sign in to start capturing.</p>
      <button type="button" className="btn-primary signin-button" onClick={() => void google()}>
        Sign in with Google
      </button>
      {!configured && (
        <p className="m-notice" role="alert">
          This copy isn't connected to a backend yet.
        </p>
      )}
      {message && (
        <p className="m-notice" role="alert">
          {message}
        </p>
      )}

      {import.meta.env.DEV && (
        <form className="signin-dev" onSubmit={(e) => void devSubmit(e, false)}>
          <h2 className="m-h2">Local development</h2>
          <label htmlFor="dev-email">Email</label>
          <input
            id="dev-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="dev-password">Password</label>
          <input
            id="dev-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="signin-dev-actions">
            <button type="submit" className="btn-quiet">
              Sign in
            </button>
            <button type="button" className="btn-quiet" onClick={(e) => void devSubmit(e, true)}>
              Create account
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
