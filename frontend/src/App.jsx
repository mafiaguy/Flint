import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { globalCSS, C } from './theme';
import useStore from './store';
import Spinner from './components/ui/Spinner';
import Sidebar from './components/layout/Sidebar';

import Landing from './routes/Landing';
import Matches from './routes/Matches';

const Onboarding = lazy(() => import('./routes/Onboarding'));
const JobDetail = lazy(() => import('./routes/JobDetail'));
const Browse = lazy(() => import('./routes/Browse'));
const Tracker = lazy(() => import('./routes/Tracker'));
const Profile = lazy(() => import('./routes/Profile'));

function PageLoader() {
  return (
    <div style={{ padding: '60px 32px' }}>
      <Spinner size={24} color={C.t3} />
    </div>
  );
}

function AuthGuard({ children }) {
  const { user, profile } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && profile && !profile.onboarding_complete && !profile.role && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    }
  }, [user, profile, location.pathname]);

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "24px 40px 60px" }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/matches" element={<Matches />} />
            <Route path="/job/:id" element={<JobDetail />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/matches" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  const { initAuth, user } = useStore();

  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, []);

  return (
    <>
      <style>{globalCSS}</style>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/matches" replace /> : <Landing />} />
        <Route path="/onboarding" element={
          <AuthGuard>
            <Suspense fallback={<PageLoader />}>
              <Onboarding />
            </Suspense>
          </AuthGuard>
        } />
        <Route path="/*" element={
          <AuthGuard><AppLayout /></AuthGuard>
        } />
      </Routes>
    </>
  );
}
