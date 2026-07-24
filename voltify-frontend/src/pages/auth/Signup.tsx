import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useDashboardStore } from '../../store/dashboardStore';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { isOnboarded } = useDashboardStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const response = await apiService.signup(data);
      toast.success('Account created! Please verify your email.');
      // Pass email, token, and user so the OTP page can log them in directly
      navigate('/verify-otp', { state: { email: data.email, token: response.token, user: response.user } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account. Email may be taken.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    if (provider === 'google') {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      window.location.href = `${apiBase}/auth/google?state=${encodeURIComponent(window.location.origin)}`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <img src="/logo.gif" alt="Voltify Logo" className="size-16 object-contain" />
          </Link>
          <h1 className="font-display text-2xl font-semibold text-on-surface tracking-tight">Create an account</h1>
          <p className="text-on-surface-variant mt-1.5 text-sm">Start your energy saving journey today.</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container rounded-2xl p-8 border border-outline shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-on-surface mb-1.5">Full Name</label>
              <div className="relative">
                <input
                  {...register('name')}
                  id="name"
                  type="text"
                  placeholder="Ravi Kumar"
                  className="w-full px-4 py-2.5 bg-surface border border-outline rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-on-surface mb-1.5">Email</label>
              <div className="relative">
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 bg-surface border border-outline rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-on-surface mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 pr-12 py-2.5 bg-surface border border-outline rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-error text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-on-surface text-surface font-medium rounded-lg hover:bg-on-surface/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <><span className="size-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />Creating account…</>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-outline" />
            <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Or continue with</span>
            <div className="flex-1 h-px bg-outline" />
          </div>

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3">
            <button onClick={() => handleOAuth('google')} className="w-full flex items-center justify-center gap-2 py-2 border border-outline rounded-lg text-sm font-medium hover:bg-surface-variant transition-colors text-on-surface">
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          <p className="text-center text-on-surface-variant text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-inverse-primary font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
