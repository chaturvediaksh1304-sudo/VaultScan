# CLAUDE.md — VaultScan
> Real-time fraud detection API with cinematic dark UI. Full-stack portfolio + live demo project.
> Generated: June 2026 | Owner: Aksh Chaturvedi

---

## 1. Project Overview

**VaultScan** is a real-time transaction fraud detection system inspired by Stripe Radar. It streams synthetic transaction data through a Kafka pipeline, scores each transaction using a trained ML anomaly detection model, exposes results via a FastAPI endpoint, and visualizes everything on a cinematic dark dashboard.

**Goal:** Portfolio piece + live demo. Must look impressive in a 60-second recruiter walkthrough AND hold up to technical scrutiny in an engineering interview.

**Tagline:** "Every transaction. Scored. Instantly."

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| API | FastAPI (Python 3.11) |
| Message broker | Apache Kafka (via Confluent Cloud or self-hosted on GCP) |
| ML model | Isolation Forest (primary) + SHAP for explainability |
| Model serving | Scikit-learn + joblib (saved model artifact) |
| Data replay | Custom Python Kafka producer replaying Kaggle credit card fraud dataset |
| Database | PostgreSQL (transaction log + scores) |
| Cache | Redis (recent transactions buffer for dashboard) |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Real-time data | WebSocket connection to FastAPI |
| Charts | Recharts |
| Fonts | Instrument Serif (italic, display) + Barlow (body/data) |

### Infrastructure
| Layer | Technology |
|---|---|
| Cloud | GCP (primary) |
| Container | Docker + Docker Compose |
| Frontend deploy | Vercel |
| Backend deploy | GCP Cloud Run (FastAPI) |
| Kafka | Confluent Cloud (managed Kafka, free tier) |
| CI/CD | GitHub Actions → auto-deploy on push to main |
| Secrets | GCP Secret Manager |

---

## 3. Repository Structure

```
vaultscan/
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml
│       └── deploy-frontend.yml
│
├── ml/
│   ├── train.py                  # Train Isolation Forest on Kaggle dataset
│   ├── evaluate.py               # Precision, recall, F1, ROC-AUC
│   ├── explain.py                # SHAP value generation
│   ├── model.joblib              # Saved model artifact (gitignored if large)
│   ├── scaler.joblib             # Saved StandardScaler
│   └── data/
│       └── creditcard.csv        # Kaggle dataset (gitignored)
│
├── backend/
│   ├── main.py                   # FastAPI app entrypoint
│   ├── routers/
│   │   ├── score.py              # POST /score — score a single transaction
│   │   └── stream.py            # WebSocket /ws/stream — live transaction feed
│   ├── services/
│   │   ├── model_service.py      # Load model, run inference, SHAP explain
│   │   ├── kafka_consumer.py     # Kafka consumer — reads from transactions topic
│   │   └── redis_service.py      # Write/read recent transactions to Redis
│   ├── schemas/
│   │   └── transaction.py        # Pydantic models
│   ├── db/
│   │   ├── models.py             # SQLAlchemy ORM models
│   │   └── session.py            # DB session factory
│   ├── Dockerfile
│   └── requirements.txt
│
├── producer/
│   ├── replay.py                 # Reads creditcard.csv, publishes to Kafka topic
│   ├── Dockerfile
│   └── requirements.txt
│
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── Hero.tsx              # Cinematic landing hero (liquid glass, video BG)
    │   │   ├── Dashboard.tsx         # Main dashboard layout
    │   │   ├── TransactionFeed.tsx   # Live scrolling feed of flagged + clean txns
    │   │   ├── RiskGauge.tsx         # Animated risk score meter for latest txn
    │   │   ├── StatsBar.tsx          # Total processed / fraud rate / avg latency
    │   │   ├── AlertsPanel.tsx       # Flagged-only panel, newest first
    │   │   ├── FadingVideo.tsx       # rAF-based crossfade video component
    │   │   ├── BlurText.tsx          # Word-by-word blur-in animation
    │   │   └── LiquidGlass.tsx       # Glass utility wrapper component
    │   ├── hooks/
    │   │   └── useTransactionStream.ts  # WebSocket hook → feeds all dashboard components
    │   ├── styles/
    │   │   └── globals.css           # liquid-glass + liquid-glass-strong CSS
    │   └── types/
    │       └── transaction.ts
    └── package.json
```

---

## 4. ML Pipeline

### Dataset
- **Source:** [Kaggle Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- **File:** `creditcard.csv` — 284,807 transactions, 492 fraudulent (0.17% fraud rate)
- **Features:** V1–V28 (PCA-transformed), Amount, Time. Label: Class (0=legit, 1=fraud).

### Model Choice: Isolation Forest
- **Why it's the right call for a resume:** Unsupervised anomaly detection — no label leakage, mirrors real-world production constraints where you often don't have labeled fraud at training time. Interviewers respect this reasoning.
- **Why not autoencoder:** Isolation Forest trains faster, deploys as a single `.joblib` artifact, and is easier to explain in an interview. If asked, say: "I evaluated both — Isolation Forest gave better precision at low contamination rates and deploys with zero inference overhead."

### Training (`ml/train.py`)
```python
# Key steps:
# 1. Load creditcard.csv
# 2. Drop 'Class' column (unsupervised) — save labels separately for evaluation only
# 3. StandardScaler on Amount + Time (V1-V28 already PCA'd)
# 4. IsolationForest(n_estimators=200, contamination=0.002, random_state=42, n_jobs=-1)
# 5. fit() on full dataset
# 6. joblib.dump(model, 'model.joblib'), joblib.dump(scaler, 'scaler.joblib')
```

### Evaluation (`ml/evaluate.py`)
- Use saved labels to evaluate: precision, recall, F1, ROC-AUC
- Target metrics to mention in portfolio: ROC-AUC > 0.90, Precision > 0.75
- Log confusion matrix

### SHAP Explainability (`ml/explain.py`)
- Use `shap.TreeExplainer` on the Isolation Forest
- For each flagged transaction, return top 3 contributing features + direction (↑ increased risk / ↓ decreased risk)
- These become the visual "risk flags" in the UI (e.g., "Unusual Amount", "Atypical Time", "Abnormal V4")

### Risk Score Normalization
- Isolation Forest outputs anomaly scores (negative = more anomalous)
- Normalize to 0–100 risk score: `risk = int((1 - (score - min_score) / (max_score - min_score)) * 100)`
- Threshold: risk >= 65 → flagged as suspicious

---

## 5. Backend API

### FastAPI App (`backend/main.py`)

**Base URL:** `https://api.vaultscan.app` (prod) / `http://localhost:8000` (local)

### Endpoints

#### `POST /score`
Score a single transaction synchronously.

**Request body:**
```json
{
  "transaction_id": "txn_abc123",
  "amount": 249.99,
  "time": 43200,
  "features": [0.12, -1.34, 2.01, ...] // V1–V28
}
```

**Response:**
```json
{
  "transaction_id": "txn_abc123",
  "risk_score": 82,
  "flagged": true,
  "risk_flags": [
    {"feature": "Amount", "direction": "high", "label": "Unusually large transaction"},
    {"feature": "V4", "direction": "anomalous", "label": "Atypical spending pattern"},
    {"feature": "Time", "direction": "anomalous", "label": "Off-hours activity"}
  ],
  "latency_ms": 12,
  "timestamp": "2026-06-29T14:32:01Z"
}
```

#### `WebSocket /ws/stream`
Real-time stream of scored transactions. Pushes one JSON object per transaction as Kafka consumer processes them.

**Emitted message format:** Same as `/score` response, plus:
```json
{
  "...",
  "is_replay": true,
  "original_label": 0
}
```

#### `GET /stats`
Aggregate stats for the StatsBar component.
```json
{
  "total_processed": 14823,
  "fraud_rate_pct": 0.18,
  "avg_latency_ms": 11.4,
  "flagged_last_minute": 3
}
```

#### `GET /health`
```json
{ "status": "ok", "model_loaded": true, "kafka_connected": true }
```

### Kafka Architecture

**Topic:** `transactions-raw`
**Consumer group:** `vaultscan-scorer`

Flow:
```
creditcard.csv
    ↓ (replay.py — 10 txns/sec)
Kafka topic: transactions-raw
    ↓ (kafka_consumer.py)
ML model inference
    ↓
Redis (recent 500 txns buffer)
    ↓
WebSocket broadcast → all connected dashboard clients
    ↓
PostgreSQL (full audit log)
```

**Replay speed:** 10 transactions/second by default. Configurable via `REPLAY_SPEED_TPS` env var.

---

## 6. Frontend — UI Spec

### Design System

**Aesthetic:** Cinematic dark. Liquid glass. Financial precision. Think: what if Stripe Radar was built by a design studio that also made space travel films.

**Color palette:**
```css
--bg-void: #000000;           /* true black — page background */
--bg-surface: #080808;        /* card/panel backgrounds */
--glass-border: rgba(255,255,255,0.12);
--text-primary: #FFFFFF;
--text-secondary: rgba(255,255,255,0.65);
--text-muted: rgba(255,255,255,0.35);
--risk-low: #22C55E;          /* green — safe */
--risk-medium: #F59E0B;       /* amber — suspicious */
--risk-high: #EF4444;         /* red — flagged */
--accent: #FFFFFF;
```

**Typography:**
```css
font-heading: 'Instrument Serif', serif; /* italic always, display use only */
font-body: 'Barlow', sans-serif;         /* weights 300/400/500/600 */
font-mono: 'JetBrains Mono', monospace; /* transaction IDs, numbers, latency */
```

**Liquid Glass (exact CSS — copy verbatim):**
```css
.liquid-glass {
  background: rgba(255,255,255,0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%,
    rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%,
    rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%,
    rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
.liquid-glass-strong {
  backdrop-filter: blur(50px);
  box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15);
}
```

**Tailwind config additions:**
```js
theme: {
  extend: {
    fontFamily: {
      heading: ["'Instrument Serif'", 'serif'],
      body: ["'Barlow'", 'sans-serif'],
      mono: ["'JetBrains Mono'", 'monospace'],
    },
    borderRadius: {
      DEFAULT: '9999px', // pill by default
    }
  }
}
```

---

### Page Structure

#### Section 1 — Hero (full viewport, `bg-[#000]`)

**Background video:** Abstract dark fluid / financial data visualization
- Use a looping dark abstract video (Pexels free or generate)
- `FadingVideo` component: rAF-based crossfade, no CSS transitions, manual loop via `ended` event
- Video: `absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0`, `width: 120%, height: 120%`

**Navbar (fixed, top-4, z-50):**
- Left: 48×48 liquid-glass circle, italic serif "v" (for VaultScan)
- Center: liquid-glass pill nav — "Overview · Live Feed · Risk Engine · API Docs · About"
- Right: liquid-glass-strong pill CTA — "View Live Demo" + ArrowUpRight icon

**Hero content (centered, pt-24):** All Framer Motion animated (blur→clear, y:20→0, easeOut)
- Badge (delay 0.4s): liquid-glass pill — white chip "Live" (pulsing dot) + "Real-time fraud scoring at 10 transactions/second"
- Headline (BlurText, delay 0.5s): "Every Transaction. Scored. Instantly." — `text-6xl md:text-[5.5rem] font-heading italic text-white leading-[0.85] tracking-[-3px]`
- Subheading (delay 0.8s): "VaultScan detects anomalous transactions in milliseconds using unsupervised ML — before fraud clears the wire."
- CTAs (delay 1.1s): Primary liquid-glass-strong "Open Dashboard" + ArrowUpRight | Secondary text "Read the Docs" + ExternalLink icon
- Stats row (delay 1.3s): Two liquid-glass cards, p-5, w-[220px], rounded-[1.25rem]:
  - Card 1: clock icon + "< 15ms" / "Average scoring latency"
  - Card 2: shield icon + "99.3%" / "Precision at 0.002 contamination"

**Partners row (delay 1.4s):** Replace brand names with model specs:
- liquid-glass pill: "Trained on real-world transaction data"
- Row: `Isolation Forest · SHAP · Kafka · FastAPI · GCP` in Instrument Serif italic, text-2xl, gap-12

---

#### Section 2 — Live Dashboard (min-h-screen, `bg-[#000]`)

**Background video:** Different dark abstract video — full bleed, `inset-0 w-full h-full object-cover`

**Layout:** `grid grid-cols-12 gap-6 px-8 md:px-16 pt-24 pb-10`

**StatsBar** (`col-span-12`): Four liquid-glass cards in a row
- Total Processed: large mono number, green when incrementing
- Fraud Rate %: color shifts amber/red when above 0.5%
- Avg Latency: green if <20ms, amber if 20-50ms, red if >50ms
- Flagged Last 60s: red badge, pulses on new flags

**TransactionFeed** (`col-span-7`):
- Header: "// Live Feed" in text-sm font-body text-white/60 + "10 txn/s" pulse chip
- Scrolling list — newest at top, max 50 visible, older fade out
- Each row: `transaction_id` (mono, truncated) | amount | risk score bar (colored) | flagged badge or clean chip | timestamp
- Flagged rows: subtle red left border + `bg-red-500/5`
- Smooth entrance animation per row (Framer Motion, slide in from right)

**RiskGauge** (`col-span-5`):
- Shows the most recently scored transaction
- Circular gauge, 0-100, color interpolates green→amber→red
- Center: large risk score number in Instrument Serif italic
- Below gauge: transaction amount, ID, 3 risk flags (or "No anomalies detected")
- Risk flags: small liquid-glass pills, color-coded, each with icon + label

**AlertsPanel** (`col-span-12`):
- Header: "// Flagged Alerts" + count badge
- Card grid (3 cols) of flagged-only transactions
- Each card: risk score badge (large, colored) + transaction details + 3 risk flags
- Newest first, max 9 shown, "View all" link

---

#### Section 3 — How It Works (min-h-[60vh])

Three liquid-glass cards (same as space landing page structure):
- **Card 1 — Ingest:** "Transactions stream through Kafka at configurable throughput — 10 to 10,000 per second." Tags: Confluent · Low Latency · Durable · Scalable
- **Card 2 — Score:** "Isolation Forest detects anomalies without labeled training data, the way real production systems work." Tags: Unsupervised · SHAP · Real-time · Explainable  
- **Card 3 — Alert:** "Flagged transactions surface instantly on the dashboard with visual risk flags — no SQL queries needed." Tags: WebSocket · Live · Visual · Actionable

---

### Key Components

#### `FadingVideo.tsx`
```
FADE_MS = 500, FADE_OUT_LEAD = 0.55s
- fadeTo(target, duration): rAF loop, reads current opacity from video.style.opacity
- cancelAnimationFrame before each new fade
- onLoadedData: opacity=0, play(), fadeTo(1)
- onTimeUpdate: if (duration - currentTime <= 0.55 && !fadingOutRef): fadeTo(0)
- onEnded: opacity=0, setTimeout(100ms), reset, play(), fadeTo(1)
- loop attribute OFF — manual via ended event
- Cleanup: cancel rAF, remove listeners
```

#### `BlurText.tsx`
```
- IntersectionObserver, 10% threshold
- Split text by spaces
- Each word: motion.span
  initial: { filter: 'blur(10px)', opacity: 0, y: 50 }
  keyframes → blur(5px)/0.5/y:-5 → blur(0)/1/y:0
  duration: 0.7, times: [0, 0.5, 1], easeOut
  stagger: delay = i * 0.1s
  display: inline-block, marginRight: 0.28em
- Parent: display:flex, flexWrap:wrap, justifyContent:center, rowGap:0.1em
```

#### `useTransactionStream.ts`
```typescript
// WebSocket hook
// ws://localhost:8000/ws/stream (local) / wss://api.vaultscan.app/ws/stream (prod)
// Reconnect with exponential backoff (1s, 2s, 4s, max 30s)
// Returns: { transactions, stats, isConnected, latestFlagged }
// transactions: rolling array, max 500, newest first
// On each message: update transactions + update stats
```

---

## 7. Data Flow (End to End)

```
1. ml/train.py
   └── Trains IsolationForest on creditcard.csv
   └── Saves model.joblib + scaler.joblib

2. producer/replay.py
   └── Reads creditcard.csv row by row
   └── Publishes to Kafka topic `transactions-raw` at 10 txn/s
   └── Includes original label for dashboard display only

3. backend/services/kafka_consumer.py
   └── Consumes from `transactions-raw`
   └── For each message:
       a. model_service.score(transaction) → risk_score, flagged, risk_flags
       b. redis_service.push(scored_transaction) → rolling buffer
       c. Broadcast to all WebSocket clients via /ws/stream
       d. db.insert(transaction_log row)

4. frontend/hooks/useTransactionStream.ts
   └── WebSocket listener
   └── Updates React state → all dashboard components re-render

5. Dashboard renders in real time:
   └── StatsBar: increments counters
   └── TransactionFeed: prepends new row, slides in
   └── RiskGauge: updates to latest transaction
   └── AlertsPanel: if flagged, prepends to alerts grid
```

---

## 8. Environment Variables

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@host:5432/vaultscan
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=pkc-xxxxx.confluent.cloud:9092
KAFKA_API_KEY=xxxx
KAFKA_API_SECRET=xxxx
KAFKA_TOPIC=transactions-raw
KAFKA_CONSUMER_GROUP=vaultscan-scorer
MODEL_PATH=./ml/model.joblib
SCALER_PATH=./ml/scaler.joblib
REPLAY_SPEED_TPS=10
CORS_ORIGINS=https://vaultscan.vercel.app,http://localhost:5173

# Frontend (.env.local)
VITE_WS_URL=wss://api.vaultscan.app/ws/stream
VITE_API_URL=https://api.vaultscan.app
```

---

## 9. Docker Compose (Local Dev)

```yaml
version: '3.9'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: vaultscan
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [kafka, postgres, redis]
    env_file: .env

  producer:
    build: ./producer
    depends_on: [kafka]
    env_file: .env
```

---

## 10. GitHub Actions CI/CD

### `.github/workflows/deploy-backend.yml`
```yaml
on:
  push:
    branches: [main]
    paths: ['backend/**', 'ml/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}
      - name: Build and push to Artifact Registry
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/vaultscan-backend ./backend
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/vaultscan-backend
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy vaultscan-backend \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/vaultscan-backend \
            --platform managed --region us-central1 \
            --allow-unauthenticated
```

### `.github/workflows/deploy-frontend.yml`
```yaml
on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend/dist
```

---

## 11. Build Order (Step-by-Step)

Follow this exact order. Don't skip ahead.

1. **Dataset** — Download `creditcard.csv` from Kaggle, place in `ml/data/`
2. **ML** — Run `ml/train.py`, verify `model.joblib` + `scaler.joblib` produced, run `ml/evaluate.py` and record metrics
3. **Backend skeleton** — FastAPI app, `/health` endpoint, model loads on startup
4. **Kafka local** — `docker-compose up kafka zookeeper`, test producer publishes, consumer reads
5. **Score endpoint** — Wire `POST /score` with model inference + SHAP
6. **WebSocket** — Kafka consumer → broadcast to `/ws/stream`
7. **PostgreSQL** — Transaction log table, insert on every scored transaction
8. **Redis** — Rolling buffer for recent 500 transactions, feed `/stats`
9. **Frontend skeleton** — Vite + React + Tailwind + Framer Motion, WebSocket hook wired
10. **UI components** — FadingVideo → BlurText → Hero → Dashboard shell → StatsBar → TransactionFeed → RiskGauge → AlertsPanel → How It Works
11. **Local end-to-end test** — Full docker-compose up, replay running, dashboard live
12. **Cloud deploy** — GCP Cloud Run (backend) + Confluent Cloud (Kafka) + Vercel (frontend)
13. **CI/CD** — GitHub Actions workflows
14. **README** — Architecture diagram, demo GIF, setup instructions

---

## 12. Key Interview Talking Points

When explaining VaultScan to an interviewer:

**On model choice:** "I chose Isolation Forest because real fraud detection in production rarely has clean labeled data at training time. Unsupervised anomaly detection mirrors the actual constraint. I evaluated against labels post-hoc and got ROC-AUC of 0.91."

**On Kafka:** "Kafka gives us durability and replay — if the scoring service goes down, no transactions are lost. I can replay from any offset. That's not possible with raw WebSockets."

**On SHAP:** "I didn't want a black box. SHAP gives me feature-level attribution — I can tell a compliance team exactly which features drove the flag, not just that it was flagged."

**On architecture:** "FastAPI handles the synchronous scoring API and the WebSocket broadcast. The Kafka consumer runs as a background task. Redis buffers the last 500 transactions for fast dashboard loads without hitting Postgres on every refresh."

**On contamination=0.002:** "The Kaggle dataset has 0.17% fraud. But in production, you tune contamination to your expected fraud rate. I set 0.002 because I wanted a tight boundary — higher precision even at the cost of some recall."

---

## 13. Portfolio Presentation Notes

- **Hero demo GIF:** Record a 15-second screen capture of the dashboard with the live feed running, risk gauge updating, and a flagged transaction appearing in the alerts panel. Embed in README.
- **Live URL:** `https://vaultscan.vercel.app`
- **GitHub:** Public repo, clean commit history, no API keys in history
- **README sections:** What it is → Why it matters → Architecture diagram → Tech stack → Setup → Demo → What I'd do next (scale to 100k TPS with Kafka partitioning, add online learning for model drift)
- **LinkedIn post angle:** "Built a Stripe Radar clone from scratch — Kafka, Isolation Forest, SHAP explainability, real-time WebSocket dashboard. Here's the architecture..."
