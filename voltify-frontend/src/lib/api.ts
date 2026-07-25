// src/lib/api.ts
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useGamificationStore } from '../store/gamificationStore';
import { estimateMonthlyKwh, estimateApplianceBreakdown, generateDailyUsage, calculatePredictions, generateRuleBasedAlerts } from './estimation';
import { generateLeaderboard, MOCK_NOTIFICATIONS, CSS_RECOMMENDATIONS } from './mockData';
import { Appliance, DEFAULT_APPLIANCES } from '../types/appliance';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Standard fetch wrapper that attaches JWT token and catches network errors
 * to gracefully fall back to local mock data.
 */
async function fetchApi(endpoint: string, options: RequestInit = {}, fallbackData?: any) {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    
    // If backend returns a normal error (400, 401, 500, etc), throw it so caller handles it
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server Error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    // If it's a TypeError (NetworkError), the backend is offline. Use dual-mode fallback!
    if (err instanceof TypeError || err.message === 'Failed to fetch') {
      console.warn(`[Voltify API] Backend unreachable for ${endpoint}. Falling back to local simulation mode.`);
      if (fallbackData !== undefined) {
        return fallbackData; // Return the specific fallback generated below
      }
    }
    // Re-throw genuine backend errors
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────
// DUAL-MODE API SERVICE EXPORTS
// ─────────────────────────────────────────────────────────────────

export const apiService = {
  // ── AUTH ────────────────────────────────────────────────────────
  
  async signup(data: any) {
    const fallback = {
      token: 'mock-jwt-token',
      user: {
        id: `mock-user-${Date.now()}`,
        name: data.name,
        email: data.email,
        tier: 3,
        coins: 100,
        streak_days: 1,
        onboarding_complete: false,
      }
    };
    return fetchApi('/auth/signup', { method: 'POST', body: JSON.stringify(data) }, fallback);
  },

  async login(data: any) {
    const fallback = {
      token: 'mock-jwt-token',
      user: {
        id: 'user-1',
        name: 'Ravi Kumar',
        email: data.email,
        tier: 3,
        household_type: 'family',
        location: 'Chennai',
        home_type: 'apartment',
        coins: 250,
        streak_days: 7,
        onboarding_complete: true,
      }
    };
    return fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }, fallback);
  },

  async oauthLogin(provider: string, payload?: { name: string; email: string }) {
    const fallback = {
      token: 'mock-jwt-token-oauth',
      user: {
        id: `oauth-user-${Date.now()}`,
        name: payload?.name || 'Oauth User',
        email: payload?.email || 'oauth@example.com',
        tier: 1,
        coins: 0,
        streak_days: 0,
        onboarding_complete: false,
      }
    };
    const options: RequestInit = { method: 'POST' };
    if (payload) {
      options.body = JSON.stringify(payload);
    }
    return fetchApi(`/auth/oauth/${provider}`, options, fallback);
  },

  async verifyOTP(data: { email: string; otp: string }) {
    const fallback = { success: true, message: 'OTP verified successfully' };
    return fetchApi('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }, fallback);
  },

  async resendOTP(data: { email: string }) {
    const fallback = { success: true, message: 'OTP sent to email' };
    return fetchApi('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }, fallback);
  },

  async forgotPassword(data: { email: string }) {
    const fallback = { success: true, message: 'Password reset link sent to email' };
    return fetchApi('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }, fallback);
  },

  async resetPassword(data: { email: string; password: string }) {
    const fallback = { success: true, message: 'Password reset successfully' };
    return fetchApi('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }, fallback);
  },

  async getMe() {
    return fetchApi('/auth/me');
  },

  // ── ONBOARDING ──────────────────────────────────────────────────
  
  async saveProfile(data: any) {
    return fetchApi('/onboarding/profile', { method: 'POST', body: JSON.stringify(data) }, { success: true, data });
  },

  async saveBill(data: any) {
    return fetchApi('/onboarding/bill', { method: 'POST', body: JSON.stringify(data) }, { success: true, data });
  },

  async parseBillPDF(file: File) {
    const formData = new FormData();
    formData.append('bill', file);
    
    const fallback = {
      success: true,
      message: 'Mock OCR data returned (Fallback)',
      data: {
        bill_amount: 3200,
        units: 400,
        billing_month: null as string | null,
      }
    };

    return fetchApi('/onboarding/parse-bill', { method: 'POST', body: formData }, fallback);
  },

  /**
   * Parse multiple PDF bills in sequence.
   * Returns one result object per file, with error isolation — a failed file
   * does NOT abort the rest. Each result carries the original filename.
   */
  async parseBillPDFBulk(files: File[]): Promise<Array<{
    fileName: string;
    bill_amount: number | null;
    units: number | null;
    billing_month: string | null;
    error: string | null;
  }>> {
    const results = [];
    for (const file of files) {
      try {
        const res = await this.parseBillPDF(file);
        results.push({
          fileName: file.name,
          bill_amount: res?.data?.bill_amount ?? null,
          units: res?.data?.units ?? null,
          billing_month: res?.data?.billing_month ?? null,
          error: null,
        });
      } catch (err: any) {
        results.push({
          fileName: file.name,
          bill_amount: null,
          units: null,
          billing_month: null,
          error: err.message || 'Failed to parse PDF',
        });
      }
    }
    return results;
  },

  async validateOnboarding(appliances: Appliance[]) {
    // Mock calculation using our local estimation.ts
    const estUnits = estimateMonthlyKwh(appliances);
    const actualUnits = useDashboardStore.getState().onboarding?.units_per_month || estUnits;
    const match_percentage = actualUnits ? Math.max(0, 100 - (Math.abs(estUnits - actualUnits) / actualUnits * 100)) : null;
    return fetchApi('/onboarding/validate', { method: 'POST', body: JSON.stringify({ appliances }) }, {
      estimated_units: estUnits,
      actual_units: actualUnits,
      match_percentage,
      is_good_match: match_percentage ? match_percentage >= 85 : null
    });
  },

  async saveAppliances(appliances: Appliance[]) {
    const estUnits = estimateMonthlyKwh(appliances);
    const actualUnits = useDashboardStore.getState().onboarding?.units_per_month || estUnits;
    const match_percentage = Math.max(0, 100 - (Math.abs(estUnits - actualUnits) / actualUnits * 100));
    
    // Auto-update dashboard store with the mock results if in fallback mode
    const fallback = {
      success: true,
      data: {
        appliance_count: appliances.length,
        estimated_monthly_units: estUnits,
        actual_monthly_units: actualUnits,
        match_percentage,
        breakdown: estimateApplianceBreakdown(appliances, 0, estUnits, 8.0)
      }
    };
    return fetchApi('/onboarding/appliances', { method: 'POST', body: JSON.stringify({ appliances }) }, fallback);
  },

  // ── DASHBOARD ───────────────────────────────────────────────────

  async getDashboardSummary() {
    const fallback = {
      today: { units: 14.2, cost: 113.6, vs_yesterday_pct: 5.2, is_higher: true },
      this_month: { units: 310, cost: 2480, days_elapsed: 15, days_remaining: 15, projected_units: 620 },
      estimated_bill: { projected: 4960, last_month: 4800, on_track: true },
      gamification: { coins: 250, streak_days: 7 }
    };
    return fetchApi('/dashboard/summary', {}, fallback);
  },

  async getDashboardUsage(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const appliances = Object.keys(DEFAULT_APPLIANCES).map(k => ({ ...DEFAULT_APPLIANCES[k], id: k } as Appliance));
    const rawFallback = generateDailyUsage(appliances, period === 'daily' ? 30 : 30, 'Chennai');
    // Ensure dates are always YYYY-MM-DD (not ISO timestamps)
    const fallback = {
      period,
      data: rawFallback.map(d => ({
        ...d,
        date: d.date.split('T')[0], // strip time if present
      }))
    };
    return fetchApi(`/dashboard/usage?period=${period}`, {}, fallback);
  },

  async getApplianceBreakdown() {
    const appliances = Object.keys(DEFAULT_APPLIANCES).map(k => ({ ...DEFAULT_APPLIANCES[k], id: k } as Appliance));
    const estUnits = estimateMonthlyKwh(appliances);
    const fallback = {
      data: estimateApplianceBreakdown(appliances, estUnits * 8.0, estUnits, 8.0)
    };
    const res = await fetchApi('/dashboard/appliance-breakdown', {}, fallback);
    if (res && Array.isArray(res.data)) {
      const NEON_COLORS = ['#22d3ee', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a78bfa'];
      res.data = res.data.map((item: any, idx: number) => {
        const defaultApp = appliances.find(a => a.name.toLowerCase() === item.name.toLowerCase())
                         || appliances.find(a => item.name.toLowerCase().includes(a.name.toLowerCase()));
        return {
          name: item.name,
          units: item.units !== undefined ? item.units : (item.estimated_units !== undefined ? item.estimated_units : 0),
          percentage: item.percentage !== undefined ? item.percentage : 0,
          cost: item.cost !== undefined ? item.cost : (item.estimated_cost !== undefined ? item.estimated_cost : 0),
          icon: item.icon || defaultApp?.icon || '🔌',
          color: item.color || NEON_COLORS[idx % NEON_COLORS.length]
        };
      });
    }
    return res;
  },

  async getInsights() {
    const fallback = {
      insights: [
        { id: '1', type: 'warning', icon: '🔴', title: 'AC dominates your bill', message: 'AC uses 45% of your energy (₹2,100/month)', action: 'Reduce usage', action_url: '/predictions' },
        { id: '2', type: 'tip', icon: '💡', title: 'Comfort-Safe Savings ready', message: 'You have recommendations that could save ₹800+/month', action: 'View', action_url: '/predictions' }
      ]
    };
    return fetchApi('/dashboard/insights', {}, fallback);
  },

  async getPeakHours() {
    const fallback = {
      pattern: Array.from({length: 24}).map((_, i) => ({ hour: i, label: `${i}h`, intensity: Math.random() })),
      peak_range: '6 PM - 9 PM',
      note: 'Based on your appliance usage pattern'
    };
    return fetchApi('/dashboard/peak-hours', {}, fallback);
  },

  // ── COACH ───────────────────────────────────────────────────────

  async getCoachPredictions() {
    const appliances = Object.keys(DEFAULT_APPLIANCES).map(k => ({ ...DEFAULT_APPLIANCES[k], id: k } as Appliance));
    const dailyHistory = generateDailyUsage(appliances, 7, 'Chennai');
    const preds = calculatePredictions(dailyHistory, 8.0);
    const fallback = {
      predictions: {
        tomorrow: preds.tomorrow,
        next_week: preds.next_week,
        next_month: preds.next_month,
      },
      bill_shock: { risk: preds.bill_shock_risk, probability: 75, projected_bill: preds.projected_bill, projected_units: 500, increase_pct: 12 }
    };
    return fetchApi('/coach/predictions', {}, fallback);
  },

  async getCoachAlerts() {
    const fallback = {
      alerts: [
        { id: 'alert-1', type: 'usage_spike', severity: 'medium', title: '⚠ Usage Alert', message: 'This week is 20% higher than last week', likely_cause: 'Higher AC usage', predicted_impact_rs: 350 },
        { id: 'alert-locked', type: 'locked_feature', severity: null, title: '🔒 Real-time Anomaly Detection', message: 'Available on Tier 2 (Smart Meter)', is_locked: true }
      ]
    };
    return fetchApi('/coach/alerts', {}, fallback);
  },

  async getCSSRecommendations() {
    const fallback = {
      recommendations: CSS_RECOMMENDATIONS.map(r => ({ ...r, already_applied: false })),
      total_potential_savings_rs: 995,
      total_annual_savings_rs: 11940
    };
    return fetchApi('/coach/css-recommendations', {}, fallback);
  },

  async applyCSSRecommendation(data: { recommendation_id: string, appliance: string, setting_applied: string }) {
    const fallback = {
      success: true,
      message: 'Recommendation applied successfully',
      coins_earned: 80,
      new_coin_balance: 330,
      expected_monthly_savings: 800
    };
    return fetchApi('/coach/css-apply', { method: 'POST', body: JSON.stringify(data) }, fallback);
  },

  async getActualVsPredicted() {
    const fallback = {
      data: [
        { month: '2026-01-01', actual_units: 400, actual_cost: 3200, estimated_units: 410, accuracy_pct: 97.5 },
        { month: '2026-02-01', actual_units: 420, actual_cost: 3360, estimated_units: 415, accuracy_pct: 98.8 },
      ],
      has_multiple_bills: true,
      message: null
    };
    return fetchApi('/coach/actual-vs-predicted', {}, fallback);
  },

  async getWhatIf(appliance: string, change_type: string, change_value: string) {
    const fallback = {
      appliance,
      current_monthly_kwh: 120,
      new_monthly_kwh: 90,
      saved_kwh: 30,
      monthly_savings_rs: 240,
      annual_savings_rs: 2880,
      coins_earned: 300
    };
    return fetchApi(`/coach/whatif?appliance=${appliance}&change_type=${change_type}&change_value=${change_value}`, {}, fallback);
  },

  async chatWithVolt(messages: { role: string; content: string }[]) {
    const fallback = {
      success: true,
      reply: "Volt here! ⚡ I recommend setting your AC to 24°C, which is the most optimal, comfort-safe temperature standard recommended by BEE!"
    };
    return fetchApi('/coach/chat', { method: 'POST', body: JSON.stringify({ messages }) }, fallback);
  },

  // ── GAMIFICATION & LEADERBOARD ──────────────────────────────────

  async getGamificationStats() {
    const fallback = {
      balance: 250, streak_days: 7, active_multiplier: 1.15, weekly_coins_earned: 120,
      recent_transactions: [
        { coins: 50, type: 'streak', reason: '7-day streak milestone!', multiplier: 1.0, created_at: new Date().toISOString() },
        { coins: 70, type: 'earned', reason: 'Saved 7 units yesterday', multiplier: 1.0, created_at: new Date().toISOString() }
      ],
      household_type: 'family',
      active_multipliers: [{ type: 'streak', label: '🔥 7-day streak', value: 1.15 }],
      next_milestone: { days: 30, bonus_coins: 150, multiplier: 1.35 }
    };
    return fetchApi('/gamification/stats', {}, fallback);
  },

  async dailyCheckin(body: { total_units: number; appliance_hours: Record<string, number> }) {
    const user = useAuthStore.getState().user;
    return fetchApi('/gamification/check-in', { method: 'POST', body: JSON.stringify(body) }, {
      success: true,
      message: 'Checked in successfully!',
      coins_earned: 25,
      new_balance: (user?.coins || 250) + 25,
      new_streak: (user?.streak_days || 7) + 1,
    });
  },

  async getGamificationChallenge() {
    const fallback = {
      challenge: useGamificationStore.getState().active_challenge,
      history: useGamificationStore.getState().challenge_history
    };
    return fetchApi('/gamification/challenge', {}, fallback);
  },

  async checkGamificationChallenge() {
    return fetchApi('/gamification/check-challenge', { method: 'POST' }, { ...useGamificationStore.getState().active_challenge, status: 'completed' });
  },

  async getShopItems() {
    const fallback = {
      items: [
        { id: '1', coins_required: 100, reward: '₹50 Amazon Voucher', description: 'Redeemable on amazon.in', can_afford: true, coins_needed: 0 },
        { id: '2', coins_required: 500, reward: '₹500 Bill Credit', description: 'Credited to bill', can_afford: false, coins_needed: 250 }
      ],
      user_coins: 250
    };
    return fetchApi('/gamification/shop', {}, fallback);
  },

  async redeemShopItem(item_id: string) {
    const fallback = { success: true, message: 'Redeemed successfully', redeemed_item: 'Voucher', coins_spent: 100, new_balance: 150 };
    return fetchApi('/gamification/redeem', { method: 'POST', body: JSON.stringify({ item_id }) }, fallback);
  },

  async getLeaderboard(type: string, period: string = 'weekly') {
    const fallback = {
      type, period,
      rankings: generateLeaderboard(type, { name: 'Ravi Kumar', coins: 250, streak: 7, rank: 47 }),
      user_rank: { rank: 47, rank_change: 12 }
    };
    return fetchApi(`/leaderboard/${type}?period=${period}`, {}, fallback);
  },

  // ── NOTIFICATIONS ────────────────────────────────────────────────

  async getNotifications() {
    return fetchApi('/notifications', {}, { notifications: MOCK_NOTIFICATIONS, unread_count: 2 });
  },

  async getUnreadCount() {
    return fetchApi('/notifications/unread-count', {}, { count: 2 });
  },

  async markNotificationRead(id: string) {
    return fetchApi(`/notifications/${id}/read`, { method: 'PUT' }, { success: true });
  },

  async markAllNotificationsRead() {
    return fetchApi('/notifications/read-all', { method: 'PUT' }, { success: true });
  },

  // ── PROFILE & SETTINGS ──────────────────────────────────────────

  async getProfile() {
    const user = useAuthStore.getState().user;
    const fallback = {
      user,
      lifetime_stats: { total_coins_earned: 800, total_savings_rs: 3200, best_streak: 15, challenges_completed: 4, bills_uploaded: 2, css_applied: 1 },
      energy_score: { score: 75, breakdown: { savings_pts: 20, streak_pts: 10, challenge_pts: 20, css_pts: 15, bill_pts: 10 }, improvement_tips: [] },
      recent_activity: []
    };
    return fetchApi('/profile', {}, fallback);
  },

  async updateProfile(data: any) {
    return fetchApi('/profile/update', { method: 'PUT', body: JSON.stringify(data) }, { success: true, user: { ...useAuthStore.getState().user, ...data } });
  },

  async deleteAccount() {
    return fetchApi('/settings/account', { method: 'DELETE' }, { success: true, message: 'Account deleted' });
  },

  // ── DISCOM / Smart Meter ─────────────────────────────────────────────────

  /** Verify consumer number with DISCOM API */
  async verifyDiscomConsumer(consumer_no: string) {
    return fetchApi(`/discom/verify/${consumer_no}`, {});
  },

  /** Link this user to a smart meter consumer number */
  async linkDiscomMeter(consumer_no: string) {
    return fetchApi('/discom/link', { method: 'POST', body: JSON.stringify({ consumer_no }) }, { success: true, consumer_no });
  },

  /** Get current user's DISCOM linkage status */
  async getDiscomStatus() {
    return fetchApi('/discom/me', {}, { linked: false, consumer_no: null, meter_no: null });
  },

  /** Get latest live meter reading */
  async getDiscomLiveReading() {
    return fetchApi('/discom/live', {}, null);
  },

  /** Get chart data for smart meter: period = hourly | daily | weekly */
  async getDiscomChart(period: 'hourly' | 'daily' | 'weekly') {
    return fetchApi(`/discom/chart?period=${period}`, {}, { period, data: [] });
  },

  /** Run anomaly detection on user's smart meter data */
  async getDiscomAnomalies() {
    return fetchApi('/discom/anomaly', {}, { anomaly_count: 0, anomalies: [], total_readings: 0, anomaly_rate: 0 });
  },
};

