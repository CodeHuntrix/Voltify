// src/lib/estimation.ts
import { Appliance } from '../types/appliance';
import { DailyUsage, ApplianceBreakdown } from '../types/dashboard';
import { getTariffRate, getSeasonMultiplier } from './utils';

const TARIFF_RATE = 8.0; // ₹/kWh default

export function estimateMonthlyKwh(appliances: Appliance[]): number {
  const currentMonth = new Date().getMonth() + 1;
  return appliances.reduce((total, appliance) => {
    const seasonal = getSeasonMultiplier(currentMonth, appliance.name.includes('AC') ? 'AC' : '');
    const daily = appliance.power_kw * appliance.avg_hours_day;
    const monthly = daily * 30 * seasonal;
    return total + monthly;
  }, 0);
}

export function estimateApplianceBreakdown(
  appliances: Appliance[],
  totalBillAmount: number,
  totalUnits: number,
  tariffRate: number = TARIFF_RATE
): ApplianceBreakdown[] {
  const currentMonth = new Date().getMonth() + 1;
  const NEON_COLORS = ['#22d3ee', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a78bfa'];

  const rawEstimates = appliances.map((appliance, idx) => {
    const seasonal = getSeasonMultiplier(currentMonth, appliance.name.includes('AC') ? 'AC' : '');
    const monthly_kwh = appliance.power_kw * appliance.avg_hours_day * 30 * seasonal;
    return { ...appliance, monthly_kwh, color: NEON_COLORS[idx % NEON_COLORS.length] };
  });

  const totalEstimated = rawEstimates.reduce((s, a) => s + a.monthly_kwh, 0);
  const scaleFactor = totalEstimated > 0 ? totalUnits / totalEstimated : 1;

  return rawEstimates.map(a => {
    const units = a.monthly_kwh * scaleFactor;
    const percentage = (units / totalUnits) * 100;
    const cost = (percentage / 100) * totalBillAmount;
    return {
      name: a.name,
      icon: a.icon || '⚡',
      units: parseFloat(units.toFixed(1)),
      percentage: parseFloat(percentage.toFixed(1)),
      cost: parseFloat(cost.toFixed(0)),
      color: a.color,
    };
  });
}

export function generateDailyUsage(
  appliances: Appliance[],
  daysBack: number = 30,
  location: string = 'Chennai',
  monthlyUnits?: number
): DailyUsage[] {
  const tariff = getTariffRate(location, monthlyUnits);
  const baseDaily = estimateMonthlyKwh(appliances) / 30;
  const result: DailyUsage[] = [];

  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Weekend uses ~15% more, add ±10% noise
    const multiplier = (isWeekend ? 1.15 : 1.0) * (0.9 + Math.random() * 0.2);
    const units = parseFloat((baseDaily * multiplier).toFixed(2));
    const cost = parseFloat((units * tariff).toFixed(0));
    const label = date.toLocaleDateString('en-IN', { weekday: 'short' });

    result.push({
      date: date.toISOString().split('T')[0],
      units,
      cost,
      label,
    });
  }
  return result;
}

export function calculatePredictions(dailyHistory: DailyUsage[], tariffRate: number = TARIFF_RATE) {
  const last7 = dailyHistory.slice(-7);
  const avg7 = last7.reduce((s, d) => s + d.units, 0) / 7;
  const last3 = dailyHistory.slice(-3);
  const avg3 = last3.reduce((s, d) => s + d.units, 0) / 3;

  // Check for bill shock (increasing trend)
  const trendFactor = avg3 / avg7 || 1.0;
  const daysInMonth = 30;
  const daysElapsed = Math.min(new Date().getDate(), daysInMonth);
  const usedSoFar = dailyHistory.slice(-daysElapsed).reduce((s, d) => s + d.units, 0);
  const projectedMonth = (usedSoFar / daysElapsed) * daysInMonth || avg7 * daysInMonth;

  return {
    tomorrow: {
      units: parseFloat((avg7 * (0.95 + Math.random() * 0.1)).toFixed(1)),
      cost: parseFloat((avg7 * tariffRate).toFixed(0)),
      confidence: 85,
    },
    next_week: {
      units: parseFloat((avg7 * 7 * (0.95 + Math.random() * 0.1)).toFixed(0)),
      cost: parseFloat((avg7 * 7 * tariffRate).toFixed(0)),
      confidence: 75,
    },
    next_month: {
      units: parseFloat((projectedMonth * trendFactor).toFixed(0)),
      cost: parseFloat((projectedMonth * trendFactor * tariffRate).toFixed(0)),
      confidence: 65,
    },
    bill_shock_risk: trendFactor > 1.15,
    projected_bill: parseFloat((projectedMonth * tariffRate).toFixed(0)),
  };
}

export function calculateCoins(predictedUnits: number, actualUnits: number, streakDays: number, rank: number): number {
  const saved = predictedUnits - actualUnits;
  if (saved <= 0) return 0;

  let base = saved * 10;
  let multiplier = 1.0;

  if (rank <= 3)        multiplier *= 1.5;
  else if (rank <= 5)   multiplier *= 1.25;
  else if (rank <= 10)  multiplier *= 1.1;

  if (streakDays >= 90)      multiplier *= 1.6;
  else if (streakDays >= 30) multiplier *= 1.35;
  else if (streakDays >= 7)  multiplier *= 1.15;

  return Math.round(base * multiplier);
}

export function calculateEnergyScore(data: {
  savingsPct: number;
  streakDays: number;
  challengesCompleted: number;
  cssApplied: number;
  billsUploaded: number;
}): number {
  const pts =
    Math.min(data.savingsPct * 30, 30) +
    Math.min(data.streakDays * 0.67, 20) +
    Math.min(data.challengesCompleted * 5, 25) +
    Math.min(data.cssApplied * 5, 15) +
    Math.min(data.billsUploaded * 2, 10);

  return Math.round(Math.min(pts, 100));
}

export function generateRuleBasedAlerts(
  dailyHistory: DailyUsage[],
  lastMonthBill: number,
  projectedBill: number
): { type: 'warning' | 'info' | 'success'; title: string; message: string }[] {
  const alerts = [];
  const last7 = dailyHistory.slice(-7);
  const prev7 = dailyHistory.slice(-14, -7);
  
  if (last7.length && prev7.length) {
    const avgLast7 = last7.reduce((s, d) => s + d.units, 0) / 7;
    const avgPrev7 = prev7.reduce((s, d) => s + d.units, 0) / 7;
    const changePct = ((avgLast7 - avgPrev7) / (avgPrev7 || 1)) * 100;

    if (changePct > 20) {
      alerts.push({
        type: 'warning' as const,
        title: `Usage ↑${changePct.toFixed(0)}% vs Last Week`,
        message: `Avg ${avgLast7.toFixed(1)} units/day this week vs ${avgPrev7.toFixed(1)} last week. Likely cause: Higher AC usage.`,
      });
    } else if (changePct < -10) {
      alerts.push({
        type: 'success' as const,
        title: `Usage ↓${Math.abs(changePct).toFixed(0)}% vs Last Week`,
        message: `Great job! You used ${avgPrev7.toFixed(1)} units/day last week vs ${avgLast7.toFixed(1)} this week.`,
      });
    }
  }

  if (projectedBill > lastMonthBill * 1.15) {
    alerts.push({
      type: 'warning' as const,
      title: 'Bill Shock Risk',
      message: `Projected bill ₹${projectedBill.toLocaleString()} vs last month ₹${lastMonthBill.toLocaleString()}. +${(((projectedBill - lastMonthBill) / (lastMonthBill || 1)) * 100).toFixed(0)}% increase.`,
    });
  }

  return alerts;
}
