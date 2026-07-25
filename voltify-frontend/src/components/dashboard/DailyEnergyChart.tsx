import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, LabelList
} from 'recharts';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface DailyHistoryItem {
  date: string;
  units?: number;
  cost?: number;
  label?: string;
  actual_units?: number;
  actual_cost?: number;
  estimated_units?: number;
  estimated_cost?: number;
  accuracy_pct?: number;
}

interface DailyEnergyChartProps {
  dailyHistory: DailyHistoryItem[];
}

function toDateStr(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoDate = raw.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return '';
}

function formatDayLabel(raw: string): string {
  const dateStr = toDateStr(raw);
  if (!dateStr) return raw;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatMonthLabel(raw: string): string {
  const dateStr = toDateStr(raw);
  if (!dateStr) return raw;
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = parts[1] ? Number(parts[1]) : 1;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const isMonthly = payload.some((p: any) => p.dataKey === 'actual' || p.dataKey === 'estimated');

  if (isMonthly) {
    const actual = payload.find((p: any) => p.dataKey === 'actual')?.value ?? 0;
    const estimated = payload.find((p: any) => p.dataKey === 'estimated')?.value ?? 0;
    const accuracy = payload[0]?.payload?.accuracy_pct ?? 100;
    
    return (
      <div className="bg-[#111] border border-[#333] rounded-xl px-4 py-3 shadow-2xl text-xs space-y-1">
        <p className="font-semibold text-on-surface">{label}</p>
        <p className="text-[#00e5ff] font-medium">Actual Bill: {Number(actual).toFixed(0)} kWh</p>
        <p className="text-[#ec4899] font-medium">Estimated: {Number(estimated).toFixed(0)} kWh</p>
        <p className="text-tertiary text-[10px] uppercase font-bold pt-1 border-t border-[#222]">
          Calibration Accuracy: {Number(accuracy).toFixed(1)}%
        </p>
      </div>
    );
  }

  const units = payload[0]?.value ?? 0;
  const cost  = payload[0]?.payload?.cost ?? 0;
  return (
    <div className="bg-[#111] border border-[#333] rounded-xl px-4 py-3 shadow-2xl text-xs">
      <p className="font-semibold text-on-surface mb-1">{label}</p>
      <p className="text-[#00e5ff] font-bold">{Number(units).toFixed(2)} kWh</p>
      {cost > 0 && <p className="text-on-surface-variant mt-0.5 font-mono">≈ ₹{Number(cost).toFixed(0)}</p>}
    </div>
  );
};

export default function DailyEnergyChart({ dailyHistory }: DailyEnergyChartProps) {
  const isMonthly = dailyHistory.some(d => 'actual_units' in d || 'estimated_units' in d);
  const [zoomMode, setZoomMode] = useState<'7d' | 'all'>('7d');

  const data = useMemo(() => {
    const cloned = [...dailyHistory];
    cloned.sort((a, b) => {
      const timeA = new Date(toDateStr(a.date) || a.date).getTime();
      const timeB = new Date(toDateStr(b.date) || b.date).getTime();
      return timeA - timeB;
    });

    return cloned.map(d => {
      if (isMonthly) {
        return {
          ...d,
          date:      toDateStr(d.date),
          label:     d.label || formatMonthLabel(d.date),
          actual:    d.actual_units ? parseFloat(Number(d.actual_units).toFixed(1)) : 0,
          estimated: d.estimated_units ? parseFloat(Number(d.estimated_units).toFixed(1)) : 0,
          actual_cost: d.actual_cost ? parseFloat(Number(d.actual_cost).toFixed(0)) : (d.actual_units ? parseFloat(Number(d.actual_units * 8).toFixed(0)) : 0),
          estimated_cost: d.estimated_cost ? parseFloat(Number(d.estimated_cost).toFixed(0)) : (d.estimated_units ? parseFloat(Number(d.estimated_units * 8).toFixed(0)) : 0),
          accuracy_pct: d.accuracy_pct ? parseFloat(Number(d.accuracy_pct).toFixed(1)) : 100,
        };
      }

      return {
        ...d,
        date:    toDateStr(d.date),
        label:   d.label || formatDayLabel(d.date),
        units:   d.units ? parseFloat(Number(d.units).toFixed(2)) : 0,
        cost:    d.cost ? parseFloat(Number(d.cost).toFixed(0)) : undefined,
      };
    });
  }, [dailyHistory, isMonthly]);

  const displayedData = useMemo(() => {
    if (zoomMode === '7d') {
      return data.slice(-7);
    }
    return data;
  }, [data, zoomMode]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-on-surface-variant">
        No usage data yet — complete onboarding to generate your energy baseline.
      </div>
    );
  }

  const avgUnits = isMonthly
    ? displayedData.reduce((s: number, d: any) => s + (d.actual || 0), 0) / displayedData.length
    : displayedData.reduce((s: number, d: any) => s + (d.units || 0), 0) / displayedData.length;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Zoom Controls */}
      <div className="flex justify-end gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => setZoomMode('7d')}
          className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
            zoomMode === '7d'
              ? 'bg-primary border-primary text-slate-950'
              : 'border-white/10 text-on-surface-variant hover:text-white bg-white/5'
          }`}
          title="Zoom to 7 days"
        >
          <ZoomIn className="size-3" /> 7 Days
        </button>
        <button
          type="button"
          onClick={() => setZoomMode('all')}
          className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
            zoomMode === 'all'
              ? 'bg-primary border-primary text-slate-950'
              : 'border-white/10 text-on-surface-variant hover:text-white bg-white/5'
          }`}
          title="Zoom out to show all data"
        >
          <ZoomOut className="size-3" /> Show All
        </button>
      </div>

      <div className="flex-1 w-full select-none">
        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer width="100%" height="100%">


            <BarChart data={displayedData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />

              <XAxis
                dataKey="label"
                tick={{ fill: '#888', fontSize: 9, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tick={{ fill: '#888', fontSize: 9, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />

              <ReferenceLine
                y={parseFloat(avgUnits.toFixed(2))}
                stroke="rgba(0,229,255,0.3)"
                strokeDasharray="4 4"
                label={{
                  value: `Avg: ${avgUnits.toFixed(0)}`,
                  position: 'insideTopRight',
                  fill: 'rgba(0,229,255,0.6)',
                  fontSize: 9,
                  fontWeight: 'bold'
                }}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

              {isMonthly ? (
                <>
                  <Bar
                    dataKey="actual"
                    name="Actual Units"
                    fill="#00e5ff"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  >
                    <LabelList dataKey="actual_cost" position="top" fill="#00e5ff" fontSize={8} fontWeight="bold" formatter={(val) => val ? `₹${val}` : ''} />
                  </Bar>
                  <Bar
                    dataKey="estimated"
                    name="Predicted Units"
                    fill="#ec4899"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  >
                    <LabelList dataKey="estimated_cost" position="top" fill="#ec4899" fontSize={8} fontWeight="bold" formatter={(val) => val ? `₹${val}` : ''} />
                  </Bar>
                </>
              ) : (
                <Bar
                  dataKey="units"
                  name="Energy Load"
                  fill="#00e5ff"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                >
                  <LabelList dataKey="cost" position="top" fill="#00e5ff" fontSize={8} fontWeight="bold" formatter={(val) => val ? `₹${val}` : ''} />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
