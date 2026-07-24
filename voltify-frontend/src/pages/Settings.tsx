// src/pages/Settings.tsx
import { useReducer, useState } from 'react';
import { Settings as SettingsIcon, Shield, Server, RefreshCw, Sliders, DollarSign, Cpu, Trash2, Check, HelpCircle, AlertTriangle, X } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { useGamificationStore } from '../store/gamificationStore';
import GlassCard from '../components/ui/GlassCard';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../lib/api';

interface SettingsState {
  selectedDiscom: string;
  flatRate: string;
  acTempThreshold: number;
  autoSnooze: boolean;
  telemetryResolution: string;
}

type SettingsAction =
  | { type: 'SET_DISCOM'; payload: { code: string; rate: string } }
  | { type: 'SET_FLAT_RATE'; payload: string }
  | { type: 'SET_AC_TEMP'; payload: number }
  | { type: 'SET_AUTO_SNOOZE'; payload: boolean }
  | { type: 'SET_TELEMETRY'; payload: string };

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_DISCOM':
      return {
        ...state,
        selectedDiscom: action.payload.code,
        flatRate: action.payload.rate,
      };
    case 'SET_FLAT_RATE':
      return {
        ...state,
        flatRate: action.payload,
      };
    case 'SET_AC_TEMP':
      return {
        ...state,
        acTempThreshold: action.payload,
      };
    case 'SET_AUTO_SNOOZE':
      return {
        ...state,
        autoSnooze: action.payload,
      };
    case 'SET_TELEMETRY':
      return {
        ...state,
        telemetryResolution: action.payload,
      };
    default:
      return state;
  }
}

export default function Settings() {
  const { onboarding, resetDashboard, isOnboarded } = useDashboardStore();
  const { user, updateUser, logout } = useAuthStore();
  const { resetGamification } = useGamificationStore();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const discoms = [
    { code: 'TNEB',    name: 'Chennai - Tamil Nadu Electricity (TNEB)', rate: '8.00', city: 'Chennai' },
    { code: 'MSEDCL',  name: 'Mumbai - Maharashtra State Electricity (MSEDCL)', rate: '9.50', city: 'Mumbai' },
    { code: 'BYPL',    name: 'Delhi - BSES Yamuna Power (BYPL)', rate: '7.50', city: 'Delhi' },
    { code: 'BESCOM',  name: 'Bangalore - Bangalore Electricity (BESCOM)', rate: '7.80', city: 'Bangalore' },
    { code: 'TSSPDCL', name: 'Hyderabad - Southern Power Discom (TSSPDCL)', rate: '8.20', city: 'Hyderabad' },
    { code: 'CESC',    name: 'Kolkata - Calcutta Electric Supply (CESC)', rate: '8.00', city: 'Kolkata' },
  ];

  // Local config states grouped under a unified state reducer
  const [state, dispatch] = useReducer(settingsReducer, {
    selectedDiscom: discoms.find(d => d.city === onboarding?.location)?.code || 'TNEB',
    flatRate: discoms.find(d => d.city === onboarding?.location)?.rate || '8.00',
    acTempThreshold: 24,
    autoSnooze: true,
    telemetryResolution: '5s',
  });

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(state.flatRate)) || Number(state.flatRate) <= 0) {
      toast.error('Please enter a valid flat tariff rate.');
      return;
    }

    // Save location to user profile
    const discom = discoms.find((d) => d.code === state.selectedDiscom);
    if (discom && user) {
      const newLoc = discom.city;
      try {
        await apiService.updateProfile({ location: newLoc });
        updateUser({ location: newLoc });
        toast.success('Settings saved successfully!');
      } catch (err) {
        toast.error('Failed to save settings to backend.');
      }
    }
  };

  const handleResetCalibration = () => {
    if (window.confirm('WARNING: This will wipe out all custom estimation settings, user history, and prompt you to run Onboarding calibration again. Proceed?')) {
      resetDashboard();
      resetGamification();
      toast.info('Estimation settings cleared.');
      navigate('/onboarding');
    }
  };

  const handleFactoryReset = () => {
    if (window.confirm('CRITICAL ACTION: This will completely wipe all local storage auth sessions and telemetry data. Proceed?')) {
      resetDashboard();
      resetGamification();
      logout();
      toast.error('All account data cleared successfully.');
      navigate('/');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      setDeletingAccount(true);
      await apiService.deleteAccount();
      resetDashboard();
      resetGamification();
      logout();
      toast.success('Account permanently deleted.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
    <div className="space-y-8 font-headline">
      {/* Title Header */}
      <div>
        <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">⚙️ SETTINGS & CONFIGURATIONS</h1>
        <p className="text-sm text-on-surface-variant">Configure energy providers, utility tariffs, and savings preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left two columns: Settings panels */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* DISCOM & GRID CALIBRATION */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-4">
              <Server className="size-5 text-sky-400" /> Electricity Provider Connection
            </h2>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
              Link your live digital smart meter via national DISCOM servers. Voltify tracks loads and estimates bills based on your utility's tariff slabs.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="discom-select" className="text-on-surface-variant font-semibold">Active DISCOM Utility</label>
                  <select
                    id="discom-select"
                    className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs"
                    value={state.selectedDiscom}
                    onChange={(e) => {
                      const code = e.target.value;
                      const rate = discoms.find(d => d.code === code)?.rate || '8.00';
                      dispatch({ type: 'SET_DISCOM', payload: { code, rate } });
                    }}
                  >
                    {discoms.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="flat-rate-input" className="text-on-surface-variant font-semibold flex items-center gap-1">
                    Custom Tariff Flat Rate <span className="text-on-surface-variant/50">(₹ per kWh)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-on-surface-variant/50 font-bold">₹</span>
                    <input
                      id="flat-rate-input"
                      type="number"
                      step="0.01"
                      className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg pl-7 pr-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs font-mono"
                      value={state.flatRate}
                      onChange={(e) => dispatch({ type: 'SET_FLAT_RATE', payload: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-primary-container text-on-primary-fixed hover:bg-primary-fixed-dim px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-1.5 text-xs font-headline"
                >
                  <Check className="size-3.5" /> Save Provider Settings
                </button>
              </div>
            </form>
          </GlassCard>

          {/* COMFORT-SAFE SYSTEM (CSS) SETTINGS */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-4">
              <Sliders className="size-5 text-rose-400" /> Comfort-Safe Efficiency Thresholds
            </h2>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
              Fine-tune smart target preferences for cooling devices to keep usage in highly-efficient tariff bands.
            </p>

            <div className="space-y-6 text-xs">
              {/* AC slider */}
              <div className="space-y-2">
                <div className="flex justify-between font-mono">
                  <label htmlFor="ac-temp-slider" className="text-on-surface font-semibold cursor-pointer">AC Safe Mode Target Temp</label>
                  <span className="text-rose-400 font-bold">{state.acTempThreshold}°C</span>
                </div>
                <input
                  id="ac-temp-slider"
                  type="range"
                  min="21"
                  max="28"
                  className="w-full h-1 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-rose-500"
                  value={state.acTempThreshold}
                  onChange={(e) => dispatch({ type: 'SET_AC_TEMP', payload: Number(e.target.value) })}
                />
                <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-mono">
                  <span>21°C (Max Performance)</span>
                  <span>24°C (BEE Recommended)</span>
                  <span>28°C (Max Savings)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label htmlFor="auto-snooze-checkbox" aria-label="Enable Autonomous Eco-Snooze" className="flex items-center gap-3 cursor-pointer group">
                  <input
                    id="auto-snooze-checkbox"
                    type="checkbox"
                    checked={state.autoSnooze}
                    onChange={(e) => dispatch({ type: 'SET_AUTO_SNOOZE', payload: e.target.checked })}
                    className="rounded bg-surface-container-high border-outline-variant/50 text-rose-500 focus:ring-rose-500 size-4"
                  />
                  <div>
                    <p className="text-on-surface font-semibold group-hover:text-rose-400 transition-colors">Enable Autonomous Eco-Snooze</p>
                    <p className="text-[10px] text-on-surface-variant/60">Automatically shifts standby devices to sleep during midnight peak pricing.</p>
                  </div>
                </label>

                <div className="space-y-1.5 pt-2">
                  <label htmlFor="telemetry-resolution-select" className="text-on-surface-variant font-semibold">Smart Telemetry Poll Frequency</label>
                  <select
                    id="telemetry-resolution-select"
                    className="w-full bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors text-xs font-mono"
                    value={state.telemetryResolution}
                    onChange={(e) => dispatch({ type: 'SET_TELEMETRY', payload: e.target.value })}
                  >
                    <option value="1s">1 second (Realtime - High Bandwidth)</option>
                    <option value="5s">5 seconds (Standard Live Monitoring)</option>
                    <option value="30s">30 seconds (Eco-grid polling)</option>
                    <option value="5m">5 minutes (High Latency - Server Cached)</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>

        </div>

        {/* Right column: Info & Maintenance Cards */}
        <div className="space-y-6">
          {/* Active Status Info */}
          <GlassCard className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 size-20 bg-volt-green/5 rounded-full blur-xl" />
            <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-1.5">
              <Cpu className="size-4 text-emerald-400" /> Savings Estimation Model
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between font-mono border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Calibrated Model</span>
                <span className="text-emerald-400 font-semibold">Trained-Slab v2.4</span>
              </div>
              <div className="flex justify-between font-mono border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Estimation Confidence</span>
                <span className="text-emerald-400 font-semibold">{onboarding?.accuracy_pct || 94}%</span>
              </div>
              <div className="flex justify-between font-mono border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Estimated Appliances</span>
                <span className="text-emerald-400 font-semibold">{onboarding?.appliances.length || user?.appliance_count || 0} Connected</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-on-surface-variant">Calibration Status</span>
                <span className={`font-semibold ${isOnboarded ? 'text-emerald-400' : 'text-volt-amber animate-pulse'}`}>
                  {isOnboarded ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Maintenance & Purge */}
          <GlassCard className="p-6 border-rose-500/20 bg-rose-500/5">
            <h3 className="font-semibold text-sm text-rose-400 mb-3 flex items-center gap-1.5">
              <Trash2 className="size-4" /> System Maintenance
            </h3>
            <p className="text-[11px] text-on-surface-variant mb-6 leading-relaxed">
              Modify the underlying database and session configurations. These actions clear persistent storage.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleResetCalibration}
                className="w-full border border-rose-500/30 hover:bg-rose-500/15 text-on-surface font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="size-3.5" /> Recalibrate Estimators
              </button>

              <button
                onClick={handleFactoryReset}
                className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-on-surface font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="size-3.5 text-rose-400" /> Full Session Purge
              </button>
            </div>
          </GlassCard>

          {/* DELETE ACCOUNT — permanent action */}
          <GlassCard className="p-6 border-red-700/40 bg-red-950/30">
            <h3 className="font-semibold text-sm text-red-400 mb-2 flex items-center gap-1.5">
              <Trash2 className="size-4" /> Delete Account
            </h3>
            <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed">
              Permanently erase your account, all energy data, coins, streaks, and check-in history from our servers. <span className="text-red-400 font-semibold">This cannot be undone.</span>
            </p>
            <button
              id="open-delete-account-modal"
              onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }}
              className="w-full bg-red-700/30 hover:bg-red-700/50 border border-red-600/40 text-red-300 font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 className="size-3.5" /> Permanently Delete My Account
            </button>
          </GlassCard>

          {/* FAQs */}
          <GlassCard className="p-6">
            <h3 className="font-semibold text-sm text-on-surface mb-3 flex items-center gap-1.5">
              <HelpCircle className="size-4 text-primary-container" /> Energy Estimation Help
            </h3>
            <div className="space-y-2 text-[11px] text-on-surface-variant">
              <p className="font-semibold text-on-surface">How is energy usage estimated?</p>
              <p className="leading-relaxed">Estimated based on seasonal factors, average usage parameters, and standard appliances. No physical sensors needed!</p>
              <p className="font-semibold text-on-surface pt-2">What is Auto-Snooze?</p>
              <p className="leading-relaxed">It triggers mild power shifts when regional electrical frequencies drop to secure high multiplier coins.</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>

    {/* DELETE ACCOUNT MODAL */}
    {showDeleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-surface-container-high border border-red-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-red-900/50 border border-red-600/40 flex items-center justify-center">
                <Trash2 className="size-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-on-surface text-base">Delete Account</h3>
                <p className="text-[11px] text-red-400">This action is permanent and irreversible</p>
              </div>
            </div>
            <button onClick={() => setShowDeleteModal(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
              <X className="size-5" />
            </button>
          </div>

          <div className="bg-red-950/40 border border-red-700/30 rounded-xl p-4 mb-5 space-y-1.5">
            <p className="text-xs text-red-300 font-semibold">The following will be permanently deleted:</p>
            <ul className="text-[11px] text-on-surface-variant space-y-1 mt-2">
              <li>• Your account and profile information</li>
              <li>• All energy data, appliances, and bill history</li>
              <li>• All Voltify Coins, streaks, and challenges</li>
              <li>• All daily check-ins and telemetry logs</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="delete-confirm-input" className="text-xs text-on-surface-variant mb-1.5 block">
                Type <span className="text-red-400 font-bold font-mono">DELETE</span> to confirm:
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full bg-surface-container border border-outline-variant/50 rounded-lg px-3 py-2.5 text-on-surface text-xs font-mono focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant font-semibold text-xs px-4 py-2.5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-account-btn"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                {deletingAccount ? (
                  <><RefreshCw className="size-3.5 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="size-3.5" /> Delete Forever</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
export { Settings };
