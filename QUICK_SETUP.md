# 🚀 SyncDocs - Quick Auth Fix Setup Guide

## ⚡ 3-Step Quick Start

### Step 1: Install New Dependencies
```bash
cd server
npm install
```

New packages added:
- `jsonwebtoken` - Industry-standard JWT library
- `validator` - Email and input validation

### Step 2: Verify .env File
```bash
cat .env
```

Make sure you have (copy from .env.example if missing):
```
MONGO_URI=mongodb://localhost:27017/syncdocs
JWT_SECRET=your_super_secret_key_change_this_in_production
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**For MongoDB Atlas (cloud):**
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/syncdocs
```

### Step 3: Start the Server
```bash
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
✅ Server running on http://localhost:5000
📡 WebSocket namespace: /documents
🌍 Client URL: http://localhost:5173
🔐 Auth middleware: JWT + bcryptjs
```

---

## ✅ What Was Fixed

| Bug | Status | Details |
|-----|--------|---------|
| Outdated JWT library | ✅ Fixed | Now using standard `jsonwebtoken` |
| Password hashing on first save | ✅ Fixed | Pre-save hook now works correctly |
| Duplicate email errors hidden | ✅ Fixed | Clear error messages (409 status) |
| No email validation | ✅ Fixed | Using `validator` library |
| No password strength check | ✅ Fixed | Requires 8+ chars, 1 uppercase, 1 number |
| Tokens never expire | ✅ Fixed | Now set to expire in 7 days |
| DB connection race condition | ✅ Fixed | Server waits for MongoDB before listening |
| Avatar URL not encoded | ✅ Fixed | Names with spaces work now |
| No input sanitization | ✅ Fixed | Trim + lowercase all inputs |
| Weak error handling | ✅ Fixed | Type-specific error messages |
| No env var validation | ✅ Fixed | Server fails with clear message if missing |

---

## 🧪 Quick Test

### Test 1: Can you register?
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123"
  }'
```

**Expected Response:**
```json
{
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://ui-avatars.com/api/..."
  }
}
```

### Test 2: Weak password rejected?
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "weak",
    "confirmPassword": "weak"
  }'
```

**Expected Error:**
```json
{
  "error": "Password must be at least 8 characters, include uppercase letter and number"
}
```

### Test 3: Login works?
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

## 📊 What Changed in Backend

### `package.json`
- ❌ Removed `jwt-simple` (outdated)
- ✅ Added `jsonwebtoken` (standard)
- ✅ Added `validator` (email/input validation)

### `server/models/User.js`
- ✅ Added email format validation
- ✅ Added password length validation
- ✅ Added name length validation
- ✅ Fixed password hashing on first save
- ✅ Added proper error handling for duplicates
- ✅ URL-encode avatar names

### `server/routes/auth.js`
- ✅ Use `jsonwebtoken` with expiration (7 days)
- ✅ Validate password strength (8+ chars, 1 uppercase, 1 number)
- ✅ Validate email format
- ✅ Require `confirmPassword` field
- ✅ Sanitize input (trim + lowercase)
- ✅ Type-specific error messages
- ✅ Use HTTP status codes (201, 400, 409, 401, 500)

### `server/middleware/authMiddleware.js`
- ✅ Use `jsonwebtoken` with `jwt.verify()`
- ✅ Check for "Bearer " prefix
- ✅ Type-specific error messages
- ✅ Distinguish between expired vs invalid tokens

### `server/index.js`
- ✅ Validate required environment variables on startup
- ✅ Wait for MongoDB to connect before starting server
- ✅ Better error messages and logging
- ✅ Graceful shutdown on SIGINT

### `server/socket/socketHandler.js`
- ✅ Use `jsonwebtoken` with `jwt.verify()`
- ✅ Better error handling for token validation

---

## 📝 What Changed in Frontend

### `client/src/api/index.js`
- ✅ Added timeout (10 seconds)
- ✅ Added response error interceptor
- ✅ Auto-logout on 401 Unauthorized
- ✅ Updated register to require `confirmPassword`

### `client/src/context/AuthContext.jsx`
- ✅ Updated register function signature
- ✅ Better error logging

### `client/src/pages/Register.jsx`
- ✅ Client-side password strength validation
- ✅ Confirm password match check
- ✅ Name validation (2+ chars)
- ✅ Email format check
- ✅ Better user feedback

---

## 🔐 Security Improvements

**Before:**
```
❌ Passwords could be plain text in DB
❌ Tokens never expired
❌ Email duplicates silently ignored
❌ Weak passwords allowed (length 1 OK)
❌ Using outdated JWT library
```

**After:**
```
✅ All passwords hashed with bcryptjs (11 rounds)
✅ Tokens expire in 7 days
✅ Email duplicates return 409 Conflict
✅ Passwords must be: 8+ chars, 1 uppercase, 1 number
✅ Using standard jsonwebtoken library
✅ All inputs sanitized and validated
✅ Clear error messages for debugging
```

---

## ⚠️ Important Notes

1. **Change JWT_SECRET in production:**
   ```bash
   # Generate strong secret
   openssl rand -base64 32
   ```
   Then update `.env` and redeploy.

2. **Token expiration is 7 days:**
   - Users need to login again every 7 days
   - To change: Edit `server/routes/auth.js` line with `expiresIn: '7d'`

3. **Password requirements:**
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 number
   - Example: `SecurePass123` ✅, `pass123` ❌

4. **Email validation:**
   - Must be valid format (user@domain.com)
   - Case-insensitive (john@example.com = JOHN@EXAMPLE.COM)

5. **Error responses are now specific:**
   - 400 Bad Request - validation errors
   - 401 Unauthorized - authentication failed
   - 409 Conflict - duplicate email

---

## 🐛 If You Find Issues

1. **Check server logs:**
   ```bash
   npm run dev  # Should show detailed logs
   ```

2. **Verify MongoDB is running:**
   ```bash
   mongod  # In another terminal
   ```

3. **Test with curl (see Quick Test section above)**

4. **Check .env has all required variables:**
   ```bash
   grep -E "MONGO_URI|JWT_SECRET|PORT|CLIENT_URL" .env
   ```

5. **Clear browser cache:**
   ```
   Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)
   ```

---

## ✅ Deployment Ready

All fixes are production-grade and tested:
- ✅ No deprecated libraries
- ✅ Proper error handling
- ✅ Security best practices
- ✅ Input validation
- ✅ Database constraints
- ✅ JWT with expiration
- ✅ Type-specific errors

**Ready to deploy to Vercel + Railway!** 🚀

---

For full technical details, see `AUTH_BUG_REPORT.md`
