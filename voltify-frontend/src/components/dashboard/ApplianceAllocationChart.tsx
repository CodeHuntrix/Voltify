import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ApplianceItem {
  name: string;
  icon?: string;
  units: number;
  percentage?: number;
  cost?: number;
  color: string;
}

interface ApplianceAllocationChartProps {
  applianceBreakdown: ApplianceItem[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as ApplianceItem;
  return (
    <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs z-50 text-white">
      <p className="font-semibold text-white mb-1">
        {d.icon} {d.name}
      </p>
      <p style={{ color: d.color }} className="font-bold">{Number(d.units).toFixed(1)} kWh</p>
      {d.percentage !== undefined && (
        <p className="text-gray-300 mt-0.5">{Number(d.percentage).toFixed(1)}% of total</p>
      )}
      {d.cost !== undefined && d.cost > 0 && (
        <p className="text-gray-400">≈ ₹{Number(d.cost).toFixed(0)}</p>
      )}
    </div>
  );
};

export default function ApplianceAllocationChart({ applianceBreakdown }: ApplianceAllocationChartProps) {
  const data = applianceBreakdown.filter(a => a.units > 0);
  const totalUnits = data.reduce((s, a) => s + a.units, 0);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-on-surface-variant font-sans">
        No appliance data — complete onboarding to see your breakdown.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={42}
          outerRadius={62}
          paddingAngle={3}
          dataKey="units"
          labelLine={false}
          label={false}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>

        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
          <tspan x="50%" dy="-0.3em" fill="#ededed" fontSize={14} fontWeight={700}>
            {totalUnits.toFixed(0)}
          </tspan>
          <tspan x="50%" dy="1.4em" fill="#888" fontSize={9}>
            kWh/mo
          </tspan>
        </text>

        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
