import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import LandingPage from '@/pages/LandingPage';
import SignInPage from '@/pages/SignInPage';
import SignUpPage from '@/pages/SignUpPage';
import DashboardPage from '@/pages/DashboardPage';
import AssistantPage from '@/pages/AssistantPage';
import ConversationsPage from '@/pages/ConversationsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import WidgetDemoPage from '@/pages/WidgetDemoPage';
import AccountSettingsPage from '@/pages/AccountSettingsPage';
import AdminPage from '@/pages/AdminPage';
import ChatWidget from '@/components/ChatWidget';

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  );
}

// ProtectedRoute: if not logged in → redirect to /signin.
// Uses <Navigate> (declarative) — never navigate() during render.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

// GuestRoute: if already logged in → redirect to /dashboard.
// This replaces the broken navigate()-during-render pattern in SignIn/SignUp.
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// AdminRoute: protected + admin check. Waits for profile to load.
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, profile } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/signin" replace />;
  if (!profile) return <FullPageLoader />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/signin"
        element={
          <GuestRoute>
            <SignInPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignUpPage />
          </GuestRoute>
        }
      />
      <Route path="/demo/:assistantId" element={<WidgetDemoPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/:id"
        element={
          <ProtectedRoute>
            <AssistantPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/:id/conversations"
        element={
          <ProtectedRoute>
            <ConversationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant/:id/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AccountSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ChatWidgetMount />
      </BrowserRouter>
    </AuthProvider>
  );
}

function ChatWidgetMount() {
  const params = new URLSearchParams(window.location.search);
  const widgetAssistantId = params.get('widget');
  if (!widgetAssistantId) return null;
  return <ChatWidget assistantId={widgetAssistantId} embedded />;
}

export default App;
