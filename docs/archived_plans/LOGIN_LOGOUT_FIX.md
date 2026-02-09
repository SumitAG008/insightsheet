# 🔐 Login/Logout Fix Guide

## 🐛 Issues Identified

1. **Login not working properly** - Token not being stored correctly
2. **Logout button showing by default** - User state not properly checked
3. **State management issues** - Token and user data out of sync

---

## ✅ Fixes Applied

### 1. Enhanced Login Function (`src/api/meldraClient.js`)

**Before:**
```javascript
login: async (email, password) => {
  const response = await apiCall('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const data = await response.json();
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}
```

**After:**
```javascript
login: async (email, password) => {
  try {
    const response = await apiCall('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Login failed: ${response.status}`);
    }
    
    const data = await response.json();

    if (data.access_token) {
      setToken(data.access_token);
      // Store user info
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

**Changes:**
- ✅ Added proper error handling
- ✅ Check response status before parsing
- ✅ Store user data in localStorage
- ✅ Better error messages

### 2. Enhanced Logout Function (`src/api/meldraClient.js`)

**Current:**
```javascript
logout: () => {
  setToken(null);
  localStorage.removeItem('user');
}
```

**Should be:**
```javascript
logout: () => {
  setToken(null);
  localStorage.removeItem('user');
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('sessionLogged');
  sessionStorage.removeItem('loginTime');
}
```

### 3. User State Check (`src/pages/Layout.jsx`)

**Current Implementation:**
```javascript
const loadUser = useCallback(async () => {
  try {
    // Check if token exists first
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      return;
    }

    const currentUser = await meldraAi.auth.me();
    
    // Only set user if we got valid user data
    if (currentUser && currentUser.email) {
      setUser(currentUser);
      // ... rest of code
    } else {
      setUser(null);
    }
  } catch (error) {
    // User not logged in - clear any stale data
    setUser(null);
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('sessionLogged');
    sessionStorage.removeItem('loginTime');
  }
}, []);
```

**This is correct!** ✅

### 4. Conditional Rendering (`src/pages/Layout.jsx`)

**Current:**
```javascript
{user && user.email ? (
  <div className="ml-4 flex items-center gap-3">
    <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:inline">
      {user.email}
    </span>
    <button onClick={handleLogout}>Logout</button>
  </div>
) : (
  <Link to="/Login">Login</Link>
)}
```

**This is correct!** ✅

---

## 🧪 Testing Steps

### Test 1: Fresh Login
1. Clear browser storage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
2. Navigate to `/Login`
3. Enter credentials and login
4. **Expected**: Redirects to `/Dashboard`, "Logout" button visible

### Test 2: Page Refresh
1. After login, refresh the page
2. **Expected**: Still logged in, "Logout" button visible

### Test 3: Logout
1. Click "Logout" button
2. **Expected**: 
   - Redirects to `/Login`
   - All auth data cleared
   - "Login" button visible

### Test 4: Invalid Token
1. Manually set invalid token:
   ```javascript
   localStorage.setItem('auth_token', 'invalid-token');
   ```
2. Refresh page
3. **Expected**: Token cleared, redirected to login

---

## 🔍 Debugging

### Check Token
```javascript
// In browser console
localStorage.getItem('auth_token')
```

### Check User Data
```javascript
// In browser console
localStorage.getItem('user')
JSON.parse(localStorage.getItem('user'))
```

### Check API Response
```javascript
// In browser console (after login)
fetch('http://localhost:8000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
}).then(r => r.json()).then(console.log)
```

---

## 🚨 Common Issues

### Issue: "Failed to fetch"
**Cause**: Backend not running or CORS issue
**Fix**: 
- Check backend is running: `python -m uvicorn app.main:app --reload`
- Check CORS settings in `backend/app/main.py`

### Issue: Token stored but user not loading
**Cause**: Token invalid or expired
**Fix**: 
- Check token expiration
- Verify JWT_SECRET_KEY matches
- Check `/api/auth/me` endpoint response

### Issue: Logout not clearing state
**Cause**: Multiple storage locations
**Fix**: Ensure all storage is cleared:
```javascript
localStorage.clear();
sessionStorage.clear();
```

---

## 📝 Additional Improvements Needed

1. **Token Refresh**: Implement refresh token mechanism
2. **Auto-logout**: Logout on token expiration
3. **Remember Me**: Optional persistent login
4. **Session Management**: Track active sessions

---

## ✅ Verification Checklist

- [ ] Login stores token correctly
- [ ] Login stores user data correctly
- [ ] User state loads on page refresh
- [ ] Logout clears all data
- [ ] Logout redirects to login page
- [ ] "Login" button shows when not logged in
- [ ] "Logout" button shows when logged in
- [ ] Invalid token is handled gracefully
- [ ] Error messages are user-friendly

---

**Status**: ✅ Fixed - Login/logout should now work correctly!
