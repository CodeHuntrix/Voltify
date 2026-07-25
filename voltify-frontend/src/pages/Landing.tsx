// src/pages/Landing.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Play, Check, Award, Cpu, ShieldCheck, UserCheck, UploadCloud, TrendingDown, X, Sparkles, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useGamificationStore } from '../store/gamificationStore';

// ─── Sample demo data injected for judge / guided demo mode ─────────────────
const DEMO_PROFILE = {
  household_type: 'family' as const,
  location: 'Chennai' as const,
  home_type: 'apartment' as const,
  bill_amount: 3840,
  units_per_month: 480,
  appliances: [
    { id: 'AC',     name: 'Air Conditioner', icon: '❄️', power_kw: 1.5,   avg_hours_day: 8,  seasonality: 'summer' },
    { id: 'Fridge', name: 'Refrigerator',    icon: '🧊', power_kw: 0.4,   avg_hours_day: 24, seasonality: 'whole_year' },
    { id: 'Lights', name: 'Lights',          icon: '💡', power_kw: 0.3,   avg_hours_day: 5,  seasonality: 'whole_year' },
    { id: 'Fans',   name: 'Fans',            icon: '🌀', power_kw: 0.075, avg_hours_day: 8,  seasonality: 'whole_year' },
    { id: 'TV',     name: 'Television',      icon: '📺', power_kw: 0.1,   avg_hours_day: 5,  seasonality: 'whole_year' },
  ],
  estimated_units: 472,
  accuracy_pct: 97,
  prev_bills: [
    { month: 'June 2026',  amount: 3840, units: 480 },
    { month: 'May 2026',   amount: 3520, units: 440 },
    { month: 'April 2026', amount: 2880, units: 360 },
  ],
};

// ─── Demo Entry Modal ─────────────────────────────────────────────────────────
interface DemoModalProps { onClose: () => void; }

function DemoEntryModal({ onClose }: DemoModalProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { setOnboarding, setApplianceBreakdown, setDailyHistory } = useDashboardStore();
  const { addCoins, setRank } = useGamificationStore();

  const launchGuidedDemo = () => {
    // Inject a mock auth session
    setAuth(
      {
        id: 'demo-judge',
        name: 'Judge (Demo)',
        email: 'judge@voltify.demo',
        tier: 3,
        coins: 420,
        streak_days: 12,
        household_type: DEMO_PROFILE.household_type,
        location: DEMO_PROFILE.location,
        home_type: DEMO_PROFILE.home_type,
        appliance_count: DEMO_PROFILE.appliances.length,
      } as any,
      'demo-mock-jwt-token'
    );

    // Pre-fill dashboard store with sample data
    const NEON_COLORS = ['#22d3ee', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
    const totalKwh = DEMO_PROFILE.appliances.reduce((s, a) => s + a.power_kw * a.avg_hours_day * 30, 0);
    const breakdown = DEMO_PROFILE.appliances.map((a, idx) => ({
      name: a.name, icon: a.icon,
      units: parseFloat((a.power_kw * a.avg_hours_day * 30).toFixed(1)),
      percentage: parseFloat(((a.power_kw * a.avg_hours_day * 30) / totalKwh * 100).toFixed(1)),
      cost: parseFloat((a.power_kw * a.avg_hours_day * 30 * 8.0).toFixed(0)),
      color: NEON_COLORS[idx % NEON_COLORS.length],
    }));

    // Simulate 30 days of daily usage history
    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      const base = DEMO_PROFILE.units_per_month / 30;
      return { 
        date: d.toISOString().split('T')[0], 
        units: parseFloat((base * (0.85 + Math.random() * 0.3)).toFixed(1)),
        cost: parseFloat((base * 8.0).toFixed(0)),
        label: `${d.getDate()}/${d.getMonth() + 1}`
      };
    });

    setOnboarding({
      household_type: DEMO_PROFILE.household_type,
      location: DEMO_PROFILE.location,
      home_type: DEMO_PROFILE.home_type,
      bill_amount: DEMO_PROFILE.bill_amount,
      units_per_month: DEMO_PROFILE.units_per_month,
      appliances: DEMO_PROFILE.appliances.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        power_kw: a.power_kw,
        avg_hours_day: a.avg_hours_day,
        seasonality: a.seasonality as any
      })),
      estimated_units: DEMO_PROFILE.estimated_units,
      accuracy_pct: DEMO_PROFILE.accuracy_pct,
      prev_bills: DEMO_PROFILE.prev_bills
    });
    setApplianceBreakdown(breakdown);
    setDailyHistory(history);
    addCoins(420);
    setRank(12);

    onClose();
    navigate('/dashboard');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 size-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06] flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono">Live Demo Mode</span>
            </div>
            <h2 className="font-display text-xl font-bold text-white">Try Voltify — No Setup Needed</h2>
            <p className="text-gray-400 text-sm mt-1">Pick how you'd like to explore the platform.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 flex-shrink-0">
            <X className="size-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A — Guided Demo */}
          <button
            onClick={launchGuidedDemo}
            className="group relative flex flex-col gap-4 p-5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-sky-500/5 text-left hover:border-primary/60 hover:from-primary/15 transition-all duration-200 shadow-[0_0_20px_rgba(0,112,243,0.08)] hover:shadow-[0_0_32px_rgba(0,112,243,0.2)] cursor-pointer"
          >
            <div className="absolute inset-0 rounded-xl ring-1 ring-primary/20 group-hover:ring-primary/40 transition-all" />
            <div className="size-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1 font-mono">Recommended for judges</div>
              <div className="font-display font-semibold text-base text-white mb-1.5">Launch Guided Demo</div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Pre-filled with a sample Chennai household — full dashboard, AI coach, streaks &amp; leaderboard, all ready instantly.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
              <Play className="size-3.5 fill-current" /> Launch now
            </div>
          </button>

          {/* Option B — Own Bill */}
          <button
            onClick={() => { onClose(); navigate('/signup'); }}
            className="group flex flex-col gap-4 p-5 rounded-xl border border-white/10 bg-white/[0.03] text-left hover:border-white/20 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
          >
            <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <FileText className="size-5 text-gray-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 font-mono">Use your own data</div>
              <div className="font-display font-semibold text-base text-white mb-1.5">Start with My Bill</div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Upload your actual electricity PDF — our AI extracts the numbers and builds your personal energy profile.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold">
              <ArrowRight className="size-3.5" /> Sign up free
            </div>
          </button>
        </div>

        <div className="px-6 pb-5 text-center text-[11px] text-gray-600">
          Demo mode uses sample data only. No account needed for the guided demo.
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <>
    {showDemoModal && <DemoEntryModal onClose={() => setShowDemoModal(false)} />}
    <div className="antialiased h-dvh flex flex-col text-on-surface bg-slate-950 font-headline selection:bg-primary/20 selection:text-white overflow-hidden">
      {/* Navigation Bar */}
      <nav className="bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/[0.06] shadow-sm">
        <div className="flex justify-between items-center w-full px-6 md:px-10 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-[1.01]">
            <img src="/logo.gif" alt="Voltify Logo" className="size-10 object-contain" />
            <span className="font-display font-bold text-xl tracking-tight text-white">Voltify</span>
          </Link>
          
          {/* Removed features links as requested */}
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link className="hidden md:inline-block text-gray-400 hover:text-white transition-colors text-sm font-semibold tracking-wide px-4 py-2" to="/dashboard">Dashboard</Link>
            ) : (
              <Link className="hidden md:inline-block text-gray-400 hover:text-white transition-colors text-sm font-semibold tracking-wide px-4 py-2" to="/login">Sign In</Link>
            )}
            <button 
              onClick={handleGetStarted}
              className="bg-primary text-slate-950 px-6 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-all"
            >
              {isAuthenticated ? 'Go to App' : 'Get Started'}
            </button>
          </div>
        </div>
      </nav>

      {/* Snap scroll container — sits below the sticky nav */}
      <main className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth" style={{ scrollbarWidth: 'none' }}>
        {/* ① Hero Section */}
        <section
          className="relative h-[calc(100vh-73px)] overflow-y-auto snap-start snap-always flex flex-col justify-center bg-slate-950"
          id="hero-section"
        >
          {/* Atmospheric ambient highlights */}
          <div className="absolute top-1/4 left-1/3 size-[350px] bg-primary/5 rounded-full blur-[140px] -z-20" />
          <div className="absolute bottom-1/4 right-1/3 size-[450px] bg-sky-500/5 rounded-full blur-[160px] -z-20" />

          <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col gap-8 text-left">
              <div className="inline-flex w-fit items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono">Hardware-Free Analytics</span>
              </div>
              
              <h1 className="font-display font-semibold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight tracking-tight">
                Understand your energy. <br/>
                <span className="text-gradient">Lower your bills.</span>
              </h1>
              
              <p className="text-gray-450 max-w-xl text-base md:text-lg leading-relaxed font-normal">
                Voltify automatically estimates your appliance-level energy consumption from your monthly utility statements. Track efficiency targets, set savings goals, and reduce waste without installing expensive monitoring hardware.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleGetStarted}
                  className="bg-primary text-slate-950 px-8 py-4 rounded-xl text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] transform duration-150"
                >
                  <span>Analyze Bill</span>
                  <ArrowRight className="size-4" />
                </button>
                
                {/* Live Demo CTA — visually distinct from primary Get Started */}
                <button
                  onClick={() => isAuthenticated ? navigate('/dashboard') : setShowDemoModal(true)}
                  className="relative group border border-primary/40 text-white bg-primary/5 backdrop-blur-md px-8 py-4 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-primary/10 hover:border-primary/70 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] transform duration-150 shadow-[0_0_16px_rgba(0,112,243,0.08)] hover:shadow-[0_0_24px_rgba(0,112,243,0.18)]"
                >
                  <span className="absolute inset-0 rounded-xl ring-1 ring-primary/20 group-hover:ring-primary/40 transition-all" />
                  <Sparkles className="size-4 text-primary" />
                  <span>{isAuthenticated ? 'Go to App' : 'View Live Demo'}</span>
                </button>
              </div>
            </div>

            {/* Right Graphics/Component-Rendered Mock Dashboard Column */}
            <div className="lg:col-span-5 relative z-10" id="preview">
              <div className="relative group">
                {/* Visual interface console */}
                <div className="relative rounded-2xl p-6 border border-white/[0.06] shadow-xl bg-slate-900/60 backdrop-blur-md">
                  <div className="flex justify-between items-center pb-4 border-b border-white/[0.06] mb-6">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase">Energy Disaggregation active</span>
                    </div>
                    <div className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 uppercase font-semibold">PREVIEW</div>
                  </div>
                  
                  {/* Grid layout parameters */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-white/[0.04]">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider block mb-1 font-mono">Current Load</span>
                      <div className="text-xl font-bold font-mono text-primary">17.4 kWh</div>
                      <div className="text-[9px] text-emerald-400 font-medium mt-1 font-mono">↓ 12% vs last month</div>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-white/[0.04]">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider block mb-1 font-mono">Estimated Savings</span>
                      <div className="text-xl font-bold font-mono text-volt-pink">₹134.40</div>
                      <div className="text-[9px] text-volt-pink font-medium mt-1 font-mono">Weekly streak: active</div>
                    </div>
                  </div>
                  
                  {/* Appliance runtimes list */}
                  <div className="bg-slate-950/40 rounded-xl p-4.5 border border-white/[0.04] space-y-4">
                    <h4 className="text-[10px] font-mono text-gray-300 font-semibold tracking-wider uppercase">Appliance Load Allocation</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-355 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-cyan-400" />
                          Air Conditioner (BEE 24°C)
                        </span>
                        <span className="font-mono text-gray-400 text-xs">32%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: '32%' }} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-355 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-indigo-400" />
                          Refrigerator (WHO 4°C)
                        </span>
                        <span className="font-mono text-gray-400 text-xs">18%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: '18%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ② Value Prop Section */}
        <section className="h-[calc(100vh-73px)] overflow-y-auto snap-start snap-always flex flex-col justify-center bg-surface-container-lowest/40 relative border-t border-white/5" id="features">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-display font-semibold text-3xl md:text-4xl text-white">
                Your Monthly Bill, <span className="text-gradient font-semibold">Decoded</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base font-light leading-relaxed">
                Voltify disaggregates your monthly utility parameters against regional baseline estimates, yielding an accurate approximation of your household's heaviest consumption points.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="relative rounded-2xl p-8 border border-white/[0.06] bg-slate-900/60 backdrop-blur-md transition-all duration-300 group flex flex-col justify-between hover:border-white/12">
                <div>
                  <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:border-primary/30 transition-colors duration-200">
                    <Cpu className="size-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-white mb-2">Appliance Disaggregation</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 font-normal">
                    Our mathematical model breaks down your billing rate and total consumption to isolate high-drain appliances.
                  </p>
                </div>
                {/* Clean data load graphic */}
                <div className="h-20 w-full flex items-end gap-2 border-b border-white/[0.06] pb-2">
                  <div className="w-1/5 bg-primary/20 hover:bg-primary/30 rounded-t-lg h-[30%] transition-all duration-200" />
                  <div className="w-1/5 bg-primary/25 hover:bg-primary/35 rounded-t-lg h-[55%] transition-all duration-200" />
                  <div className="w-1/5 bg-primary rounded-t-lg h-[95%] transition-all duration-200" />
                  <div className="w-1/5 bg-primary/50 hover:bg-primary/60 rounded-t-lg h-[75%] transition-all duration-200" />
                  <div className="w-1/5 bg-primary/20 hover:bg-primary/30 rounded-t-lg h-[45%] transition-all duration-200" />
                </div>
              </div>
              
              {/* Feature 2 */}
              <div className="relative rounded-2xl p-8 border border-white/[0.06] bg-slate-900/60 backdrop-blur-md transition-all duration-300 group flex flex-col justify-between hover:border-white/12">
                <div>
                  <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:border-volt-pink/30 transition-colors duration-200">
                    <Award className="size-5 text-volt-pink" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-white mb-2">Gamified Conservation</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 font-normal">
                    Earn points by keeping your consumption below targeted limits. Challenge yourself with saving tasks and compete locally.
                  </p>
                </div>
                <div className="bg-slate-950/40 rounded-xl p-4 border border-white/[0.04] flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Target multiplier</div>
                    <div className="font-mono font-bold text-base text-white">1.15x Multiplier</div>
                  </div>
                  <span className="text-[10px] font-semibold text-volt-pink bg-volt-pink/10 px-2.5 py-1 rounded-full uppercase">Active</span>
                </div>
              </div>
              
              {/* Feature 3 */}
              <div className="relative rounded-2xl p-8 border border-white/[0.06] bg-slate-900/60 backdrop-blur-md transition-all duration-300 group flex flex-col justify-between hover:border-white/12">
                <div>
                  <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:border-primary/30 transition-colors duration-200">
                    <ShieldCheck className="size-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-white mb-2">Efficiency Standards</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 font-normal">
                    Establish operating baselines aligned directly with BEE and WHO guidelines to balance safety and consumption.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 bg-slate-950/40 p-2 rounded-lg border border-white/[0.04]">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[11px] text-gray-300">AC calibrated to BEE 24°C</span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-slate-950/40 p-2 rounded-lg border border-white/[0.04]">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[11px] text-gray-305">Refrigerator calibrated to 4°C</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ③ How it Works Section */}
        <section className="h-[calc(100vh-73px)] overflow-y-auto snap-start snap-always flex flex-col justify-center relative border-t border-white/[0.06]" id="how-it-works">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="text-center mb-20">
              <h2 className="font-display font-semibold text-3xl md:text-4xl text-white">
                How Voltify <span className="text-gradient">Works</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
              {/* Central connection timeline path (desktop) */}
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-white/[0.06] z-0" />
              
              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="size-20 rounded-2xl bg-slate-900 border border-white/[0.06] flex items-center justify-center mb-6 group-hover:border-primary/40 group-hover:scale-[1.02] transition-all duration-300">
                  <UserCheck className="size-8 text-gray-400 group-hover:text-primary transition-colors duration-200" />
                </div>
                <div className="bg-primary/10 text-primary font-semibold text-[9px] px-3 py-1 rounded-full mb-4 uppercase tracking-widest font-mono border border-primary/20">
                  Step 01
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-2">Set Up Profile</h3>
                <p className="text-gray-400 text-xs max-w-xs leading-relaxed font-normal">
                  Configure your dashboard parameters. Input your geographic region, power utility provider, and active billing rates.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="size-20 rounded-2xl bg-slate-900 border border-white/[0.06] flex items-center justify-center mb-6 group-hover:border-primary/40 group-hover:scale-[1.02] transition-all duration-300">
                  <UploadCloud className="size-8 text-gray-400 group-hover:text-primary transition-colors duration-200" />
                </div>
                <div className="bg-primary/10 text-primary font-semibold text-[9px] px-3 py-1 rounded-full mb-4 uppercase tracking-widest font-mono border border-primary/20">
                  Step 02
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-2">Upload Statements</h3>
                <p className="text-gray-400 text-xs max-w-xs leading-relaxed font-normal">
                  Simply provide your monthly statements or enter basic bill statistics manually to feed the disaggregation model.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="size-20 rounded-2xl bg-slate-900 border border-white/[0.06] flex items-center justify-center mb-6 group-hover:border-primary/40 group-hover:scale-[1.02] transition-all duration-300">
                  <TrendingDown className="size-8 text-gray-400 group-hover:text-primary transition-colors duration-200" />
                </div>
                <div className="bg-primary text-slate-950 font-semibold text-[9px] px-3 py-1 rounded-full mb-4 uppercase tracking-widest font-mono">
                  Step 03
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-2">Optimize Usage</h3>
                <p className="text-gray-400 text-xs max-w-xs leading-relaxed font-normal">
                  Explore disaggregated metrics, tune temperature controls to BEE guidelines, and save on electricity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ④ CTA + Footer snap section */}
        <section className="h-[calc(100vh-73px)] overflow-y-auto snap-start snap-always flex flex-col relative border-t border-white/[0.06]">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          {/* CTA — grows to fill the space above the footer */}
          <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
              <h2 className="font-display font-semibold text-3xl md:text-5xl text-white">
                Ready to take control?
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base font-normal">
                Join thousands of energy-smart households managing their consumption, cutting costs, and earning efficiency credits.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleGetStarted}
                  className="bg-primary text-slate-950 px-10 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-all hover:scale-[1.02] transform duration-150"
                >
                  Start Saving Today
                </button>
              </div>
            </div>
          </div>

          {/* Footer — pinned to the bottom of the last snap section */}
          <footer className="bg-slate-950 text-gray-500 pt-10 pb-8 border-t border-white/[0.06] relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-6 md:px-10 max-w-7xl mx-auto">
              <div className="col-span-1 space-y-3">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.gif" alt="Voltify Logo" className="size-8 object-contain" />
                  <span className="font-display font-bold text-lg text-white tracking-tight">Voltify</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed font-normal">
                  Smart, hardware-free electricity disaggregation for residential efficiency.
                </p>
              </div>

              <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                  <h4 className="font-semibold text-[10px] uppercase tracking-widest text-white mb-1 font-mono">Product</h4>
                  <a className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" href="#features">Features</a>
                  <a className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" href="#how-it-works">How it Works</a>
                  <a className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" href="#preview">System Preview</a>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-semibold text-[10px] uppercase tracking-widest text-white mb-1 font-mono">Guidelines</h4>
                  <a className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" href="https://www.tristarenergy.in/blog/tangedco-electricity-tariff-rates-2026" target="_blank" rel="noopener noreferrer">DISCOM Rates</a>
                  <a className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" href="https://beeindia.in/standards-labeling/" target="_blank" rel="noopener noreferrer">BEE Standards</a>
                  <a className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" href="https://www.who.int/publications/i/item/9789241550376" target="_blank" rel="noopener noreferrer">WHO Comfort</a>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-semibold text-[10px] uppercase tracking-widest text-white mb-1 font-mono">Company</h4>
                  <Link className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" to="/info/about">About Us</Link>
                  <Link className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" to="/info/blog">Blog</Link>
                  <Link className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" to="/info/security">Security Specs</Link>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-semibold text-[10px] uppercase tracking-widest text-white mb-1 font-mono">Support</h4>
                  <Link className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" to="/info/support">User Support</Link>
                  <Link className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" to="/info/api">API Details</Link>
                  <Link className="text-gray-400 hover:text-primary transition-colors text-xs font-normal font-sans" to="/info/contact">Contact Team</Link>
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 pt-5 border-t border-white/[0.06] text-center md:text-left text-gray-500 text-xs flex flex-col md:flex-row justify-between items-center gap-4">
                <span className="font-normal font-sans">&copy; 2026 Voltify Energy Systems. All rights reserved.</span>
                <div className="flex gap-6 text-gray-400">
                  <Link className="hover:text-primary transition-colors font-sans" to="/info/privacy">Privacy Policy</Link>
                  <Link className="hover:text-primary transition-colors font-sans" to="/info/terms">Terms of Use</Link>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
    </>
  );
}
