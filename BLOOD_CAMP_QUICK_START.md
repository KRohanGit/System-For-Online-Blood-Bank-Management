# BLOOD CAMP QUICK START GUIDE

## Overview
The blood camp system allows hospitals, verified public users, and admins to organize blood donation camps and reach potential donors instantly through real-time updates.

---

## FOR HOSPITALS / MEDICAL TEAMS

### How to Organize a Blood Camp

#### Step 1: Login as Hospital Admin
```
1. Go to Dashboard
2. Click "Login"
3. Enter hospital admin credentials
4. Role should show: "Hospital Admin"
```

#### Step 2: Navigate to Camp Organizer
```
1. Click "Events" or "Manage" menu
2. Select "Organize Blood Camp"
3. Or go to: /hospital/organize-camp
```

#### Step 3: Fill Camp Details
```
Camp Details Form:
├── Camp Title (required)
│   └─ e.g., "Red Cross Annual Blood Drive 2026"
│
├── Description (required)
│   └─ e.g., "Join us for safe blood donation. Refreshments provided."
│
├── Location (required)
│   ├─ Address/Venue Name
│   ├─ City
│   ├─ Coordinates (auto-filled from address)
│   └─ Type: Indoor/Outdoor
│
├── Date & Time (required)
│   ├─ Date: Select future date
│   └─ Time: Select start time
│
├── Duration
│   └─ e.g., 4 hours, 6 hours, 8 hours
│
├── Capacity (required)
│   └─ e.g., 150 donors
│
├── Facilities
│   ├─ ☐ Refreshments
│   ├─ ☐ Medical Team
│   ├─ ☐ Parking
│   ├─ ☐ Wheelchair Access
│   └─ ☐ Ambulance on Standby
│
└── Blood Groups Needed (optional)
    ├─ ☐ O+
    ├─ ☐ O-
    ├─ ☐ A+
    ├─ ☐ A-
    ├─ ☐ B+
    ├─ ☐ B-
    ├─ ☐ AB+
    └─ ☐ AB-
```

#### Step 4: Submit
```
1. Click "Create Camp"
2. Confirmation: "Camp created successfully!"
3. Real-time notifications sent to all eligible users
```

### What Happens After Creation
```
Instant Timeline:
↓ T+0s   → Camp saved to database
↓ T+0.5s → Socket event emitted: "camp.created"
↓ T+1s   → All logged-in public users notified
↓ T+2s   → All hospital admins notified
↓ T+3s   → Dashboards updated across the platform
↓ T+5s   → Nearby users (within 50km) see in their feed
```

### Update Camp Details
```
1. Go to Camp Details
2. Click "Edit Camp"
3. Modify allowed fields (title, date, capacity, etc.)
4. Click "Save Changes"
5. All participants get instant notification
```

### Cancel Camp
```
1. Go to Camp Details
2. Click "Cancel Camp"
3. Enter cancellation reason
4. Confirm cancellation
5. All booked participants notified with reason
```

---

## FOR PUBLIC USERS

### How to Discover Blood Camps

#### Option 1: View All Available Camps
```
1. Go to Dashboard
2. Click "Find Blood Camps"
3. See list of all upcoming camps
4. Camps sorted by date
```

#### Option 2: Find Nearby Camps
```
1. Go to "Find Blood Camps"
2. Click "Nearby" tab
3. System uses your location with permission
4. Shows camps within 50km
5. Sorted by distance
```

#### Option 3: Search by Location
```
1. Enter city name or address
2. Select radius (10km, 25km, 50km, 100km)
3. View matching camps with distances
```

### Camp Details You'll See
```
Camp Card Shows:
├── Camp Title
├── Organizing Hospital
├── Date & Time
├── Location with distance
├── Blood Groups Needed
├── Available Slots
├── Facilities Offered
└── Booking Button
```

### How to Book / Register

#### As Public User
```
1. Find a camp you like
2. Click "Book Slot" / "Register"
3. System verifies you are verified
4. If verified: Instant booking confirmation
5. If not verified: 
   → Message: "Please verify your account first"
   → Option to verify with identity documents
```

#### After Booking
```
✓ You receive:
  ├── Booking confirmation email
  ├── Calendar invite
  ├── Reminder 24 hours before
  ├── Real-time updates if camp details change
  └── Map directions to venue
```

#### Day of Camp
```
1. Show booking confirmation at venue
2. Help with check-in
3. Medical screening
4. Blood donation process
5. Refreshments
6. Thank you & certificate
```

### How to Organize Your Own Camp (if verified)
```
1. Ensure your account is "Verified"
2. Go to Dashboard → "My Camps" or "Events"
3. Click "Organize Blood Camp"
4. Follow same steps as hospital admin
5. Same real-time notifications work
```

---

## REAL-TIME FEATURES

### You Get Instant Notifications When:

✅ **New Camp Organized**
```
Notification: "New blood camp organized near you!"
└─ Camp: Red Cross Drive at City Hospital
└─ Date: April 15, 2026
└─ Location: 2.5 km away
└─ Action: View Details / Book Now
```

✅ **Camp Details Updated**
```
Notification: "A camp you're interested in was updated"
└─ Camp: Red Cross Drive
└─ Update: Date changed from 9:00 AM → 10:00 AM
└─ Action: View Updated Details
```

✅ **Camp Cancelled**
```
Notification: "A registered camp has been cancelled"
└─ Camp: Red Cross Drive
└─ Reason: Unexpected severe weather
└─ Refund: Your slot credits have been refunded
└─ Alternative: View other nearby camps
```

✅ **Your Registration Confirmed**
```
Notification: "Your camp registration confirmed!"
└─ Camp: Red Cross Drive
└─ Date: April 15, 2026, 9:00 AM
└─ Location: City Hospital, Vizag
└─ Map: Get Directions
```

### How to Enable Notifications

```
In Browser:
  1. Settings → Notifications → Allow
  2. Location → Always (for nearby camps)

In Mobile:
  1. App Settings → Notifications → ON
  2. Tap on notification to open
```

---

## API INTEGRATION (For Developers)

### Get All Camps
```bash
GET /api/blood-camps?page=1&limit=20&status=upcoming

Response:
{
  "success": true,
  "data": {
    "camps": [
      {
        "_id": "...",
        "title": "Red Cross Blood Drive",
        "organizer": { "name": "City Hospital", "type": "Hospital" },
        "dateTime": "2026-04-15T09:00:00Z",
        "location": { "coordinates": [83.22, 17.69], "address": "..." },
        "capacity": 200,
        "currentBookings": 45
      }
    ],
    "pagination": { "total": 120, "page": 1, "limit": 20, "totalPages": 6 }
  }
}
```

### Get Nearby Camps
```bash
GET /api/blood-camps/nearby?longitude=83.2185&latitude=17.6869&maxDistance=50

Response:
{
  "success": true,
  "data": {
    "camps": [
      {
        "_id": "...",
        "title": "Red Cross Blood Drive",
        "distance": 2.5,  // km
        "dateTime": "2026-04-15T09:00:00Z",
        "location": { "coordinates": [83.22, 17.69] }
      }
    ],
    "userLocation": { "longitude": 83.2185, "latitude": 17.6869 },
    "searchRadius": 50
  }
}
```

### Create Camp (Authenticated)
```bash
POST /api/blood-camps
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "Blood Donation Campaign",
  "description": "Organize by our hospital",
  "location": {
    "coordinates": [83.2185, 17.6869],
    "name": "Hospital Main Campus",
    "address": "123 Hospital Lane"
  },
  "dateTime": "2026-04-15T09:00:00Z",
  "duration": { "hours": 6 },
  "capacity": 150,
  "facilities": ["Refreshments", "Medical team"],
  "bloodGroupsNeeded": ["O+", "A+"],
  "organizerContact": {
    "phone": "9876543210",
    "email": "hospital@example.com"
  }
}

Response:
{
  "success": true,
  "message": "Blood camp created successfully",
  "data": {
    "camp": {
      "_id": "64f3a2b1...",
      "title": "Blood Donation Campaign",
      "status": "upcoming"
    }
  }
}
```

### Real-time Socket Events
```javascript
// Connect to socket
const socket = io('http://localhost:5000', {
  query: {
    userId: 'user-123',
    role: 'hospital_admin'
  }
});

// Listen for new camps
socket.on('camp.created', (data) => {
  console.log('New camp:', data);
  // Update UI with new camp
});

// Listen for camp updates
socket.on('camp.updated', (data) => {
  console.log('Camp updated:', data.campId);
  // Refresh camp details
});

// Listen for cancellations
socket.on('camp.cancelled', (data) => {
  console.log('Camp cancelled:', data.title);
  // Show cancellation message
});

// Join specific camp room to get targeted updates
socket.emit('join:bloodcamp', 'camp-id-123');
```

---

## TROUBLESHOOTING

### Problem: I don't see new camps
**Solution**:
1. Refresh page (F5)
2. Check if you're logged in
3. Check notification permissions
4. Try logging out and back in

### Problem: Real-time updates not working
**Solution**:
1. Check internet connection
2. Open browser dev console (F12)
3. Look for socket error messages
4. Refresh the application
5. Try a different browser

### Problem: Can't organize a camp
**Solution**:
- If Public User: "Only verified users can organize camps"
  → Go to Settings → Complete identity verification
  
- If Hospital Admin: "Authorization failed"
  → Ensure you're logged in as admin
  → Check with hospital IT

### Problem: Can't book a slot
**Solution**:
- Verify your account is active and verified
- Check if camp still has available slots
- Try booking from another browser
- Contact hospital directly if issue persists

---

## FAQ

**Q: How many people can attend a camp?**  
A: Determined by the organizer. Each camp shows capacity (e.g., 150 donors).

**Q: Can I cancel my booking?**  
A: Yes, up to 24 hours before the camp date.

**Q: Will I get reminder notifications?**  
A: Yes, 24 hours and 1 hour before camp start time.

**Q: What blood groups are needed?**  
A: Varies by camp. Each camp specifies which groups are needed.

**Q: Do I need medical qualifications to organize?**  
A: For hospitals: Yes (hospital admin). For public users: Must be verified.

**Q: Can I see who else is attending?**  
A: No, for privacy reasons. Only camp organizer sees participant list.

**Q: What if a camp is cancelled?**  
A: All participants get notification with reason. Slots are refunded.

**Q: Can I update camp details after creation?**  
A: Yes, organizer can edit allowed fields anytime before camp date.

**Q: How do I get verified as public user?**  
A: Upload identity documents in Settings → Verification.

---

## CONTACT & SUPPORT

**Hospital Issues**: Contact Hospital Admin / IT Department  
**User Account Issues**: Contact Support via Dashboard  
**Technical Issues**: technical-support@bloodbank.io  
**Emergency**: Call 24/7 Hotline: +91-XXXX-XXXX-XXXX

---

**Last Updated**: April 1, 2026  
**System Version**: 1.0.0 Production Release  
**Status**: ✅ Live and Operational
