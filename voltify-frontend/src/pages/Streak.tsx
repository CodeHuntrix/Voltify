// src/pages/Streak.tsx
import { useState, useEffect } from 'react';
import { Flame, CheckCircle, Trophy, Calendar, ArrowRight, ArrowLeft, Info, Zap, Plus, Minus, Check, Sparkles } from 'lucide-react';
import { apiService } from '../lib/api';
import { useGamificationStore } from '../store/gamificationStore';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import GlassCard from '../components/ui/GlassCard';
import { toast } from 'react-toastify';
import { Appliance, DEFAULT_APPLIANCES } from '../types/appliance';



export default function Streak() {
  const { user, updateUser } = useAuthStore();
  const { streak_days, coins, addCoins, setStreak } = useGamificationStore();
  const [stats, setStats] = useState<any>(null);
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { onboarding } = useDashboardStore();
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Telemetry check-in states
  const [checkInStep, setCheckInStep] = useState(1);
  const [checkInUnits, setCheckInUnits] = useState(10.5);
  const [checkInApplianceHours, setCheckInApplianceHours] = useState<Record<string, number>>({});

  const userAppliances = onboarding?.appliances || Object.entries(DEFAULT_APPLIANCES).map(([id, app]) => ({ ...app, id } as Appliance));
  const checkInAvgDailyUnits = onboarding?.units_per_month ? parseFloat((onboarding.units_per_month / 30).toFixed(1)) : 10.5;

  // Sync initial state when modal opens or onboarding loads
  useEffect(() => {
    if (showCheckInModal) {
      setCheckInStep(1);
      setCheckInUnits(checkInAvgDailyUnits);
      const initialHours: Record<string, number> = {};
      userAppliances.forEach((app) => {
        initialHours[app.id] = app.avg_hours_day;
      });
      setCheckInApplianceHours(initialHours);
    }
  }, [showCheckInModal, onboarding]);

  async function loadData() {
    try {
      setLoading(true);
      const [gamestats, chalResult] = await Promise.all([
        apiService.getGamificationStats(),
        apiService.getGamificationChallenge()
      ]);
      setStats(gamestats);
      setChallenge(chalResult?.challenge);
    } catch (err) {
      console.error("Failed to load streak statistics", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleClaimDailyCheckIn = async (units: number, applianceHours: Record<string, number>) => {
    try {
      setCheckingIn(true);
      const res = await apiService.dailyCheckin({ total_units: units, appliance_hours: applianceHours });
      if (res.success) {
        toast.success(`✨ Daily Telemetry Logged! +${res.coins_earned} Coins awarded!`);
        addCoins(res.coins_earned);
        setStreak(res.new_streak);
        setShowCheckInModal(false);
        
        // Update local auth store so stats stay synchronized
        if (user) {
          updateUser({
            ...user,
            coins: res.new_balance,
            streak_days: res.new_streak
          });
        }
        await loadData();
      }
    } catch (err: any) {
      toast.warning(err.message || 'Already checked in today!');
      setShowCheckInModal(false);
    } finally {
      setCheckingIn(false);
    }
  };

  const isTodayCheckedIn = () => {
    if (!stats?.recent_transactions) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return stats.recent_transactions.some((tx: any) => {
      const txDate = tx.created_at.split('T')[0];
      return tx.type === 'checkin' && txDate === todayStr;
    });
  };

  const alreadyCheckedIn = isTodayCheckedIn();

  return (
    <div className="space-y-8 font-headline text-on-surface">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">🔥 STREAK &amp; QUESTS</h1>
          <p className="text-sm text-on-surface-variant">Stay active, complete weekly saving targets, and boost your rewards multiplier</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streak Interactive check-in */}
        <GlassCard className="lg:col-span-2 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-5 text-volt-pink/10 group-hover:text-volt-pink/20 transition-colors pointer-events-none">
            <Flame className="size-36" />
          </div>

          <div className="space-y-6 z-10 relative">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-volt-pink/15 flex items-center justify-center border border-volt-pink/20">
                <Flame className="size-5 text-volt-pink" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-on-surface">Daily check-in Console</h3>
                <p className="text-xs text-on-surface-variant">Check in every 24 hours to advance your streak and multipliers</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-4 bg-white/5 border border-white/[0.04] p-5 rounded-2xl">
              <div className="text-center shrink-0">
                <span className="text-[10px] font-bold text-volt-pink uppercase tracking-widest block mb-1">Active streak</span>
                <span className="text-5xl font-extrabold text-white font-mono tracking-tight">{streak_days}</span>
                <span className="text-xs text-on-surface-variant block mt-1">Days</span>
              </div>

              <div className="flex-1 space-y-2.5">
                <h4 className="text-sm font-semibold text-white">
                  {alreadyCheckedIn 
                    ? "✨ Checked In for Today!" 
                    : "Ready for Today's Active Check-In"
                  }
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Checking in rewards you with <span className="font-semibold text-primary">25 base coins</span> plus your active streak rate multiplier.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded text-volt-pink font-mono">
                    Multiplier: {stats?.active_multiplier || '1.15'}x
                  </span>
                  {alreadyCheckedIn && (
                    <span className="text-[10px] font-semibold bg-tertiary/20 text-tertiary px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      <CheckCircle className="size-3" /> Next in 12h
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={alreadyCheckedIn || checkingIn}
                onClick={() => setShowCheckInModal(true)}
                className={`w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold tracking-tight transition-all duration-300 shrink-0 cursor-pointer ${
                  alreadyCheckedIn
                    ? 'bg-white/10 border border-white/5 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-volt-pink to-rose-500 hover:from-volt-pink/90 hover:to-rose-500/90 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                }`}
              >
                {checkingIn ? 'Syncing...' : (alreadyCheckedIn ? 'Checked In' : 'Claim Daily Coins')}
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.05] mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <Calendar className="size-4 text-slate-400" />
              <span>Streak Milestones: <span className="font-semibold text-white">7d (1.15x)</span> → <span className="font-semibold text-white">30d (1.35x)</span> → <span className="font-semibold text-white">90d (1.6x)</span></span>
            </span>
          </div>
        </GlassCard>

        {/* Multipliers & Stats side panel */}
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-on-surface tracking-wider uppercase flex items-center gap-1.5">
              <Trophy className="size-4 text-tertiary" /> Active Multipliers
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-lg border flex justify-between items-center ${
                streak_days >= 7 
                  ? 'border-volt-pink/30 bg-volt-pink/5 text-volt-pink' 
                  : 'border-white/5 bg-white/5 text-slate-400 opacity-60'
              }`}>
                <div>
                  <h4 className="font-semibold text-on-surface">7-Day Saver</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.15x Saving Multiplier</p>
                </div>
                <span className="font-bold font-mono">
                  {streak_days >= 7 ? 'Active' : 'Locked'}
                </span>
              </div>

              <div className={`p-3 rounded-lg border flex justify-between items-center ${
                streak_days >= 30 
                  ? 'border-volt-pink/30 bg-volt-pink/5 text-volt-pink' 
                  : 'border-white/5 bg-white/5 text-slate-400 opacity-60'
              }`}>
                <div>
                  <h4 className="font-semibold text-on-surface">30-Day Sovereign</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.35x Saving Multiplier</p>
                </div>
                <span className="font-bold font-mono">
                  {streak_days >= 30 ? 'Active' : 'Locked'}
                </span>
              </div>

              <div className={`p-3 rounded-lg border flex justify-between items-center ${
                streak_days >= 90 
                  ? 'border-volt-pink/30 bg-volt-pink/5 text-volt-pink' 
                  : 'border-white/5 bg-white/5 text-slate-400 opacity-60'
              }`}>
                <div>
                  <h4 className="font-semibold text-on-surface">90-Day Grid Master</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.60x Saving Multiplier</p>
                </div>
                <span className="font-bold font-mono">
                  {streak_days >= 90 ? 'Active' : 'Locked'}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Quest / Challenges Section */}
      <GlassCard className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Zap className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-on-surface">Active Energy Saving Quests</h3>
              <p className="text-xs text-on-surface-variant">Perform disaggregation challenges to claim huge coin bonuses</p>
            </div>
          </div>
          <Sparkles className="size-5 text-primary animate-pulse" />
        </div>

        {challenge ? (
          <div className="bg-white/5 border border-white/[0.04] p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase font-mono">
                {challenge.type} Challenge
              </span>
              <h4 className="text-base font-bold text-white">{challenge.title}</h4>
              <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                Save energy below your baseline target this week. Completed challenges award coins which increase in value based on streak milestones.
              </p>
            </div>

            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">Progress: {Number(challenge.current_units).toFixed(0)} / {Number(challenge.target_units).toFixed(0)} kWh</span>
                <span className={challenge.on_track ? "text-tertiary" : "text-error"}>
                  {challenge.progress_pct}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    challenge.on_track ? 'bg-tertiary shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-error'
                  }`}
                  style={{ width: `${Math.min(100, challenge.progress_pct)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-on-surface-variant pt-1 font-medium">
                <span className="flex items-center gap-1 font-semibold text-white">
                  Reward: <Coins className="size-3 text-primary" /> {challenge.coins_reward || 100} Coins
                </span>
                <span className="uppercase text-volt-pink font-semibold">{challenge.days_remaining} Days left</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center text-xs text-on-surface-variant leading-relaxed">
            No active quest calibrated. Complete your onboarding profile first to initialize weekly energy-saving challenges!
          </div>
        )}
      </GlassCard>

      {/* Daily Check-In Modal with Interactive Telemetry Log */}
      {showCheckInModal && (() => {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in px-4">
            <GlassCard className="max-w-md w-full p-8 border border-white/[0.08] shadow-[0_0_50px_rgba(236,72,153,0.15)] relative overflow-hidden space-y-6">
              {/* Glowing neon effects */}
              <div className="absolute -top-24 -left-24 size-48 bg-volt-pink/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 size-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

              {/* Close button */}
              <button
                onClick={() => setShowCheckInModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold p-1 hover:bg-white/5 rounded-lg"
              >
                ✕
              </button>

              {/* Header section */}
              <div className="text-center space-y-2">
                <div className="mx-auto size-16 rounded-full bg-volt-pink/15 flex items-center justify-center border border-volt-pink/25 shadow-[0_0_20px_rgba(236,72,153,0.2)] animate-pulse mb-2">
                  <Flame className="size-8 text-volt-pink" />
                </div>
                <h3 className="font-display font-bold text-xl text-white tracking-tight">Daily Telemetry Log</h3>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  {checkInStep === 1
                    ? "Log your total power consumption for today to calculate today's actual cost and claim your daily reward."
                    : "Log today's hours run for each of your active appliances."
                  }
                </p>
              </div>

              {/* Progress Tracker */}
              <div className="flex items-center justify-center gap-2">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${checkInStep === 1 ? 'w-8 bg-volt-pink' : 'w-2 bg-white/20'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-300 ${checkInStep === 2 ? 'w-8 bg-volt-pink' : 'w-2 bg-white/20'}`} />
              </div>

              {checkInStep === 1 ? (
                /* STEP 1: Total Units (kWh) counter and slider */
                <div className="space-y-6">
                  <div className="space-y-4 text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Electricity Today</span>
                    
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => setCheckInUnits(prev => Math.max(0, parseFloat((prev - 0.5).toFixed(1))))}
                        className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 text-white font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        <Minus className="size-4" />
                      </button>

                      <div className="font-mono text-4xl font-black text-white flex items-baseline gap-1 select-none">
                        <span>{checkInUnits.toFixed(1)}</span>
                        <span className="text-sm font-sans text-volt-pink font-bold">kWh</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCheckInUnits(prev => parseFloat((prev + 0.5).toFixed(1)))}
                        className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 text-white font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>

                    <div className="px-2">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.1"
                        value={checkInUnits}
                        onChange={(e) => setCheckInUnits(parseFloat(parseFloat(e.target.value).toFixed(1)))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-volt-pink"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/[0.04] rounded-xl text-center space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Personalized Recommendation</span>
                    <p className="text-on-surface-variant font-medium text-[11px]">
                      Your average daily consumption is <span className="text-primary font-bold">{checkInAvgDailyUnits} kWh</span>. Drag or click above to adjust today's actual value.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCheckInStep(2)}
                    className="w-full py-3.5 bg-gradient-to-r from-volt-pink to-rose-500 hover:from-volt-pink/90 hover:to-rose-500/90 text-white rounded-xl font-bold tracking-tight shadow-[0_0_20px_rgba(236,72,153,0.35)] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <span>Proceed to Appliances</span>
                    <ArrowRight className="size-4 animate-pulse" />
                  </button>
                </div>
              ) : (
                /* STEP 2: Appliance hours run today sliders list */
                <div className="space-y-6">
                  <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {userAppliances.map((app) => {
                      const currentHours = checkInApplianceHours[app.id] !== undefined ? checkInApplianceHours[app.id] : app.avg_hours_day;
                      return (
                        <div key={app.id} className="p-3 bg-white/5 border border-white/[0.04] rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{app.icon}</span>
                              <span className="text-xs font-semibold text-white">{app.name}</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-volt-pink">
                              {currentHours.toFixed(1)} hrs
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500">0h</span>
                            <input
                              type="range"
                              min="0"
                              max="24"
                              step="0.5"
                              value={currentHours}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCheckInApplianceHours(prev => ({
                                  ...prev,
                                  [app.id]: val
                                }));
                              }}
                              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-[10px] text-slate-500">24h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckInStep(1)}
                      className="flex-1 py-3 border border-white/10 hover:border-white/20 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="size-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleClaimDailyCheckIn(checkInUnits, checkInApplianceHours)}
                      disabled={checkingIn}
                      className="flex-[2] py-3 bg-gradient-to-r from-volt-pink to-rose-500 hover:from-volt-pink/90 hover:to-rose-500/90 text-white rounded-xl font-bold tracking-tight shadow-[0_0_20px_rgba(236,72,153,0.35)] transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {checkingIn ? (
                        <span>Logging...</span>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>Submit Telemetry</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        );
      })()}
    </div>
  );
}

function Coins({ className, ...props }: any) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10" stroke="none" />
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" fill="#0b0f19" />
    </svg>
  );
}
