# 🇮🇳 VoterMitra — Hyper-Local Indian Civic Tech Platform

> Your personal election companion for the 2026 India election cycle.
> Personalized news, candidate data, booth finder, and voter registration help — in your language.

![VoterMitra Banner](https://img.shields.io/badge/Built_for-India_2026_Elections-FF6B35?style=for-the-badge&logo=data:image/svg+xml;base64,)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **Mitra Chatbot** | Pincode-based personalization via Gemini AI |
| 📰 **Election News** | Hyper-local news with 60-word AI summaries |
| 🏛️ **Candidate Info** | Assets, education, criminal cases from ECI affidavits |
| 📋 **Forms Wizard** | Form 6/8/8A with document checklists |
| 🗳️ **Booth Finder** | EPIC ID → polling booth with Google Maps link |
| 🌐 **8 Languages** | EN, हिं, தமி, తెలు, বাং, मरा, ગુજ, ಕನ್ನ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Cloud Run (Frontend)               │
│           React + Vite + Tailwind CSS               │
│                nginx:alpine on :8080                │
└──────────────────────┬──────────────────────────────┘
                       │ /api/*
┌──────────────────────▼──────────────────────────────┐
│                   Cloud Run (Backend)                │
│              FastAPI + Python 3.11                  │
│                 uvicorn on :8080                    │
├─────────────────────────────────────────────────────┤
│  Vertex AI (Gemini)  │  Firestore  │  Cloud Trans.  │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Prerequisites

- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- `gcloud` CLI ([install](https://cloud.google.com/sdk/docs/install))
- A GCP project with billing enabled

---

## 🛠️ Local Setup

### 1. Clone & configure

```bash
git clone https://github.com/yourorg/votermitra.git
cd votermitra
cp .env.example .env
# Edit .env — fill in all values
```

### 2. GCP Authentication (local dev)

```bash
# Install gcloud CLI, then:
gcloud auth login
gcloud auth application-default login
# This generates: ~/.config/gcloud/application_default_credentials.json
# Set in .env:
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/application_default_credentials.json
```

### 3. Run backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### 4. Run frontend

```bash
cd frontend
npm install
# Create frontend/.env.local with your VITE_ variables
cp ../.env.example .env.local
npm run dev
# App: http://localhost:5173
```

### 5. Run with Docker Compose

```bash
# From project root:
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/docs
```

---

## ☁️ GCP Setup

### Enable required APIs

```bash
gcloud services enable \
  firestore.googleapis.com \
  aiplatform.googleapis.com \
  translate.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  identitytoolkit.googleapis.com \
  --project=$GCP_PROJECT_ID
```

### Create Firestore database

```bash
gcloud firestore databases create \
  --location=asia-south1 \
  --project=$GCP_PROJECT_ID
```

### Create Artifact Registry repository

```bash
gcloud artifacts repositories create votermitra \
  --repository-format=docker \
  --location=asia-south1 \
  --project=$GCP_PROJECT_ID
```

### Store secrets

```bash
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create GEMINI_API_KEY --data-file=- \
  --project=$GCP_PROJECT_ID

echo -n "YOUR_GCP_API_KEY" | \
  gcloud secrets create GCP_API_KEY --data-file=- \
  --project=$GCP_PROJECT_ID
```

### Setup Firebase / Identity Platform

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Add your GCP project
3. Enable **Google Sign-in** under Authentication → Sign-in method
4. Add your Cloud Run frontend URL to **Authorized domains**
5. Copy `apiKey`, `messagingSenderId`, `appId` to `.env`

### Deploy to Cloud Run

```bash
# Authenticate Docker
gcloud auth configure-docker asia-south1-docker.pkg.dev

# Backend
docker build -t asia-south1-docker.pkg.dev/$GCP_PROJECT_ID/votermitra/backend:latest ./backend
docker push asia-south1-docker.pkg.dev/$GCP_PROJECT_ID/votermitra/backend:latest

gcloud run deploy votermitra-backend \
  --image=asia-south1-docker.pkg.dev/$GCP_PROJECT_ID/votermitra/backend:latest \
  --region=asia-south1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --set-env-vars="GCP_PROJECT_ID=$GCP_PROJECT_ID,GEMINI_MODEL=gemini-1.5-flash" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,GCP_API_KEY=GCP_API_KEY:latest" \
  --project=$GCP_PROJECT_ID

# Get backend URL
BACKEND_URL=$(gcloud run services describe votermitra-backend \
  --region=asia-south1 --format='value(status.url)' --project=$GCP_PROJECT_ID)

# Frontend
docker build \
  --build-arg VITE_GCP_API_KEY=$VITE_GCP_API_KEY \
  --build-arg VITE_GCP_PROJECT_ID=$GCP_PROJECT_ID \
  --build-arg VITE_BACKEND_URL=$BACKEND_URL \
  --build-arg VITE_MESSAGING_SENDER_ID=$VITE_MESSAGING_SENDER_ID \
  --build-arg VITE_APP_ID=$VITE_APP_ID \
  -t asia-south1-docker.pkg.dev/$GCP_PROJECT_ID/votermitra/frontend:latest ./frontend
docker push asia-south1-docker.pkg.dev/$GCP_PROJECT_ID/votermitra/frontend:latest

gcloud run deploy votermitra-frontend \
  --image=asia-south1-docker.pkg.dev/$GCP_PROJECT_ID/votermitra/frontend:latest \
  --region=asia-south1 \
  --allow-unauthenticated \
  --memory=256Mi \
  --project=$GCP_PROJECT_ID
```

### Setup Cloud Scheduler (news refresh)

```bash
# Get backend URL first (see above)
gcloud scheduler jobs create http votermitra-news-refresh \
  --location=asia-south1 \
  --schedule="0 */6 * * *" \
  --uri="${BACKEND_URL}/api/news/refresh" \
  --http-method=POST \
  --oidc-service-account-email=votermitra-scheduler@${GCP_PROJECT_ID}.iam.gserviceaccount.com \
  --project=$GCP_PROJECT_ID
```

---

## 🔐 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT_ID` | ✅ | GCP project ID |
| `GCP_REGION` | ✅ | e.g. `asia-south1` |
| `GEMINI_API_KEY` | ✅ | From AI Studio |
| `GCP_API_KEY` | ✅ | For Translation API |
| `GEMINI_MODEL` | — | Default: `gemini-1.5-flash` |
| `DIALOGFLOW_AGENT_ID` | — | Dialogflow CX agent |
| `VITE_GCP_API_KEY` | ✅ | Firebase web API key |
| `VITE_GCP_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_BACKEND_URL` | ✅ | Backend Cloud Run URL |
| `VITE_MESSAGING_SENDER_ID` | ✅ | Firebase sender ID |
| `VITE_APP_ID` | ✅ | Firebase app ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | local | Path to ADC JSON |

---

## 🤖 CI/CD Setup (GitHub Actions)

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `WIF_PROVIDER` | Workload Identity Federation provider |
| `WIF_SERVICE_ACCOUNT` | Service account email for WIF |
| `GEMINI_API_KEY` | Gemini API key |
| `GCP_API_KEY` | GCP REST API key |
| `VITE_GCP_API_KEY` | Firebase web API key |
| `VITE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_APP_ID` | Firebase app ID |
| `BACKEND_CLOUD_RUN_URL` | Deployed backend URL |

### Setup Workload Identity Federation

```bash
# Create service account
gcloud iam service-accounts create votermitra-cicd \
  --project=$GCP_PROJECT_ID

# Grant necessary roles
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:votermitra-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:votermitra-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Create WIF pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --project=$GCP_PROJECT_ID

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --workload-identity-pool=github-pool \
  --location=global \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --project=$GCP_PROJECT_ID
```

---

## 📁 Project Structure

```
votermitra/
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── gcp/              # Firebase auth + translate helpers
│   │   ├── components/       # All UI components
│   │   ├── utils/            # API utilities
│   │   ├── App.jsx           # 4-screen app shell
│   │   └── main.jsx
│   ├── Dockerfile            # Multi-stage nginx build
│   └── nginx.conf            # SPA + API proxy config
├── backend/                  # FastAPI Python 3.11
│   ├── routers/              # voter, news, candidates, translate, chat, webhook
│   ├── main.py               # App entrypoint
│   ├── ai.py                 # Gemini wrapper
│   ├── database.py           # Firestore singleton
│   ├── scraper.py            # News scraper + cache
│   └── Dockerfile
├── .github/workflows/        # CI/CD
├── docker-compose.yml
└── .env.example
```

---

## 📊 Data Sources

| Source | Data | Endpoint |
|--------|------|----------|
| India Post | Pincode → District/State | `api.postalpincode.in` |
| Google News RSS | Election news | via allorigins proxy |
| Lok Dhaba | Candidate data (ECI affidavits) | `api.lokdhaba.ashoka.edu.in` |
| Gemini 1.5 Flash | News summaries + chat | Vertex AI |
| Google Translation | 8 Indian languages | Cloud Translation v2 |
| ECI Portal | Voter ID + booth search | `voters.eci.gov.in` |

---

## 📝 License

MIT — Built with ❤️ for Indian democracy.
