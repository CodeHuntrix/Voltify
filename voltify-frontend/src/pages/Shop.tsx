// src/pages/Shop.tsx
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useGamificationStore } from '../store/gamificationStore';
import { apiService } from '../lib/api';
import GlassCard from '../components/ui/GlassCard';
import { toast } from 'react-toastify';
import { Gift, Coins, Clock, AlertCircle } from 'lucide-react';

export default function Shop() {
  const { user } = useAuthStore();
  const { coins, setCoins } = useGamificationStore();

  const [shopItems, setShopItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const [redeemingItem, setRedeemingItem] = useState<any>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(user?.email || '');
  const [isVerifying, setIsVerifying] = useState(false);

  async function loadShopData() {
    try {
      setLoadingShop(true);
      const [shopData, gamestats] = await Promise.all([
        apiService.getShopItems(),
        apiService.getGamificationStats()
      ]);
      setShopItems(shopData?.items || []);
      setStats(gamestats);
    } catch (err) {
      console.error("Failed to load rewards shop data", err);
    } finally {
      setLoadingShop(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadShopData();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] font-headline text-center">
        <AlertCircle className="size-12 text-rose-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold text-on-surface mb-2">Unauthorized Access</h2>
        <p className="text-sm text-on-surface-variant max-w-sm">Please log in to view the rewards shop.</p>
      </div>
    );
  }

  const startRedeemFlow = (item: any) => {
    setRedeemingItem(item);
    setVerifyEmail(user.email);
    setShowVerifyModal(true);
  };

  const handleFinalRedeem = async () => {
    if (!verifyEmail.trim() || !verifyEmail.includes('@')) {
      toast.error('Please enter a valid verification email address');
      return;
    }

    try {
      setIsVerifying(true);
      const res = await apiService.redeemShopItem(redeemingItem.id);
      if (res.success) {
        toast.success(`Success! Voucher confirmation dispatched to: ${verifyEmail}`);
        setCoins(res.new_balance);
        setShowVerifyModal(false);
        setRedeemingItem(null);
        loadShopData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete redemption.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getTxColor = (type: string, amount: number) => {
    if (amount < 0) return 'text-rose-400';
    if (type === 'streak') return 'text-volt-pink';
    if (type === 'checkin') return 'text-primary';
    return 'text-tertiary';
  };

  const getTxTypeLabel = (type: string) => {
    switch (type) {
      case 'streak': return '🔥 Streak Bonus';
      case 'checkin': return '✨ Daily Checkin';
      case 'redeemed': return '🛍️ Redemption';
      case 'challenge': return '🎯 Quest Victory';
      default: return '⚡ Saving Reward';
    }
  };

  const formatTxDate = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 font-headline">
      {/* Title Header */}
      <div>
        <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">🛍️ REWARDS SHOP</h1>
        <p className="text-sm text-on-surface-variant">Redeem your hard-earned energy coins for vouchers and utility credits</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rewards Catalog */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Gift className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-on-surface">Redeemable Rewards</h3>
              <p className="text-xs text-on-surface-variant">Your current balance: <span className="text-primary font-bold font-mono">{coins} Coins</span></p>
            </div>
          </div>

          {loadingShop ? (
            <div className="py-12 text-center text-xs text-on-surface-variant italic">Loading rewards catalog...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shopItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`bg-white/5 border p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 relative overflow-hidden group ${
                    coins >= item.coins_required
                      ? 'border-white/[0.06] hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,229,255,0.05)]' 
                      : 'border-white/[0.03] opacity-60'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity text-primary">
                    <Gift className="size-12" />
                  </div>

                  <div className="space-y-1.5 z-10 relative">
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{item.reward}</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/[0.04] z-10 relative">
                    <div className="flex items-center gap-1">
                      <Coins className="size-4 text-primary shrink-0" />
                      <span className="font-mono text-xs font-extrabold text-white">{item.coins_required} c</span>
                    </div>

                    <button
                      type="button"
                      disabled={coins < item.coins_required || isVerifying}
                      onClick={() => startRedeemFlow(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        coins >= item.coins_required
                          ? 'bg-primary hover:bg-primary/95 text-surface shadow-md hover:scale-105 cursor-pointer'
                          : 'bg-white/10 border border-white/5 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Redeem Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions Ledger Panel */}
        <GlassCard className="flex flex-col justify-between h-[450px]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/[0.05]">
            <h3 className="font-display font-semibold text-sm text-on-surface tracking-wider uppercase flex items-center gap-2">
              <Clock className="size-4 text-slate-400" /> Transaction history
            </h3>
            <span className="text-[9px] font-mono uppercase bg-white/5 px-2 py-0.5 rounded text-on-surface-variant font-bold">Ledger</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {!stats?.recent_transactions || stats.recent_transactions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-on-surface-variant italic">No recent log entries</div>
            ) : (
              stats.recent_transactions.map((tx: any, idx: number) => (
                <div key={idx} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-start justify-between gap-3 hover:bg-white/[0.05] transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-white block">{getTxTypeLabel(tx.type)}</span>
                    <p className="text-[10px] text-on-surface-variant font-sans leading-normal">{tx.reason}</p>
                    <span className="text-[9px] text-slate-500 block font-mono">{formatTxDate(tx.created_at)}</span>
                  </div>

                  <span className={`font-mono text-xs font-bold shrink-0 ${getTxColor(tx.type, tx.coins)}`}>
                    {tx.coins > 0 ? `+${tx.coins}` : tx.coins} c
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── EMAIL CONFIRMATION REDEMPTION MODAL ── */}
      {showVerifyModal && redeemingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="font-display font-bold text-base text-white mb-2 flex items-center gap-2">
              <Gift className="size-5 text-primary" /> Confirm Reward Redemption
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              You are about to redeem <strong className="text-white">{redeemingItem.reward}</strong> for <strong className="text-primary">{redeemingItem.coins_required} Coins</strong>.
            </p>

            <div className="space-y-3 mb-5">
              <label htmlFor="verify-email-input" className="block text-xs text-slate-300 font-semibold">Verification Email</label>
              <input
                id="verify-email-input"
                type="email"
                placeholder="e.g. name@domain.com"
                value={verifyEmail}
                onChange={e => setVerifyEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-[#1e293b] rounded-lg text-white text-xs focus:outline-none focus:border-primary"
              />
              <span className="block text-[10px] text-gray-500">We will send a confirmation code and gift card link to this address.</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowVerifyModal(false); setRedeemingItem(null); }}
                className="flex-1 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalRedeem}
                className="flex-1 py-2 bg-primary hover:bg-primary/90 text-slate-950 font-bold rounded-lg text-xs transition-all cursor-pointer"
              >
                Confirm &amp; Send Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export { Shop };
