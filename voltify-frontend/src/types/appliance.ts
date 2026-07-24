// src/types/appliance.ts
export interface Appliance {
  id: string;
  name: string;
  icon: string;
  power_kw: number;
  avg_hours_day: number;
  seasonality?: 'whole_year' | 'summer' | 'winter';
  type?: string; // for geyser: electric/solar/instant
  monthly_kwh?: number;
  monthly_cost?: number;
  percentage?: number;
}

export const DEFAULT_APPLIANCES: Record<string, Omit<Appliance, 'id'> & { control_type?: 'temperature' | 'schedule' | 'hours' }> = {
  AC:               { name: 'Air Conditioner', icon: '❄️', power_kw: 1.5, avg_hours_day: 8,    seasonality: 'summer', control_type: 'temperature' },
  Fridge:           { name: 'Refrigerator',    icon: '🧊', power_kw: 0.4, avg_hours_day: 24, control_type: 'hours' },
  Geyser:           { name: 'Geyser',          icon: '🚿', power_kw: 3.0, avg_hours_day: 1.5,  type: 'electric', control_type: 'schedule' },
  TV:               { name: 'Television',      icon: '📺', power_kw: 0.1, avg_hours_day: 4, control_type: 'hours' },
  WashingMachine:   { name: 'Washing Machine', icon: '🫧', power_kw: 2.0, avg_hours_day: 0.5, control_type: 'hours' },
  Microwave:        { name: 'Microwave',       icon: '📡', power_kw: 1.2, avg_hours_day: 0.3, control_type: 'hours' },
  Lights:           { name: 'Lights',          icon: '💡', power_kw: 0.3, avg_hours_day: 5, control_type: 'hours' },
  Fans:             { name: 'Fans',            icon: '🌀', power_kw: 0.075, avg_hours_day: 8, control_type: 'hours' },
  Laptop:           { name: 'Laptop',          icon: '💻', power_kw: 0.065, avg_hours_day: 6, control_type: 'hours' },
};
