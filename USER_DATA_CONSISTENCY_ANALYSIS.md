# User Data Consistency Analysis - CapStoneProject

**Date:** March 31, 2026  
**Scope:** Backend user models, auth flow, JWT tokens, and frontend displays

---

## SUMMARY OF FINDINGS

### ⚠️ CRITICAL ISSUES FOUND:
1. **Donor name data loss during registration** - Name provided in signup form is never stored
2. **Inconsistent field naming** - Multiple name field variations (fullName, name, firstName)
3. **Frontend/Backend mismatch** - Frontend tries to display `user.name` that doesn't exist
4. **JWT token missing user identity** - Only contains userId and role, no name data
5. **Donor localStorage key inconsistency** - Different keys used across login flows

---

## 1. USER SIGNUP/AUTH FLOW

### 1.1 Doctor Registration
**File:** [Backend/src/controllers/authController.js](Backend/src/controllers/authController.js#L9-L120)

#### What's stored:
- **User collection:** `email`, `password`, `role: 'doctor'`, `isVerified`
- **DoctorProfile collection:** `fullName` (from req.body.name), `hospitalName`, `userId`

#### Data flow on signup:
```javascript
const { email, password, name, hospitalName } = req.body;  // Line 11
// ...
const doctorProfile = new DoctorProfile({
  userId: user._id,
  fullName: name,  // ✅ Name stored in DoctorProfile, NOT in User
  hospitalName,
  // ...
});
```

#### Response to frontend:
```javascript
data: {
  token,
  user: { id, email, role, isVerified },  // ❌ NO NAME HERE
  profile: {
    fullName: doctorProfile.fullName,  // ✅ NAME IN PROFILE
    hospitalName,
    verificationStatus
  }
}
```

---

### 1.2 Hospital/Admin Registration
**File:** [Backend/src/controllers/authController.js](Backend/src/controllers/authController.js#L123-L270)

#### What's stored:
- **User collection:** `email`, `password`, `role: 'hospital_admin'`, `isVerified`
- **HospitalProfile collection:** `adminName`, `hospitalName`, `officialEmail`, `userId`

#### Data flow:
```javascript
const { hospitalName, officialEmail, licenseNumber, adminName, adminEmail, password } = req.body;
// ...
const hospitalProfile = new HospitalProfile({
  userId: user._id,
  adminName,  // ✅ Admin name in HospitalProfile
  hospitalName,
  // ...
});
```

#### Response to frontend:
```javascript
profile: {
  hospitalName,
  adminName: hospitalProfile.adminName,  // ✅ NAME AVAILABLE
  verificationStatus
}
```

---

### 1.3 Donor Registration
**File:** [Backend/src/controllers/authController.js](Backend/src/controllers/authController.js#L429-L498)

#### What's stored:
- **User collection:** `email`, `password`, `role: 'donor'`, `isVerified: true`
- **NO profile collection created for simple donor registration**

#### Data flow:
```javascript
const { email, password, name, bloodType, phone, address } = req.body;  // Line 431
// ...
const user = new User({
  email,
  password,
  role: 'donor',
  isVerified: true
});
// ❌ NAME NOT STORED ANYWHERE!
```

#### Response to frontend:
```javascript
data: {
  token,
  user: { id, email, role, isVerified }  // ❌ NO NAME FIELD
}
```

#### **ISSUE: Name parameter is accepted but NEVER STORED**

---

### 1.4 Donor Created by Hospital
**File:** [Backend/src/controllers/hospitalController.js](Backend/src/controllers/hospitalController.js#L119-L200)

#### What's stored:
- **PublicUser collection:** `fullName`, `email`, `password`, `bloodGroup`, `phone`, `role: 'PUBLIC_USER'`
- **DonorCredential collection:** links donor to hospital, stores `email` only

#### Data flow:
```javascript
const donor = new PublicUser({
  fullName: donorName,  // ✅ Stored in PublicUser
  email,
  phone,
  password,
  bloodGroup,
  role: 'PUBLIC_USER',
  verificationStatus: 'verified'
});

const credential = new DonorCredential({
  donorId: donor._id,
  hospitalId: req.user._id,
  email,
  // ❌ Name NOT stored in DonorCredential
});
```

---

### 1.5 Login Flow
**File:** [Backend/src/controllers/authController.js](Backend/src/controllers/authController.js#L271-L360)

#### JWT Token Generated:
**File:** [Backend/src/utils/jwt.js](Backend/src/utils/jwt.js#L9-L15)
```javascript
const generateToken = (payload, expiresIn = '1d') => {
  return jwt.sign(
    { userId: user._id, role: user.role },  // ❌ NO NAME INFO
    process.env.JWT_SECRET,
    { expiresIn }
  );
};
```

#### Login Response:
```javascript
res.status(200).json({
  success: true,
  message: 'Login successful',
  data: {
    token,
    user: { id, email, role, isVerified },  // ❌ NO NAME
    profile: profile ? {
      ...(user.role === 'doctor' ? {
        fullName: profile.fullName,  // ✅ Available for doctor
        hospitalName
      } : {
        hospitalName,
        adminName: profile.adminName  // ✅ Available for hospital
      })
    } : null  // ❌ NULL for donors!
  }
});
```

---

## 2. USER DISPLAY CONSISTENCY ISSUES

### 2.1 Frontend - PublicDashboard
**File:** [frontend/src/pages/public/PublicDashboard.js](frontend/src/pages/public/PublicDashboard.js#L1-L50)

```javascript
const user = JSON.parse(localStorage.getItem('user') || '{}');
setUserName(user.fullName || user.name || 'User');  // Line 23
// Tries THREE different field names: fullName, name, 'User' fallback
```

**Issues:**
- ❌ Expects `fullName` or `name` fields in localStorage
- ❌ localStorage key is `'user'` but not all login flows set this
- ✅ Falls back to 'User' if not found

---

### 2.2 Frontend - DonorSignin.js
**File:** [frontend/src/landing_page/auth/DonorSignin.js](frontend/src/landing_page/auth/DonorSignin.js#L99-L102)

```javascript
localStorage.setItem('token', response.data.data.token);
localStorage.setItem('donorInfo', JSON.stringify(response.data.data.donor));  // Different key!
```

**Issues:**
- ❌ Uses key `'donorInfo'` instead of `'user'`
- ❌ PublicDashboard expects `'user'` key, not `'donorInfo'`

---

### 2.3 Frontend - Admin Dashboard username display
**File:** [frontend/src/pages/admin/AdminDashboard.jsx](frontend/src/pages/admin/AdminDashboard.jsx#L1-L50)

```javascript
const [userName, setUserName] = useState('Admin');  // Default fallback
```

**Issues:**
- ❌ Always defaults to 'Admin', never fetches actual user name
- ❌ No attempt to display actual hospital admin name

---

### 2.4 Frontend - DonorManagement component
**File:** [frontend/src/pages/admin/DonorManagement.jsx](frontend/src/pages/admin/DonorManagement.jsx#L37-L50)

```javascript
setDonors(donorList.map(d => ({
  id: d._id || d.id,
  name: d.fullName || d.name || d.email,  // ❌ Multiple fallbacks needed
  email: d.email || '',
  // ...
})));
```

**Issues:**
- ❌ Tries THREE different field names: `fullName`, `name`, `email`
- ✅ Falls back to email if no name available

---

### 2.5 Frontend - Donor credentials return
**File:** [Backend/src/controllers/donorAuth.controller.js](Backend/src/controllers/donorAuth.controller.js#L164-L180)

```javascript
donor: {
  id: donor._id,
  email: donor.email,
  fullName: donor.fullName,  // ✅ Provided
  bloodGroup: donor.bloodGroup
}
```

**Issues:**
- ✅ Provides fullName for PublicUser donors
- ❌ But this uses key `'donorInfo'` in localStorage, not `'user'`

---

### 2.6 Frontend - CrisisEngines using user.name
**File:** [frontend/src/services/crisis/crisisEngines.js](frontend/src/services/crisis/crisisEngines.js#L392)

```javascript
taken_by: { user_id: user.id, name: user.name, role: user.role }  // ❌
acknowledged_by: user.name  // ❌
```

**Issues:**
- ❌ Expects `user.name` field that doesn't exist
- ❌ Will fail if user object doesn't have name property

---

### 2.7 Frontend - useHospitalRole hook
**File:** [frontend/src/hooks/useHospitalRole.js](frontend/src/hooks/useHospitalRole.js#L39)

```javascript
name: payload.name || payload.username || 'Unknown User'  // ❌
```

**Issues:**
- ❌ JWT payload only contains userId and role (not name or username)
- ✅ Falls back to 'Unknown User'

---

## 3. MODEL SCHEMA ANALYSIS

### 3.1 User Model
**File:** [Backend/src/models/User.js](Backend/src/models/User.js#L1-L40)

Fields stored:
- ✅ `email`
- ✅ `password`
- ✅ `role` (enum: super_admin, hospital_admin, doctor, donor)
- ✅ `isVerified`
- ✅ `createdAt`, `updatedAt`
- ❌ **NO NAME FIELDS**

---

### 3.2 DoctorProfile Model
**File:** [Backend/src/models/DoctorProfile.js](Backend/src/models/DoctorProfile.js#L1-L50)

Fields stored:
- ✅ `userId` (reference to User)
- ✅ `fullName` (required)
- ✅ `specialization`
- ✅ `affiliatedHospitals`
- ✅ `hospitalName` (legacy field)

**Naming:** Uses `fullName` ✅

---

### 3.3 HospitalProfile Model
**File:** [Backend/src/models/HospitalProfile.js](Backend/src/models/HospitalProfile.js#L1-L50)

Fields stored:
- ✅ `userId` (reference to User)
- ✅ `adminName` (required)
- ✅ `hospitalName`
- ✅ `adminEmail`
- ✅ `officialEmail`

**Naming:** Uses `adminName` ✅

---

### 3.4 PublicUser Model (for donors created by hospitals)
**File:** [Backend/src/models/PublicUser.js](Backend/src/models/PublicUser.js#L1-L50)

Fields stored:
- ✅ `fullName` (required)
- ✅ `email`
- ✅ `phone`
- ✅ `password`
- ✅ `bloodGroup`
- ✅ `role: 'PUBLIC_USER'`
- ✅ `verificationStatus`

**Naming:** Uses `fullName` ✅

---

### 3.5 DonorCredential Model
**File:** [Backend/src/models/DonorCredential.js](Backend/src/models/DonorCredential.js#L1-L30)

Fields stored:
- ✅ `donorId` (reference to PublicUser)
- ✅ `hospitalId` (reference to User)
- ✅ `email`
- ✅ `otpHash`
- ✅ `isVerified`
- ✅ `mustChangePassword`
- ❌ **NO NAME FIELD** (relies on foreign key to PublicUser)

---

## 4. DATA FLOW MAPPING BY ROLE

### 4.1 DOCTOR Flow
```
Frontend: Signup with (email, password, name, hospitalName)
    ↓
Backend: createUser(email, password, role='doctor')
         createDoctorProfile(userId, fullName=name, hospitalName)
    ↓
Response: { user: {id, email, role}, profile: {fullName, hospitalName} }
    ↓
Frontend: Stores token, does NOT store user object
    ↓
Frontend: On dashboard, calls getProfile() which returns:
         { user: {id, email, role}, profile: {fullName, hospitalName} }
    ↓
Display: Uses profile.fullName ✅
```

**Status:** ✅ CONSISTENT

---

### 4.2 HOSPITAL_ADMIN Flow
```
Frontend: Signup with (email, password, adminName, hospitalName, adminEmail, ...)
    ↓
Backend: createUser(email=adminEmail, password, role='hospital_admin')
         createHospitalProfile(userId, adminName, hospitalName, ...)
    ↓
Response: { user: {id, email, role}, profile: {adminName, hospitalName} }
    ↓
Frontend: Stores token
    ↓
Frontend: On dashboard, getProfile() returns:
         { user: {id, email, role}, profile: {adminName, hospitalName} }
    ↓
Display: AdminDashboard defaults to 'Admin' (❌ doesn't use profile.adminName)
```

**Status:** ⚠️ PARTIALLY CONSISTENT (display issue)

---

### 4.3 DONOR (Simple Signup) Flow
```
Frontend: Signup with (email, password, name, bloodGroup, phone, address)
    ↓
Backend: createUser(email, password, role='donor', isVerified=true)
         ❌ NAME NOT STORED ANYWHERE
    ↓
Response: { user: {id, email, role, isVerified} }  // ❌ NO NAME
    ↓
Frontend: Stores token
    ↓
Frontend: PublicDashboard tries: localStorage.getItem('user')
         But 'user' key was NEVER SET
    ↓
Display: Falls back to default 'User' ❌
```

**Status:** ❌ BROKEN - Name is lost

---

### 4.4 DONOR (Hospital-Created) Flow
```
Hospital Admin: Creates donor with (email, password, donorName, phone, bloodGroup)
    ↓
Backend: createPublicUser(fullName=donorName, email, phone, blood, role='PUBLIC_USER')
         createDonorCredential(donorId, hospitalId, email)
    ↓
Returns: Temp password and OTP
    ↓
Donor Login: loginWithPassword(email, password)
    ↓
Backend donorAuth controller: Returns {token, donor: {id, email, fullName, bloodGroup}}
    ↓
Frontend DonorSignin: localStorage.setItem('donorInfo', donor_data)
    ↓
Frontend PublicDashboard: Tries to read localStorage.getItem('user')
                         ❌ WRONG KEY! Should be 'donorInfo'
    ↓
Display: Falls back to default 'User' ❌
```

**Status:** ❌ BROKEN - Wrong localStorage key

---

### 4.5 PUBLIC_USER Flow (via PublicUserLogin)
```
Public User: Registers with (email, password, fullName, phone, bloodGroup, ...)
    ↓
Backend: createPublicUser(fullName, email, password, phone, bloodGroup, role='PUBLIC_USER')
    ↓
Response: Returns token and user data
    ↓
Frontend: Should store in localStorage.setItem('user', userData)
         ❓ Need to verify where this happens
    ↓
Frontend PublicDashboard: localStorage.getItem('user')
         Expects: user.fullName or user.name
    ↓
Display: Uses user.fullName if available
```

**Status:** ⚠️ UNCLEAR - Need to find PublicUserLogin implementation

---

## 5. INCONSISTENT FIELD NAMING

| Entity | Name Field | Location |
|--------|-----------|----------|
| User | ❌ None | Base User model |
| DoctorProfile | `fullName` | Backend stores, frontend displays |
| HospitalProfile | `adminName` | Backend stores, frontend IGNORES |
| PublicUser | `fullName` | Backend stores, frontend inconsistent |
| JWT Token | ❌ None | Only userId, role |
| localStorage | Varies | 'user' vs 'donorInfo' |

---

## 6. KEY INCONSISTENCIES FOUND

### Issue #1: Simple Donor Signup Name Lost
- **Where:** Backend `/auth/register/donor`
- **Problem:** Name parameter accepted but never stored
- **Impact:** Donors who sign up directly lose their name
- **Files:** 
  - [authController.js line 431](Backend/src/controllers/authController.js#L431)
  - [User model](Backend/src/models/User.js)
- **Fix Needed:** Either store name in User model OR create DonorProfile like doctors

---

### Issue #2: Hospital Admin Name Not Displayed
- **Where:** Frontend Admin Dashboard
- **Problem:** Always shows 'Admin' instead of actual admin name
- **Files:**
  - [AdminDashboard.jsx line 22](frontend/src/pages/admin/AdminDashboard.jsx#L22)
- **Why:** SetUserName default state is 'Admin', never fetches profile data
- **Fix Needed:** Fetch and display `profile.adminName` on dashboard load

---

### Issue #3: Donor localStorage Key Mismatch
- **Where:** Donor signin and dashboard
- **Problem:** DonorSignin stores as 'donorInfo', PublicDashboard reads 'user'
- **Files:**
  - [DonorSignin.js line 102](frontend/src/landing_page/auth/DonorSignin.js#L102)
  - [PublicDashboard.js line 22](frontend/src/pages/public/PublicDashboard.js#L22)
- **Impact:** Donors see 'User' instead of their name on dashboard
- **Fix Needed:** Use consistent key name (recommend 'user' for all)

---

### Issue #4: JWT Token Missing User Identity
- **Where:** All auth endpoints
- **Problem:** JWT only has userId and role, no name data
- **Files:** [jwt.js](Backend/src/utils/jwt.js)
- **Impact:** Backend services can't identify user by name from token
- **Note:** This is OK if profiles are always populated via API calls

---

### Issue #5: Frontend Expects Multiple Name Fields
- **Where:** Various frontend files
- **Problem:** Code tries `fullName || name || username || email` fallbacks
- **Files:**
  - [PublicDashboard.js line 23](frontend/src/pages/public/PublicDashboard.js#L23)
  - [DonorManagement.jsx line 47](frontend/src/pages/admin/DonorManagement.jsx#L47)
  - [crisisEngines.js line 392](frontend/src/services/crisis/crisisEngines.js#L392)
- **Impact:** Defensive coding but indicates schema uncertainty
- **Cause:** Backend uses `fullName` consistently but frontend unsure

---

### Issue #6: CrisisEngines References Non-Existent user.name
- **Where:** Crisis audit logging
- **Problem:** Uses `user.name` which doesn't exist in any user object
- **Files:** [crisisEngines.js lines 392, 550, 562](frontend/src/services/crisis/crisisEngines.js)
- **Impact:** Will store undefined/null audit records
- **Fix Needed:** Use user.profile?.fullName or user.email as fallback

---

## 7. RECOMMENDATIONS

### Priority 1: Fix Donor Name Storage
**Issue:** Simple donors lose name on registration
```javascript
// In authController.js registerDonor():
// Option A: Store name in User (breaking change to User schema)
const user = new User({
  email,
  password,
  role: 'donor',
  isVerified: true,
  displayName: name  // ADD THIS
});

// Option B: Create DonorProfile like doctors (preferred)
const donor = new DonorProfile({
  userId: user._id,
  fullName: name,
  // ...
});
```

### Priority 2: Standardize localStorage Keys
```javascript
// All login flows should use same key:
localStorage.setItem('user', {
  id: user.id,
  email: user.email,
  role: user.role,
  fullName: profile?.fullName || profile?.adminName
});
```

### Priority 3: Update Admin Dashboard
```javascript
// In AdminDashboard.jsx - fetch actual name:
const fetchProfile = async () => {
  const response = await authAPI.getProfile();
  const adminName = response.data?.profile?.adminName;
  setUserName(adminName || 'Admin');
};
```

### Priority 4: Fix Crisis Engine References
```javascript
// Replace user.name with:
const userName = user.profile?.fullName || 
                 user.profile?.adminName || 
                 user.email || 
                 'Unknown';
```

### Priority 5: Add Name to JWT Token (Optional)
**Note:** Not necessary if profile is always fetched via API

---

## 8. PLACES WHERE USER NAMES ARE DISPLAYED

| Location | Field Used | Status |
|----------|-----------|--------|
| Doctor Dashboard | profile.fullName | ✅ Correct |
| Admin Dashboard | 'Admin' (hardcoded) | ❌ Broken |
| Donor Dashboard | Falls back to 'User' | ⚠️ Usually missing |
| Public Dashboard | user.fullName or 'User' | ⚠️ Depends on localStorage |
| Donor Management Table | d.fullName \|\| d.name \|\| d.email | ⚠️ Defensive |
| DonationCertificate | donorName (stored separately) | ✅ Correct |
| Emergency Crisis Logs | user.name (undefined!) | ❌ Broken |
| Community Comments | comment.userName | ? Unknown source |

---

## 9. SUMMARY TABLE

| Aspect | Doctor | Hospital Admin | Donor (Simple) | Donor (PublicUser) | Public User |
|--------|--------|---|---|---|---|
| **Where Stored** | DoctorProfile.fullName | HospitalProfile.adminName | ❌ NOWHERE | PublicUser.fullName | PublicUser.fullName |
| **Field Name** | fullName | adminName | N/A | fullName | fullName |
| **In User Model** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **In JWT** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Login Response** | ✅ Yes (profile) | ✅ Yes (profile) | ❌ No | ✅ Yes (donorInfo) | ? Unknown |
| **localStorage Key** | token only | token only | token only | 'donorInfo' | 'user'? |
| **Dashboard Display** | ✅ Correct | ❌ Hardcoded 'Admin' | ⚠️ Falls back 'User' | ⚠️ Wrong key | ✅ Correct |

---

## CONCLUSION

**Overall Status:** ⚠️ **PARTIALLY INCONSISTENT**

- ✅ Doctors and Hospital Admins: Names stored and displayed correctly
- ❌ Simple Donors: Names accepted but not stored
- ⚠️ Hospital-Created Donors: Names stored but localStorage key mismatch
- ⚠️ Display Logic: Multiple fallback patterns indicate uncertainty
- ❌ Crisis System: References undefined user.name field

**Most Critical Issues:**
1. Simple donor names are lost during registration
2. localStorage keys are inconsistent ('user' vs 'donorInfo')
3. Admin dashboard hardcodes 'Admin' instead of using actual name
