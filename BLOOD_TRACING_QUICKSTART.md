# Blood Tracing System - Quick Start Guide

## Overview

The Blood Tracing System has been fully implemented on the frontend with React components, services, and routing. This guide helps developers integrate the backend API to complete the system.

## Quick Features Tour

### 1. Public QR Scanner (`/trace`)
- No login required
- Scan QR codes or enter unit IDs manually
- Real-time search functionality
- Responsive mobile design

### 2. Blood Unit Details (`/trace/:unitId`)
- Complete unit lifecycle
- 4 main tabs: Overview, Timeline, Transfer (Admin), Usage (Admin)
- Blockchain verification badges
- Risk assessment warnings
- Color-coded status indicators

### 3. Role-Based Access
- **Public Users**: View-only access to unit timeline
- **Hospital Staff**: Can record transfers
- **Doctors/Admins**: Can record transfusions and run monitoring

## Quick Setup

### Frontend Only (Already Done)

```bash
# Components already created:
frontend/src/services/bloodApi.js           # API client
frontend/src/pages/BloodTracingDashboard.js # Main UI
frontend/src/components/BloodUnitCard.js    # Unit display
frontend/src/components/Timeline.js         # Timeline view
frontend/src/components/TransferForm.js     # Transfer recording
frontend/src/components/UsageForm.js        # Transfusion recording
frontend/src/components/QRScanner.js        # QR scanner
```

### Routes Already Added to App.js

```javascript
<Route path="/trace" element={<QRScanner />} />
<Route path="/trace/:unitId" element={<BloodTracingDashboard />} />
```

## Backend Integration

### Step 1: Implement MongoDB Schema

```javascript
// Backend: src/models/BloodUnit.js
const bloodUnitSchema = new Schema({
  unitId: { type: String, unique: true, required: true },
  status: {
    type: String,
    enum: ['collected', 'processing', 'tested', 'available', 'transfused', 'discarded', 'expired'],
    default: 'collected'
  },
  bloodGroup: { type: String, required: true },
  component: { type: String, required: true },
  volume: { type: Number, default: 450 },
  collectionDate: { type: Date, default: Date.now },
  expiryDate: Date,
  currentLocation: String,
  
  testResults: {
    HIV: Boolean,
    HBV: Boolean,
    HCV: Boolean,
    VDRL: Boolean
  },
  
  blockchainTx: String,
  
  riskAssessment: {
    level: { type: String, enum: ['low', 'medium', 'high'] },
    flags: [String],
    lastUpdated: Date
  },
  
  timeline: [{
    type: String,
    timestamp: Date,
    description: String,
    location: String,
    details: Schema.Types.Mixed,
    blockchainTx: String
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BloodUnit', bloodUnitSchema);
```

### Step 2: Implement Public Endpoints

```javascript
// Backend: src/routes/blood.js

router.get('/trace/:unitId', async (req, res) => {
  try {
    const unit = await BloodUnit.findOne({ unitId: req.params.unitId });
    if (!unit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blood unit not found' 
      });
    }
    res.json({
      success: true,
      unitId: unit.unitId,
      status: unit.status,
      bloodGroup: unit.bloodGroup,
      component: unit.component,
      volume: unit.volume,
      currentLocation: unit.currentLocation,
      testResults: unit.testResults,
      blockchainTx: unit.blockchainTx,
      riskAssessment: unit.riskAssessment,
      timeline: unit.timeline
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/unit/:unitId', async (req, res) => {
  try {
    const unit = await BloodUnit.findOne({ unitId: req.params.unitId });
    if (!unit) return res.status(404).json({ success: false });
    res.json({ success: true, ...unit.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/timeline/:unitId', async (req, res) => {
  try {
    const unit = await BloodUnit.findOne({ unitId: req.params.unitId });
    if (!unit) return res.status(404).json({ success: false });
    res.json({ 
      success: true, 
      unitId: unit.unitId,
      timeline: unit.timeline 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### Step 3: Implement Authenticated Endpoints

```javascript
// Backend: src/routes/blood.js

// Middleware: Check authentication
const auth = require('../middleware/auth');

router.post('/transfer/complete', auth, async (req, res) => {
  try {
    const { unitId, facility, facilityName, metadata } = req.body;
    
    const unit = await BloodUnit.findOne({ unitId });
    if (!unit) return res.status(404).json({ success: false });
    
    // Create blockchain record (placeholder)
    const blockchainTx = `TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add timeline event
    unit.timeline.push({
      type: 'transferred',
      timestamp: new Date(),
      description: `Transfer to ${facilityName}`,
      location: facilityName,
      details: metadata,
      blockchainTx
    });
    
    unit.currentLocation = facilityName;
    unit.status = 'available';
    unit.blockchainTx = blockchainTx;
    
    await unit.save();
    
    res.json({
      success: true,
      message: 'Transfer recorded successfully',
      blockchainTx: unit.blockchainTx
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/usage/record', auth, async (req, res) => {
  try {
    const { unitId, hospital, ageGroup, procedure, urgency, outcome } = req.body;
    
    const unit = await BloodUnit.findOne({ unitId });
    if (!unit) return res.status(404).json({ success: false });
    
    const blockchainTx = `TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    unit.timeline.push({
      type: 'transfused',
      timestamp: new Date(),
      description: `Transfusion at ${hospital} - ${procedure}`,
      location: hospital,
      details: { ageGroup, procedure, urgency, outcome },
      blockchainTx
    });
    
    unit.status = 'transfused';
    unit.blockchainTx = blockchainTx;
    
    await unit.save();
    
    res.json({
      success: true,
      message: 'Transfusion recorded successfully',
      blockchainTx: unit.blockchainTx
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### Step 4: Register Routes in Server

```javascript
// Backend: server.js

const bloodRoutes = require('./src/routes/blood');

app.use('/api/blood', bloodRoutes);
```

## Testing

### Test with Mock Data

```bash
# Create a test blood unit (via MongoDB directly or API)
db.bloodunits.insertOne({
  "unitId": "BU-2024-TEST-001",
  "bloodGroup": "O+",
  "component": "Whole Blood",
  "volume": 450,
  "status": "available",
  "collectionDate": new Date(),
  "currentLocation": "Apollo Hospital Blood Bank",
  "testResults": {
    "HIV": false,
    "HBV": false,
    "HCV": false,
    "VDRL": false
  },
  "riskAssessment": {
    "level": "low",
    "flags": []
  },
  "timeline": [{
    "type": "collected",
    "timestamp": new Date(),
    "description": "Blood collected from donor",
    "location": "Apollo Hospital",
    "blockchainTx": "0x123abc..."
  }]
})

# Test the endpoints
curl http://localhost:5000/api/blood/trace/BU-2024-TEST-001
curl http://localhost:5000/api/blood/unit/BU-2024-TEST-001
curl http://localhost:5000/api/blood/timeline/BU-2024-TEST-001
```

### Frontend Testing

1. **Navigate to QR Scanner**: `http://localhost:3000/trace`
2. **Enter test unit ID**: `BU-2024-TEST-001`
3. **Click Search Unit**
4. **Verify redirect to**: `/trace/BU-2024-TEST-001`
5. **Check tabs load correctly**

## Component Usage Examples

### Using bloodApi Service

```javascript
import bloodApi from '../services/bloodApi';

// Search for a blood unit (no auth required)
const searchUnit = async (unitId) => {
  try {
    const data = await bloodApi.traceBloodUnit(unitId);
    console.log('Unit found:', data);
  } catch (error) {
    console.error('Unit not found:', error);
  }
};

// Record a transfer (requires auth)
const recordTransfer = async (unitId) => {
  try {
    const result = await bloodApi.completeTransfer(
      unitId,
      'hospital',
      'Apollo Hospital',
      {
        transportMethod: 'courier',
        temperature: 4,
        specialHandling: 'Fragile'
      }
    );
    console.log('Transfer recorded:', result);
  } catch (error) {
    console.error('Transfer failed:', error);
  }
};

// Get donor's blood units
const getDonorUnits = async () => {
  try {
    const units = await bloodApi.getDonorBloodUnits();
    console.log('Donor units:', units);
  } catch (error) {
    console.error('Failed to fetch units:', error);
  }
};
```

### Component Integration

```javascript
import BloodTracingDashboard from '../pages/BloodTracingDashboard';
import QRScanner from '../components/QRScanner';

// Already integrated in App.js routes
// No additional setup needed!
```

## Environment Variables

```
# .env (Frontend)
REACT_APP_API_URL=http://localhost:5000

# .env (Backend)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/blood-tracing
JWT_SECRET=your_secret_key
```

## UI Color Scheme Reference

```css
--blood-red: #d32f2f
--process-blue: #2196F3
--test-orange: #FF9800
--available-green: #4CAF50
--transfused-purple: #9C27B0
--discarded-red: #F44336
--expired-gray: #757575
```

## Troubleshooting

### "Cannot find module" Error
- Ensure all files are created in correct paths
- Check that file names match imports exactly

### "API not responding"
- Verify backend server is running
- Check REACT_APP_API_URL in .env
- Ensure backend routes are registered

### Timeline not showing
- Check MongoDB has data in timeline array
- Verify unit exists in database
- Check browser console for errors

### Transfer form not appearing
- Verify user role is set correctly in localStorage
- Check authentication token is valid
- Try logging in again

## File Checklist

Frontend files created:
- [ ] `frontend/src/services/bloodApi.js`
- [ ] `frontend/src/pages/BloodTracingDashboard.js`
- [ ] `frontend/src/pages/BloodTracingDashboard.css`
- [ ] `frontend/src/components/BloodUnitCard.js`
- [ ] `frontend/src/components/BloodUnitCard.css`
- [ ] `frontend/src/components/Timeline.js`
- [ ] `frontend/src/components/Timeline.css`
- [ ] `frontend/src/components/TransferForm.js`
- [ ] `frontend/src/components/TransferForm.css`
- [ ] `frontend/src/components/UsageForm.js`
- [ ] `frontend/src/components/UsageForm.css`
- [ ] `frontend/src/components/QRScanner.js`
- [ ] `frontend/src/components/QRScanner.css`
- [ ] Updated `frontend/src/App.js`

Backend files to create:
- [ ] `Backend/src/models/BloodUnit.js`
- [ ] `Backend/src/routes/blood.js`
- [ ] Integration with `Backend/server.js`

## Next Steps

1. Create MongoDB schema and model
2. Implement API routes
3. Test endpoints with Postman
4. Test frontend with mock data
5. Integrate blockchain (if needed)
6. Set up CI/CD pipeline

## Support Resources

- [MongoDB Documentation](https://docs.mongodb.com)
- [Express.js Guide](https://expressjs.com)
- [React Documentation](https://react.dev)
- [Blockchain Integration Guide](./BLOOD_TRACING_GUIDE.md)

---

**Last Updated**: 2024
**Status**: Frontend Complete, Ready for Backend Integration
