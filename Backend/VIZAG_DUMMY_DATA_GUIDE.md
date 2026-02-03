# Visakhapatnam (Vizag) Hospital Dummy Data Setup

## Overview
This project includes comprehensive dummy data using **Visakhapatnam (Vizag) hospitals** to demonstrate all system features. The dummy data appears automatically when the database is empty, allowing you to showcase the system without needing real data.

---

## 🏥 Vizag Hospitals Included

### 1. **King George Hospital (KGH)**
- **Address**: Maharani Peta, Visakhapatnam, Andhra Pradesh 530002
- **Phone**: +91 891 256 2555
- **Blood Inventory**: 155 units (A+: 45, O+: 38, B+: 28, AB+: 15, A-: 8, O-: 12, B-: 6, AB-: 3)
- **Type**: Government Hospital (Largest in Vizag)

### 2. **Apollo Hospital Visakhapatnam**
- **Address**: Waltair Main Road, Visakhapatnam, Andhra Pradesh 530002
- **Phone**: +91 891 254 0000
- **Blood Inventory**: 98 units (A+: 28, O+: 25, B+: 18, AB+: 10, A-: 5, O-: 7, B-: 3, AB-: 2)
- **Type**: Private Multi-specialty Hospital

### 3. **GITAM Institute of Medical Sciences**
- **Address**: Rushikonda, Visakhapatnam, Andhra Pradesh 530045
- **Phone**: +91 891 280 5555
- **Blood Inventory**: 117 units (A+: 35, O+: 30, B+: 20, AB+: 12, A-: 6, O-: 8, B-: 4, AB-: 2)
- **Type**: Medical College & Hospital

### 4. **Seven Hills Hospital**
- **Address**: Rockdale Layout, Visakhapatnam, Andhra Pradesh 530002
- **Phone**: +91 891 278 4444
- **Blood Inventory**: 61 units (A+: 18, O+: 15, B+: 12, AB+: 6, A-: 3, O-: 4, B-: 2, AB-: 1)
- **Type**: Private Hospital

### 5. **Queen Mary Hospital**
- **Address**: Beach Road, Visakhapatnam, Andhra Pradesh 530001
- **Phone**: +91 891 256 1234
- **Blood Inventory**: 78 units (A+: 22, O+: 18, B+: 15, AB+: 8, A-: 4, O-: 6, B-: 3, AB-: 2)
- **Type**: Government Hospital

### 6. **Care Hospital Visakhapatnam**
- **Address**: Ramnagar, Visakhapatnam, Andhra Pradesh 530002
- **Phone**: +91 891 667 1000
- **Blood Inventory**: 70 units (A+: 20, O+: 17, B+: 14, AB+: 7, A-: 4, O-: 5, B-: 2, AB-: 1)
- **Type**: Private Multi-specialty Hospital

---

## 🚀 Quick Start: Seed Database with Vizag Data

### Option 1: Seed Hospitals Only
```bash
cd Backend
node seed-vizag-hospitals.js
```

This creates:
- 6 hospital user accounts
- 6 hospital profiles (all pre-approved)
- Realistic blood inventory for each hospital (580+ total units)

**Login Credentials Created:**
- KGH: `admin@kgh.gov.in` / `KGH@2026`
- Apollo: `vizag@apollohospitals.com` / `Apollo@2026`
- GITAM: `admin@gitam.edu` / `GITAM@2026`
- Seven Hills: `admin@sevenhills.in` / `SevenHills@2026`
- Queen Mary: `admin@queenmary.gov.in` / `QMH@2026`
- Care: `vizag@carehospitals.com` / `Care@2026`

### Option 2: Seed Emergency Scenario
```bash
cd Backend
node seed-vizag-emergency-scenario.js
```

This creates a realistic emergency scenario:
- **Incident**: NH-16 highway accident near Anakapalli
- **Location**: NH-16 Anakapalli Junction, Visakhapatnam
- **Casualties**: 45 (12 critical, 18 severe, 15 moderate)
- **Blood Demand**: ~130 units
- **Affected Hospitals**: KGH, GITAM Medical College

---

## 🎭 Automatic Dummy Data (No Seeding Required)

The system automatically shows dummy data when the database is empty:

### Doctor Dashboard
- **Emergency Alerts**: NH-16 accident at KGH, Post-transfusion reaction at Apollo
- **Blood Units for Validation**: 5 units from various Vizag hospitals
- **Emergency Consults**: 4 consults from KGH, Apollo, GITAM, Seven Hills
- **Blood Camps**: 3 upcoming camps at TCS Vizag, Rotary Club, GITAM University
- **Affiliated Hospitals**: KGH, Apollo, GITAM

### Emergency Intelligence Dashboard
- **Hospital Impacts**: Shows all 6 Vizag hospitals with distance from incident
- **Blood Inventory**: Realistic inventory levels per hospital
- **Risk Assessment**: Time to shortage, projected demand, risk levels
- **City Preparedness**: 65/100 score for Visakhapatnam

---

## 📊 Dummy Data Features

### Blood Units (Doctor Validation Page)
- **Unit IDs**: VZG-BU-001 to VZG-BU-005
- **Blood Groups**: O+, A+, B-, AB+, O-
- **Storage Types**: Whole Blood, Plasma, Red Cells, Platelets
- **Hospitals**: Distributed across all 6 Vizag hospitals
- **Expiry**: One unit expiring in 2 days (O- from Care Hospital)

### Emergency Consults (Doctor Consults Page)
- **VZG-EC-001**: NH-16 accident, KGH, Critical (O- needed, 4 units)
- **VZG-EC-002**: Post-partum hemorrhage, Apollo, Urgent (A+, 2 units)
- **VZG-EC-003**: Transfusion reaction, GITAM, Urgent (B+, 1 unit)
- **VZG-EC-004**: Ruptured ectopic, Seven Hills, Critical (AB+, 6 units)

### Blood Camps (Doctor Camp Oversight)
- **TCS SEZ Visakhapatnam**: 5 days away, 150 expected donors
- **Rotary Club MVP Colony**: 12 days away, 100 expected donors
- **GITAM University**: 18 days away, 250 expected donors (pre-approved)

### Emergency Scenario (Emergency Intelligence)
- **Type**: Traffic Accident
- **Location**: NH-16 near Anakapalli (25 km from city center)
- **Time Impact**:
  - KGH: 4.5 hours to shortage (HIGH risk)
  - GITAM: 6.2 hours to shortage (MEDIUM risk)
- **Recommendations**: 
  - Emergency donor mobilization
  - Inter-hospital blood transfers
  - Contact nearby blood banks

---

## 🎯 Demonstration Scenarios

### Scenario 1: Doctor Medical Validation
1. Login as a doctor
2. Navigate to "Validations" tab
3. See 5 blood units from Vizag hospitals needing review
4. Validate units with medical notes

### Scenario 2: Emergency Crisis Management
1. Login as super admin
2. Go to Emergency Intelligence Dashboard
3. See NH-16 accident scenario
4. View hospital impacts:
   - KGH: 25.3 km away, 4.5 hours to shortage
   - GITAM: 12.8 km away, 6.2 hours to shortage
5. Review recommendations and city preparedness score

### Scenario 3: Emergency Consultations
1. Login as doctor
2. Navigate to "Consults" tab
3. See 4 urgent/critical consults from Vizag hospitals
4. Review patient context and medical queries
5. Respond with medical advisory

### Scenario 4: Blood Camp Oversight
1. Login as doctor
2. Navigate to "Camps" tab
3. See 3 upcoming camps in Visakhapatnam
4. Review camp details (TCS, Rotary Club, GITAM)
5. Provide pre-camp medical oversight

---

## 🔄 Switching to Real Data

The system automatically detects when real data exists:

1. **Seed Real Hospitals**: Run `seed-vizag-hospitals.js` to add actual hospital data
2. **Real Data Takes Precedence**: Once seeded, real data replaces dummy data
3. **Seamless Transition**: No code changes needed
4. **Dummy Data IDs**: All start with `dummy-` for easy identification

---

## 📍 Geographic Data

All Vizag hospitals include accurate GPS coordinates:
- **KGH**: 17.7231°N, 83.3012°E
- **Apollo**: 17.7452°N, 83.3142°E
- **GITAM**: 17.7842°N, 83.3776°E
- **Seven Hills**: 17.7306°N, 83.3185°E
- **Queen Mary**: 17.7145°N, 83.3089°E
- **Care**: 17.7398°N, 83.3252°E

Emergency scenario location (NH-16 Anakapalli): 17.6869°N, 83.0041°E

---

## 🎨 UI/UX Benefits

### Consistent Experience
- All dummy data uses Vizag hospitals for brand consistency
- Easy to explain: "Let me show you how it works with Vizag hospitals"
- Real locations make demos more relatable

### Realistic Data
- Accurate addresses and phone numbers
- Realistic blood inventory levels
- Medically accurate scenarios (MVA, post-partum hemorrhage, transfusion reactions)
- Proper distance calculations from incident location

### Professional Presentation
- Government hospitals (KGH, Queen Mary) + Private hospitals (Apollo, Care, Seven Hills)
- Medical college (GITAM) for educational context
- Corporate + community + university camps for diversity

---

## 💡 Tips for Demonstration

1. **Start with Empty Database**: Shows automatic dummy data immediately
2. **Explain Vizag Context**: "These are real hospitals in Visakhapatnam, where I'm based"
3. **Walk Through Scenario**: NH-16 accident → Hospital impacts → Doctor consultations → Camp preparation
4. **Show Seeding**: Run `seed-vizag-hospitals.js` live to show database population
5. **Highlight Transition**: Point out how system switches from dummy to real data

---

## 🔧 Technical Details

### Dummy Data Location
- **Emergency Intelligence**: `Backend/src/controllers/emergencyIntelligenceController.js`
- **Doctor Dashboard**: `Backend/src/controllers/doctorClinicalController.js`
- **Hospital Model**: `Backend/src/models/HospitalProfile.js`
- **Seed Scripts**: `Backend/seed-vizag-*.js`

### Database Collections
- `users`: Hospital admin accounts
- `hospitalprofiles`: Hospital details with location
- `bloodinventories`: Blood units at each hospital
- `emergencyscenarios`: Crisis simulations

---

## 📞 Support

For questions about dummy data or seeding:
1. Check seed script output for details
2. View dummy IDs in responses (all start with `dummy-`)
3. Run `node seed-vizag-hospitals.js --help` for options

---

**Made with ❤️ for Visakhapatnam Blood Management System**
