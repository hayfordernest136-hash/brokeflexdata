# AGENTS.md - Brokeflex Data Development Guide

## Project Structure
```
brokeflexdata1/
├── backend/              # Express.js backend
│   ├── server.js         # Entry point
│   ├── config/           # Configuration (datamart, paystack, resend, admin)
│   ├── db/               # Database (MySQL via mysql2)
│   ├── models/           # Data models (Order.js)
│   ├── services/         # Business logic (datamart, paystack, email, order)
│   ├── controllers/      # Route controllers
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware (error handler, async wrapper, webhooks)
│   ├── utils/            # Utilities (validation, reference generation, logger)
│   └── test/             # API tests
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components (Home, BuyData, CheckOrder, OrderResult)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API service layer
│   │   ├── styles/       # Stylesheets
│   │   ├── App.jsx       # Main app with routing
│   │   ├── main.jsx      # Entry point
│   │   └── index.css     # Tailwind CSS imports
│   ├── index.html        # HTML template
│   ├── vite.config.js    # Vite config (with proxy)
│   ├── postcss.config.cjs # PostCSS config
│   └── .env              # Frontend env (VITE_API_BASE_URL)
├── .env.example          # Root environment template
├── .gitignore
└── AGENTS.md
```

## Commands

### Backend
```bash
cd backend
npm run dev    # Start with nodemon (development)
npm start      # Start without nodemon (production)
```
- Runs on http://localhost:4000
- Auto-restarts with nodemon on file changes

### Frontend
```bash
cd frontend
npm run dev    # Start Vite dev server
npm run build  # Build for production
npm run lint   # Run linter
```
- Dev server: http://localhost:5173
- Proxy: `/api` → http://localhost:4000/api

### Tests
```bash
cd backend
node test/api.test.js  # Run API test suite
```

## Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
- `DATABASE_URL` - **Required.** MySQL connection string (Railway provides this)
- `DATAMART_API_KEY` - DataMart API key
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Paystack public key
- `PAYSTACK_WEBHOOK_SECRET` - Paystack webhook signature secret
- `RESEND_API_KEY` - Resend email API key
- `JWT_SECRET` - JWT secret for admin authentication
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Admin panel credentials

**Required for production**: `DATABASE_URL` must be set. Backend fails to start without it.

## Architecture
1. Customer visits frontend → no login required
2. Customer selects network + bundle → frontend fetches real DataMart bundles via backend
3. Customer enters phone + email
4. Frontend creates order via backend API
5. Backend creates Paystack transaction → returns authorization URL
6. Frontend redirects to Paystack → customer pays
7. Paystack redirects back → frontend verifies payment via backend
8. Backend verifies with Paystack → if successful, calls DataMart API
9. Backend records result → sends email via Resend
10. Customer sees result → can check order later via Check Order page

## Key Design Decisions
- MySQL database (via mysql2 driver)
- DataMart API key never exposed to frontend
- Paystack secret key stays on backend
- Order amounts determined by backend (from DataMart bundles)
- Idempotency protection on DataMart purchases
- Admin area uses simple token-based auth (separate from customer flow)
