// src/pages/auth/OAuthSuccess.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

export default function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { isOnboarded } = useDashboardStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        
        // Save to Zustand auth store
        setAuth(user, token);
        
        toast.success(`Welcome back, ${user.name || 'User'}! Successfully authenticated with Google.`);

        // Redirect based on onboarding status (using database user.onboarding_complete as truth source)
        if (user.onboarding_complete) {
          // Synchronize store's onboarded state
          useDashboardStore.getState().setOnboarding({
            household_type: user.household_type,
            location: user.location,
            home_type: user.home_type,
            bill_amount: 0,
            units_per_month: 0,
            appliances: [],
            estimated_units: 0,
            accuracy_pct: 0,
            prev_bills: []
          });
          navigate('/dashboard');
        } else {
          // Clear any stale cached state from previous users
          useDashboardStore.getState().resetDashboard();
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('Error parsing OAuth user data:', error);
        toast.error('Google authentication failed during account synchronization.');
        navigate('/login');
      }
    } else {
      toast.error('Invalid or expired Google authentication credentials.');
      navigate('/login');
    }
  }, [searchParams, navigate, setAuth, isOnboarded]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-body p-4 relative overflow-hidden">
      {/* Background Neon Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 bg-surface-container rounded-2xl p-8 border border-outline shadow-xl text-center backdrop-blur-md">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="size-16 rounded-2xl bg-surface border border-outline flex items-center justify-center relative">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
          {/* Pulsing Outer Ring */}
          <div className="absolute size-20 rounded-2xl border-2 border-primary/20 animate-ping pointer-events-none" />
        </div>
        
        <h2 className="font-display text-xl font-semibold text-on-surface tracking-tight mb-2">Syncing with Google</h2>
        <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
          Please wait while we securely fetch your energy profile details and establish a secure session...
        </p>
      </div>
    </div>
  );
}
