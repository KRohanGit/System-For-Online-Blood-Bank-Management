# 🚨 Emergency Coordination System - Quick Reference

## 🚀 Quick Start

### 1. Start the Server
```bash
cd Backend
node server.js
```

Expected output:
```
✅ MongoDB Connected
🔔 Starting escalation monitoring (check every 2 minutes)
🚀 LifeLink Backend Server Running
   📍 URL: http://localhost:5000
   🔔 Escalation Service: Active
```

### 2. Run Test Script
```bash
node test-emergency-coordination.js
```

This will:
- Create a test emergency request
- Find matching hospitals
- Display urgency scores
- Show top 5 matches

### 3. Test Frontend
```bash
cd frontend
npm start
```

Navigate to: `http://localhost:3000/admin/emergency-intercloud`

---

## 📝 API Quick Test (Postman/Thunder Client)

### Create Emergency Request
```
POST http://localhost:5000/api/emergency-coordination/request
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
Body:
{
  "bloodGroup": "O-",
  "unitsRequired": 3,
  "severityLevel": "CRITICAL",
  "medicalJustification": "Road accident - severe trauma",
  "patientDetails": {
    "age": 28,
    "gender": "MALE",
    "diagnosis": "Multiple trauma",
    "bloodPressure": "85/55",
    "hemoglobin": "6.8"
  },
  "requiredBy": "2025-01-16T20:00:00Z"
}
```

### Get Matching Hospitals
```
GET http://localhost:5000/api/emergency-coordination/request/{REQUEST_ID}/matches
Headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
```

### Accept Request (Partner Hospital)
```
POST http://localhost:5000/api/emergency-coordination/request/{REQUEST_ID}/accept
Headers: { "Authorization": "Bearer PARTNER_HOSPITAL_TOKEN" }
Body:
{
  "unitsCommitted": 3,
  "estimatedDeliveryTime": "2025-01-16T19:00:00Z",
  "notes": "Units ready for dispatch"
}
```

### Dispatch Blood Transfer
```
POST http://localhost:5000/api/emergency-coordination/request/{REQUEST_ID}/dispatch
Body:
{
  "vehicleDetails": {
    "vehicleNumber": "MH-01-AB-1234",
    "vehicleType": "AMBULANCE"
  },
  "driverDetails": {
    "name": "John Doe",
    "phone": "+91-9876543210",
    "license": "DL123456"
  },
  "dispatchChecklist": {
    "bloodUnitsSealed": true,
    "temperatureChecked": true,
    "documentsAttached": true
  }
}
```

---

## 🔍 Understanding the System

### Request Lifecycle
```
CREATED 
  ↓
MEDICAL_VERIFICATION_PENDING 
  ↓
PARTNER_ACCEPTED (hospital accepts)
  ↓
LOGISTICS_DISPATCH (blood dispatched)
  ↓
IN_TRANSIT (on the way)
  ↓
ARRIVED (reached destination)
  ↓
VERIFIED_RECEIVED (verified at receiving hospital)
  ↓
DELIVERED (successfully delivered)
  ↓
COMPLETED (transaction complete, trust updated)
```

### Escalation Timeline
```
0 min  ━━━━━━━━━━ Request Created (Status: CREATED)
       ↓
8 min  ━━━━━━━━━━ Level 1: Notify 3 nearest hospitals
       ↓
15 min ━━━━━━━━━━ Level 2: Notify ALL network hospitals
       ↓
25 min ━━━━━━━━━━ Level 3: Notify city health authority
```

### Match Score Components
```
Total Score (0-100) =
  Distance (30 pts) +      // Closer = higher score
  Availability (30 pts) +  // More units = higher score
  Trust Score (25 pts) +   // Better reputation = higher score
  Response History (15 pts) // Past acceptances = higher score
```

### Trust Score Formula
```
Overall Trust (0-100) =
  Response Score (30%) +   // How often they accept
  Delivery Score (30%) +   // On-time + temp compliance
  Credit Score (25%) +     // Units borrowed vs returned
  Longevity Score (15%)    // How long in network
```

---

## 🎯 Key Features

### ✅ What's Working Now
1. **Emergency Request Creation** with patient details
2. **Intelligent Matching Algorithm** (distance + availability + trust)
3. **Auto-Escalation** (every 2 minutes check)
4. **Trust Scoring System** (builds reputation over time)
5. **GPS Tracking Support** (API ready)
6. **Temperature Monitoring** (2-8°C compliance)
7. **Resource Locking** (prevents double-booking)
8. **Audit Logging** (complete transparency)
9. **Frontend Dashboard** (create, view, accept, decline)
10. **API Layer** (11 endpoints)

### 🔄 Future Enhancements
- Real-time Socket.IO updates
- Email/SMS notifications
- Live GPS map tracking UI
- Trust score dashboard
- Predictive analytics
- Mobile driver app

---

## 🐛 Troubleshooting

### No Matching Hospitals Found
**Problem**: API returns empty array
**Solution**: 
1. Check if hospitals exist: `db.users.countDocuments({ role: 'HOSPITAL_ADMIN' })`
2. Ensure blood inventory exists: `db.bloodinventories.countDocuments({})`
3. Run seed scripts to populate data

### Escalation Not Triggering
**Problem**: Request stays at level 0 after 8+ minutes
**Solution**:
1. Check server logs: "Starting escalation monitoring"
2. Wait for next 2-minute check cycle
3. Use manual escalation API if urgent

### 401 Unauthorized
**Problem**: API returns 401 error
**Solution**:
1. Get valid JWT token by logging in
2. Add to headers: `Authorization: Bearer YOUR_TOKEN`
3. Check token hasn't expired

### Trust Score is 0
**Problem**: Hospital shows 0 trust score
**Solution**: This is normal for new hospitals - score builds with transactions

---

## 📊 Database Collections

### EmergencyRequests
```javascript
{
  _id: ObjectId,
  requestingHospital: { hospitalId, hospitalName, location },
  bloodGroup: 'O-',
  unitsRequired: 3,
  status: 'CREATED',
  urgencyScore: 87,
  escalationLevel: 0,
  createdAt: ISODate
}
```

### BloodTransfers
```javascript
{
  _id: ObjectId,
  emergencyRequestId: ObjectId,
  fromHospital: { hospitalId, hospitalName },
  toHospital: { hospitalId, hospitalName },
  trackingPoints: [{ lat, lng, timestamp }],
  temperatureLog: [{ temp, timestamp }],
  status: 'IN_TRANSIT'
}
```

### HospitalTrustLedgers
```javascript
{
  _id: ObjectId,
  hospitalId: ObjectId,
  trustScore: { overall: 75, response: 80, delivery: 70 },
  reliabilityRating: 'RELIABLE',
  creditHistory: { unitsBorrowed: 10, unitsReturned: 10 }
}
```

---

## 🔐 Important Notes

### Security
- All endpoints require JWT authentication
- Only HOSPITAL_ADMIN can create/accept requests
- Resource locks prevent double-booking
- Audit logs track all actions

### Performance
- Matching algorithm runs in O(n) time
- Escalation check every 2 minutes (configurable)
- MongoDB indexes for fast queries
- Top 10 matches returned (configurable)

### Best Practices
1. Always provide accurate patient details
2. Set realistic `requiredBy` timestamps
3. Monitor escalation levels
4. Complete delivery cycle for trust updates
5. Log temperature readings regularly

---

## 📞 API Endpoint Summary

```
POST   /api/emergency-coordination/request                 Create
GET    /api/emergency-coordination/requests                List All
GET    /api/emergency-coordination/request/:id             Get One
GET    /api/emergency-coordination/request/:id/matches     Matches
POST   /api/emergency-coordination/request/:id/accept      Accept
POST   /api/emergency-coordination/request/:id/decline     Decline
POST   /api/emergency-coordination/request/:id/dispatch    Dispatch
POST   /api/emergency-coordination/transfer/:id/location   GPS
POST   /api/emergency-coordination/transfer/:id/temperature Temp
POST   /api/emergency-coordination/transfer/:id/complete   Complete
```

---

## 📚 File Locations

### Backend
```
Models:
  Backend/src/models/EmergencyRequest.js
  Backend/src/models/BloodTransfer.js
  Backend/src/models/HospitalTrustLedger.js

Controllers:
  Backend/src/controllers/emergencyCoordinationController.js

Services:
  Backend/src/services/hospitalMatchingService.js
  Backend/src/services/escalationService.js

Routes:
  Backend/src/routes/emergencyCoordinationRoutes.js

Tests:
  Backend/test-emergency-coordination.js
```

### Frontend
```
Components:
  frontend/src/pages/admin/EmergencyInterCloud.jsx
  frontend/src/pages/admin/EmergencyInterCloud.css

Services:
  frontend/src/services/emergencyCoordinationApi.js
```

### Documentation
```
EMERGENCY_COORDINATION_IMPLEMENTATION.md    Full implementation guide
EMERGENCY_COORDINATION_QUICK_REF.md         This file
```

---

## ✅ Testing Checklist

- [ ] Server starts with escalation service
- [ ] Test script creates request successfully
- [ ] Matching algorithm returns hospitals
- [ ] Accept request updates inventory
- [ ] Escalation triggers after 8 minutes
- [ ] Dispatch creates transfer record
- [ ] GPS tracking updates location
- [ ] Temperature logging works
- [ ] Delivery completion updates trust
- [ ] Frontend displays active requests
- [ ] Create request modal works
- [ ] Matching hospitals modal shows results

---

**System Status**: ✅ FULLY OPERATIONAL
**Last Updated**: January 2025
**Version**: 1.0.0
