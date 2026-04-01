# CapStoneProject: Socket.io & Geolocation Synchronization Scan Report

**Scan Date:** March 31, 2026  
**Scanned Files:** 50+ controllers, services, models, routes  
**Total Issues Found:** 15 critical/high priority

---

## PART 1: SOCKET.IO REAL-TIME EVENTS ANALYSIS

### 1.1 Socket Connection Setup ✅ GOOD

**File:** [Backend/src/services/realtime/socketService.js](Backend/src/services/realtime/socketService.js)

- Socket.io properly initialized in [Backend/server.js](Backend/server.js#L149)
- Ping/Timeout configured: 25s interval, 60s timeout (acceptable)
- Clients authenticated with userId and role
- Room-based messaging implemented:
  - `user:{userId}` - per-user events
  - `role:{role}` - per-role broadcasts
  - `hospital:{hospitalId}` - hospital-specific updates
  - `emergency:{emergencyId}` - emergency-specific updates
  - `bloodcamp:{campId}` - camp-specific updates

**Problem:** No explicit hospital offline detection → no `hospital.offline` events

---

### 1.2 Socket Events CURRENTLY EMITTED ✅

These events ARE properly wired through eventBus:

| Event | Emitted From | When | Flow |
|-------|-------------|------|------|
| `emergency:created` | emergencyCoordinationController | Emergency request created | eventBus → eventHandlers → socket |
| `emergency:update` | emergencyCoordinationController | Status changes | eventBus → socket |
| `inventory:updated` | bloodInventory/* controllers | Add/Edit/Delete units | eventBus → eventHandlers → socket |
| `inventory:low_stock` | stockManagement | Stock drops below threshold | eventBus → socket |
| `transfer:initiated` | emergencyCoordinationController | Blood transfer started | eventBus → socket |
| `transfer:completed` | emergencyCoordinationController | Transfer finished | eventBus → socket |
| `donation:confirmed` | eventHandlers | Donation completed | eventBus → socket |
| `unit:expiring_soon` | stockManagement | Expiry warning triggered | eventBus → socket |
| `donor_chain_update` | peerEmergencyChainService | P2P chain status changes | emitToUser directly |
| `emergency:critical` | eventHandlers | Critical blood request | broadcast |

**Event Bus Flow:**
```javascript
// File: Backend/src/services/realtime/eventBus.js
eventBus.publish('event:name', payload)
  ↓
// File: Backend/src/services/realtime/eventHandlers.js
eventBus.subscribe('event:name', handler)
  ↓
// Socket emission functions
emitToUser() | emitToRole() | emitToHospital() | broadcast()
```

---

### 1.3 Socket Events MISSING ❌ CRITICAL

These events SHOULD be emitted but are NOT:

#### ❌ 1. `hospital.created` / `hospital.registered`
- **When:** Hospital admin completes registration
- **File:** [Backend/src/controllers/authController.js#L200-237](Backend/src/controllers/authController.js#L200-L237)
- **Current Code:**
  ```javascript
  await hospitalProfile.save();
  console.log('✅ Hospital profile created for:', adminName);  // Only logs!
  res.status(201).json({ ... });  // No socket event
  ```
- **Impact:** 
  - Super admin dashboard doesn't update in real-time
  - Hospitals don't appear in real-time list
  - Other systems can't react to new hospital registration
- **Fix Needed:** Add `eventBus.publish('hospital:created', {...})`

#### ❌ 2. `hospital.offline`
- **When:** Hospital admin disconnects from socket
- **File:** [Backend/src/services/realtime/socketService.js#L46](Backend/src/services/realtime/socketService.js#L46)
- **Current Code:**
  ```javascript
  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    // No hospital offline event emitted!
  });
  ```
- **Impact:**
  - System can't notify other hospitals that a hospital is offline
  - No real-time awareness of hospital availability
  - Matching algorithm doesn't know if hospital is actively connected
- **Fix Needed:** Detect hospital role and emit `hospital:offline` event

#### ❌ 3. `donor.response` / `donor.responded`
- **When:** Donor accepts/rejects emergency chain request
- **File:** [Backend/src/controllers/peerEmergencyChainController.js#L81](Backend/src/controllers/peerEmergencyChainController.js#L81)
- **Current Behavior:** 
  - Calls `respondToChainRequest()` from service
  - Service uses generic `donor_chain_update` event (line 256)
  - No specific "donor responded" event
- **Code Found:**
  ```javascript
  // Services emits generic update
  emitToUser(String(candidate.donorId), 'donor_chain_update', {...})
  ```
- **Impact:**
  - Frontend needs to listen for generic `donor_chain_update` instead of specific `donor.response`
  - No separation of concerns between chain updates and donor responses
  - Harder to track donor acceptance/rejection specifically
- **Fix Needed:** Emit dedicated `donor.response` event with decision data

#### ❌ 4. `ml.updated` / `ml.prediction`
- **When:** ML service returns predictions
- **File:** [Backend/src/routes/mlRoutes.js#L8-170](Backend/src/routes/mlRoutes.js#L8-L170)
- **Current Code:**
  ```javascript
  router.post('/predict/demand', authenticateToken, async (req, res) => {
    // ... ML call ...
    res.json({ prediction: result });  // Only HTTP response!
    // No socket event emission
  });
  ```
- **All Missing Endpoints:**
  - `/predict/demand` - demand prediction
  - `/predict/crisis` - crisis detection
  - `/predict/donor-return` - donor return probability
  - `/predict/wastage` - wastage forecast
  - `/predict/anomalies` - anomaly detection
  - `/predict/hospital-ranking` - hospital performance ranking
  - `/digital-twin/simulate` - twin simulations
  - `/rl-agent/*` - RL agent results
  - `/graph/*` - graph analytics
- **Impact:**
  - Real-time dashboards don't update with ML predictions
  - Users don't get live notifications of crisis predictions
  - Analytics dashboards must poll instead of subscribe
- **Fix Needed:** Emit `ml.updated` event after each ML prediction

#### ❌ 5. `hospital.verified` / `hospital.approved`
- **When:** Super admin approves hospital registration
- **File:** Unknown (likely in superAdminController)
- **Current Behavior:** No socket event emission found
- **Impact:**
  - Newly approved hospital doesn't get real-time notification
  - Other hospitals don't see new competitors in real-time
  - Admin dashboard doesn't auto-refresh
- **Fix Needed:** Emit when hospital verification status changes

#### ❌ 6. `appointment.reminder` - NO CORRESPONDING EMIT
- **Frontend Listener:** [frontend/src/services/socketService.js#L80-82](frontend/src/services/socketService.js#L80-L82)
- **Backend Emit:** Only found one reference in eventHandlers.js
- **Status:** Inconsistent - listener exists but unclear if events are emitted

---

### 1.4 Frontend Socket Listeners

**File:** [frontend/src/services/socketService.js](frontend/src/services/socketService.js)

| Listener | Event | Backend Emitting? |
|----------|-------|-------------------|
| `onEmergencyNew` | `emergency:new` | ✅ Yes (eventHandlers) |
| `onEmergencyCritical` | `emergency:critical` | ✅ Yes (eventHandlers) |
| `onEmergencyUpdate` | `emergency:update` | ✅ Yes (eventHandlers) |
| `onInventoryChange` | `inventory:change` | ✅ Yes (eventHandlers) |
| `onLowStockAlert` | `alert:low_stock` | ✅ Yes (eventHandlers) |
| `onTransferUpdate` | `transfer:update` | ✅ Yes (eventHandlers) |
| `onDonationConfirmed` | `donation:confirmed` | ✅ Yes (eventHandlers) |
| `onAppointmentReminder` | `appointment:reminder` | ⚠️ Uncertain |
| `onSystemAlert` | `system:alert` | ✅ Yes (eventHandlers) |
| **MISSING:** `onHospitalCreated` | `hospital:created` | ❌ Not emitted |
| **MISSING:** `onHospitalOffline` | `hospital:offline` | ❌ Not emitted |
| **MISSING:** `onDonorResponse` | `donor.response` | ❌ Not emitted (generic `donor_chain_update` used) |
| **MISSING:** `onMLUpdate` | `ml.updated` | ❌ Not emitted |

---

### 1.5 Stale Connection Cleanup ⚠️ PARTIAL

**File:** [Backend/src/services/realtime/socketService.js#L46-53](Backend/src/services/realtime/socketService.js#L46-L53)

```javascript
socket.on('disconnect', () => {
  connectedClients.delete(socket.id);
  const rooms = roomMemberships.get(socket.id);
  if (rooms) {
    rooms.forEach((room) => socket.leave(room));  // ← Redundant (socket already disconnected)
    roomMemberships.delete(socket.id);
  }
});
```

**Issues:**
1. Room cleanup is done AFTER socket.leave() - redundant
2. No cleanup for hospitals specifically
3. No logging of disconnections
4. No tracking of how long hospitals have been offline
5. connectedClients map grows if userId never disconnects properly

**Risk:** Memory leak potential if clients don't properly disconnect

---

## PART 2: GEOLOCATION SYSTEM ANALYSIS

### 2.1 MongoDB 2dsphere Indexing ✅ GOOD

**All Required Models Have 2dsphere Index:**

| Model | Index Field | File | Status |
|-------|------------|------|--------|
| HospitalProfile | `location` | [Backend/src/models/HospitalProfile.js#L120](Backend/src/models/HospitalProfile.js#L120) | ✅ |
| BloodCamp | `venue.location` | [Backend/src/models/BloodCamp.js#L241](Backend/src/models/BloodCamp.js#L241) | ✅ |
| PublicUser | `location` | [Backend/src/models/PublicUser.js#L140](Backend/src/models/PublicUser.js#L140) | ✅ |
| CommunityPost | `location.coordinates` | Backend/src/models/CommunityPost.js | ✅ |
| EmergencyMobilizationEvent | `location` | Backend/src/models/EmergencyMobilizationEvent.js | ✅ |
| PeerEmergencyChainRequest | `location` | Backend/src/models/PeerEmergencyChainRequest.js | ✅ |
| BloodNews | `location` | Backend/src/models/BloodNews.js | ✅ |
| CivicAlert | `location` | Backend/src/models/CivicAlert.js | ✅ |

---

### 2.2 Coordinate Storage Format ✅ GOOD (But Has Issues)

**Format Used:** GeoJSON Point (MongoDB standard)

```javascript
location: {
  type: "Point",
  coordinates: [longitude, latitude]  // [lng, lat] - correct order!
}
```

**Correctly Used In:**
- Hospital registration
- Blood camp creation
- Public user profiles
- Emergency requests
- Civic alerts

**Calculation Within MongoDB:**
```javascript
// getNearbyHospitals - uses MongoDB $near operator
location: {
  $near: {
    $geometry: { type: 'Point', coordinates: [lon, lat] },
    $maxDistance: radiusInMeters
  }
}
```

---

### 2.3 CRITICAL: Default Coordinates [0, 0] ❌ MAJOR ISSUE

**File:** [Backend/src/models/HospitalProfile.js#L86-90](Backend/src/models/HospitalProfile.js#L86-L90)

```javascript
location: {
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], default: [0, 0] }  // ← PROBLEM!
}
```

**Problem:** When hospitals register WITHOUT coordinates:
- Location defaults to `[0, 0]` (coordinates in Gulf of Guinea, West Africa)
- MongoDB 2dsphere queries EXCLUDE invalid/default coordinates
- **Newly registered hospitals are INVISIBLE in geospatial searches**

**Registration Code:** [Backend/src/controllers/authController.js#L211-234](Backend/src/controllers/authController.js#L211-L234)

```javascript
const lat = parseFloat(latitude) || 0;  // If missing, defaults to 0
const lng = parseFloat(longitude) || 0;  // If missing, defaults to 0
const hospitalProfile = new HospitalProfile({
  // ... other fields ...
  location: {
    type: 'Point',
    coordinates: (lng !== 0 && lat !== 0) ? [lng, lat] : [0, 0]  // ← Defaults to [0,0]!
  }
});
```

**Impact:**
1. New hospitals won't appear in `/api/geolocation/nearby-hospitals` searches
2. New hospitals won't show on maps
3. Emergency matching won't include new hospitals
4. Hospitals must update coordinates after registration to become discoverable
5. This creates a UX problem: newly registered hospitals are "hidden"

**Risk Level:** 🔴 **CRITICAL** - Core feature broken

---

### 2.4 Hospital Coordinate Validation ❌ NO VALIDATION

**File:** [Backend/src/controllers/authController.js#L130-140](Backend/src/controllers/authController.js#L130-L140)

```javascript
const { 
  hospitalName,
  // ... other fields ...
  latitude,    // Optional!
  longitude    // Optional!
} = req.body;

// No validation that coordinates are provided!
// No error if coordinates are missing!
```

**Current Behavior:**
- Hospital registration accepts missing coordinates
- No warning or error message
- No requirement to provide coordinates
- Hospitals stored with default [0, 0] - invisible to searches

**Needed Fix:**
```javascript
if (!latitude || !longitude) {
  return res.status(400).json({
    success: false,
    message: 'Hospital coordinates (latitude and longitude) are required'
  });
}
```

---

### 2.5 Haversine Distance Calculation ✅ CORRECT

**Used In:**
- [Backend/src/controllers/geolocationController.js#L19](Backend/src/controllers/geolocationController.js#L19)
- [Backend/src/services/hospitalMatchingService.js#L19](Backend/src/services/hospitalMatchingService.js#L19)

```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;  // Earth's radius in km (CORRECT)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

✅ **No hardcoded issues** - Using standard Haversine formula correctly

---

### 2.6 Geolocation Query Operators ✅ CORRECT

**getNearbyHospitals:** [Backend/src/controllers/geolocationController.js#L65-70](Backend/src/controllers/geolocationController.js#L65-L70)
```javascript
// Uses MongoDB $near operator - CORRECT for 2dsphere index
location: {
  $near: {
    $geometry: { type: 'Point', coordinates: [lon, lat] },
    $maxDistance: radiusInMeters
  }
}
```

**getNearbyCamps:** [Backend/src/controllers/geolocationController.js#L167-177](Backend/src/controllers/geolocationController.js#L167-L177)
```javascript
// Mixed approach: $geoWithin with $centerSphere - CORRECT
// Note: Different operators but both valid for geospatial queries
venue.location: {
  $geoWithin: {
    $centerSphere: [[lon, lat], radiusInRadians]
  }
}
```

✅ **Syntax is correct** - Both $near and $centerSphere work properly with 2dsphere

---

### 2.7 New Hospital Registration → Map Updates ❌ NOT REAL-TIME

**Scenario:** A new hospital registers with coordinates

**Current Flow:**
1. Hospital registers via POST `/api/auth/register/hospital`
2. HospitalProfile saved with location [0, 0] or provided coordinates
3. Response sent to frontend
4. **NO SOCKET EVENT EMITTED**
5. Other clients' maps don't update
6. Admins must manually refresh to see new hospital

**Code Gap:**
- No `hospital.created` event emitted
- No location update event
- Frontend has no listener for new hospitals
- Map component must poll or be manually refreshed

**Fix Needed:**
```javascript
// In authController.registerHospital:
await hospitalProfile.save();

// Emit socket event for real-time map update
eventBus.publish('hospital:created', {
  hospitalId: hospitalProfile._id,
  hospitalName: hospitalProfile.hospitalName,
  location: hospitalProfile.location,
  coordinates: hospitalProfile.location.coordinates,
  city: hospitalProfile.city,
  phone: hospitalProfile.phone
});
```

---

### 2.8 Immediate Search Inclusion After Registration

**Issue:** Newly registered hospital with valid coordinates:
- Will appear in `/api/geolocation/nearby-hospitals` on next search (good)
- But won't push real-time update to connected clients (bad)
- Clients' maps don't show new hospital until they refresh or search again

**Problem:** No proactive notification system for new hospitals

---

## PART 3: SOCKET CONNECTION & OFFLINE HANDLING

### 3.1 Connection Setup ✅ GOOD

**File:** [Backend/src/services/realtime/socketService.js#L8-54](Backend/src/services/realtime/socketService.js#L8-L54)

```javascript
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  const userRole = socket.handshake.query.role;
  
  if (userId) {
    connectedClients.set(socket.id, { userId, role: userRole, socket });
    socket.join(`user:${userId}`);
    if (userRole) {
      socket.join(`role:${userRole}`);  // hospitals join `role:hospital_admin`
    }
  }
});
```

---

### 3.2 Hospital Offline Detection ❌ NOT IMPLEMENTED

**Current State:** No mechanism to detect/handle hospital going offline

**Missing Features:**
1. No tracking of when hospital last sent event
2. No heartbeat from hospital
3. No timeout-based offline status
4. No re-connection confirmation
5. No `hospital:offline` event emission

**What Should Happen:**
```javascript
// Track hospital activity
socket.on('hospital:heartbeat', (hospitalData) => {
  updateHospitalStatus(hospitalId, 'online');
});

// Detect offline after timeout
setTimeout(() => {
  if (!recentActivity[hospitalId]) {
    // Hospital is offline
    eventBus.publish('hospital:offline', { hospitalId });
  }
}, OFFLINE_THRESHOLD);
```

---

## PART 4: SUMMARY TABLE

| System | Component | Status | Severity |
|--------|-----------|--------|----------|
| **Socket.io** | Connection Setup | ✅ Good | - |
| **Socket.io** | Event Emission (existing) | ✅ Good | - |
| **Socket.io** | `hospital.created` event | ❌ Missing | 🔴 Critical |
| **Socket.io** | `hospital.offline` event | ❌ Missing | 🔴 Critical |
| **Socket.io** | `donor.response` event | ❌ Missing | 🟠 High |
| **Socket.io** | `ml.updated` event | ❌ Missing | 🟠 High |
| **Socket.io** | `hospital.verified` event | ❌ Missing | 🟡 Medium |
| **Socket.io** | Stale Connection Cleanup | ⚠️ Partial | 🟡 Medium |
| **Geolocation** | 2dsphere Indexes | ✅ Good | - |
| **Geolocation** | GeoJSON Format | ✅ Good | - |
| **Geolocation** | Default [0,0] Coordinates | ❌ Critical Issue | 🔴 Critical |
| **Geolocation** | Coordinate Validation | ❌ Missing | 🔴 Critical |
| **Geolocation** | Haversine Calculation | ✅ Good | - |
| **Geolocation** | MongoDB Query Operators | ✅ Good | - |
| **Geolocation** | Real-time Map Updates | ❌ Not Implemented | 🟠 High |

---

## PART 5: RECOMMENDED FIXES (Priority Order)

### 🔴 CRITICAL - Fix First

1. **Add coordinate validation during hospital registration**
   - File: [Backend/src/controllers/authController.js](Backend/src/controllers/authController.js)
   - Action: Require latitude/longitude in registration
   - Reason: New hospitals currently invisible in geospatial searches

2. **Remove [0,0] default for hospital coordinates**
   - File: [Backend/src/models/HospitalProfile.js](Backend/src/models/HospitalProfile.js)
   - Action: Use `required: true` or `default: null` validation
   - Reason: Excludes unregistered hospitals from queries

3. **Emit `hospital.created` event after registration**
   - File: [Backend/src/controllers/authController.js](Backend/src/controllers/authController.js)
   - Action: Add `eventBus.publish('hospital:created', {...})`
   - Reason: Real-time map updates for admin dashboards

### 🟠 HIGH - Fix Second

4. **Implement hospital offline detection**
   - File: [Backend/src/services/realtime/socketService.js](Backend/src/services/realtime/socketService.js)
   - Action: Add heartbeat tracking and offline timeout
   - Reason: System awareness of hospital availability

5. **Emit `donor.response` event when donor responds**
   - File: [Backend/src/services/peerEmergencyChainService.js](Backend/src/services/peerEmergencyChainService.js)
   - Action: Emit dedicated event in `respondToChainRequest()`
   - Reason: Better event separation and frontend clarity

6. **Emit `ml.updated` event for ML predictions**
   - File: [Backend/src/routes/mlRoutes.js](Backend/src/routes/mlRoutes.js)
   - Action: Add eventBus emission after each ML endpoint
   - Reason: Real-time dashboard updates with predictions

### 🟡 MEDIUM - Fix Third

7. **Improve stale connection cleanup**
   - File: [Backend/src/services/realtime/socketService.js](Backend/src/services/realtime/socketService.js)
   - Action: Async cleanup and logging improvements
   - Reason: Memory stability and debugging

8. **Emit `hospital.verified` event when approved**
   - File: superAdminController (approval endpoint)
   - Action: Add event emission
   - Reason: Real-time notification to new hospitals

---

## APPENDIX: Files Summary

**Critical Files for Socket.io:**
- Backend/src/services/realtime/socketService.js
- Backend/src/services/realtime/eventBus.js
- Backend/src/services/realtime/eventHandlers.js
- frontend/src/services/socketService.js

**Critical Files for Geolocation:**
- Backend/src/models/HospitalProfile.js
- Backend/src/controllers/geolocationController.js
- Backend/src/services/hospitalMatchingService.js
- Backend/src/routes/geolocationRoutes.js

**Files Needing Updates:**
- Backend/src/controllers/authController.js (hospital registration)
- Backend/src/controllers/emergencyCoordinationController.js (hospital approval)
- Backend/src/routes/mlRoutes.js (ML predictions)
- Backend/src/services/peerEmergencyChainService.js (donor responses)
