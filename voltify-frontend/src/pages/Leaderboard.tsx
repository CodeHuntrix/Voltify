// src/pages/Leaderboard.tsx
import { useState, useEffect } from 'react';
import { Trophy, Flame, Coins, Zap, Shield, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useGamificationStore } from '../store/gamificationStore';
import { useDashboardStore } from '../store/dashboardStore';
import { apiService } from '../lib/api';
import GlassCard from '../components/ui/GlassCard';

export default function Leaderboard() {
  const { user } = useAuthStore();
  const { coins, streak_days, rank } = useGamificationStore();
  const { onboarding } = useDashboardStore();
  const [board, setBoard] = useState<any[]>([]);

  useEffect(() => {
    async function loadLeaderboard() {
      if (user) {
        try {
          const res = await apiService.getLeaderboard(onboarding?.household_type || 'family');
          setBoard(res.rankings);
        } catch (err) {
          console.error("Failed to load leaderboard", err);
        }
      }
    }
    loadLeaderboard();
  }, [user, onboarding]);

  return (
    <div className="space-y-8 font-headline">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">🏆 REGIONAL LEADERBOARD</h1>
          <p className="text-sm text-on-surface-variant">Compare savings parameters against neighboring homes in your active district</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-high/60 border border-outline-variant/30 px-4 py-2 rounded-xl text-xs">
          <Trophy className="size-4 text-tertiary" />
          <span className="text-on-surface-variant">Rank:</span>
          <span className="font-mono font-bold text-tertiary">#{rank} in sector</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rankings Table */}
        <GlassCard className="col-span-1 lg:col-span-2 overflow-x-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-semibold text-base text-on-surface">Regional Sector Rankings</h3>
            <span className="text-[10px] text-outline font-mono uppercase">Sector: Chennai North</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
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
                  <td className="py-3 text-center font-mono font-bold">
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
            
            <div className="space-y-3 text-xs">
              <div className="border border-outline-variant/30 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-on-surface">7-Day Saver</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.15x Saving Multiplier</p>
                </div>
                <span className="text-[10px] bg-primary/20 text-primary font-mono px-2 py-0.5 rounded uppercase font-bold">Active</span>
              </div>

              <div className="border border-outline-variant/30 p-3 rounded-lg flex justify-between items-center opacity-60">
                <div>
                  <h4 className="font-semibold text-on-surface">30-Day Sovereign</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.35x Saving Multiplier</p>
                </div>
                <span className="text-[10px] bg-outline-variant/30 text-outline font-mono px-2 py-0.5 rounded uppercase font-bold">Locked</span>
              </div>

              <div className="border border-outline-variant/30 p-3 rounded-lg flex justify-between items-center opacity-60">
                <div>
                  <h4 className="font-semibold text-on-surface">90-Day Grid Master</h4>
                  <p className="text-[10px] text-on-surface-variant">Unlock 1.6x Saving Multiplier</p>
                </div>
                <span className="text-[10px] bg-outline-variant/30 text-outline font-mono px-2 py-0.5 rounded uppercase font-bold">Locked</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
export { Leaderboard };
