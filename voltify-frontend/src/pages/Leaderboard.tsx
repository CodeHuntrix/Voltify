// src/pages/Leaderboard.tsx
import { useState, useEffect } from 'react';
import { Trophy, Flame, Coins, Zap, Shield, ArrowUp, ArrowDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useGamificationStore } from '../store/gamificationStore';
import { useDashboardStore } from '../store/dashboardStore';
import { apiService } from '../lib/api';
import GlassCard from '../components/ui/GlassCard';
import { toast } from 'react-toastify';

export default function Leaderboard() {
  const { user } = useAuthStore();
  const { coins, streak_days, rank, addCoins } = useGamificationStore();
  const { onboarding } = useDashboardStore();
  const [board, setBoard] = useState<any[]>([]);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [cssTotals, setCssTotals] = useState<any>({ potential: 1020, annual: 12240 });
  const [activeChallenge, setActiveChallenge] = useState<any>(null);

  useEffect(() => {
    async function loadLeaderboard() {
      if (user) {
          const rawHType = onboarding?.household_type || 'family';
          let backendHType = 'family';
          if (rawHType === '1_person' || rawHType === 'bachelor') backendHType = 'bachelor';
          else if (rawHType === '2_people' || rawHType === '3_people' || rawHType === '4_people' || rawHType === 'family') backendHType = 'family';
          else if (rawHType === '5_plus_people' || rawHType === 'large_family') backendHType = 'large_family';
          else if (rawHType === 'organization') backendHType = 'organization';

          try {
            const [lbRes, cssRes, chalRes] = await Promise.all([
            apiService.getLeaderboard(backendHType),
            apiService.getCSSRecommendations().catch(() => null),
            apiService.getGamificationChallenge().catch(() => null)
          ]);
          setBoard(lbRes.rankings);
          if (cssRes?.recommendations) {
            setRecommendations(cssRes.recommendations);
            setCssTotals({
              potential: cssRes.total_potential_savings_rs || 1020,
              annual: cssRes.total_annual_savings_rs || 12240
            });
          }
          if (chalRes?.challenge) {
            setActiveChallenge(chalRes.challenge);
          }
        } catch (err) {
          console.error("Failed to load leaderboard", err);
        }
      }
    }
    loadLeaderboard();
  }, [user, onboarding]);

  const handleApplyRecommendation = async (recId: string, appliance: string, setting: string) => {
    try {
      const res = await apiService.applyCSSRecommendation({
        recommendation_id: recId,
        appliance,
        setting_applied: setting
      });
      if (res.success) {
        toast.success(`Applied! Earned ${res.coins_earned || 80} coins! Expected savings: ₹${res.expected_monthly_savings || 240}/mo.`);
        setRecommendations(prev => 
          prev.map(r => r.id === recId ? { ...r, already_applied: true } : r)
        );
        addCoins(res.coins_earned || 80);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply optimization target");
    }
  };

  const getApplianceEmoji = (appliance: string) => {
    switch (appliance?.toUpperCase()) {
      case 'AC': return '❄️';
      case 'GEYSER': return '♨️';
      case 'FRIDGE':
      case 'REFRIGERATOR': return '🧊';
      case 'TV': return '📺';
      case 'FAN': return '🌀';
      default: return '🔌';
    }
  };

  return (
    <div className="space-y-8 font-headline">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">🏆 REGIONAL LEADERBOARD</h1>
          <p className="text-sm text-on-surface-variant">Compare savings parameters against neighboring homes in your active district</p>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rankings Table */}
        <GlassCard className="col-span-1 lg:col-span-2 overflow-x-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-semibold text-base text-on-surface">Regional Sector Rankings</h3>
            <span className="text-[10px] text-outline font-mono uppercase">Sector: Chennai North</span>
          </div>

          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant uppercase tracking-wider font-bold">
                <th className="pb-3 text-center w-12">Rank</th>
                <th className="pb-3 pl-4">Household</th>
                <th className="pb-3 text-center">Saving Streak</th>
                <th className="pb-3 text-center">Efficiency Score</th>
                <th className="pb-3 text-right">Coin Balance</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row) => (
                <tr
                  key={row.name}
                  className={`border-b border-outline-variant/10 transition-colors ${
                    row.is_current_user
                      ? 'bg-primary-container/10 border-y border-primary/20 text-primary font-bold'
                      : 'hover:bg-surface-container-high/30'
                  }`}
                >
                  <td className="py-3 text-center font-mono font-bold text-xs">
                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                  </td>
                  <td className="py-3 pl-4 font-bold flex items-center gap-2">
                    {row.name}
                    {row.is_current_user && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">YOU</span>}
                  </td>
                  <td className="py-3 text-center font-mono font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="size-3.5 text-rose-400" />
                      {row.streak}d
                    </span>
                  </td>
                  <td className="py-3 text-center font-mono font-semibold">
                    <span className="text-tertiary">+{row.savings_pct}%</span>
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-primary-container pr-2">
                    {row.coins} c
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>

        {/* Side Panel: Streak Milestones */}
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Active Streak Milestones
            </h3>
            
            <div className="space-y-3 text-xs font-sans">
              <div className={`border border-outline-variant/30 p-3 rounded-lg flex justify-between items-center ${user?.streak_days >= 7 ? '' : 'opacity-60'}`}>
                <div>
                  <h4 className="font-semibold text-on-surface">7-Day Saver</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.15x Saving Multiplier</p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                  user?.streak_days >= 7 ? 'bg-primary/20 text-primary' : 'bg-outline-variant/30 text-outline'
                }`}>{user?.streak_days >= 7 ? 'Active' : 'Locked'}</span>
              </div>

              <div className={`border border-outline-variant/30 p-3 rounded-lg flex justify-between items-center ${user?.streak_days >= 30 ? '' : 'opacity-60'}`}>
                <div>
                  <h4 className="font-semibold text-on-surface">30-Day Sovereign</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.35x Saving Multiplier</p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                  user?.streak_days >= 30 ? 'bg-primary/20 text-primary' : 'bg-outline-variant/30 text-outline'
                }`}>{user?.streak_days >= 30 ? 'Active' : 'Locked'}</span>
              </div>

              <div className={`border border-outline-variant/30 p-3 rounded-lg flex justify-between items-center ${user?.streak_days >= 90 ? '' : 'opacity-60'}`}>
                <div>
                  <h4 className="font-semibold text-on-surface">90-Day Grid Master</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.6x Saving Multiplier</p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                  user?.streak_days >= 90 ? 'bg-primary/20 text-primary' : 'bg-outline-variant/30 text-outline'
                }`}>{user?.streak_days >= 90 ? 'Active' : 'Locked'}</span>
              </div>
            </div>

          </GlassCard>

          <GlassCard className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-semibold text-sm text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="size-4 text-tertiary animate-pulse" /> Active Savings Quest
              </h3>
              <span className="text-[10px] bg-tertiary/10 text-tertiary border border-tertiary/20 px-2 py-0.5 rounded font-mono font-bold">Quest</span>
            </div>

            {activeChallenge ? (
              <div className="bg-surface border border-outline p-4 rounded-xl space-y-3 font-sans">
                <span className="text-[10px] font-bold text-volt-pink uppercase tracking-widest block">WEEKLY SAVINGS CHALLENGE</span>
                <h4 className="text-sm font-semibold text-on-surface">{activeChallenge.title}</h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant font-medium">
                      Progress: {Number(activeChallenge.current_units).toFixed(0)} / {Number(activeChallenge.target_units).toFixed(0)} kWh
                    </span>
                    <span className={activeChallenge.on_track ? "text-tertiary font-bold animate-pulse" : "text-error font-bold"}>
                      {activeChallenge.progress_pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-outline rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        activeChallenge.on_track ? 'bg-tertiary shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-error'
                      }`}
                      style={{ width: `${Math.min(100, activeChallenge.progress_pct)}%` }} 
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-on-surface-variant pt-2 border-t border-outline font-medium">
                  <span>Reward: <span className="font-semibold text-primary">{activeChallenge.coins_reward} Coins</span></span>
                  <span className="uppercase text-volt-pink font-semibold">{activeChallenge.days_remaining} Days left</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-xs text-on-surface-variant italic">
                No active quest. Complete onboarding profile to begin weekly saving challenges!
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Centralized Comfort-Safe Savings (CSS) Recommendations */}
      <div className="w-full pt-4">
        <GlassCard className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="size-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-white">Comfort-Safe Savings (CSS)</h3>
                <p className="text-[10px] text-gray-400 font-sans">BEE & Comfort-standard optimization targets</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono text-emerald-400 font-bold block">₹{cssTotals.potential}/mo</span>
              <span className="text-[9px] text-gray-400 block font-mono">Potential Savings</span>
            </div>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {recommendations && recommendations.length > 0 ? (
              recommendations.map((tip) => (
                <div key={tip.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <span>{getApplianceEmoji(tip.appliance)}</span> {tip.title || `${tip.appliance} Optimization`}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      Save ₹{tip.monthly_savings_rs || tip.monthly_savings || 240}/mo
                    </span>
                  </div>
                  
                  <p className="text-gray-400 leading-relaxed text-[11px] font-sans">
                    {tip.explanation || tip.why_safe || 'BEE & WHO environmental comfort guidelines for appliance energy reduction.'}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.03] text-[10px] font-sans">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">
                        Target: <span className="font-semibold text-white font-mono">{tip.recommended_setting || tip.target_setting || 'ECO'}</span>
                      </span>
                      {tip.comfort_pct && (
                        <span className="text-gray-500">
                          Comfort: <span className="text-primary font-semibold font-mono">{tip.comfort_pct}%</span>
                        </span>
                      )}
                    </div>
                    
                    {tip.already_applied ? (
                      <span className="font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="size-3" /> Target Applied
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleApplyRecommendation(tip.id, tip.appliance, tip.recommended_setting || tip.target_setting || 'ECO')}
                        className="inline-flex items-center gap-1 text-[9px] text-slate-950 bg-primary px-3 py-1.5 rounded-lg hover:opacity-90 transition-all font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        <Coins className="size-3" /> Apply & Earn
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-40 flex items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01]">
                <span className="text-xs text-gray-500 font-sans">Loading energy targets...</span>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
export { Leaderboard };
