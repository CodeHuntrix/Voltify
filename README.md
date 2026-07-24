# ⚡ Voltify
### *Track it. Predict it. Save it.*

> An AI-powered smart energy monitoring and conservation platform that helps households understand, predict, and reduce their electricity consumption — with gamification to keep you motivated.

---

## 🧠 What is Voltify?

Most households have no idea where their electricity goes. Voltify changes that.

It takes your electricity bill and appliance details, disaggregates your consumption per appliance, predicts your future usage, detects when something looks off, and rewards you for making smarter energy choices — all in one clean dashboard.

No smart meter required. Works with just your monthly bill.

---

## ✨ Features

### 📊 Energy Dashboard
- Daily, weekly, and monthly consumption trends with interactive charts
- Per-appliance usage breakdown with cost estimates
- Projected monthly bill with real-time recalculation as you adjust settings
- BEE (Bureau of Energy Efficiency) standard sliders for AC and refrigerator — earn coins when you hit recommended targets

### 🔮 AI Predictions & Simulator
- Forecast tomorrow's, next week's, and next month's energy usage
- Bill shock detection — alerts you if you're on track to exceed last month's bill
- What-If simulator — pick an appliance, simulate reducing hours or adjusting temperature, and instantly see projected savings in ₹ and kWh
- Actual vs. predicted consumption chart once you've entered multiple bills

### 🤖 Volt — Your AI Energy Coach
- In-app chatbot powered by Groq (Llama 3.3 70B)
- Gives personalized energy-saving advice for AC, geyser, fridge, lights, etc.
- Falls back to a smart rule-based NLP engine if the AI is unavailable
- Comfort-Safe Savings (CSS) recommendations — apply a BEE/WHO standard setting, earn coins, and see your projected monthly savings

### 🎮 Gamification
- Daily check-in: log today's kWh usage and appliance hours to earn **25 coins**
- Weekly challenges: auto-generated targets (e.g., "Use under X units this week") with **100 coin rewards**
- Streaks: longer consecutive check-ins unlock coin multipliers (1.15x → 1.35x → 1.60x)
- Leaderboard: compete with others in your household category (family, student, etc.)
- Coin shop: redeem earned coins for real rewards

### 🔔 Notifications
- Challenge completion / failure alerts
- Daily check-in reminders
- CSS application confirmations
- Coin redemption status

### 🛂 Multi-Tier Onboarding
Users are categorized into three tiers based on their setup:

| Tier | Type | How it works |
|------|------|--------------|
| **Tier 1** | Smart Plugs | Enter plug IDs per appliance — direct device-level data |
| **Tier 2** | Smart Meter | Connect via DISCOM API — reads meter data directly |
| **Tier 3** | Manual Meter | Upload your electricity bill (PDF/image) — AI extracts bill amount and units automatically, then you describe your appliances |

### 👤 Profile & Settings
- Edit name, location, household type
- Change password, manage account
- Reset calibration to re-run onboarding with updated appliance or bill data

---

## 🛠️ Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Recharts (graphs)
- Framer Motion (animations)
- Zustand (state management)
- React Hook Form + Zod (form validation)
- React Router v6

**Backend**
- Node.js + Express
- PostgreSQL (via Supabase)
- Passport.js (Google OAuth 2.0)
- JWT authentication
- Nodemailer (OTP emails, password reset)
- Multer + unpdf (bill file upload and PDF text extraction)
- Groq API — Llama 3.3 70B (AI chatbot + bill parsing)
- WeatherAPI.com + Open-Meteo (live temperature for consumption adjustments)

---

## 🗂️ Project Structure

```
Voltify/
├── voltify-frontend/          # React + TypeScript frontend
│   └── src/
│       ├── pages/             # Dashboard, Predictions, Leaderboard, Streak, Shop, Profile, Settings
│       │   ├── auth/          # Login, Signup, OTP, Forgot/Reset Password, OAuth
│       │   └── onboarding/    # Tier 1/2/3 onboarding wizard
│       ├── components/
│       │   ├── dashboard/     # Energy and appliance charts
│       │   ├── layout/        # App shell, Topbar
│       │   └── ui/            # GlassCard, ChatbotVolt
│       ├── store/             # Zustand stores (auth, dashboard, gamification)
│       └── lib/               # API client, estimation utils, mock data
│
└── voltify-backend/           # Node.js + Express backend
    └── src/
        ├── controllers/       # Auth, Dashboard, Coach, Gamification, Onboarding, etc.
        ├── routes/            # REST API route definitions
        ├── services/          # Estimation engine, LLM, coins, challenges, weather, email
        ├── config/            # DB connection, Passport config, SQL schema
        ├── middleware/        # JWT auth, error handler
        └── utils/             # JWT helpers, validators, mock data
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or a [Supabase](https://supabase.com) project)
- A [Groq API key](https://console.groq.com) (free tier works)
- A Gmail account for OTP emails (App Password required)
- Optional: Google OAuth credentials, WeatherAPI key

---

### Backend Setup

```bash
cd voltify-backend
npm install
```

Create a `.env` file (copy from `.env.example`):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_app_password
EMAIL_FROM=Voltify <your@gmail.com>
GROQ_API_KEY=your_groq_key
WEATHER_API_KEY=your_weatherapi_key   # optional
```

Apply the database schema:

```bash
node apply_schema.js
```

Start the server:

```bash
npm run dev
```

---

### Frontend Setup

```bash
cd voltify-frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔌 API Overview

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Signup, login, OTP, Google OAuth, password reset |
| `/api/onboarding` | Save tier/appliance/bill data, trigger estimation |
| `/api/dashboard` | Daily/weekly/monthly usage, appliance breakdown, summary |
| `/api/coach` | Predictions, bill shock, what-if simulator, CSS recommendations, Volt chatbot |
| `/api/gamification` | Stats, daily check-in, weekly challenge, shop, redeem |
| `/api/leaderboard` | Household-grouped rankings |
| `/api/notifications` | In-app notification list |
| `/api/profile` | Get/update user profile |
| `/api/settings` | Account settings, password change |

---

## 🧮 How the Estimation Engine Works

Voltify doesn't need a smart meter. It estimates your appliance-level consumption using:

1. **Your appliance list** — power (kW) × daily hours × 30 days
2. **Seasonal multipliers** — AC usage goes up in summer (April–June), geyser usage goes up in winter
3. **Live temperature** — fetched from WeatherAPI or Open-Meteo; affects AC and geyser load calculations dynamically
4. **Calibration** — total estimated units are scaled to match your actual bill units
5. **Daily noise** — seeded date-based ±10% variation makes charts look realistic without being random

Tariff rates are city-specific. Chennai uses TANGEDCO's tiered slab system (first 100 units free, then stepped rates). Other cities use flat per-unit rates.

---

## 🌍 Supported Cities

Chennai · Mumbai · Delhi · Bangalore · Hyderabad · Kolkata

---

## 📝 License

This project was built for a hackathon. Feel free to fork, extend, and build on top of it.

---

*Built by Ramitha Chowdary*