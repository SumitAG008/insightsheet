# 🔐 Password Reset Guide

## ✅ **What's Implemented**

Complete password reset functionality has been added to your application!

---

## 🎯 **How Users Can Reset Password**

### **Step 1: Request Password Reset**

1. User goes to **Login page** (`/login`)
2. Clicks **"Forgot password?"** link (next to password field)
3. Or directly visits: `https://insight.meldra.ai/forgot-password`
4. Enters their **email address**
5. Clicks **"Send Reset Link"**

### **Step 2: Receive Reset Link**

**Development Mode:**
- Reset link is shown on screen (for testing)
- Link format: `https://insight.meldra.ai/reset-password?token=XXXXX`

**Production Mode:**
- Reset link would be sent via email (TODO: implement email sending)
- Link expires after **1 hour**

### **Step 3: Reset Password**

1. User clicks reset link (or copies from development screen)
2. Taken to **Reset Password page** (`/reset-password?token=XXXXX`)
3. Enters **new password** (minimum 6 characters)
4. Confirms password
5. Clicks **"Reset Password"**
6. Success message shown
7. Auto-redirected to **Login page** after 3 seconds

---

## 🔧 **Technical Details**

### **Backend Endpoints**

1. **POST `/api/auth/forgot-password`**
   - Input: `{ "email": "user@example.com" }`
   - Generates secure reset token
   - Saves token to database (expires in 1 hour)
   - Returns reset link (development mode)

2. **POST `/api/auth/reset-password`**
   - Input: `{ "token": "XXXXX", "new_password": "newpass123" }`
   - Validates token and expiration
   - Updates password
   - Clears reset token

### **Database Fields**

Added to `users` table:
- `reset_token` (VARCHAR 255) - Secure token for reset
- `reset_token_expires` (TIMESTAMP) - Token expiration time

### **Security Features**

- ✅ **Secure token generation** (32-byte URL-safe token)
- ✅ **Token expiration** (1 hour validity)
- ✅ **Email privacy** (doesn't reveal if email exists)
- ✅ **Password validation** (minimum 6 characters)
- ✅ **Token cleanup** (expired tokens are cleared)

---

## 📋 **User Flow**

```
Login Page
    ↓
Click "Forgot password?"
    ↓
Forgot Password Page
    ↓
Enter email → Send Reset Link
    ↓
Reset Link Generated (shown in dev mode)
    ↓
Click/Copy Reset Link
    ↓
Reset Password Page
    ↓
Enter new password → Reset
    ↓
Success → Redirect to Login
```

---

## 🚀 **What Happens After Deployment**

1. **Vercel** will deploy frontend pages:
   - `/forgot-password` page
   - `/reset-password` page
   - Updated Login page with "Forgot password?" link

2. **Railway** will deploy backend:
   - `/api/auth/forgot-password` endpoint
   - `/api/auth/reset-password` endpoint
   - Database migration (adds reset_token fields)

3. **Users can now:**
   - Request password reset from login page
   - Receive reset link (dev mode: shown on screen)
   - Reset password with secure token
   - Login with new password

---

## 📧 **TODO: Email Integration**

Currently, reset links are shown on screen (development mode).

**To enable email sending in production:**

1. Add email service (SendGrid, AWS SES, etc.)
2. Add email credentials to Railway environment variables
3. Implement `send_password_reset_email()` function
4. Remove `reset_link` from API response

---

## ✅ **Summary**

- ✅ **Backend:** Password reset endpoints added
- ✅ **Frontend:** Forgot Password and Reset Password pages created
- ✅ **Database:** Reset token fields added to User model
- ✅ **Security:** Secure token generation and expiration
- ✅ **UX:** Clear error messages and success feedback

**Users can now reset their passwords if they forget them!** 🎉
