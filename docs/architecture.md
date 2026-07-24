# ⚡ Voltify — Technical Architecture Specification

This document provides a deep-dive analysis of Voltify's technical architecture, component communications, data modeling, algorithm designs, and security enforcement mechanisms.

---

## 🏛️ 1. System Architecture

Voltify is built on a decoupled **Client-Server Architecture** utilizing modular micro-services for weather integration, AI models, estimation processing, and gamification metrics.

```mermaid
graph TD
    %% Frontend Layer
    subgraph Client [Client Application - React v19 + TS]
        UI[Tailwind UI / Recharts]
        State[Zustand Stores]
        API_Client[Axios Client API]
        UI --> State
        State --> API_Client
    end

    %% Gateway & Load Balancer (Conceptual)
    API_Client -- JWT Auth / CORS --> Express[Express Web Server - Node.js]

    %% Backend Layer
    subgraph Backend [Backend API Service]
        Express --> Auth[Auth Middleware]
        Express --> Controller[API Controllers]
        
        %% Core Engines
        subgraph Core Engines [Core Engine Layer]
            Controller --> Estimator[Calibration & Estimation Engine]
            Controller --> Coach[AI Energy Coach Service]
            Controller --> Gamify[Gamification & Challenge Engine]
        end
        
        %% External Connectors
        subgraph Connectors [External Integration Connectors]
            Coach --> GroqConnector[Groq API Client - Llama 3.3 70B]
            Estimator --> WeatherConnector[Weather API & Open-Meteo]
            Auth --> MailConnector[Nodemailer - SMTP Gateway]
        end
    end

    %% Database Layer
    subgraph Storage [Persistence Layer]
        Express --> DB[(Supabase PostgreSQL)]
    end

    %% Styling
    classDef client fill:#0f172a,stroke:#06b6d4,stroke-width:2px,color:#fff;
    classDef server fill:#1e1b4b,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef storage fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    
    class Client,UI,State,API_Client client;
    class Backend,Express,Auth,Controller,Estimator,Coach,Gamify,GroqConnector,WeatherConnector,MailConnector server;
    class Storage,DB storage;
```

---

## 🔁 2. Core Operational Workflows

### 2.1 Multi-Tier Onboarding & Calibration
The system supports three user-calibrating tiers:
1.  **Tier 1 (Smart Plugs)**: Real-time telemetry via plug IDs mapped to hardware tables.
2.  **Tier 2 (Smart Meters)**: Direct API synchronization with regional utilities (DISCOM).
3.  **Tier 3 (Manual Bill Input + AI OCR)**: Drag-and-drop PDF parser.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Agent
    participant FE as Frontend Dashboard
    participant BE as Express API Gateway
    participant LLM as Groq Service (Llama 3.3)
    participant DB as Supabase PostgreSQL

    User->>FE: Upload Bill PDF (Drag & Drop)
    FE->>BE: POST /api/onboarding/bill-upload (Multipart Form)
    BE->>BE: Extract text buffer from PDF via unpdf
    BE->>LLM: JSON-schema prompting (Extract bill_date, units, total_amount)
    LLM-->>BE: Returns parsed JSON schema
    BE-->>FE: Return preview of extracted data
    User->>FE: Confirm details & input appliance hours
    FE->>BE: POST /api/onboarding/calibrate
    BE->>BE: Execute Calibration Engine (Scale estimates to actual units)
    BE->>DB: Write users, monthly_bills, & daily_estimates
    BE-->>FE: Success & Redirect to Main Dashboard
```

---

## 🗄️ 3. Database Schema Design (ERD)

Voltify uses a relational PostgreSQL database to ensure strict integrity constraints for user transactions, coin adjustments, and energy auditing logs.

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar provider
        integer tier
        varchar household_type
        varchar location
        integer coins
        integer streak_days
        boolean onboarding_complete
        timestamp last_active
        timestamp created_at
    }

    APPLIANCES {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar icon
        decimal power_kw
        decimal avg_hours_day
        varchar seasonality
        timestamp created_at
    }

    MONTHLY_BILLS {
        uuid id PK
        uuid user_id FK
        date month
        decimal bill_amount
        decimal units
        decimal estimated_units
        decimal accuracy_pct
        timestamp created_at
    }

    DAILY_ESTIMATES {
        uuid id PK
        uuid user_id FK
        date date
        decimal estimated_units
        decimal estimated_cost
        timestamp created_at
    }

    APPLIANCE_ESTIMATES {
        uuid id PK
        uuid user_id FK
        uuid appliance_id FK
        date month
        decimal estimated_units
        decimal estimated_pct
        decimal estimated_cost
        timestamp created_at
    }

    CSS_APPLICATIONS {
        uuid id PK
        uuid user_id FK
        uuid appliance_id FK
        varchar setting_type
        varchar applied_value
        timestamp applied_at
    }

    USERS ||--o{ APPLIANCES : owns
    USERS ||--o{ MONTHLY_BILLS : logs
    USERS ||--o{ DAILY_ESTIMATES : maps_to
    USERS ||--o{ APPLIANCE_ESTIMATES : monitors
    USERS ||--o{ CSS_APPLICATIONS : activates
    APPLIANCES ||--o{ APPLIANCE_ESTIMATES : disaggregates
    APPLIANCES ||--o{ CSS_APPLICATIONS : controlled_by
```

---

## 🧮 4. Calibration & Energy Disaggregation Engine

For users without smart meters, Voltify estimates device-level metrics using a 5-step mathematical calibration process:

### Step 1: Base Consumption Estimation
For each appliance $a$ in the user's inventory, the raw monthly energy estimate ($E_{raw, a}$) is calculated:
$$E_{raw, a} = P_a \times H_a \times D_{month}$$
*Where:*
*   $P_a$ is the power rating of appliance $a$ in kW.
*   $H_a$ is the average daily operational hours.
*   $D_{month}$ is the number of days in the target month (e.g. 30).

### Step 2: Seasonal Weight Modification
Certain high-power appliances require adjustments based on local temperature metrics. We apply seasonal multipliers ($S_a$):
*   **Air Conditioners**: $S_{AC} = 1.0 + 0.15 \times (T_{current} - 28)$ for climates above $28^\circ\text{C}$ ( Chennai / Mumbai summer profile).
*   **Geysers**: $S_{geyser} = 1.0 + 0.10 \times (20 - T_{current})$ for winter profiles (Delhi).
*   **Others**: $S_a = 1.0$.

Adjusted raw monthly estimate ($E_{adj, a}$):
$$E_{adj, a} = E_{raw, a} \times S_a$$

### Step 3: Total Inventory vs. Actual Calibration Scale
Let the total actual units consumed from the electric bill be $U_{actual}$. The total adjusted estimated units is:
$$U_{estimated} = \sum_{a \in A} E_{adj, a}$$

We derive a calibration scalar ($k$):
$$k = \frac{U_{actual}}{U_{estimated}}$$

### Step 4: Calibrated Device Estimates
Every appliance's final calibrated consumption ($E_{final, a}$) is scaled proportionally to match the true monthly total:
$$E_{final, a} = E_{adj, a} \times k$$
This process yields device disaggregation percentages with 100% boundary alignment to the actual utility invoice.

---

## 🔒 5. Security & Authentication Model

```mermaid
graph LR
    User[User Agent] -->|1. Submit email| Auth[Express API Gateway]
    Auth -->|2. Generate 6-digit OTP| DB[(Supabase Session Store)]
    Auth -->|3. Trigger email containing OTP| SMTP[Nodemailer SMTP Gateway]
    SMTP -->|4. Deliver OTP| User
    User -->|5. Verify code + Password| Auth
    Auth -->|6. Signs JWT Token| Token[Signed Session JWT]
    Token -->|7. Access header authentication| User
```

*   **Credential Hashing**: Argon2 / bcrypt hashing models.
*   **API Security**: Stateless JSON Web Token (JWT) verification attached via `Authorization: Bearer <token>` request headers.
*   **Rate Limiting**: Configured express-rate-limit bounds (100 requests per 15 minutes for general endpoints, 5 requests per 15 minutes for OTP generators).
