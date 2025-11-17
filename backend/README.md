# InsightSheet Backend API

REST API for InsightSheet application built with Node.js, Express, and MongoDB.

## Features

- ✅ User authentication (JWT)
- ✅ Subscription management
- ✅ File uploads
- ✅ Activity tracking
- ✅ Rate limiting
- ✅ Security best practices
- ✅ MongoDB database

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
```

Server runs on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Subscriptions
- `GET /api/subscriptions` - Get subscription info
- `POST /api/subscriptions/upgrade` - Upgrade subscription

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files` - Get user files

### Activity
- `POST /api/activity` - Log activity
- `GET /api/activity` - Get activity log

## Deployment

### Railway (Recommended - Free Tier)

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select this repository
4. Add environment variables
5. Deploy!

### Render

1. Create account at https://render.com
2. New Web Service → Connect repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy!

### Vercel (Serverless)

```bash
npm install -g vercel
vercel
```

## Environment Variables

See `.env.example` for all required variables.

## Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Helmet.js for security headers
- Rate limiting enabled
- CORS configured

## Database Models

- **User** - User accounts
- **Subscription** - Subscription plans
- **UserActivity** - Activity tracking

## License

MIT
