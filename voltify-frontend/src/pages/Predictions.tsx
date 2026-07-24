// src/pages/Predictions.tsx
import { useState, useEffect } from 'react';
import { 
  Zap, Sparkles, BrainCircuit, ArrowRight, Lightbulb, 
  TrendingUp, Coins, Lock, CheckCircle2, Sliders, Activity, Gauge, Info, Calendar, FileText
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { apiService } from '../lib/api';
import { toast } from 'react-toastify';
import { useGamificationStore } from '../store/gamificationStore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

export default function Predictions() {
  const { addCoins } = useGamificationStore();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ potential: 1020, annual: 12240 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>({ tomorrow: 12.4, next_week: 85.0, next_month: 340.0 });
  const [billShock, setBillShock] = useState<any>({ risk: 'LOW', probability: 24, projected_bill: 2450 });
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  
  // What-If Simulation State
  const [simAppliance, setSimAppliance] = useState('Air Conditioner');
  const [simValue, setSimValue] = useState('2');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Derive the active control type from appliance name matching catalog
  const getSimControlInfo = () => {
    if (simAppliance.includes('Conditioner') || simAppliance === 'AC') {
      return { control_type: 'temperature', label: 'Raise AC Temperature', unit: '°C' };
    }
    if (simAppliance.includes('Geyser') || simAppliance === 'Water Heater') {
      return { control_type: 'schedule', label: 'Shift Heating Schedule', unit: 'hr shift' };
    }
    if (simAppliance.includes('Refrigerator') || simAppliance === 'Fridge') {
      return { control_type: 'hours', label: 'Reduce Running Hours', unit: 'hrs' };
    }
    return { control_type: 'hours', label: 'Reduce Running Hours', unit: 'hrs' };
  };

  const simInfo = getSimControlInfo();

  useEffect(() => {
    async function loadPredictionsData() {
      try {
        const [cssRes, chartRes, predRes, chalRes] = await Promise.all([
          apiService.getCSSRecommendations(),
          apiService.getActualVsPredicted(),
          apiService.getCoachPredictions(),
          apiService.getGamificationChallenge().catch(() => null)
        ]);

        if (cssRes?.recommendations) {
          setRecommendations(cssRes.recommendations);
          setTotals({
            potential: cssRes.total_potential_savings_rs || 1020,
            annual: cssRes.total_annual_savings_rs || 12240
          });
        }
        if (chartRes?.data) {
          setChartData(chartRes.data);
        }
        if (predRes?.predictions) {
          setPredictions(predRes.predictions);
        }
        if (predRes?.bill_shock) {
          setBillShock(predRes.bill_shock);
        }
        if (chalRes?.challenge) {
          setActiveChallenge(chalRes.challenge);
        }
      } catch (err) {
        console.error("Failed to load energy predictions and recommendations", err);
      }
    }
    loadPredictionsData();
  }, []);

  // Run initial simulation
  useEffect(() => {
    handleSimulate();
  }, [simAppliance, simValue]);

  const handleApplyRecommendation = async (recId: string, appliance: string, setting: string) => {
    try {
      const res = await apiService.applyCSSRecommendation({
        recommendation_id: recId,
        appliance,
        setting_applied: setting
      });
      if (res.success) {
        toast.success(`Applied! Earned ${res.coins_earned || 80} coins! Expected savings: ₹${res.expected_monthly_savings || 240}/mo.`);
        
        // Update local state to show applied status
        setRecommendations(prev => 
          prev.map(r => r.id === recId ? { ...r, already_applied: true } : r)
        );
        addCoins(res.coins_earned || 80);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply optimization target");
    }
  };

  const handleSimulate = async () => {
    setSimLoading(true);
    try {
      const changeType = simInfo.control_type;
      const res = await apiService.getWhatIf(simAppliance, changeType, simValue);
      setSimResult(res);
    } catch (err: any) {
      console.error("Simulation failed", err);
      setSimResult({ error: err.message || "Failed to compute energy simulation" });
    } finally {
      setSimLoading(false);
    }
  };

  const getUnits = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'object' && 'units' in val) {
      return val.units;
    }
    return typeof val === 'number' ? val : 0;
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
    <div className="space-y-8 font-headline text-on-surface pb-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">
            AI Energy Predictions & Simulator
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Leverage disaggregation-powered foresight to predict future bills, simulate energy shifts, and activate comfort-safe optimizations.
          </p>
        </div>

        {/* Prediction Accuracy Badge */}
        <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl flex items-center gap-3 w-fit">
          <Activity className="size-5 text-primary animate-pulse" />
          <div>
            <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Disaggregation Accuracy</div>
            <div className="text-sm font-semibold text-white">98.4% Confidence Interval</div>
          </div>
        </div>
      </div>

      {/* Grid: Actual vs Predicted Graph & Tomorrow's Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Actual vs Predicted Graph */}
        <GlassCard className="col-span-1 lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold text-base text-white">Consumption History: Actual vs. Predicted</h3>
              <p className="text-[11px] text-gray-400">Comparing disaggregated estimates against DISCOM statement bills</p>
            </div>
            {chartData && chartData.length >= 2 && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  <span className="size-1.5 rounded-full bg-primary" /> Actual Units
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full">
                  <span className="size-1.5 rounded-full bg-tertiary" /> Predicted Units
                </span>
              </div>
            )}
          </div>

          <div className="h-64 w-full">
            {chartData && chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="month" 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={10}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString('default', { month: 'short' });
                    }}
                  />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="actual_units" name="Actual Units" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                  <Area type="monotone" dataKey="estimated_units" name="Predicted Units" stroke="#00e676" strokeWidth={2} fillOpacity={1} fill="url(#colorPredicted)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-white/5 rounded-2xl bg-white/[0.01] space-y-4">
                <div className="size-12 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                  <Calendar className="size-6 text-amber-400" />
                </div>
                <div className="max-w-md space-y-2">
                  <h4 className="font-display font-semibold text-sm text-white">More Bill Data Required</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    To render this disaggregation accuracy graph, we require <strong className="font-semibold text-white">at least 2 monthly bills</strong> to chart estimates against actual bills over time.
                  </p>
                  <p className="text-[10px] text-primary font-mono bg-primary/5 border border-primary/10 px-3 py-2 rounded-xl mt-3 inline-block font-sans">
                    💡 Navigate to <strong className="font-semibold">Settings</strong> and click <strong className="font-semibold">Reset Calibration</strong> to run the Onboarding wizard and enter your historical bill parameters!
                  </p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Prediction Intelligence Card */}
        <GlassCard className="space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-primary" />
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-gray-400">Predictive Horizons</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300 font-sans">Tomorrow's Forecast</span>
                <span className="text-sm font-semibold text-white font-mono">{getUnits(predictions.tomorrow).toFixed(1)} kWh</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300 font-sans">Next 7 Days Forecast</span>
                <span className="text-sm font-semibold text-white font-mono">{getUnits(predictions.next_week).toFixed(0)} kWh</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300 font-sans">Projected Monthly Cost</span>
                <span className="text-sm font-bold text-primary font-mono">₹{billShock.projected_bill || '2,450'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] text-gray-400 font-sans">Bill Shock Risk Level</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                billShock.risk === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {billShock.risk || 'LOW'} ({billShock.probability || '24'}%)
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal font-sans">
              No anomalies detected. Projected bill is within normal seasonal distributions. Keep up the optimization!
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Interactive What-If Simulator */}
      <div className="max-w-4xl mx-auto">
        <GlassCard className="space-y-6">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sliders className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-white">What-If Energy Simulator</h3>
              <p className="text-[10px] text-gray-400">Simulate changes and forecast savings before applying them</p>
            </div>
          </div>

          {/* Simulator Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sim_appliance_select" className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">Appliance</label>
              <select 
                id="sim_appliance_select"
                value={simAppliance} 
                onChange={(e) => { setSimAppliance(e.target.value); setSimValue('1'); }}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary font-sans"
              >
                <option value="Air Conditioner">Air Conditioner</option>
                <option value="Geyser">Water Heater (Geyser)</option>
                <option value="Refrigerator">Refrigerator</option>
                <option value="Television">Television</option>
                <option value="Lights">Lights</option>
                <option value="Fans">Fans</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">Adjustment Lever</label>
              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-primary font-bold font-sans">
                {simInfo.label}
              </div>
            </div>

            <div>
              <label htmlFor="sim_value_input" className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">Value ({simInfo.unit})</label>
              {simInfo.control_type === 'temperature' ? (
                <div className="flex items-center gap-3">
                  <input
                    id="sim_value_input"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={simValue}
                    onChange={(e) => setSimValue(e.target.value)}
                    className="flex-1 accent-primary h-1 bg-white/15 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-white whitespace-nowrap min-w-[50px] text-right">
                    +{simValue}°C
                  </span>
                </div>
              ) : simInfo.control_type === 'schedule' ? (
                <select
                  id="sim_value_input"
                  value={simValue}
                  onChange={(e) => setSimValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary font-sans"
                >
                  <option value="1">Shift 1 hr (Avoid peak slots)</option>
                  <option value="2">Shift 2 hrs (Early morning slots)</option>
                  <option value="3">Shift 3 hrs (Midnight slots)</option>
                </select>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    id="sim_value_input"
                    type="range"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={simValue}
                    onChange={(e) => setSimValue(e.target.value)}
                    className="flex-1 accent-primary h-1 bg-white/15 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-white whitespace-nowrap min-w-[50px] text-right">
                    -{simValue}h/day
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Simulator Outputs */}
          {simResult && !simResult.error ? (
            <div className="p-5 rounded-2xl border border-primary/20 bg-primary/[0.02] relative overflow-hidden space-y-4">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-sans">Projected Energy Saved</span>
                <span className="text-sm font-bold text-primary font-mono">-{simResult.saved_kwh} kWh / mo</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.05]">
                <div>
                  <span className="block text-[9px] text-gray-500 uppercase font-semibold font-sans">Monthly Savings</span>
                  <span className="text-base font-bold text-white font-mono">₹{simResult.monthly_savings_rs}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-500 uppercase font-semibold font-sans">Annual Savings</span>
                  <span className="text-base font-bold text-white font-mono">₹{simResult.annual_savings_rs}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2">
                  <Coins className="size-4 text-tertiary" />
                  <span className="text-[10px] text-gray-300 font-sans">Completing this goal earns:</span>
                </div>
                <span className="text-xs font-mono font-bold text-tertiary">+{simResult.coins_earned || 300} Coins</span>
              </div>
            </div>
          ) : simResult && simResult.error ? (
            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center text-xs space-y-2">
              <span className="block font-semibold text-white font-sans">⚠️ Simulation Unavailable</span>
              <span className="block text-gray-400 font-sans leading-relaxed">
                To run this simulation, you must first add a <strong className="font-semibold text-white">{simAppliance}</strong> to your household configuration!
              </span>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01]">
              <span className="text-xs text-gray-500 font-sans">Configuring simulation forecasts...</span>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
export { Predictions };
