// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatUnits(units: number): string {
  return `${units.toFixed(1)} kWh`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function getDayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' });
}

export function calculateChennaiTNEBBill(monthlyUnits: number): number {
  const biMonthlyUnits = monthlyUnits * 2;
  let remaining = biMonthlyUnits;
  let cost = 0;

  // 1. First 100 units: Free
  const slab1 = Math.min(100, remaining);
  remaining -= slab1;

  // 2. 101 to 200 units: ₹2.25
  if (remaining > 0) {
    const slab2 = Math.min(100, remaining);
    cost += slab2 * 2.25;
    remaining -= slab2;
  }

  // 3. 201 to 400 units: ₹4.50
  if (remaining > 0) {
    const slab3 = Math.min(200, remaining);
    cost += slab3 * 4.50;
    remaining -= slab3;
  }

  // 4. 401 to 500 units: ₹6.00
  if (remaining > 0) {
    const slab4 = Math.min(100, remaining);
    cost += slab4 * 6.00;
    remaining -= slab4;
  }

  // 5. 501 to 600 units: ₹8.00
  if (remaining > 0) {
    const slab5 = Math.min(100, remaining);
    cost += slab5 * 8.00;
    remaining -= slab5;
  }

  // 6. 601 to 800 units: ₹9.00
  if (remaining > 0) {
    const slab6 = Math.min(200, remaining);
    cost += slab6 * 9.00;
    remaining -= slab6;
  }

  // 7. 801 to 1000 units: ₹10.00
  if (remaining > 0) {
    const slab7 = Math.min(200, remaining);
    cost += slab7 * 10.00;
    remaining -= slab7;
  }

  // 8. Above 1000 units: ₹11.00
  if (remaining > 0) {
    cost += remaining * 11.00;
  }

  // Monthly share is bi-monthly bill / 2
  return cost / 2;
}

export function getTariffRate(location: string, monthlyUnits?: number): number {
  // DISCOM tariff rates
  const rates: Record<string, number> = {
    Chennai: 8.0, Mumbai: 9.5, Delhi: 7.5, Bangalore: 7.8,
    Hyderabad: 8.2, Kolkata: 8.0, default: 8.0,
  };

  if (location === 'Chennai' && monthlyUnits !== undefined && monthlyUnits > 0) {
    return calculateChennaiTNEBBill(monthlyUnits) / monthlyUnits;
  }

  return rates[location] || rates.default;
}

export function getSeasonMultiplier(month: number, appliance: string): number {
  if (appliance === 'AC') {
    if ([4, 5, 6].includes(month)) return 1.3;    // Summer
    if ([12, 1, 2].includes(month)) return 0.7;   // Winter
    return 1.0;
  }
  return 1.0;
}
