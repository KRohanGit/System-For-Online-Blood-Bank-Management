# API Integration Guide for New Features

This document provides detailed integration instructions for the 5 newly implemented features.

---

## 🎯 Overview

All features are implemented with **deterministic, rule-based logic** (no machine learning). Each feature is designed to be:
- ✅ Reusable across multiple dashboards
- ✅ Self-contained with minimal dependencies
- ✅ Performance-optimized
- ✅ Mobile-responsive

---

## Feature 1: Blood Demand Urgency Index

### Frontend Components
- `UrgencyIndexCalculator.js` - Core calculation logic
- `UrgencyIndexCard.jsx` - Visual display component

### Required Backend API

#### GET `/api/blood-requests/with-urgency`
Returns blood requests with calculated urgency scores

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "_id": "...",
      "patientName": "Emergency Case",
      "bloodGroup": "O-",
      "unitsRequired": 8,
      "status": "pending",
      "urgencyScore": 87,
      "urgencyLabel": "HIGH",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Urgency Calculation Logic:**
```javascript
// Implement in backend/src/controllers/appointmentController.js

const calculateUrgencyScore = (request, nearbyStock) => {
  let score = 0;
  
  // Blood group rarity (max 30 points)
  const rarityScores = {
    'O-': 30, 'AB-': 28, 'B-': 26, 'A-': 24,
    'O+': 15, 'AB+': 14, 'B+': 13, 'A+': 12
  };
  score += rarityScores[request.bloodGroup] || 10;
  
  // Quantity urgency (max 25 points)
  if (request.unitsRequired >= 10) score += 25;
  else if (request.unitsRequired >= 5) score += 18;
  else if (request.unitsRequired >= 3) score += 12;
  else score += 6;
  
  // Time sensitivity (max 30 points)
  const hoursUntilExpiry = calculateHours(request.requiredBy);
  if (hoursUntilExpiry <= 12) score += 30;
  else if (hoursUntilExpiry <= 24) score += 24;
  else if (hoursUntilExpiry <= 48) score += 18;
  else if (hoursUntilExpiry <= 72) score += 12;
  
  // Stock availability (max 15 points)
  const totalNearbyStock = nearbyStock.reduce((sum, h) => sum + h.units, 0);
  if (totalNearbyStock === 0) score += 15;
  else if (totalNearbyStock < request.unitsRequired) score += 10;
  else score += 3;
  
  return Math.min(score, 100);
};
```

**Integration:**
```javascript
// In your dashboard component
import UrgencyIndexCard from '../../components/common/UrgencyIndexCard';

<UrgencyIndexCard 
  request={{
    bloodGroup: request.bloodGroup,
    unitsRequired: request.unitsRequired,
    expiryHours: calculateHoursUntil(request.requiredBy),
    nearbyStock: stockData
  }}
/>
```

---

## Feature 2: Verified Request Badge System

### Frontend Components
- `VerificationBadge.jsx` - Badge display and modal

### Required Backend Changes

#### Model: `CommunityPost.js` (✅ ALREADY UPDATED)
Added fields:
```javascript
{
  source: { type: String, enum: ['hospital', 'camp', 'community'], default: 'community' },
  adminReviewed: { type: Boolean, default: false },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  campId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodCamp' }
}
```

#### New API Endpoint Required

**PUT** `/api/community-posts/:id/verify`
Admin endpoint to verify community posts

**Request Body:**
```json
{
  "approved": true,
  "reviewNotes": "Verified with hospital records"
}
```

**Controller Implementation:**
```javascript
// In backend/src/controllers/communityController.js

exports.verifyPost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Only admins can verify
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    post.adminReviewed = true;
    post.reviewedBy = req.user._id;
    post.reviewedAt = new Date();
    
    await post.save();
    
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

**Integration:**
```javascript
import VerificationBadge from '../../components/common/VerificationBadge';

<VerificationBadge 
  request={{
    source: 'hospital', // or 'camp', 'community'
    adminReviewed: true,
    hospitalName: 'City General',
    campId: 'CAMP001'
  }}
  showDetails={true}
/>
```

---

## Feature 3: Blood Unit Lifecycle Intelligence (Waste Risk)

### Frontend Components
- `WasteRiskIndicator.jsx` - Waste risk display and transfer suggestions

### Required Backend API

#### GET `/api/blood-inventory/expiring-soon`
Returns units at risk of expiring

**Query Parameters:**
- `riskLevel` - 'high', 'medium', 'low'
- `bloodGroup` - Filter by blood type

**Response:**
```json
{
  "success": true,
  "units": [
    {
      "bloodUnitId": "BU2026001234",
      "bloodGroup": "O+",
      "expiryDate": "2025-01-17T00:00:00Z",
      "status": "Available",
      "location": "Central Blood Bank",
      "wasteRisk": {
        "percentage": 85,
        "level": "HIGH",
        "hoursRemaining": 36
      }
    }
  ]
}
```

**Controller Implementation:**
```javascript
// In backend/src/controllers/bloodInventory/inventoryController.js

exports.getExpiringUnits = async (req, res) => {
  try {
    const { riskLevel, bloodGroup } = req.query;
    
    const now = new Date();
    const query = {
      status: 'Available',
      expiryDate: { $gt: now }
    };
    
    if (bloodGroup) query.bloodGroup = bloodGroup;
    
    let units = await BloodInventory.find(query)
      .sort({ expiryDate: 1 })
      .limit(100);
    
    // Calculate waste risk for each unit
    units = units.map(unit => {
      const hoursUntilExpiry = (unit.expiryDate - now) / (1000 * 60 * 60);
      let riskPercentage, riskLevel;
      
      if (hoursUntilExpiry < 24) {
        riskPercentage = 95;
        riskLevel = 'CRITICAL';
      } else if (hoursUntilExpiry < 48) {
        riskPercentage = 75;
        riskLevel = 'HIGH';
      } else if (hoursUntilExpiry < 72) {
        riskPercentage = 50;
        riskLevel = 'MEDIUM';
      } else {
        riskPercentage = 25;
        riskLevel = 'LOW';
      }
      
      return {
        ...unit.toObject(),
        wasteRisk: { percentage: riskPercentage, level: riskLevel, hoursRemaining: Math.floor(hoursUntilExpiry) }
      };
    });
    
    // Filter by risk level if specified
    if (riskLevel) {
      units = units.filter(u => u.wasteRisk.level === riskLevel.toUpperCase());
    }
    
    res.json({ success: true, units });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

**Integration:**
```javascript
import WasteRiskIndicator from '../../components/bloodInventory/WasteRiskIndicator';

<WasteRiskIndicator 
  unit={{
    bloodUnitId: 'BU2026001234',
    bloodGroup: 'A+',
    expiryDate: new Date(Date.now() + 40 * 60 * 60 * 1000),
    status: 'Available'
  }}
  showSuggestions={true}
/>
```

---

## Feature 4: Geo-Time Heatmap

### Frontend Components
- `GeoTimeHeatmap.jsx` - Map visualization with filters

### Required Backend API

#### GET `/api/analytics/demand-heatmap`
Returns geographic demand data

**Query Parameters:**
- `timeRange` - '24h', '7d', '30d'
- `bloodGroup` - Optional blood group filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "location": {
        "name": "Mumbai Central",
        "lat": 19.0176,
        "lng": 72.8561
      },
      "demandStats": {
        "totalRequests": 45,
        "fulfilledRequests": 32,
        "unfulfilled": 13,
        "intensity": 71.1,
        "bloodGroupDistribution": {
          "A+": 12, "B+": 8, "O+": 15, "AB+": 4,
          "A-": 2, "B-": 1, "O-": 2, "AB-": 1
        }
      }
    }
  ]
}
```

**Controller Implementation:**
```javascript
// In backend/src/controllers/bloodCampController.js or new analyticsController.js

exports.getDemandHeatmap = async (req, res) => {
  try {
    const { timeRange = '24h', bloodGroup } = req.query;
    
    // Calculate time threshold
    const now = new Date();
    const hoursAgo = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const startTime = new Date(now - hoursAgo * 60 * 60 * 1000);
    
    // Build aggregation query
    const matchStage = {
      createdAt: { $gte: startTime }
    };
    
    if (bloodGroup) matchStage.bloodGroup = bloodGroup;
    
    const demandData = await DonationAppointment.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospitalId',
          foreignField: '_id',
          as: 'hospital'
        }
      },
      { $unwind: '$hospital' },
      {
        $group: {
          _id: '$hospital.location',
          totalRequests: { $sum: 1 },
          fulfilledRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          bloodGroups: { $push: '$bloodGroup' }
        }
      },
      {
        $project: {
          location: '$_id',
          totalRequests: 1,
          fulfilledRequests: 1,
          unfulfilled: { $subtract: ['$totalRequests', '$fulfilledRequests'] },
          intensity: {
            $multiply: [
              { $divide: ['$fulfilledRequests', '$totalRequests'] },
              100
            ]
          },
          bloodGroupDistribution: '$bloodGroups'
        }
      }
    ]);
    
    res.json({ success: true, data: demandData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

**Route Registration:**
```javascript
// In backend/src/routes/bloodCampRoutes.js or new analyticsRoutes.js
router.get('/analytics/demand-heatmap', auth, getDemandHeatmap);
```

**Integration:**
```javascript
import GeoTimeHeatmap from '../../components/common/GeoTimeHeatmap';

<GeoTimeHeatmap 
  apiEndpoint="/api/analytics/demand-heatmap"
  defaultTimeRange="7d"
/>
```

---

## Feature 5: Community Reputation System

### Frontend Components
- `ReputationCalculator.js` - Score calculation logic
- `ReputationCard.jsx` - Visual display

### Required Backend Changes

#### Model: `PublicUser.js` (✅ ALREADY UPDATED)
Added fields:
```javascript
{
  reputationScore: { type: Number, default: 0 },
  activities: {
    campsOrganized: { type: Number, default: 0 },
    donationsCompleted: { type: Number, default: 0 },
    hospitalCollaborations: { type: Number, default: 0 },
    communityPosts: { type: Number, default: 0 },
    helpfulComments: { type: Number, default: 0 },
    campsAttended: { type: Number, default: 0 },
    certificatesEarned: { type: Number, default: 0 }
  }
}
```

#### Required API Endpoints

**GET** `/api/public-users/:userId/reputation`
Get user reputation and activities

**Response:**
```json
{
  "success": true,
  "reputation": {
    "score": 235,
    "badge": "Contributor",
    "activities": {
      "campsOrganized": 3,
      "donationsCompleted": 8,
      "hospitalCollaborations": 2,
      "communityPosts": 12,
      "helpfulComments": 25,
      "campsAttended": 5,
      "certificatesEarned": 6
    }
  }
}
```

**PUT** `/api/public-users/:userId/reputation/activity`
Increment activity counter

**Request Body:**
```json
{
  "activityType": "donationsCompleted",
  "increment": 1
}
```

**Controller Implementation:**
```javascript
// In backend/src/controllers/publicUserFeatures.js

exports.getReputation = async (req, res) => {
  try {
    const user = await PublicUser.findById(req.params.userId)
      .select('reputationScore activities name');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      reputation: {
        score: user.reputationScore,
        badge: calculateBadgeLevel(user.reputationScore),
        activities: user.activities
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.incrementActivity = async (req, res) => {
  try {
    const { activityType, increment = 1 } = req.body;
    
    const validActivities = [
      'campsOrganized', 'donationsCompleted', 'hospitalCollaborations',
      'communityPosts', 'helpfulComments', 'campsAttended', 'certificatesEarned'
    ];
    
    if (!validActivities.includes(activityType)) {
      return res.status(400).json({ success: false, message: 'Invalid activity type' });
    }
    
    const user = await PublicUser.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Increment activity counter
    user.activities[activityType] += increment;
    
    // Recalculate reputation score
    const pointValues = {
      campsOrganized: 50,
      donationsCompleted: 30,
      hospitalCollaborations: 25,
      communityPosts: 5,
      helpfulComments: 2,
      campsAttended: 15,
      certificatesEarned: 20
    };
    
    user.reputationScore = Object.entries(user.activities).reduce(
      (total, [activity, count]) => total + (count * (pointValues[activity] || 0)),
      0
    );
    
    await user.save();
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

function calculateBadgeLevel(score) {
  if (score >= 500) return 'Hero';
  if (score >= 300) return 'Champion';
  if (score >= 180) return 'Advocate';
  if (score >= 100) return 'Contributor';
  if (score >= 50) return 'Helper';
  return 'Newcomer';
}
```

**Route Registration:**
```javascript
// In backend/src/routes/publicUserRoutes.js
router.get('/:userId/reputation', auth, getReputation);
router.put('/:userId/reputation/activity', auth, incrementActivity);
```

**Integration:**
```javascript
import ReputationCard from '../../components/common/ReputationCard';

<ReputationCard 
  activities={userData.activities}
  userName={userData.name}
  compact={false} // Set to true for inline display
/>
```

---

## 📌 Dashboard Integration Checklist

### Super Admin Dashboard
- [ ] Add GeoTimeHeatmap for demand analytics
- [ ] Add reputation leaderboard section
- [ ] Add urgency-based request filtering

### Hospital Admin Dashboard
- [ ] Add UrgencyIndexCard to blood requests list
- [ ] Add WasteRiskIndicator to inventory page
- [ ] Add verification badge to community requests

### Doctor Dashboard
- [ ] Add UrgencyIndexCard to patient requests
- [ ] Add waste risk alerts for critical units

### Public User Dashboard
- [ ] Add ReputationCard to profile page
- [ ] Add compact reputation badge to navbar
- [ ] Show verification badges on community posts

---

## 🔧 Testing Commands

```bash
# Test urgency calculation
curl http://localhost:5000/api/blood-requests/with-urgency

# Test verification endpoint
curl -X PUT http://localhost:5000/api/community-posts/POST_ID/verify \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'

# Test expiring units
curl http://localhost:5000/api/blood-inventory/expiring-soon?riskLevel=high

# Test heatmap data
curl http://localhost:5000/api/analytics/demand-heatmap?timeRange=7d

# Test reputation
curl http://localhost:5000/api/public-users/USER_ID/reputation
```

---

## 🚀 Deployment Notes

1. **Database Migration**: Run database migration to add new fields:
   ```bash
   node backend/scripts/migrate-new-fields.js
   ```

2. **Index Creation**: Create geospatial indexes for heatmap:
   ```javascript
   db.hospitals.createIndex({ location: "2dsphere" });
   db.bloodcamps.createIndex({ location: "2dsphere" });
   ```

3. **Cron Jobs**: Set up cron jobs for:
   - Daily waste risk notifications (units expiring < 48hrs)
   - Weekly reputation score recalculation
   - Hourly urgency index updates

---

## 📝 Next Steps

1. **API Implementation**: Create the backend endpoints listed above
2. **Dashboard Integration**: Import components into actual dashboard pages
3. **Testing**: Test with real data
4. **Mobile Optimization**: Ensure all components work on mobile
5. **Documentation**: Add inline code comments and user guides

---

**Need Help?** 
- Frontend Components: See `/frontend/src/pages/test/NewFeaturesDemo.jsx` for live examples
- Backend Models: Check `/Backend/src/models/PublicUser.js` and `CommunityPost.js`
- Calculation Logic: Review `/frontend/src/utils/` directory for all calculators
