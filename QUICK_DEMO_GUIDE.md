# 🎯 Quick Demo Guide - Vizag Hospital System

## 🚀 Start Demo (5 Steps)

### 1. Backend is Running ✅
```
Server: http://localhost:5000
Status: Connected to MongoDB
Dummy Data: Active (Vizag hospitals)
```

### 2. Test Dummy Data Endpoints

**Doctor Dashboard Overview:**
```
GET http://localhost:5000/api/doctor-clinical/overview
Authorization: Bearer <doctor-token>
```
**Shows**: Emergency alerts from KGH and Apollo Vizag

**Blood Units for Validation:**
```
GET http://localhost:5000/api/doctor-clinical/blood-units
```
**Shows**: 5 blood units (VZG-BU-001 to VZG-BU-005) from Vizag hospitals

**Emergency Consults:**
```
GET http://localhost:5000/api/doctor-clinical/consults
```
**Shows**: 4 consults from KGH, Apollo, GITAM, Seven Hills

**Blood Camps:**
```
GET http://localhost:5000/api/doctor-clinical/camps
```
**Shows**: 3 camps at TCS, Rotary Club, GITAM

**Emergency Scenarios:**
```
GET http://localhost:5000/api/emergency-intelligence/scenarios
```
**Shows**: Dummy scenarios with Vizag hospital impacts

---

## 🏥 Vizag Hospitals Included

| # | Hospital | Inventory | Phone |
|---|----------|-----------|-------|
| 1 | King George Hospital (KGH) | 155 units | +91 891 256 2555 |
| 2 | Apollo Hospital Vizag | 98 units | +91 891 254 0000 |
| 3 | GITAM Medical Sciences | 117 units | +91 891 280 5555 |
| 4 | Seven Hills Hospital | 61 units | +91 891 278 4444 |
| 5 | Queen Mary Hospital | 78 units | +91 891 256 1234 |
| 6 | Care Hospital Vizag | 70 units | +91 891 667 1000 |

**Total**: 579 blood units across all hospitals

---

## 📊 Seed Real Data (Optional)

### Seed All Vizag Hospitals
```bash
cd Backend
node seed-vizag-hospitals.js
```
**Creates**:
- 6 hospital accounts (with login credentials printed)
- 580+ blood inventory units
- Hospital profiles with GPS coordinates

### Seed Emergency Scenario
```bash
cd Backend
node seed-vizag-emergency-scenario.js
```
**Creates**:
- NH-16 highway accident scenario
- 45 casualties, 130+ units needed
- Hospital impact analysis for KGH and GITAM

---

## 🎭 Demo Scenarios

### Scenario 1: Doctor Medical Validation
**Story**: "Doctor needs to validate blood units before they can be used"

1. Show Doctor Dashboard
2. Click "Validations" tab
3. See 5 blood units from different Vizag hospitals
4. Point out:
   - One O- unit from Care Hospital expiring in 2 days
   - Different storage types (Whole Blood, Plasma, Platelets)
   - All from Visakhapatnam hospitals

### Scenario 2: Emergency Crisis Management
**Story**: "Major accident on NH-16 highway near Anakapalli"

1. Navigate to Emergency Intelligence Dashboard
2. Show NH-16 accident scenario
3. Point out:
   - 45 casualties from traffic accident
   - KGH (25km away): 4.5 hours to blood shortage
   - GITAM (12km away): 6.2 hours to shortage
4. Review recommendations:
   - Emergency donor mobilization
   - Inter-hospital transfers
   - Blood bank alerts

### Scenario 3: Emergency Consultations
**Story**: "Hospitals need urgent medical guidance from specialists"

1. Show Doctor Dashboard
2. Click "Consults" tab
3. Highlight critical consults:
   - **VZG-EC-001** (KGH): NH-16 accident victim, O- needed
   - **VZG-EC-004** (Seven Hills): Ruptured ectopic, surgery in progress
4. Point out patient context (BP, HR, clinical condition)

### Scenario 4: Blood Camp Planning
**Story**: "Upcoming blood donation camps need medical oversight"

1. Show Doctor Dashboard
2. Click "Camps" tab
3. Show 3 upcoming camps:
   - TCS Corporate (5 days away, 150 donors)
   - Rotary Club (12 days away, 100 donors)
   - GITAM University (18 days away, 250 donors, pre-approved)

---

## 🗣️ Demo Script

### Opening (30 seconds)
> "Let me show you our blood management system with actual Visakhapatnam hospitals. This is real data from KGH, Apollo, GITAM, and other major Vizag hospitals."

### Doctor Dashboard (2 minutes)
> "Here's the doctor clinical intelligence dashboard. You can see emergency alerts from KGH about the NH-16 accident casualties, and blood units awaiting validation from hospitals across Vizag."

### Emergency Intelligence (2 minutes)
> "This is our emergency crisis simulation engine. We've modeled a major highway accident near Anakapalli. The system calculates which hospitals will run out of blood first - KGH has only 4.5 hours before critical shortage."

### Blood Inventory (1 minute)
> "We track 579 blood units across all 6 major Vizag hospitals in real-time. You can see KGH has 155 units, Apollo has 98, and GITAM has 117."

### Closing (30 seconds)
> "Everything you're seeing is using dummy data that automatically appears when the database is empty. Once hospitals start adding real data, it seamlessly replaces the dummy data."

---

## 💡 Key Talking Points

### ✅ Local Context
- "All these hospitals are from Visakhapatnam"
- "NH-16 is the major highway connecting Vizag to other cities"
- "Anakapalli is a common accident hotspot"

### ✅ Realistic Data
- "Inventory levels match hospital sizes (KGH largest, Seven Hills smaller)"
- "GPS coordinates are accurate for distance calculations"
- "Emergency scenarios reflect real medical situations"

### ✅ Smart System
- "Dummy data appears automatically when database is empty"
- "Two commands to seed real hospital data"
- "System switches seamlessly from dummy to real data"

---

## 🔧 Troubleshooting

### Dummy Data Not Showing?
1. Check server logs: `✅ MongoDB Connected`
2. Verify empty database: No hospitals in `hospitalprofiles` collection
3. Clear browser cache and reload

### Want to Reset?
```bash
# Stop server
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Restart server (dummy data reappears if DB empty)
cd Backend
node server.js
```

### Seed Data Not Working?
```bash
# Check MongoDB connection
# Verify .env file has correct MONGODB_URI
# Run seed script again
node seed-vizag-hospitals.js
```

---

## 📁 Important Files

**Dummy Data Logic:**
- `Backend/src/controllers/emergencyIntelligenceController.js` (Lines 110-180)
- `Backend/src/controllers/doctorClinicalController.js` (Lines 60-800)

**Seed Scripts:**
- `Backend/seed-vizag-hospitals.js` (Hospital seeder)
- `Backend/seed-vizag-emergency-scenario.js` (Emergency seeder)

**Documentation:**
- `Backend/VIZAG_DUMMY_DATA_GUIDE.md` (Complete guide)
- `Backend/VIZAG_IMPLEMENTATION_SUMMARY.md` (Technical summary)

---

## 🎯 Success Criteria

✅ Backend server running on localhost:5000
✅ All API endpoints return Vizag hospital data
✅ Doctor dashboard shows Vizag emergency alerts
✅ Emergency intelligence shows hospital impacts
✅ Seed scripts create real hospital accounts
✅ System transitions from dummy to real data

---

## 📞 Need Help?

**Check Server Status:**
```bash
Get-Process | Where-Object {$_.ProcessName -eq "node"}
```

**View API Response:**
- Use Postman/Thunder Client
- Or browser: http://localhost:5000/api/doctor-clinical/overview

**Documentation:**
- Full guide: `VIZAG_DUMMY_DATA_GUIDE.md`
- Technical summary: `VIZAG_IMPLEMENTATION_SUMMARY.md`

---

**Demo Ready!** 🚀
All systems operational with Vizag hospital dummy data.
