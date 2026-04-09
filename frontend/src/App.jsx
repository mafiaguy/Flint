import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/app-sidebar';
import useStore from './store';

import Landing from './routes/Landing';
import Matches from './routes/Matches';

const Onboarding = lazy(() => import('./routes/Onboarding'));
const JobDetail = lazy(() => import('./routes/JobDetail'));
const Browse = lazy(() => import('./routes/Browse'));
const Tracker = lazy(() => import('./routes/Tracker'));
const Profile = lazy(() => import('./routes/Profile'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center p-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
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
  }, [user, profile, location.pathname, navigate]);

  if (user === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PageHeader({ title }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <span className="text-sm font-medium">{title}</span>
    </header>
  );
}

function AppLayout() {
  const location = useLocation();
  const pageTitle = {
    '/matches': 'Matches',
    '/browse': 'Browse',
    '/tracker': 'Tracker',
    '/profile': 'Profile',
  }[location.pathname] || (location.pathname.startsWith('/job/') ? 'Job Details' : 'Matches');

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageHeader title={pageTitle} />
        <main className="flex-1 p-6">
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
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  const { initAuth, user } = useStore();

  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, []);

  return (
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
  );
}
