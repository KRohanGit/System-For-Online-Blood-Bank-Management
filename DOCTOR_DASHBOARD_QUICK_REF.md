# Doctor Dashboard Quick Reference

## File Structure
```
frontend/src/
├── pages/doctor/
│   ├── DoctorDashboard.js          [Main dashboard with tabs]
│   └── DashboardStats.js           [Statistics cards]
│
├── components/doctor/
│   ├── BloodRequestValidation.js   [Blood request validation]
│   ├── DonorScreening.js           [Donor eligibility screening]
│   ├── BloodUnitValidation.js      [Blood unit safety validation]
│   ├── AdverseReactions.js         [Reaction logging]
│   ├── CampOversight.js            [Camp medical oversight]
│   ├── EmergencyActions.js         [Emergency fast-track]
│   ├── MedicalNotes.js             [Medical notes & audit]
│   ├── AlertsPanel.js              [Real-time alerts]
│   │
│   ├── cards/
│   │   ├── RequestCard.js
│   │   ├── DonorCard.js
│   │   ├── BloodUnitCard.js
│   │   ├── ReactionCard.js
│   │   ├── CampCard.js
│   │   ├── EmergencyCard.js
│   │   └── NoteCard.js
│   │
│   ├── modals/
│   │   ├── ValidationModal.js
│   │   ├── DonorScreeningModal.js
│   │   ├── UnitValidationModal.js
│   │   ├── ReactionModal.js
│   │   ├── CampValidationModal.js
│   │   ├── EmergencyApprovalModal.js
│   │   └── NoteModal.js
│   │
│   └── common/
│       └── FilterBar.js
│
├── services/
│   └── doctorApi.js                [All API calls]
│
└── styles/
    ├── DoctorDashboard.css
    ├── DashboardStats.css
    ├── BloodRequestValidation.css
    ├── DonorScreening.css
    ├── BloodUnitValidation.css
    ├── AdverseReactions.css
    ├── CampOversight.css
    ├── EmergencyActions.css
    ├── MedicalNotes.css
    ├── AlertsPanel.css
    └── [Card & Modal CSS files]

Backend/src/routes/
└── doctorRoutes.js                 [16 new endpoints added]
```

## API Endpoints

### GET /api/doctor/dashboard/stats
Returns: emergencyRequests, pendingRequests, donorsToScreen, unitsToValidate, recentReactions, upcomingCamps

### GET /api/doctor/blood-requests
Query params: status, bloodGroup, isEmergency
Returns: { requests: [] }

### POST /api/doctor/blood-requests/:id/validate
Body: decision, medicalNotes, compatibilityCheck, alternativeRecommendations

### GET /api/doctor/donors/screening
Query params: bloodGroup, status
Returns: { donors: [] }

### POST /api/doctor/donors/:id/screen
Body: eligibilityDecision, deferralReason, deferralPeriod, medicalNotes

### GET /api/doctor/blood-units/validation
Query params: bloodGroup, status
Returns: { units: [] }

### POST /api/doctor/blood-units/:id/validate
Body: validationDecision, labTestReview, qualityAssessment, medicalNotes

### GET /api/doctor/adverse-reactions
Query params: severity, dateFrom, dateTo
Returns: { reactions: [] }

### POST /api/doctor/adverse-reactions
Body: donorId, donorName, bloodUnitNumber, reactionType, severity, symptoms, actionTaken, unitMarkedUnsafe, medicalNotes

### GET /api/doctor/camps/oversight
Query params: status, dateFrom, dateTo
Returns: { camps: [] }

### POST /api/doctor/camps/:id/validate
Body: medicalValidation, medicalStaffAssessment, emergencySupportReview, safetyEquipmentCheck, medicalNotes

### GET /api/doctor/emergency-requests
Returns: { emergencies: [] }

### POST /api/doctor/emergency-requests/:id/fast-track
Body: fastTrackApproval, priorityLevel, medicalJustification, specialInstructions

### GET /api/doctor/medical-notes
Query params: entityType, dateFrom, dateTo
Returns: { notes: [] }

### POST /api/doctor/medical-notes
Body: entityType, entityId, title, clinicalNote, decision

### GET /api/doctor/alerts
Returns: { alerts: [] }

### PUT /api/doctor/alerts/:id/read
Returns: { message: 'Alert marked as read' }

## Component Props Reference

### RequestCard
Props: request, onValidate
Fields: requestNumber, bloodGroup, unitsRequired, hospitalName, patientName, clinicalReason, isEmergency, status

### DonorCard
Props: donor, onScreen
Fields: fullName, bloodGroup, age, vitals (bloodPressure, hemoglobin, weight), lastDonation, screeningStatus

### BloodUnitCard
Props: unit, onValidate
Fields: unitNumber, bloodGroup, volume, collectionDate, expiryDate, labTests, validationStatus

### ReactionCard
Props: reaction
Fields: donorName, bloodUnitNumber, reactionType, severity, symptoms, actionTaken, unitMarkedUnsafe, reportedBy

### CampCard
Props: camp, onValidate
Fields: name, date, location, expectedDonors, medicalStaff, emergencySupport, safetyEquipment, medicalValidation

### EmergencyCard
Props: emergency, onFastTrack
Fields: patientName, bloodGroup, unitsRequired, emergencyType, clinicalReason, hospitalName, contactNumber

### NoteCard
Props: note
Fields: entityType, title, clinicalNote, entityDetails, decision, doctorName, createdAt

## Modal Components

### ValidationModal
Props: request, onClose, onSubmit
Collects: decision, medicalNotes, compatibilityCheck, alternativeRecommendations

### DonorScreeningModal
Props: donor, onClose, onSubmit
Collects: eligibilityDecision, deferralReason, deferralPeriod, vitalsReview, healthCheckComments, medicalNotes

### UnitValidationModal
Props: unit, onClose, onSubmit
Collects: validationDecision, labTestReview, qualityAssessment, storageConditionReview, expiryReview, medicalNotes, markUnsafeReason

### ReactionModal
Props: onClose, onSubmit
Collects: donorId, donorName, bloodUnitNumber, reactionType, severity, symptoms, vitalSigns, actionTaken, medicalIntervention, outcome, unitMarkedUnsafe, medicalNotes

### CampValidationModal
Props: camp, onClose, onSubmit
Collects: medicalValidation, medicalStaffAssessment, emergencySupportReview, safetyEquipmentCheck, venueAssessment, recommendedModifications, medicalNotes

### EmergencyApprovalModal
Props: emergency, onClose, onSubmit
Collects: fastTrackApproval, priorityLevel, medicalJustification, compatibilityNotes, specialInstructions, estimatedDeliveryTime, contactConfirmation

### NoteModal
Props: onClose, onSubmit
Collects: entityType, entityId, title, clinicalNote, decision

## FilterBar Usage

```javascript
const filters = [
  {
    type: 'select',
    name: 'bloodGroup',
    label: 'Blood Group',
    value: filterState.bloodGroup,
    options: [
      { value: '', label: 'All' },
      { value: 'A+', label: 'A+' },
      { value: 'B+', label: 'B+' }
    ]
  },
  {
    type: 'search',
    name: 'search',
    label: 'Search',
    value: filterState.search,
    placeholder: 'Search...'
  },
  {
    type: 'date',
    name: 'fromDate',
    label: 'From Date',
    value: filterState.fromDate
  },
  {
    type: 'checkbox',
    name: 'emergencyOnly',
    label: 'Emergency Only',
    value: filterState.emergencyOnly
  }
];

<FilterBar filters={filters} onFilterChange={handleFilterChange} />
```

## Color Codes

**Status Colors:**
- Approved/Safe: #4caf50 (green)
- Pending/Warning: #ff9800 (orange)
- Rejected/Unsafe: #f44336 (red)
- Emergency: #d32f2f (dark red)

**Severity Colors:**
- Mild: #4caf50 (green)
- Moderate: #ff9800 (orange)
- Severe: #f44336 (red)

**Gradient Themes:**
- Emergency: #f093fb → #f5576c
- Primary Action: #667eea → #764ba2
- Safe/Success: #43e97b → #38f9d7
- Info/Donor: #4facfe → #00f2fe

## Key Features

**Auto-refresh:**
- Emergency Actions: 30 seconds
- Alerts Panel: 60 seconds

**Animations:**
- Emergency cards: pulse effect
- Emergency icon: blink effect
- Hover effects: translateY, shadow

**Responsive:**
- Grid layouts: auto-fit, minmax(350px, 1fr)
- Mobile breakpoint: 768px
- Flex wrapping for tabs and filters

## Integration Checklist

- [ ] Add DoctorDashboard route to App.js
- [ ] Verify auth middleware checks 'doctor' role
- [ ] Implement backend controller logic
- [ ] Create MongoDB models for entities
- [ ] Connect real data to API endpoints
- [ ] Test all modal submissions
- [ ] Verify encryption for file uploads
- [ ] Test responsive design
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test real-time alerts
- [ ] Verify audit trail functionality

## Quick Start

1. Import in your routing:
```javascript
import DoctorDashboard from './pages/doctor/DoctorDashboard';

<Route path="/doctor/dashboard" element={<DoctorDashboard />} />
```

2. Ensure JWT token with doctor role

3. Backend endpoints ready at `/api/doctor/*`

4. All 8 tabs functional with placeholder data

5. Ready for real data integration
