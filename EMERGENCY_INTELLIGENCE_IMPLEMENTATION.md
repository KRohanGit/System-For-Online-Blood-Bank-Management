# City-Level Blood Shockwave & Crisis Propagation Intelligence Engine

## 🎯 Implementation Summary

A comprehensive emergency preparedness and crisis simulation system for blood bank management, designed to predict and analyze the impact of mass casualty events on city-wide blood supply chains.

---

## 📁 Project Structure

### Backend (Node.js + Express + MongoDB)

#### Models
- **EmergencyScenario.js** - Main scenario model with incident details, blood demand projections, hospital impacts, crisis timeline, and recommendations

#### Utilities
- **emergencyCalculations.js** - Rule-based calculation engine:
  - Blood demand calculation by severity
  - Blood group distribution
  - Distance calculations (Haversine formula)
  - Risk assessment algorithms
  - Recommendation generation logic

#### Controllers
- **emergencyIntelligenceController.js** - Business logic for:
  - Creating scenarios
  - Analyzing hospital impacts
  - Running simulations
  - Managing recommendations
  - Audit trail

#### Routes
- **emergencyIntelligenceRoutes.js** - API endpoints:
  - `POST /api/emergency-intelligence/scenarios` - Create scenario
  - `GET /api/emergency-intelligence/scenarios` - List scenarios
  - `GET /api/emergency-intelligence/scenarios/:id` - Get scenario details
  - `PUT /api/emergency-intelligence/scenarios/:id/rerun` - Re-run simulation
  - `PUT /api/emergency-intelligence/scenarios/:scenarioId/recommendations/:index` - Approve/reject recommendation
  - `DELETE /api/emergency-intelligence/scenarios/:id` - Delete scenario

---

### Frontend (React)

#### Services
- **emergencyIntelligenceApi.js** - API integration layer

#### Reusable Components (`components/emergency/`)
1. **RiskLevelBadge** - Color-coded risk indicators (CRITICAL, HIGH, MEDIUM, LOW)
2. **BloodGroupMeter** - Visual blood availability vs demand meters
3. **HospitalRiskCard** - Compact hospital status cards with risk metrics
4. **CityPreparednessIndex** - Overall city readiness dashboard
5. **PropagationTimeline** - Crisis spread visualization (0-2h, 2-6h, 6-12h)
6. **RecommendationsList** - Action recommendations with approval workflow
7. **IncidentForm** - Scenario creation form with validation

#### Pages (`pages/emergency/`)
1. **EmergencyDashboard** - Main landing page with scenario list and filters
2. **CreateScenario** - Form to create new emergency scenarios
3. **ScenarioDetails** - Comprehensive analysis view with all metrics

#### Routes
```
/emergency-intelligence                    → Dashboard
/emergency-intelligence/create             → Create Scenario
/emergency-intelligence/scenario/:id       → Scenario Details
```

---

## 🔑 Key Features

### 1. Incident Input Module
- Configurable incident types (road accident, disaster, festival, industrial, etc.)
- Geo-location support (latitude, longitude)
- Casualty estimation
- Severity distribution (critical/moderate/minor percentages)
- Clearly marked as "SIMULATION MODE"

### 2. Blood Demand Calculation
**Rule-based calculations:**
- Critical patient: 2-4 units (avg: 3)
- Moderate patient: 1-2 units (avg: 1.5)
- Minor patient: 0 units

**Distribution:**
- Standard blood group population distribution applied
- Rare blood pressure index calculated
- Emergency demand score (0-100)

### 3. Hospital Impact Analysis
- Distance-based impact levels (Primary ≤5km, Secondary ≤15km, Tertiary >15km)
- Real-time inventory comparison vs projected demand
- Time-to-shortage estimation
- Blood group-specific risk assessment
- Overall risk level per hospital

### 4. Crisis Propagation Timeline
- **Immediate (0-2 hours)** - Hospitals at immediate risk
- **Short-term (2-6 hours)** - Secondary impact wave
- **Critical (6-12 hours)** - Extended crisis period

### 5. Preemptive Recommendations
**System generates (NOT auto-executes):**
- Lock emergency units
- Inter-hospital transfers
- Targeted donor alerts (by blood group)
- Postpone elective procedures
- Activate hospital credit network

**Admin approval required** for all actions

### 6. City Preparedness Index
Composite score (0-100) based on:
- Inventory level (40% weight)
- Hospital capacity (30% weight)
- Response readiness (30% weight)
- Donor availability (tracked)

### 7. What-If Simulator
- Modify casualty numbers
- Adjust severity ratios
- Re-run simulation instantly
- Compare scenarios

### 8. Audit & Safety Layer
- Complete audit trail (creator, timestamp, modifications)
- Clear simulation vs real emergency distinction
- No automatic public alerts
- Role-based access control

---

## 👥 Role-Based Access

| Role | Access Level |
|------|-------------|
| **Super Admin** | Full access - city-level simulations, all scenarios |
| **Hospital Admin** | Regional + hospital-level simulations |
| **Doctor** | Read-only emergency insights |
| **Public/Donor** | No access |

---

## 🎨 UI Features

### Visual Design
- Color-coded risk levels (red/orange/yellow/green)
- Progressive disclosure (expandable cards)
- Real-time data visualization
- Mobile-responsive design

### Key Indicators
- 🎯 Primary Impact
- ⚡ Secondary Impact
- 📍 Tertiary Impact
- 🚨 Critical Risk
- ⚠️ High Risk
- ⏱️ Time to Shortage

---

## 🔐 Security & Ethics

### Safety Measures
1. ✅ Clear "SIMULATION MODE" badges
2. ✅ No automatic notifications
3. ✅ Admin approval for all actions
4. ✅ Complete audit logging
5. ✅ Role-based access control
6. ✅ Data privacy compliance

### Ethical Guidelines
- Advisory recommendations only
- Does NOT replace medical authority
- Transparent decision-making process
- Preparedness focused, not fear-based

---

## 📊 Sample Data Flow

### Creating a Scenario:
1. Admin enters incident details (type, location, casualties)
2. System calculates blood demand using severity rules
3. Queries hospitals within 50km radius
4. Compares current inventory vs projected demand
5. Calculates time-to-shortage for each hospital
6. Generates crisis propagation timeline
7. Creates actionable recommendations
8. Computes city preparedness score

### Re-running Simulation:
1. Admin adjusts parameters (casualties, severity ratios)
2. System recalculates all metrics
3. New results compared to original
4. Audit log updated with changes

---

## 🚀 Getting Started

### Access the System
1. Login as Super Admin or Hospital Admin
2. Navigate to `/emergency-intelligence`
3. Click "Create New Scenario"
4. Fill in incident details
5. View comprehensive analysis
6. Run "What-If" simulations
7. Approve/reject recommendations

### API Testing
```bash
# Create scenario
POST http://localhost:5000/api/emergency-intelligence/scenarios
Authorization: Bearer <token>

# Get all scenarios
GET http://localhost:5000/api/emergency-intelligence/scenarios

# Get scenario details
GET http://localhost:5000/api/emergency-intelligence/scenarios/:id

# Re-run simulation
PUT http://localhost:5000/api/emergency-intelligence/scenarios/:id/rerun
```

---

## 📈 Benefits

### For Administrators
- Strategic planning tool
- Emergency drill simulation
- Resource allocation optimization
- Evidence-based decision making

### For Healthcare System
- Improved crisis preparedness
- Coordinated inter-hospital response
- Reduced blood shortage incidents
- Better patient outcomes

### For Community
- Enhanced public safety
- Transparent governance
- Proactive healthcare system

---

## 🎓 Technical Highlights

- **Modular Architecture**: Small, reusable components
- **Rule-Based Intelligence**: No ML dependencies
- **Real-Time Calculations**: Instant scenario analysis
- **Scalable Design**: Handles city-wide data
- **Responsive UI**: Works on all devices

---

## 📝 Notes

- All components are small (<250 lines)
- Maximum code reusability
- Clean separation of concerns
- Comprehensive error handling
- Extensive commenting

---

## 🔄 Future Enhancements

1. Historical scenario analytics
2. Weather data integration
3. Traffic pattern analysis
4. Multi-city coordination
5. Donor engagement metrics
6. Real-time inventory sync
7. Mobile app integration

---

**Status**: ✅ Fully Implemented and Ready for Use

**Documentation**: Complete
**Testing**: Required (manual testing recommended)
**Deployment**: Ready for staging environment
