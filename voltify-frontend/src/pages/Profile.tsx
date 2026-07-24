// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { User, Shield, Flame, Coins, Zap, MapPin, Home, Users, Check, AlertCircle, ShoppingBag, Gift, Clock, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useGamificationStore } from '../store/gamificationStore';
import { apiService } from '../lib/api';
import GlassCard from '../components/ui/GlassCard';
import { toast } from 'react-toastify';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const { onboarding } = useDashboardStore();
  const { coins, setCoins } = useGamificationStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'rewards'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    home_type: user?.home_type || 'apartment',
    household_type: user?.household_type || 'family',
    location: user?.location || '',
  });

  // Rewards catalog states
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
    if (activeTab === 'rewards') {
      loadShopData();
    }
  }, [activeTab]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] font-headline text-center">
        <AlertCircle className="size-12 text-rose-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-semibold text-on-surface mb-2">Unauthorized Access</h2>
        <p className="text-sm text-on-surface-variant max-w-sm">Please log in to view your energy savings profile.</p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and Email cannot be blank');
      return;
    }
    
    try {
      const res = await apiService.updateProfile({
        name: formData.name,
        email: formData.email,
        home_type: formData.home_type,
        household_type: formData.household_type,
        location: formData.location,
      });
      if (res.user) {
        updateUser(res.user);
      }
      setIsEditing(false);
      toast.success('Profile successfully updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

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

    setShowVerifyModal(false);
    setIsVerifying(true);
    
    // 1. Optimistic UI update: instantly deduct coins and flag processing
    const oldCoins = coins;
    const item = redeemingItem;
    const newBal = Math.max(0, coins - item.coins_required);
    setCoins(newBal);
    updateUser({ ...user, coins: newBal });
    const toastId = toast.info(`Processing redemption for ${item.reward}...`, { autoClose: false });

    try {
      // 2. Async API Call to finish the transaction and trigger verification email
      const res = await apiService.redeemShopItem(item.id);
      if (res.success) {
        toast.dismiss(toastId);
        toast.success(`🎉 Verification email sent to ${verifyEmail}! Voucher code locked in.`);
        setCoins(res.new_balance);
        updateUser({ ...user, coins: res.new_balance });
        await loadShopData();
      }
    } catch (err: any) {
      // Rollback optimistic balance on failure
      setCoins(oldCoins);
      updateUser({ ...user, coins: oldCoins });
      toast.dismiss(toastId);
      toast.error(err.message || 'Failed to redeem reward item');
    } finally {
      setIsVerifying(false);
      setRedeemingItem(null);
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1:
        return { label: 'Bronze Energy Saver', color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' };
      case 2:
        return { label: 'Silver Saving Champ', color: 'text-slate-300 border-slate-300/30 bg-slate-300/10' };
      case 3:
        return { label: 'Gold Saving Expert', color: 'text-sky-400 border-sky-400/30 bg-sky-400/10' };
      default:
        return { label: 'Novice Saver', color: 'text-on-surface border-outline/30 bg-surface/5' };
    }
  };

  const tierInfo = getTierLabel(user.tier);

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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">👤 USER PROFILE</h1>
          <p className="text-sm text-on-surface-variant">Calibrate household parameters & redeem earned saving credits</p>
        </div>

        {/* Tab Buttons switcher */}
        <div className="flex p-0.5 bg-white/5 border border-white/[0.06] rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-surface font-bold shadow-md shadow-primary/10'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'rewards'
                ? 'bg-primary text-surface font-bold shadow-md shadow-primary/10'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            Rewards &amp; Transactions
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <>
          {/* Grid Dashboard Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <GlassCard className="p-6 col-span-1 md:col-span-2 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 size-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary-container text-2xl font-display font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <h2 className="text-xl font-semibold text-on-surface">{user.name}</h2>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${tierInfo.color}`}>
                        {tierInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-mono">USER ID: {user.id}</p>
                    <p className="text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                </div>

                <hr className="border-outline-variant/30" />

                {/* Editing Drawer Form */}
                {!isEditing ? (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-on-surface-variant flex items-center gap-1.5"><MapPin className="size-3.5 text-sky-400" /> Location / Region</span>
                      <p className="font-bold text-on-surface">{user.location || 'Not Specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-on-surface-variant flex items-center gap-1.5"><Home className="size-3.5 text-sky-400" /> Household Layout</span>
                      <p className="font-bold text-on-surface capitalize">{user.home_type}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-on-surface-variant flex items-center gap-1.5"><Users className="size-3.5 text-sky-400" /> Household Size</span>
                      <p className="font-bold text-on-surface capitalize">{user.household_type.replace('_', ' ')}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-on-surface-variant flex items-center gap-1.5"><Zap className="size-3.5 text-sky-400" /> Connected Appliances</span>
                      <p className="font-bold text-on-surface">{user.appliance_count} active</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSave} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="name-input" className="text-on-surface-variant font-semibold">Full Name</label>
                        <input
                          id="name-input"
                          type="text"
                          className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="email-input" className="text-on-surface-variant font-semibold">Email Address</label>
                        <input
                          id="email-input"
                          type="email"
                          className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="home-classification-select" className="text-on-surface-variant font-semibold">Home Classification</label>
                        <select
                          id="home-classification-select"
                          className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs"
                          value={formData.home_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, home_type: e.target.value as any }))}
                        >
                          <option value="apartment">Apartment</option>
                          <option value="house">Detached House</option>
                          <option value="villa">Premium Villa</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="household-cohort-select" className="text-on-surface-variant font-semibold">Household Cohort</label>
                        <select
                          id="household-cohort-select"
                          className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs"
                          value={formData.household_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, household_type: e.target.value as any }))}
                        >
                          <option value="bachelor">Bachelor (1 Person)</option>
                          <option value="family">Small Family (2-4 People)</option>
                          <option value="large_family">Large Family (5+ People)</option>
                          <option value="organization">Office / Org</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label htmlFor="location-input" className="text-on-surface-variant font-semibold">Location / Regional Tariff Area</label>
                        <input
                          id="location-input"
                          type="text"
                          className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g. Bengaluru, Karnataka"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="border border-outline-variant hover:bg-surface-container-high text-on-surface px-4 py-2 rounded-lg transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-primary-container text-on-primary-fixed hover:bg-primary-fixed-dim px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-1.5"
                      >
                        <Check className="size-3.5" /> Save Changes
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-6 border border-outline-variant hover:border-primary/50 text-on-surface hover:text-primary-container text-xs px-4 py-2 rounded-lg text-center font-bold uppercase transition-all duration-300"
                >
                  Modify Profile Details
                </button>
              )}
            </GlassCard>

            {/* Level and Rewards Stat Card */}
            <div className="space-y-6">
              {/* Energy Rank Card */}
              <GlassCard className="p-6 relative overflow-hidden group">
                <div className="absolute -bottom-8 -right-8 size-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-500" />
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Level Progress</span>
                    <span className="font-mono text-xs text-rose-400 font-bold">LVL {user.tier === 3 ? '42' : user.tier === 2 ? '24' : '8'}</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-semibold font-display text-on-surface flex items-center gap-1.5">
                      <Shield className="size-5 text-rose-400" /> Grid Guardian
                    </h3>
                    <p className="text-xs text-on-surface-variant">Calibrate smart saving settings to gain more points.</p>
                  </div>
                  {/* Fake progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden border border-outline-variant/30">
                      <div 
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: user.tier === 3 ? '78%' : user.tier === 2 ? '45%' : '18%' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
                      <span>{user.tier === 3 ? '15,600 XP' : user.tier === 2 ? '4,500 XP' : '800 XP'}</span>
                      <span>{user.tier === 3 ? '20,000 XP' : user.tier === 2 ? '10,000 XP' : '5,000 XP'}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Wallet Balance Info */}
              <GlassCard className="p-6 relative overflow-hidden group">
                <div className="absolute -bottom-8 -right-8 size-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all duration-500" />
                <div className="space-y-4">
                  <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider block">Wallet Balance</span>
                  <div className="flex gap-4 items-center">
                    <div className="size-10 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container">
                      <Coins className="size-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono text-primary-container">{coins || 0} COINS</p>
                      <p className="text-[10px] text-on-surface-variant">Estimated Credit Value: <span className="text-emerald-400 font-semibold">₹{(coins || 0) * 0.5}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                      <Flame className="size-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono text-rose-400">{user.streak_days || 0} DAYS</p>
                      <p className="text-[10px] text-on-surface-variant">Streak Multiplier: <span className="text-rose-400 font-semibold">1.15x</span></p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Onboarding Calibrated Summary Card */}
          {onboarding && (
            <GlassCard className="p-6 border-primary/20 bg-primary/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-on-surface flex items-center gap-2">
                    <Zap className="size-5 text-primary-container" /> Energy Savings Estimation Profile
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
                    Your energy estimation parameters have been optimized using your uploaded DISCOM history (monthly target of <span className="text-on-surface font-semibold">₹{onboarding.bill_amount}</span> for ~<span className="text-on-surface font-semibold">{onboarding.units_per_month} kWh</span>). Accuracy confidence is verified at <span className="text-emerald-400 font-bold">{onboarding.accuracy_pct}%</span>.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 bg-surface-container-high/50 p-4 rounded-xl border border-outline-variant/30 text-center font-mono">
                  <div className="px-2">
                    <p className="text-xs text-on-surface-variant">CALIBRATED LOAD</p>
                    <p className="text-xl font-bold text-primary-container">{onboarding.estimated_units.toFixed(1)} kWh</p>
                  </div>
                  <div className="px-2 border-l border-outline-variant/30">
                    <p className="text-xs text-on-surface-variant">CONFIDENCE</p>
                    <p className="text-xl font-bold text-emerald-400">{onboarding.accuracy_pct}%</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </>
      ) : (
        /* Rewards & Transactions ledger tab (Item 7 flow) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rewards Catalog */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Gift className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-on-surface">Redeemable Rewards</h3>
                <p className="text-xs text-on-surface-variant">Redeem your hard-earned Voltify Coins for real voucher rewards and bill utility credits</p>
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
      )}

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
export { Profile };
