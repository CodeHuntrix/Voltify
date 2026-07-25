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
    <div className="bg-[#111] border border-[#333] rounded-xl px-4 py-3 shadow-2xl text-xs">
      <p className="font-semibold text-on-surface mb-1">
        {d.icon} {d.name}
      </p>
      <p style={{ color: d.color }}>{Number(d.units).toFixed(1)} kWh</p>
      {d.percentage !== undefined && (
        <p className="text-on-surface-variant mt-0.5">{Number(d.percentage).toFixed(1)}%</p>
      )}
      {d.cost !== undefined && d.cost > 0 && (
        <p className="text-on-surface-variant">≈ ₹{Number(d.cost).toFixed(0)}</p>
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
          cy="42%"
          innerRadius={50}
          outerRadius={75}
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

        <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle">
          <tspan x="50%" dy="-0.3em" fill="#ededed" fontSize={15} fontWeight={700}>
            {totalUnits.toFixed(0)}
          </tspan>
          <tspan x="50%" dy="1.4em" fill="#888" fontSize={9}>
            kWh/mo
          </tspan>
        </text>

        <Tooltip content={<CustomTooltip />} />
        <Legend 
          layout="horizontal" 
          align="center" 
          verticalAlign="bottom" 
          iconSize={8} 
          iconType="circle" 
          formatter={(value, entry: any) => {
            const item = entry.payload as ApplianceItem;
            return <span className="text-[10px] text-gray-300 font-sans">{item.name} ({item.percentage?.toFixed(0)}%)</span>;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
