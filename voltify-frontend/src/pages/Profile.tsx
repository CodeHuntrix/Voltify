// src/pages/Profile.tsx
import { useState } from 'react';
import { User, Shield, Flame, Coins, Zap, MapPin, Home, Users, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useGamificationStore } from '../store/gamificationStore';
import { apiService } from '../lib/api';
import GlassCard from '../components/ui/GlassCard';
import { toast } from 'react-toastify';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const { onboarding } = useDashboardStore();
  const { coins } = useGamificationStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    home_type: user?.home_type || 'apartment',
    household_type: user?.household_type || 'family',
    location: user?.location || '',
  });

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

  const getTierLabel = (tierNum: number) => {
    switch (tierNum) {
      case 3:  return { label: 'Grid Guardian (Tier 3)', color: 'border-amber-400/30 text-amber-300 bg-amber-500/10' };
      case 2:  return { label: 'Watt Whisperer (Tier 2)', color: 'border-slate-300/30 text-slate-200 bg-slate-400/10' };
      default: return { label: 'Energy Initiate (Tier 1)', color: 'border-emerald-400/30 text-emerald-300 bg-emerald-500/10' };
    }
  };

  const tierInfo = getTierLabel(user.tier);

  return (
    <div className="space-y-8 font-headline">
      {/* Title Header */}
      <div>
        <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">👤 USER PROFILE</h1>
        <p className="text-sm text-on-surface-variant">Calibrate household parameters & view saved energy credits</p>
      </div>

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
                  <p className="font-bold text-on-surface capitalize">{user.household_type ? user.household_type.replace('_', ' ') : 'Not Specified'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-on-surface-variant flex items-center gap-1.5"><Zap className="size-3.5 text-sky-400" /> Connected Appliances</span>
                  <p className="font-bold text-on-surface">{user.appliance_count || 0} active</p>
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
    </div>
  );
}
export { Profile };
