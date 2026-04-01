# 🛠️ SYSTEM AUDIT - DETAILED FIX INSTRUCTIONS

## PHASE 1 FIXES: REMOVE HARDCODED/DUMMY DATA

### Fix 1.1: Remove Crisis Engine Mock State

**File:** `frontend/src/services/crisis/crisisEngines.js`

**Current (Lines 19-56):** Contains hardcoded inventory, patient queue, surgeries

**Action:** Replace mock state with dynamic queries to MongoDB

```javascript
// BEFORE: Lines 19-56 hardcoded state
const mockHospitalState = {
  'O+': { current: 45, safe: 50, ... },
  erQueue: [
    { patient_id: 'ER-001', triage_level: 1, ... },
    ...
  ],
  surgeries: [...],
  ...
};

// AFTER: Fetch from database
async function getHospitalCrisisState(hospitalId) {
  const inventory = await BloodInventory.find(
    { hospitalId },
    { bloodGroup: 1, unitsAvailable: 1 }
  );
  
  const emergencies = await EmergencyRequest.find(
    { affectedHospitalIds: hospitalId, status: { $in: ['pending', 'active'] } }
  );
  
  // Return dynamic state instead of mock
  return formatCrisisState(inventory, emergencies);
}
```

**Files to Modify:**
- `frontend/src/services/crisis/crisisEngines.js` - Remove lines 19-56
- `Backend/src/services/crisisService.js` - Add dynamic state query (if doesn't exist)

---

### Fix 1.2: Remove Emergency Mock Data Service

**File:** `frontend/src/services/emergencyMockData.js`

**Action:** Delete or deprecate this file. Replace with API calls.

```javascript
// BEFORE: emergencyMockData.js
export const mockEmergencies = [
  { id: 'EMG001', hospital: 'Apollo', ...},
  ...
];

// AFTER: Call real API
export async function getEmergencies() {
  const response = await api.get('/emergency/requests');
  return response.data;
}
```

**Update Components Using This:**
- Search for `emergencyMockData` imports
- Replace with API calls to `/api/emergency/requests`

---

### Fix 1.3: Remove Demand Forecast Hardcoded Data

**File:** `frontend/src/pages/admin/ml/DemandForecastPage.jsx`

**Lines 24-68:** Hardcoded array of forecast data

**Action:** Fetch from ML service instead

```javascript
// BEFORE: Lines 24-68
const BASE_FORECAST = [
  { date: '2026-03-25', predicted_units: 42 },
  ...
];

// AFTER: Fetch from API
useEffect(() => {
  const fetchForecast = async () => {
    try {
      const response = await mlAPI.predictDemand(hospitalId, bloodGroup,7);
      setForecast(response.data.forecast);
    } catch (error) {
      console.error('Forecast fetch failed:', error);
    }
  };
  fetchForecast();
}, [hospitalId, bloodGroup]);
```

**Replace Lines 24-68 with dynamic fetch**

---

### Fix 1.4: Remove Waste Risk Mock Hospitals

**File:** `frontend/src/components/bloodInventory/WasteRiskIndicator.jsx`

**Lines 64-67:** Hardcoded hospital list

**Action:** Query nearby hospitals from API

```javascript
// BEFORE: Lines 64-67  
const nearbyHospitals = [
  { id: 1, name: 'City General', distance: '2.3 km' },
  ...
];

// AFTER: Query from API
const [nearbyHospitals, setNearbyHospitals] = useState([]);

useEffect(() => {
  const fetchNearby = async () => {
    const response = await api.get('/geolocation/nearby-hospitals', {
      params: { lat: userLat, lng: userLng, radius: 5 }
    });
    setNearbyHospitals(response.data);
  };
  fetchNearby();
}, []);
```

---

### Fix 1.5: Remove Wastage Risk Mock Data

**File:** `frontend/src/pages/admin/ml-intelligence/wastage-risk/mockData.js`

**Lines 1-170:** 45 mock blood units, 200 mock transactions

**Action:** Delete or archive. Move to test fixtures directory.

```bash
# Archive mock data
mv frontend/src/pages/admin/ml-intelligence/wastage-risk/mockData.js \
   frontend/__test_fixtures__/wastage-risk-mockData.js
```

**Update Imports:** Search for imports of mockData and replace with API calls

---

### Fix 1.6: Disable/Remove Development Seed Files

**Files:** All Backend/seed-*.js files

**Action:** Prevent these from running in production

**In Backend/package.json**, update scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "echo 'Seed disabled in production. Contact admin.'",
    "seed:dev-only": "node seed-hospitals.js && node seed-geolocation-data.js"
  }
}
```

---

## PHASE 2 FIXES: USER DATA CONSISTENCY

### Fix 2.1: Add Name Field to User Schema

**File:** `Backend/src/models/User.js`

**Current:** No name field

**Action:** Add name field to schema

```javascript
// After isVerified field, add:
name: {
  type: String,
  required: [true, 'User name is required'],
  trim: true,
  minlength: [2, 'Name must be at least 2 characters'],
  maxlength: [100, 'Name must not exceed 100 characters']
},
email: {
  type: String,
  required: [true, 'Email is required'],
  unique: true,
  lowercase: true,
  trim: true,
  match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
},
```

**Also update toJSON method:**

```javascript
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  // Keep name in response (always safe to show)
  if (process.env.SHOW_PASSWORDS !== 'true') {
    delete user.password;
  }
  return user;
};
```

---

### Fix 2.2: Store Donor Name in Registration

**File:** `Backend/src/controllers/authController.js`

**Lines: 469 where User is created**

**Before:**
```javascript
const user = new User({
  email: email.toLowerCase(),
  password,
  role: 'donor',
  isVerified: true
});
```

**After:**
```javascript
const user = new User({
  email: email.toLowerCase(),
  password,
  role: 'donor',
  isVerified: true,
  name: name  // ADD THIS LINE
});
```

---

### Fix 2.3: Fix localStorage Key Consistency

**File:** `frontend/src/pages/auth/DonorSignin.jsx`

**Change:** Store with key `'user'` instead of `'donorInfo'`

```javascript
// BEFORE
localStorage.setItem('donorInfo', JSON.stringify(userData));

// AFTER
localStorage.setItem('user', JSON.stringify(userData));
```

**Also Update:** Any other files using `donorInfo`

```bash
grep -r "localStorage.*donorInfo" frontend/src/
# Update all to use 'user' key
```

---

### Fix 2.4: Fix Admin Dashboard User Display

**File:** `frontend/src/pages/admin/AdminDashboard.jsx`

**Find:** The line showing `{hospitalAdminName || 'Admin'}`

**Replace with:**

```javascript
// Fetch from API instead of relying on state
const [adminName, setAdminName] = useState('');

useEffect(() => {
  const fetchHospitalProfile = async () => {
    try {
      const response = await api.get('/api/hospital/profile');
      setAdminName(response.data.adminName || 'Hospital Admin');
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setAdminName('Hospital Admin');
    }
  };
  fetchHospitalProfile();
}, []);

// In render:
<span>{adminName}</span>  // No hardcoded fallback
```

---

### Fix 2.5: Update JWT Token to Include Name

**File:** `Backend/src/controllers/authController.js`

**Find:** `generateToken` function calls

**Before:**
```javascript
const token = generateToken({
  userId: user._id,
  role: user.role
});
```

**After:**
```javascript
const token = generateToken({
  userId: user._id,
  role: user.role,
  name: user.name  // ADD THIS
});
```

---

## PHASE 3 FIXES: REAL-TIME SOCKET EVENTS

### Fix 3.1: Emit hospital.created Event

**File:** `Backend/src/controllers/authController.js`

**Find:** `registerHospital` function

**After hospital is saved and verified, add:**

```javascript
// In registerHospital function, after hospital.save():
const io = require('socket.io')();  // Get socket instance

// Emit hospital creation event
globalIO.emit('hospital.created', {
  hospitalId: hospital._id,
  hospitalName: hospital.hospitalName,
  location: hospital.location,
  coordinates: hospital.location.coordinates,
  timestamp: new Date()
});

// User sees updated hospital list/map in real-time
```

**Also in:** Any other place hospital is created/updated

---

### Fix 3.2: Emit hospital.offline Event

**File:** `Backend/src/services/realtime/socketService.js`

**Add Hospital Offline Detector:**

```javascript
// Add to socket service
io.on('connection', (socket) => {
  const hospitalId = socket.handshake.auth.hospitalId;
  
  socket.on('disconnect', () => {
    // Mark hospital as offline in cache/DB
    updateHospitalAvailability(hospitalId, 'offline');
    
    // Emit offline event to all connected clients
    io.emit('hospital.offline', {
      hospitalId,
      timestamp: new Date()
    });
    
    console.log(`Hospital ${hospitalId} went offline`);
  });
  
  socket.on('reconnect', () => {
    updateHospitalAvailability(hospitalId, 'online');
    io.emit('hospital.online', { hospitalId, timestamp: new Date() });
  });
});
```

---

### Fix 3.3: Emit ML Results as Socket Events

**File:** `Backend/src/routes/mlRoutes.js`

**For each ML prediction endpoint, add:**

```javascript
router.post('/predict/demand', authenticateToken, async (req, res) => {
  try {
    const result = await mlService.predictDemand(...);
    
    // Emit to connected dashboard users
    const io = require('socket.io')();
    io.emit('ml.demand-predicted', {
      hospitalId,
      result,
      timestamp: new Date()
    });
    
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable' });
  }
});
```

---

## PHASE 4 FIXES: GEOLOCATION

### Fix 4.1: Remove Default Coordinates [0, 0]

**File:** `Backend/src/models/HospitalProfile.js`

**Find:** `coordinates` field definition (around line 87)

**Before:**
```javascript
coordinates: {
  type: [Number],  // [longitude, latitude]
  default: [0, 0]
}
```

**After:**
```javascript
coordinates: {
  type: [Number],
  required: [true, 'Hospital coordinates are required for geo-location'],
  validate: {
    validator: v => v && v[0] !== 0 && v[1] !== 0,
    message: 'Invalid coordinates. Cannot use [0, 0]'
  }
},
```

---

### Fix 4.2: Validate Coordinates During Registration

**File:** `Backend/src/controllers/authController.js`

**In registerHospital, add validation:**

```javascript
const registerHospital = async (req, res) => {
  try {
    const { latitude, longitude, ...otherData } = req.body;
    
    // VALIDATE coordinates before saving
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Hospital location (latitude & longitude) is required'
      });
    }
    
    if (latitude === 0 || longitude === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Latitude and longitude cannot be 0'
      });
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates out of valid geographic range'
      });
    }
    
    // Create hospital with validated coordinates
    const hospital = new HospitalProfile({
      ...otherData,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]  // [lon, lat] for GeoJSON
      }
    });
    
    // ... rest of registration
  }
};
```

---

### Fix 4.3: Emit hospital.created Socket Event

**Already covered in Phase 3.1** - Will make hospitals visible on maps in real-time

---

## PHASE 5-10 FIXES: VALIDATION & CONSISTENCY

### Fix 5.1: API Response Format Standardization

**Create consistent response format:**

**File:** `Backend/src/utils/responseFormatter.js` (NEW FILE)

```javascript
// Standardized response format
const formatSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const formatError = (res, message, statusCode = 400, error = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined
  });
};

module.exports = { formatSuccess, formatError };
```

**Use in all route handlers:**

```javascript
// BEFORE: Inconsistent
res.json(data);
res.status(400).json({ message: 'Error' });

// AFTER: Consistent
formatSuccess(res, data);
formatError(res, 'Error occurred', 400);
```

---

### Fix 6.1: Consistent Auth Middleware

**Audit all routes** and ensure protected endpoints have `auth` middleware

```bash
grep -r "router\\..*(" Backend/src/routes/ | grep -v auth | head -20
# Check each route - if it should be protected, add auth middleware
```

**Pattern:**

```javascript
// BEFORE: Missing auth
router.post('/update-profile', updateProfile);

// AFTER: Protected
router.post('/update-profile', authenticateToken, updateProfile);
```

---

### Fix 7.1: Orphaned Record Prevention

**File:** `Backend/src/models/BloodInventory.js`

**Add foreign key constraint:**

```javascript
const inventorySchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: [true, 'Hospital ID is required']
  },
  // ... other fields
}, {
  timestamps: true
});

// Add index for orphan cleanup
inventorySchema.index({ hospitalId: 1 });
```

**Add deletion cascade:**

```javascript
// In HospitalProfile.js - when hospital deleted, clean up inventory
hospitalSchema.pre('findByIdAndDelete', async function(next) {
  await BloodInventory.deleteMany({ hospitalId: this._id });
  next();
});
```

---

### Fix 9.1: Remove SHOW_PASSWORDS from Tokens

**File:** `Backend/src/utils/tokenUtils.js` (or wherever JWT is generated)

**REMOVE:**
```javascript
// DELETE THIS - DON'T INCLUDE IN TOKENS
showPasswords: process.env.SHOW_PASSWORDS === 'true'
```

**Keep secure:**
```javascript
const token = jwt.sign({
  userId: user._id,
  role: user.role,
  name: user.name,
  email: user.email
  // NO passwords, NO SHOW_PASSWORDS flag
}, process.env.JWT_SECRET, { expiresIn: '24h' });
```

---

### Fix 10.1: Clean Up Console Errors

**Search codebase:**

```bash
grep -r "console\\.error\\|console\\.warn" Backend/src/ | grep -v "catch"
# Review each and either:
# 1. Fix the underlying issue
# 2. Add proper error handling
```

**Handle undefined safely:**

```javascript
// BEFORE: Can cause errors
user.name  // What if user is null?

// AFTER: Safe
const userName = user?.name || 'Unknown User';
```

---

## VERIFICATION CHECKLIST

After applying fixes, verify:

- [ ] No hardcoded data in production builds
- [ ] Donor names stored and displayed
- [ ] localStorage key consistent (`user`)
- [ ] Hospital coordinates validated and non-zero
- [ ] Socket events emitted for new hospitals
- [ ] hospital.offline event detected
- [ ] Real-time map updates working
- [ ] No [0, 0] coordinates in database
- [ ] API responses have consistent format
- [ ] All protected routes have auth middleware
- [ ] User name shown in all dashboards
- [ ] No seed files run in production
- [ ] Database clean (no test data remaining)
- [ ] Console errors cleared
- [ ] SHOW_PASSWORDS flag removed from tokens

---

## TESTING COMMANDS

```bash
# Test user consistency
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test hospital creation
curl -X POST http://localhost:5000/api/auth/register/hospital \
  -H "Content-Type: application/json" \
  -d '{
    "hospitalName": "Test Hospital",
    "latitude": 17.3850,
    "longitude": 78.4867,
    ...
  }'

# Verify coordinates stored (not [0, 0])
db.hospitalprofiles.findOne({ _id: "hospital-id" })

# Test geolocation
curl -X GET "http://localhost:5000/api/geolocation/nearby-hospitals?lat=17.3850&lng=78.4867"

# Test socket emission
io.emit('hospital.created', {...})  // Should broadcast to all connected clients
```

---

## ROLLBACK PLAN

If issues occur:

1. **User schema change:** Revert User.js schema to previous state
2. **Seed data:** Clear database and reseed with production data
3. **Socket changes:** Disable new socket events, revert to old behavior
4. **Geolocation:** Re-enable [0, 0] default temporarily

All fixes are backward compatible and can be rolled back safely.

---

**Estimated Application Time:** 4-6 hours  
**Test Coverage Needed:** Full end-to-end testing required before deployment
