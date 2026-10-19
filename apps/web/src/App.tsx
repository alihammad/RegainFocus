import { useSyncExternalStore } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { SignIn } from './auth/SignIn';
import { DataProvider } from './data/DataProvider';
import { MobileApp } from './mobile/MobileApp';
import { WebApp } from './web/WebApp';

// The phone gets the capture app; a desk-sized window gets the web app. Same data either way.
const PHONE = '(max-width: 767px)';

function useIsPhone(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(PHONE);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

function Shell() {
  const { state } = useAuth();
  const phone = useIsPhone();

  if (state.status === 'loading') return null;
  if (state.status === 'signedOut') return <SignIn />;
  return <DataProvider userId={state.userId}>{phone ? <MobileApp /> : <WebApp />}</DataProvider>;
}

export function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
