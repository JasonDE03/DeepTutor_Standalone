# Changelog - Casdoor Authentication & Authorization Integration

*Date: 2026-01-27*

## 🎯 Requirements
Integrate **Casdoor** as the authentication & authorization system for DeepTutor.
- OAuth2 login flow.
- Role-based permissions (Admin, Editor, Viewer).
- Protect APIs with JWT validation.
- UI updates for user info and logout.

---

## ✅ Completed Features

### 1. **Backend - Authentication Middleware** (NEW)
#### `backend/src/middleware/auth.py`
- Validates JWT token (RS256).
- Parses `id`, `username`, `role`.
- Supports `isAdmin` flag (Casdoor-specific) and `roles` array.

### 2. **Backend - Permission Decorator** (NEW)
#### `backend/src/middleware/permissions.py`
- `@require_permission("write")` decorator.
- **Admin**: read, write, delete, manage_users.
- **Editor**: read, write.
- **Viewer**: read only.

### 3. **Backend - Protected APIs**
#### `backend/src/api/routers/minio_files.py`
- All endpoints now require `Authorization: Bearer <token>`.
- Write/Delete operations protected by `@require_permission`.

### 4. **Frontend - AuthContext** (NEW)
#### `frontend/contexts/AuthContext.tsx`
- Manages global auth state.
- Handles OAuth2 callback and token storage (Cookies).
- `logout()` function.

### 5. **Frontend Pages**
- `frontend/app/login/page.tsx`: Redirects to Casdoor.
- `frontend/app/callback/page.tsx`: Exchanges code for token.
- `frontend/app/files/page.tsx`: Displays user info, Sign Out button.

### 6. **Infrastructure**
- Added `casdoor` and `casdoor-db` to `docker-compose.yml`.
- Configured dummy email/sms providers for dev.

---

## 🐛 Bug Fixes
- **403 Forbidden**: Fixed by checking `isAdmin` flag in JWT.
- **Signup Verification**: Disabled compulsory email/phone check for dev.
- **Built-in Org**: Created `my-org` for standard users.

---

## 📝 Next Steps
1. **MinIO IAM Integration**: Map Casdoor users to MinIO policies for file-level access.
2. **Production Hardening**: Add HTTPS, mount real public keys.
