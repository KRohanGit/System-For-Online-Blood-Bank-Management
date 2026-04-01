# User Data Consistency - Quick Reference

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. Simple Donor Signup Loses Name
- **Backend:** `POST /auth/register/donor` accepts `name` but never stores it
- **File:** `Backend/src/controllers/authController.js:431-498`
- **Impact:** Users who sign up as donors lose their name
- **Fix:** Create DonorProfile or add `displayName` to User model

### 2. Storage Key Mismatch  
- **DonorSignin.js:** Stores as `localStorage.setItem('donorInfo', ...)`
- **PublicDashboard.js:** Reads from `localStorage.getItem('user')`
- **Impact:** Donors see "User" instead of name on dashboard
- **Fix:** Use `'user'` key consistently across all auth flows

### 3. Admin Dashboard Name Hardcoded
- **File:** `frontend/src/pages/admin/AdminDashboard.jsx:22`
- **Code:** `const [userName, setUserName] = useState('Admin');`
- **Impact:** Never displays actual hospital admin name
- **Fix:** Fetch `profile.adminName` and display it

### 4. Crisis System Uses Undefined Field
- **Files:** `frontend/src/services/crisis/crisisEngines.js:392, 550, 562`
- **Problem:** References `user.name` which doesn't exist
- **Impact:** Audit logs store undefined values
- **Fix:** Use `user.profile?.fullName || user.email`

---

## 📊 DATA STORAGE BY ROLE

| Role | Where Stored | Field Name | Status |
|------|--------------|-----------|--------|
| **Doctor** | DoctorProfile | fullName | ✅ Correct |
| **Hospital Admin** | HospitalProfile | adminName | ✅ Stored, ❌ Display broken |
| **Donor (Simple)** | ❌ NOWHERE | N/A | ❌ LOST |
| **Donor (PublicUser)** | PublicUser | fullName | ✅ Stored, ⚠️ Key mismatch |
| **Public User** | PublicUser | fullName | ✅ Correct |

---

## 🔗 KEY FILES

### Backend Models
- User.js - NO name fields
- DoctorProfile.js - fullName ✅
- HospitalProfile.js - adminName ✅
- PublicUser.js - fullName ✅
- DonorCredential.js - stores email only

### Backend Auth
- authController.js - Registers users/doctors/hospitals/donors
- donorAuth.controller.js - Donor login (hospital-created)

### Frontend Auth
- SignIn.js - Doctor/Hospital/Super admin login
- DonorSignin.js - Donor login (creates 'donorInfo' localStorage)
- PublicUserLogin.js - Public user login (⚠️ NOT FOUND)

### Frontend Display
- AdminDashboard.jsx - Shows 'Admin' (hardcoded)
- DoctorDashboard.js - Shows from profile ✅
- PublicDashboard.js - Reads 'user' key
- DonorManagement.jsx - Uses fallbacks: fullName || name || email

---

## 🔍 JWT TOKEN

**Current Content:**
```javascript
{ userId, role }
```

**Missing:**
```javascript
{ displayName, email, profile }  // Not included
```

**Status:** Minimal but adequate (profiles fetched via API)

---

## 📋 INCONSISTENT FIELD NAMING

Frontend code tries multiple variations:
- `user.fullName`
- `user.name`
- `user.displayName`
- `user.email` (fallback)
- `profile?.fullName`
- `profile?.adminName`

**Root Cause:** Backend uses `fullName` but frontend unsure what field names exist

---

## ✅ CORRECT FLOWS

### Doctor Flow ✓
1. Sign up → Store DoctorProfile.fullName
2. Login → Return profile.fullName
3. Dashboard → Display profile.fullName
4. Status: CONSISTENT

### Hospital Admin Flow ✓ (Partial)
1. Sign up → Store HospitalProfile.adminName
2. Login → Return profile.adminName
3. Dashboard → **HARDCODED 'Admin'** ❌
4. Status: STORED CORRECTLY, DISPLAY BROKEN

---

## ❌ BROKEN FLOWS

### Donor Simple Signup ✗
1. Sign up → Accept name in form
2. **NAME NOT STORED** ❌
3. Login → No name in response
4. Dashboard → Falls back to 'User' ❌
5. Status: BROKEN

### Donor Hospital-Created ✗
1. Hospital admin creates → Store PublicUser.fullName ✓
2. Donor login → Response has fullName ✓
3. Frontend stores as 'donorInfo' ✓
4. Dashboard reads 'user' key ❌
5. Status: RIGHT DATA, WRONG KEY

---

## 🎯 FIXES NEEDED

### Fix 1: Store Simple Donor Name
```javascript
// Option: Create DonorProfile for simple donors too
const donorProfile = new DonorProfile({
  userId: user._id,
  fullName: name,
  // other fields...
});
```

### Fix 2: Standardize localStorage
```javascript
// All login endpoints should do:
localStorage.setItem('user', JSON.stringify({
  id: user.id,
  email: user.email,
  role: user.role,
  displayName: profile?.fullName || profile?.adminName
}));
```

### Fix 3: Update Admin Dashboard
```javascript
// Fetch actual name instead of hardcoding
const response = await authAPI.getProfile();
setUserName(response.data?.profile?.adminName || 'Admin');
```

### Fix 4: Fix Crisis Logs
```javascript
// Replace user.name with safe access
const userName = user.profile?.fullName || 
                 user.profile?.adminName || 
                 user.email || 
                 'Unknown';
```

---

## 📍 ALL PLACES USER NAMES ARE DISPLAYED/USED

### Backend (API Responses)
1. `/auth/login` - Returns profile.fullName (doctor) or profile.adminName (hospital)
2. `/auth/profile` - Returns profile with name
3. `/donor-auth/login/password` - Returns donorInfo.fullName
4. `/donor-auth/login/otp` - Returns donorInfo.fullName

### Frontend (Component Displays)
1. DoctorDashboard - Uses profile.fullName ✅
2. AdminDashboard - Hardcoded 'Admin' ❌
3. PublicDashboard - Uses user.fullName (from localStorage)
4. DonorManagement - Uses d.fullName || d.name || d.email
5. DonationCertificate - Uses donorName (stored in certificate itself)
6. CommunityPage - Uses comment.userName (source unknown)
7. CrisisEngines - References user.name ❌

### localStorage
1. 'token' - Stored by all auth flows
2. 'user' - Expected by PublicDashboard (not always set!)
3. 'donorInfo' - Stored by DonorSignin (not read by PublicDashboard!)

---

## SEVERITY RATING

| Issue | Severity | Users Affected |
|-------|----------|---|
| Simple donor name lost | 🔴 HIGH | Anyone who signs up as donor directly |
| localStorage key mismatch | 🔴 HIGH | Donors see 'User' instead of name |
| Admin name hardcoded | 🟠 MEDIUM | Hospital admins |
| Crisis user.name undefined | 🔴 HIGH | Audit trail quality |
| Frontend field confusion | 🟡 LOW | Defensive but works OK |

