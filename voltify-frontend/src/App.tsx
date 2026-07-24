// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useDashboardStore } from './store/dashboardStore';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import VerifyOTP from './pages/auth/VerifyOTP';
import Onboarding from './pages/onboarding';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import OAuthSuccess from './pages/auth/OAuthSuccess';
import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';
import Leaderboard from './pages/Leaderboard';
import Streak from './pages/Streak';
import Shop from './pages/Shop';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import InfoPage from './pages/InfoPage';
import AppLayout from './components/layout/AppLayout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ReactNode, useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { apiService } from './lib/api';

// Route Guard: Access only if authenticated
function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Route Guard: Access dashboard components only if calibrated through onboarding
function OnboardedRoute({ children }: { children: ReactNode }) {
  const { isOnboarded } = useDashboardStore();
  return isOnboarded ? children : <Navigate to="/onboarding" replace />;
}

// Route Guard: Redirect logged in users away from guest pages (Landing, Login, Signup)
function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { token, logout, updateUser } = useAuthStore();
  const [checkingAuth, setCheckingAuth] = useState(!!token);

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const user = await apiService.getMe();
        if (user) {
          updateUser(user);
        }
      } catch (err: any) {
        console.error('Session verification failed. Logging out...', err);
        // Stale session or user deleted in DB
        logout();
      } finally {
        setCheckingAuth(false);
      }
    }
    verifySession();
  }, [token, logout, updateUser]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-body text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute inset-0 size-16 rounded-full bg-primary/20 animate-ping" />
          <img src="/logo.gif" alt="Voltify Logo" className="size-16 animate-pulse relative z-10" />
        </div>
        <p className="text-gray-400 text-sm tracking-wide font-medium">Verifying session...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing */}
        <Route path="/" element={<Landing />} />
        <Route path="/info/:slug" element={<InfoPage />} />

        {/* Guest Auth Screens */}
        <Route 
          path="/login" 
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <GuestRoute>
              <Signup />
            </GuestRoute>
          } 
        />
        <Route 
          path="/verify-otp" 
          element={
            <GuestRoute>
              <VerifyOTP />
            </GuestRoute>
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <GuestRoute>
              <ForgotPassword />
            </GuestRoute>
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            <GuestRoute>
              <ResetPassword />
            </GuestRoute>
          } 
        />
        <Route 
          path="/oauth-success" 
          element={
            <GuestRoute>
              <OAuthSuccess />
            </GuestRoute>
          } 
        />

        {/* Authenticated Onboarding Wizard */}
        <Route 
          path="/onboarding" 
          element={
            <PrivateRoute>
              <Onboarding />
            </PrivateRoute>
          } 
        />

        {/* Dashboard Shell layout with nested navigation */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          {/* Main Dashboard - Guarded by onboarding */}
          <Route 
            path="dashboard" 
            element={
              <OnboardedRoute>
                <Dashboard />
              </OnboardedRoute>
            } 
          />
          {/* Sub-features - Guarded by onboarding */}
          <Route 
            path="predictions" 
            element={
              <OnboardedRoute>
                <Predictions />
              </OnboardedRoute>
            } 
          />
          <Route 
            path="leaderboard" 
            element={
              <OnboardedRoute>
                <Leaderboard />
              </OnboardedRoute>
            } 
          />
          <Route 
            path="notifications" 
            element={
              <OnboardedRoute>
                <Notifications />
              </OnboardedRoute>
            } 
          />
          <Route 
            path="streak" 
            element={
              <OnboardedRoute>
                <Streak />
              </OnboardedRoute>
            } 
          />
          <Route 
            path="shop" 
            element={
              <OnboardedRoute>
                <Shop />
              </OnboardedRoute>
            } 
          />
          {/* Generic details accessible even prior to onboarding */}
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback wildcard routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Clean SaaS styled toast container */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: '#1a1a1a',
          border: '1px solid #333',
          color: '#ededed',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      />
    </BrowserRouter>
  );
}
