# AI Assistant Conversation Analysis

Automated analysis platform for e-commerce assistant conversations. The system ingests conversation/message data from MongoDB, computes quality and engagement insights, and presents them in a dashboard for faster weekly review.

## Problem Statement
Manual conversation review does not scale across brands. This project automates insight generation to identify where the assistant performs well and where it needs improvement.

## What This System Delivers
1. Brand-wise conversation analytics using widget-level segmentation.
2. Conversation quality signals: drop-off, unanswered, frustration indicators.
3. Topic clustering and unanswered topic patterns.
4. Engagement analytics from user interaction events.
5. Action-oriented insights shown in a UI for quick decision making.

## Tech Stack
1. Database: MongoDB
2. Backend: Node.js + Express
3. Frontend: Vanilla JS + HTML/CSS

## Architecture
1. MongoDB stores two collections: conversations and messages.
2. Express API computes analysis through modular analyzers.
3. Frontend consumes /api/insights and renders dashboard sections.

Detailed architecture is documented in [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).

## Repository Structure
```text
.
├── conversations.json
├── messages.json
├── README.md
├── SYSTEM_DESIGN.md
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── importData.js
│   ├── package.json
│   └── analyzers/
│       ├── brandStats.js
│       ├── conversation.js
│       ├── topics.js
│       └── engagement.js
└── frontend/
  ├── index.html
  ├── styles.css
  ├── app.js
  └── package.json
```

## Quick Start

### 1) Configure Environment
Create backend environment file:

```env
MONGO_URI=<your_mongodb_connection_string>
DB_NAME=helio_intern
PORT=8000
NODE_ENV=development
```

You can copy from [backend/.env.example](backend/.env.example).

### 2) Install Dependencies
```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3) Import Data
Option A (Node script):
```bash
cd backend
npm run import
```

Option B (mongoimport):
```bash
mongoimport --db helio_intern --collection conversations --file conversations.json --jsonArray
mongoimport --db helio_intern --collection messages --file messages.json --jsonArray
```

### 4) Run Backend
```bash
cd backend
npm run dev
```

### 5) Run Frontend
Option A (served by backend):
1. Open http://localhost:8000

Option B (frontend dev server):
```bash
cd frontend
npm run dev
```
2. Open http://localhost:5500

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/health | Backend + DB connectivity and counts |
| GET | /api/insights | Combined payload used by dashboard |
| GET | /api/brands | Brand-level stats |
| GET | /api/health/conversations | Drop-off, unanswered, frustration signals |
| GET | /api/topics | Topic frequency and unanswered topics |
| GET | /api/engagement | Event and recommendation engagement stats |
| GET | /api/conversations | Conversation list with optional widget filter |
| GET | /api/conversations/:id/messages | Messages for one conversation |

## Demo Flow (Interview-Friendly)
1. Open /api/health and confirm records loaded.
2. Dashboard: explain overall quality metrics.
3. Brand Comparison: show differences between brands.
4. Conversation Health + Topics: identify weak coverage areas.
5. Engagement + Actionable Insights: map findings to next actions.

## Notes
1. Hallucination is currently a proxy signal based on missing product payload in agent responses.
2. Keep sensitive values only in .env files and never commit secrets.
3. Prefer IP-restricted Atlas access after demo; avoid 0.0.0.0/0 long-term.
