# 🎨 Voltify — UI/UX Design Specification & Wireframes

This document outlines the complete design language, component library, and detailed screen-by-screen layouts of **Voltify** (desktop and mobile viewports) for Stitch/Figma prototyping.

---

## 🌌 1. Design System & Visual Identity

Voltify uses a modern **Glassmorphism Dark Mode** aesthetic. The theme represents high energy, precision, and efficiency, featuring vibrant glowing borders, neon accents, and smooth backdrop-filter blurs.

### 🎨 Color Palette
*   **Primary/Background**: `hsl(222, 47%, 11%)` (Deep Space Blue - Base)
*   **Secondary/Card**: `rgba(30, 41, 59, 0.45)` (Slate-800 Semi-transparent, `backdrop-blur-md`)
*   **Accent 1 (Energy/High Power)**: `hsl(38, 92%, 50%)` (Volt Amber - `#F59E0B`)
*   **Accent 2 (Eco/Saving/Coins)**: `hsl(142, 70%, 45%)` (Emerald Eco - `#10B981`)
*   **Accent 3 (Info/Forecast)**: `hsl(199, 89%, 48%)` (Electric Cyan - `#0EA5E9`)
*   **Alert/Shock**: `hsl(0, 84%, 60%)` (Crimson Warning - `#EF4444`)
*   **Borders**: `rgba(255, 255, 255, 0.08)` (Subtle white overlay for glass borders)
*   **Text (Primary)**: `hsl(0, 0%, 98%)` (Pure White / Off-white)
*   **Text (Secondary)**: `hsl(215, 20%, 65%)` (Cool Muted Gray)

### ✍️ Typography
*   **Font Family**: `Inter`, sans-serif (Interface & Body), `Outfit` (Headings & Large Metrics)
*   **Scale**:
    *   `h1` (Display): `32px` / `2rem` (Bold, tracking-tight)
    *   `h2` (Section Titles): `24px` / `1.5rem` (Semi-bold)
    *   `h3` (Card Titles): `18px` / `1.125rem` (Medium)
    *   `Body`: `14px` / `0.875rem` (Regular)
    *   `Caption/Metrics`: `12px` / `0.75rem` (Medium, tracking-wide)

### ✨ Key Effects
*   **Backdrop Filter**: `blur(12px)` on all cards.
*   **Box Shadow**: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`.
*   **Glow Effect**: Inner shadow or thin border gradient: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0))` to give 3D depth to glass panels.

---

## 🧭 2. Global Layout & App Shell

Voltify uses a responsive App Shell with a **Fixed Left Sidebar** on Desktop (`>= 1024px`) and a **Bottom Navigation Bar** on Mobile (`< 1024px`).

### 🖥️ Desktop Shell
*   **Width**: 100vw, Height: 100vh (Overflow hidden on body, main content scrolls independently).
*   **Left Sidebar** (Width: `260px`):
    *   *Top*: Voltify Logo (⚡ **Voltify**) in glowing font.
    *   *Middle*: Navigation links with interactive hover glow:
        *   📊 Dashboard
        *   🔮 Predictions & Sim
        *   🏆 Leaderboard & Quests
        *   🪙 Coin Shop
        *   👤 Profile & Settings
    *   *Bottom*: User Profile summary chip & logout button.
*   **Header / Topbar**:
    *   Page Title & Dynamic Breadcrumb.
    *   Notifications Bell Icon (with orange dot badge for alerts).
    *   Streak Indicator Widget (🔥 `5 Days` · `1.15x`).
    *   Coin Wallet Card (🪙 `1,420`).

### 📱 Mobile Shell
*   **Top Bar**: Logo (⚡), Notifications Bell, and Wallet.
*   **Bottom Navigation**: 5-tab bar with icon-only or icon-plus-label configurations:
    *   `Dashboard` | `Predictions` | `Leaderboard` | `Shop` | `Profile`

---

## 📄 3. Screen-by-Screen Interface Specs

### 🏠 Screen 3.1: Landing Page (Public)
Designed to grab user attention, explain the value proposition, and drive onboarding.

```
+-----------------------------------------------------------------------------+
|  ⚡ Voltify              [Features]   [Calculator]   [FAQ]       [Sign In]  |
+-----------------------------------------------------------------------------+
|                                                                             |
|            ⚡ TRACK IT. PREDICT IT. SAVE IT.                               |
|            Manage household electricity with next-gen AI disaggregation   |
|            without needing expensive smart meters.                          |
|                                                                             |
|                    [ Get Started Free ]   [ How it Works ]                  |
|                                                                             |
|      +----------------------------------------------------------------+     |
|      |  [Mockup/Figma screenshot of Voltify Dashboard - Glowing UI]  |     |
|      +----------------------------------------------------------------+     |
|                                                                             |
|  [ Features Grid ]                                                          |
|  +--------------------+ +--------------------+ +--------------------+       |
|  | 🔮 AI Forecasting  | | ⚡ Meterless Disag. | | 🎮 Gamified Quests |       |
|  | Future bills       | | See where watts go| | Earn real vouchers |       |
|  +--------------------+ +--------------------+ +--------------------+       |
+-----------------------------------------------------------------------------+
```

*   **Header Navigation**: Glass panel stuck to the top. Dynamic hover highlights.
*   **Hero Area**: Central alignment, large gradient header (Volt Amber to Electric Cyan).
*   **Action Button**: Neon border button with an organic hover pulse.
*   **Interactive Demo Box**: Shows a mini interactive dashboard slider so guests can preview the slider calculations before signing up.

---

### 🔑 Screen 3.2: Authentication Suite (Login & Sign Up)
*   **Layout**: Balanced two-column split layout.
    *   *Left Column (Hidden on Mobile)*: Ambient moving dark nebula background with energy efficiency quotes and active stats.
    *   *Right Column*: Login card.
*   **Inputs**: Floating label inputs with Amber glow focus states.
*   **Actions**:
    *   "Sign In with Google" (Passport integration) - White branded button.
    *   "Request Email OTP" - For secure passwordless or login flow.
    *   "Forgot Password" flow with seamless inline transitions.

---

### 🚀 Screen 3.3: Multi-Tier Onboarding Flow
This wizard guides the user to set up their calibration profiles depending on their available hardware tier.

```
+-----------------------------------------------------------------------------+
|   ⚡ Voltify | Setup Wizard                     Step 1 of 3: Choose Tier    |
+-----------------------------------------------------------------------------+
|                                                                             |
|   Choose how you want to feed energy data into Voltify:                     |
|                                                                             |
|   +-----------------------+ +-----------------------+ +-------------------+ |
|   | 🔌 Tier 1: Smart Plugs| | 🎛️ Tier 2: Smart Meter| | 📄 Tier 3: Manual | |
|   | Enter plug IDs for    | | Connect DISCOM API    | | Upload PDF bills  | |
|   | real-time appliance   | | readouts directly.    | | and AI will parse | |
|   | consumption.          | |                       | | your usage.       | |
|   | [ Select ]            | | [ Select ]            | | [ Select (Rec) ]  | |
|   +-----------------------+ +-----------------------+ +-------------------+ |
|                                                                             |
|                                                     [ Continue -> ]         |
+-----------------------------------------------------------------------------+
```

#### ⚡ Tier 1 Interface (Smart Plugs)
*   Interactive table showing: Appliance Name (Dropdown), Plug Manufacturer (Select), and Plug ID (Text input).
*   Add Row/Delete Row buttons.

#### ⚡ Tier 2 Interface (Smart Meter)
*   Utility provider dropdown (e.g. TNEB, MSEDCL, Bescom, Tata Power).
*   Consumer Account Number & Password.
*   "Test Connection" button with animated spinning loader.

#### ⚡ Tier 3 Interface (Manual Meter/Upload)
*   **Dropzone Area**: Dashed border glass panel. Drag & Drop or Browse files.
*   **File parsing state**: Uploading -> Extracting values via Groq Llama 3.3 -> Extracted data preview (Bill Date, Units consumed, Total Amount).
*   Users can edit the extracted values in text fields if correction is needed.

#### 🎛️ Appliance Profile Setup (All Tiers)
*   A form to define household configuration: City, Household Type (Apartment, House), Occupants, and Appliance Inventory.
*   For each appliance, specify:
    *   Appliance Type (AC, Geyser, Fridge, Lights, TV, etc.)
    *   Quantity (Counter)
    *   Average usage hours per day (Slider: 0 - 24 hrs)
    *   Power Rating (kW - with presets e.g., "1.5 Ton 3-star AC = 1.6kW")

---

### 📊 Screen 3.4: Main Energy Dashboard
The primary landing screen once authenticated. Contains quick-glance widgets and actions.

```
+-----------------------------------------------------------------------------+
|  📊 Energy Dashboard                               [ 🔥 5 Days ] [ 🪙 1420 ] |
+-----------------------------------------------------------------------------+
|  +------------------------+ +---------------------+ +----------------------+ |
|  | Today's Consumption    | | Estimated Month Bill| | Weather & Slab Alert | |
|  | 14.5 kWh (+2% vs yesterday) | ₹ 4,250 (On track) | Chennai - High Heat   | |
|  +------------------------+ +---------------------+ +----------------------+ |
|                                                                             |
|  +-----------------------------------+ +----------------------------------+ |
|  | 📈 Weekly Consumption Trend       | | 🍕 Appliance Energy Split        | |
|  | [ Bar Chart: Actual vs Predicted] | | [ Donut Chart with Breakdown ]   | |
|  +-----------------------------------+ +----------------------------------+ |
|                                                                             |
|  +-----------------------------------+ +----------------------------------+ |
|  | 🎮 Smart Appliance Controls       | | 🤖 Volt: Your AI Energy Coach    | |
|  | AC Temp: [ 24°C ] <---Slider--->  | | "You could save ₹450 by raising  | |
|  |   *BEE Target Met! +10 Coins*     | |  AC temp by 2°C."                | |
|  | Refrigerator: [ Med ]             | | [ Chat with Volt...         [>] ]| |
|  +-----------------------------------+ +----------------------------------+ |
+-----------------------------------------------------------------------------+
```

*   **Summary Cards (KPI Grid)**: Top 3 horizontal cards with subtle hover lifting effect.
*   **Appliance Energy Split**: Interactive Donut chart. Clicking a slice focuses the appliance details on the right pane.
*   **BEE Standard Sliders**: Interactive sliders for AC Temperature and Fridge Mode. If user slides the AC to `>= 24°C`, a green tick appears with a coin pop-up animation.

---

### 🔮 Screen 3.5: AI Predictions & What-If Simulator
Designed for planning energy cuts and calculating future usage scenarios.

*   **Forecast Chart**: Double-line chart showing:
    *   Solid cyan line: *Actual recorded consumption* (historical).
    *   Dashed yellow line: *AI predicted consumption* (future).
*   **What-If Simulator Panel**:
    *   Dropdown to select appliance.
    *   Slider to simulate reduction of daily hours.
    *   Instantly updates secondary gauges: **kWh saved** and **Money saved (₹)**.
*   **Bill Shock Alert Card**: Appears at the top in crimson outline if forecasted bill exceeds the user-configured budget limit by `>15%`.

---

### 🎮 Screen 3.6: Gamification Dashboard & Quests
Tracks user achievements, daily check-ins, and active quests.

*   **Daily Check-in Card**: Clicking "Log Today's Hours" opens a modal to adjust today's hours. Submitting grants a glowing splash screen: `+25 Coins Added!`.
*   **Active Challenges List**:
    *   *Challenge 1*: "Keep AC usage under 5 hours for 3 consecutive days" (Progress bar: 2/3 days). Reward: 🪙 `100`.
    *   *Challenge 2*: "Apply Comfort-Safe Savings advice once this week" (Status: Pending). Reward: 🪙 `50`.
*   **Leaderboard**:
    *   Filter tabs: `Global` | `Neighborhood` | `Similar Households`.
    *   Top 3 podium: Avatars with crowns and total coins.
    *   Scrollable list of runners-up with rank numbers.

---

### 🪙 Screen 3.7: Coin Shop
*   **Visual Layout**: Grid of reward cards resembling retail vouchers.
*   **Reward Item Card**:
    *   Merchant logo (e.g. Swiggy, Amazon, Uber, Eco-friendly store).
    *   Voucher description ("₹100 Amazon Pay Gift Card").
    *   Price badge (e.g. "500 Coins").
    *   Action: "Redeem" button. If coins are insufficient, the button is disabled and displays a muted state.

---

## 📱 4. Mobile Responsiveness Design Rules

*   **Breakpoints**: Mobile (`xs` & `sm` < 768px), Tablet (`md` 768px - 1024px), Desktop (`lg` & `xl` > 1024px).
*   **Flex-wrap Rule**: All double-column grids on dashboard and predictions wrap into single columns on screens `< 1024px`.
*   **Table Scroll**: Scrollable appliance tables on onboarding wrapper with indicator indicators.
*   **Volt Chatbot Overlay**: On mobile, the AI coach is accessible via a persistent floating action button (FAB) in the bottom-right corner, which slides up a full-screen chat drawer when tapped.
