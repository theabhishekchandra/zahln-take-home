import { HashRouter, Navigate, Route, Routes } from 'react-router';

import { Shell } from './components/Shell';
import { AttentionPage } from './features/attention/AttentionPage';
import { OverviewPage } from './features/overview/OverviewPage';
import { SignInPage } from './features/sign-in/SignInPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { useAuth } from './lib/auth';

/**
 * Hash URLs (`/#/transactions`), so the built dashboard runs from any static
 * host without rewrite rules. Signed out, every address shows sign-in.
 */
export function App() {
  const { user } = useAuth();
  return (
    <HashRouter>
      {user ? (
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<OverviewPage />} />
            <Route path="attention" element={<AttentionPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <SignInPage />
      )}
    </HashRouter>
  );
}
