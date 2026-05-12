# UMP — University Marketplace

A full-stack web application built for university students to buy, sell, and connect. Students can list physical products, offer services, browse hostel/accommodation listings, and communicate in real time — all within a trusted campus community.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Pages & Routes](#pages--routes)
- [Deployment](#deployment)

---

## Overview

UMP (University Marketplace) is a peer-to-peer platform designed exclusively for university students. It supports:

- **Marketplace** — buy and sell physical goods between students
- **Services** — offer and book student-run services (tutoring, design, etc.)
- **Hostel Hub** — browse and list off-campus accommodation
- **Real-time Messaging** — Socket.io-powered chat between buyers and sellers
- **Escrow Payments** — Paystack-integrated payments held in escrow until delivery is confirmed
- **Seller Dashboard** — analytics, order management, and payout tracking for sellers

---

## Features

### Authentication

- Email/password signup with OTP email verification (Brevo/SMTP)
- JWT authentication via httpOnly cookies
- Forgot password / reset password via email link
- Role-based access: `buyer`, `seller`, `admin`

### Marketplace

- Product listings with Cloudinary image hosting
- Category and subcategory browsing
- Search with filters (price, condition, category)
- Quick-view modal and full product detail page
- Color variants and specifications table
- Add to cart / add to wishlist
- Product reviews with star ratings
- Follow/unfollow sellers

### Hostel Hub

- Accommodation listings with image carousel
- Filter by location, price range, bedrooms, and amenities
- Grid and list view toggle

### Services

- Service provider listings
- Booking system with session tracking
- Service analytics for providers

### Cart & Checkout

- Multi-step checkout: Cart → Shipping → Payment
- Paystack card and bank transfer payment methods
- Escrow-protected transactions
- Order tracking

### Messaging

- Real-time 1-on-1 chat powered by Socket.io
- File and image attachments
- Conversation history with infinite scroll pagination
- Admin/support team accessible from the sidebar

### Seller Tools

- Seller dashboard with sales analytics
- Payout requests and history
- Product management (CRUD)
- Cloudinary-hosted media (logo, banner, product images)

---

## Tech Stack

### Frontend

| Tool | Purpose |
|------|---------|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Vite 7 | Dev server and build tool |
| Socket.io Client | Real-time messaging |
| CSS (vanilla) | Styling — no CSS framework |

### Backend

| Tool | Purpose |
|------|---------|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose | Database and ODM |
| Socket.io | WebSocket server |
| JWT + bcrypt | Authentication |
| Cloudinary | Image and video hosting |
| Multer | File upload handling |
| Paystack | Payment processing |
| Brevo / Nodemailer | Transactional email |
| Helmet + CORS | Security headers |
| PDFKit | Invoice generation |

---

## Project Structure

```
ump-react/
├── frontend/                  # React + Vite app
│   ├── public/                # Static assets (images, icons)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   ├── FeaturedCategories.jsx
│   │   │   ├── TrendingCarousel.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── QuickViewModal.jsx
│   │   │   ├── SettingsModal.jsx
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── UserContext.jsx # Global auth state (single /api/auth/me fetch)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route-level page components
│   │   │   ├── Home.jsx
│   │   │   ├── Market.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Messages.jsx
│   │   │   ├── Hostel.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Auth.jsx       # OTP verification
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   └── ...
│   │   ├── styles/            # Page and component CSS
│   │   └── utils/
│   │       └── api.js         # apiFetch helper + cookie utils
│   ├── .env                   # Production env (VITE_API_BASE)
│   ├── .env.development       # Dev env (VITE_API_BASE=http://localhost:5000)
│   └── vite.config.js         # Vite config + /api proxy
│
├── backend/                   # Express API server
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── cloudinary.js      # Cloudinary SDK config
│   ├── controllers/           # Route handler logic
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification
│   │   ├── upload.js          # Multer + Cloudinary upload handlers
│   │   ├── uploadHandler.js   # Upload middleware with timeout
│   │   ├── errorHandler.js    # Centralized error handler
│   │   └── requireRole.js     # Role-based access control
│   ├── models/                # Mongoose schemas
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Cart.js
│   │   ├── Message.js
│   │   ├── Listing.js         # Hostel/accommodation listings
│   │   ├── Service.js
│   │   ├── Seller.js
│   │   └── ...
│   ├── routes/                # Express route definitions
│   ├── utils/
│   │   ├── sendMail.js        # Email sending (Brevo/SMTP)
│   │   ├── generateToken.js   # JWT generation
│   │   ├── paystack.js        # Paystack API wrapper
│   │   └── invoiceGenerator.js
│   ├── app.js                 # Express app setup (CORS, middleware, routes)
│   ├── server.js              # HTTP server + Socket.io
│   ├── .env                   # Environment variables (never commit)
│   └── .env.example           # Template for required env vars
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- Paystack account
- Brevo (Sendinblue) account or SMTP credentials

### 1. Clone the repository

```bash
git clone https://github.com/techtide0/ump-react.git
cd ump-react
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Fill in your credentials in .env (see Environment Variables below)
npm install
npm run dev
```

The backend starts on **http://localhost:5000**

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**

> The Vite dev server proxies all `/api/*` requests to `localhost:5000`, so no CORS issues during development.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/ump

# JWT
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Brevo / SMTP)
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=noreply@myump.com.ng
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_key_here

# Frontend URL (for email links and CORS)
CLIENT_URL=http://localhost:5173
```

Frontend env files:

| File | Used when |
|------|-----------|
| `frontend/.env` | Production builds (`npm run build`) |
| `frontend/.env.development` | Local dev (`npm run dev`) |

```env
# frontend/.env.development
VITE_API_BASE=http://localhost:5000

# frontend/.env  (production)
VITE_API_BASE=https://your-production-backend.com
```

---

## API Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/verify-otp` | Verify email OTP |
| POST | `/api/auth/forgot-password` | Send reset link |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/products` | List products (supports `?seller=`, `?limit=`) |
| GET | `/api/products/:id` | Get product by ID |
| POST | `/api/products/:id/reviews` | Submit review |
| GET | `/api/products/:id/related` | Related products |
| GET | `/api/categories` | List all categories |
| GET | `/api/listings` | List accommodation listings |
| POST | `/api/cart/add` | Add item to cart |
| GET | `/api/cart` | Get current cart |
| GET | `/api/orders` | Get user orders |
| POST | `/api/payments/initialize` | Initialize Paystack payment |
| POST | `/api/payments/webhook` | Paystack webhook handler |
| GET | `/api/messages/conversations` | Get conversations list |
| GET | `/api/messages/user` | Get messages with a user |
| POST | `/api/messages/send` | Send a message |
| GET | `/api/sellers/:id` | Get seller profile |
| POST | `/api/sellers/:id/follow` | Follow/unfollow seller |
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist/:id` | Toggle wishlist item |
| POST | `/api/upload` | Upload a single file to Cloudinary |

---

## Pages & Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Home` | Landing page with hero, categories, trending |
| `/market` | `Market` | Product marketplace with filters |
| `/products/:id` | `ProductDetail` | Product detail page with tabs |
| `/cart` | `Cart` | Multi-step checkout |
| `/hostel` | `Hostel` | Accommodation listings |
| `/services` | `Services` | Student services marketplace |
| `/store` | `Store` | Featured store page |
| `/partner` | `Provider` | Become a seller/partner |
| `/messages` | `Messages` | Real-time chat |
| `/login` | `Login` | Sign in / Sign up |
| `/auth` | `Auth` | OTP email verification |
| `/forgot-password` | `ForgotPassword` | Request reset link |
| `/reset-password` | `ResetPassword` | Set new password |
| `/checkout-success` | `CheckoutSuccess` | Post-checkout confirmation |
| `/payment-success` | `PaymentSuccess` | Payment confirmed page |

---

## Deployment

### Backend (Render / Railway / any Node host)

1. Set all environment variables from `.env.example` in your hosting dashboard
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Ensure `NODE_ENV=production`

### Frontend (Netlify / Vercel)

1. Set `VITE_API_BASE` to your deployed backend URL
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add a redirect rule for SPA routing:

   ```
   /* → /index.html  (200)
   ```

### Combined (backend serves frontend)
Build the frontend first, then start the backend — it serves `frontend/dist` as static files and handles SPA routing via the catch-all route.

```bash
cd frontend && npm run build
cd ../backend && npm start
```

---

## License

MIT — built for the University of Lagos student community.
