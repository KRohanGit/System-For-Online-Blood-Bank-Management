# Data Sourcing: Visual Diagrams for Presentation

## **DIAGRAM 1: Data Flow Architecture**

```
╔════════════════════════════════════════════════════════════════╗
║                   ADMIN DASHBOARD (React)                       ║
║        "Forecast demand" / "Simulate crisis" / etc.             ║
╚═══════════════════┬════════════════════════════════════════════╝
                    │
                    │ HTTP Request
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXPRESS API GATEWAY (Node.js)                       │
│          Authentication + proxy to ML service                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │ Forward to ML
                       ▼
╔═════════════════════════════════════════════════════════════════╗
║             FASTAPI ML SERVICE (Python)                         ║
║  ┌─────────────────────────────────────────────────────────┐   ║
║  │ Route Handler:                                          │   ║
║  │ 1. Receive request                                      │   ║
║  │ 2. Call shared_utils.py functions                       │   ║
║  └──────────────┬──────────────────────────────────────────┘   ║
║                 │                                               ║
║     ┌───────────┴────────────┐                                 ║
║     │                         │                                 ║
║     ▼                         ▼                                 ║
║  ┌──────────────┐    ┌──────────────────────┐                  ║
║  │ Shared Utils │    │ Model Services       │                  ║
║  ├──────────────┤    ├──────────────────────┤                  ║
║  │ fetch_       │    │ demand_forecast.py   │                  ║
║  │  hospital    │    │ digital_twin.py      │                  ║
║  ├──────────────┤    │ rl_allocation.py     │                  ║
║  │ fetch_       │    │ graph_intelligence.py│                  ║
║  │  inventory   │    │ anomaly_detection.py │                  ║
║  ├──────────────┤    └──────────────────────┘                  ║
║  │ fetch_       │                                              ║
║  │  emergency   │                                              ║
║  ├──────────────┤                                              ║
║  │ fetch_       │                                              ║
║  │  donation    │                                              ║
║  └──────────────┘                                              ║
╚════════════════════════╦═════════════════════════════════════════╝
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼ (Query)                       ▼ (Fallback if empty)
    ┌─────────────────┐             ┌──────────────────┐
    │  MONGODB ATLAS  │             │  SYNTHETIC DATA  │
    ├─────────────────┤             ├──────────────────┤
    │ hospitalprofiles│             │ Mock generators  │
    │ bloodinventories│             │ Seed scripts     │
    │ emergencyrequests           │ Random data      │
    │ donations       │             │ (reproducible)   │
    └─────────────────┘             └──────────────────┘
         200 hospitals
         500 inventory units
         1000 emergency requests
         2000 donation records
```

---

## **DIAGRAM 2: Data Per Model (What Each Model Queries)**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONGODB (Live Data Source)                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │   Hospital   │   Inventory  │ Emergency    │   Donations  │  │
│  │   Profiles   │   (Live)     │ Requests     │  (Historical)│  │
│  │              │              │  (Recent)    │              │  │
│  │ • ID         │ • Blood group│ • Hospital   │ • Donor ID   │  │
│  │ • Location   │ • Expiry     │ • Blood type │ • Blood type │  │
│  │ • City       │ • Status     │ • Units      │ • Date       │  │
│  │ • Verified   │ • Collection │ • Urgency    │ • Volume     │  │
│  │              │   date       │              │              │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ▲                ▲                ▲              ▲
         │                │                │              │
    ┌────┴────┐      ┌────┴────┐      ┌───┴───┐      ┌───┴───┐
    │  Graph  │      │ Anomaly │      │Digital│      │  RL   │
    │Intelligence   │Detection │      │ Twin  │      │Alloc  │
    │              │          │      │       │      │ ation │
    │ Builds      │ Triggers │      │ Gets  │      │ Uses  │
    │ network     │ on stock │      │ current         │histor│
    │ from coords │ changes  │      │state + │      │ical  │
    │            │ & demand │      │scenario       │supply│
    │            │ anomalies│      │params        │demand│
    └────┬───────┘      └────┬────┘      └───┬───┘      └───┬───┘
         │                  │               │              │
         │ Output           │ Output        │ Output       │ Output
         ▼                  ▼               ▼              ▼
    Centrality +     Alerts +          Risk Level +   Transfer
    Bottleneck       Severity          Confidence +   Routes +
    Analysis                           Decision Plan  Optimization
```

---

## **DIAGRAM 3: Data Freshness & Update Frequency**

```
PRODUCTION TIMELINE
─────────────────────────────────────────────────────────────

Current Moment (Now)
        │
        │ Admin clicks "Analyze Risk for Hospital X"
        │
        ▼
    ┌───────────────────────────────────────────────┐
    │ ML Service receives request (< 100ms)          │
    └────────────────┬────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────┐
    │ Fetch fresh MongoDB data (< 500ms)            │
    │  - Current inventory (snapshot now)           │
    │  - Last 1000 emergency requests (recent)      │
    │  - Last 2000 donations (6+ months history)    │
    └────────────────┬────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────┐
    │ Process live data (< 1000ms)                  │
    │  - Extract patterns (Scikit-learn)            │
    │  - Simulate scenarios (Monte Carlo)           │
    │  - Rank hospitals (Graph algorithms)          │
    └────────────────┬────────────────────────────────┘
                     │
                     ▼
    ┌───────────────────────────────────────────────┐
    │ Return results (< 200ms)                      │
    │ Total: ~2 seconds end-to-end                  │
    └───────────────────────────────────────────────┘

    Data Freshness: REAL-TIME (updated every request)
    No stale training data; always current
```

---

## **DIAGRAM 4: Data Comparison: Training vs Our Approach**

```
TRADITIONAL ML APPROACH              OUR LIVE-DATA APPROACH
───────────────────────────────────    ──────────────────────────────

1. Collect Dataset              1. No collection phase
   (weeks/months)
   
2. Clean & Label                2. Direct MongoDB queries
   (weeks)
   
3. Train Model                  3. Fetch + Process at request time
   (hours/days)
   
4. Save Weights                 4. No saved weights
   (model.pkl)                     (each request is fresh)
   
5. Deploy                       5. Deploy & Ready
   
6. Use                          6. Live queries with latest data
   (reuse old weights)            (always current)

7. Model goes stale             7. Self-updating
   (new data not used)            (uses live data)

RESULT:
Traditional: Fast inference,    Our Approach: Fresh results, 
             stale data                       live data,
             rigid,                          adaptive,
             offline-trained               online-computing
```

---

## **DIAGRAM 5: Data Flow for Each ML Model**

### **Demand Forecasting**
```
Request: "Forecast O+ demand for Vizag, next 7 days"
              ▼
    Fetch: emergencyrequests (1000 most recent)
           Filter: city='Vizag' AND bloodGroup='O+'
              ▼
    Extract: Daily avg, trend, seasonality
             (Scikit-learn time-series features)
              ▼
    Analyze: Past 180 days pattern
             → if upward trend: +10% buffer
             → if downward: -5% expected
              ▼
    Return: {forecast: 120 units, confidence: 0.87, trend: +5%}
```

### **Digital Twin Simulation**
```
Request: "Simulate disaster for Hospital X"
              ▼
    Fetch: hospitalprofiles (Hospital X details)
           bloodinventories (current stock)
           emergencyrequests (baseline patterns)
              ▼
    Setup: Initial state from live inventory
           Apply scenario multiplier (disaster: demand ×1.8)
              ▼
    Monte Carlo: Run 1000 stochastic simulations
                 → Each: random demand + supply + expiry
                 → Track: stockout events, time-to-fail
              ▼
    Return: {risk: CRITICAL, stockout_prob: 0.78, ttf: 14h}
```

### **RL Allocation**
```
Request: "Find best route for O+ transfer from A to B"
              ▼
    Fetch: hospitalprofiles (all hospitals + coordinates)
           donations (past transfer success/time)
           emergencyrequests (demand patterns)
              ▼
    Build State: Current inventory per hospital
    Build Action: All possible routes between hospitals
    Build Rewards: Historical success/failure + time saved
              ▼
    RL Policy: Find route maximizing reward
              (minimize time + expiry waste)
              ▼
    Return: {route: A→C→B, time: 2.3h, saves: 12 units}
```

### **Graph Intelligence**
```
Request: "Analyze network critical points"
              ▼
    Fetch: hospitalprofiles (200 hospitals + coordinates)
           bloodinventories (supply at each hospital)
              ▼
    Build Graph: Nodes = hospitals
                 Edges = distance-based (Haversine)
                 Weights = past successful transfers
              ▼
    Compute: Centrality (degree, betweenness, closeness, PageRank)
             Community detection
             Bottleneck identification
              ▼
    Return: {bottleneck: Hospital X, criticality: 0.78,
             if_fails: 67% network isolated}
```

### **Anomaly Detection**
```
Real-Time Event:
    - New inventory arrives
    - OR emergency request filed
    - OR donation received
              ▼
    Fetch: Historical baseline for this category
           (past 3 months of data)
              ▼
    Compute: Mean, Std, Z-score, IQR
              ▼
    Check: Is current event > 3-sigma anomaly?
           Is it outside IQR whiskers?
              ▼
    Decision: If anomaly detected
              → Send alert with severity
              
    Example: O- stock dropped from 45 → 3 units
             Z-score = 4.2 (anomaly threshold = 3.0)
             Alert: "CRITICAL: O- stock anomaly"
```

---

## **DIAGRAM 6: For Your Slide Deck**

### **Slide 1: "Where's Our Data?"**
```
┌────────────────────────────────────────────┐
│     ML Intelligence Data Architecture      │
├────────────────────────────────────────────┤
│                                            │
│  ❌ External datasets? NO                  │
│  ❌ Pre-trained models? NO                 │
│  ✅ Live MongoDB? YES                      │
│  ✅ Real-time computation? YES             │
│                                            │
│  Request → Fetch MongoDB → Process → Return│
│               (< 2 seconds)                │
│                                            │
│  Data Volume per Query:                    │
│  • 200 hospitals                          │
│  • 500 inventory units                     │
│  • 1000 emergency requests                │
│  • 2000 donation records                   │
│                                            │
└────────────────────────────────────────────┘
```

### **Slide 2: "Data Sources"**
```
┌────────────────────────────────────────────┐
│         MongoDB Data Collections            │
├────────────────────────────────────────────┤
│                                            │
│ 🏥 HospitalProfiles                        │
│    • Names (King George Hospital, etc.)    │
│    • Coordinates (real locations)          │
│    • Verification status                   │
│                                            │
│ 🩸 BloodInventories (Live)                │
│    • Blood group, units, expiry            │
│    • Updated in real-time                  │
│    • 500 units per query                   │
│                                            │
│ 🆘 EmergencyRequests (Recent)              │
│    • Hospital, blood type, units needed    │
│    • Last 1000 requests                    │
│    • Patterns for anomaly detection        │
│                                            │
│ 💉 Donations (Historical)                  │
│    • Donor, blood type, volume, date       │
│    • Last 2000 donations                   │
│    • Supply patterns for forecasting       │
│                                            │
└────────────────────────────────────────────┘
```

### **Slide 3: "How Models Use Data"**
```
┌──────────────────────────────────────────────┐
│   Live-Data Request-Time Computing           │
├──────────────────────────────────────────────┤
│                                              │
│ Demand Forecast:  "What's needed next week?" │
│ → Uses: Emergency request patterns           │
│                                              │
│ Digital Twin:     "Can we handle crisis?"    │
│ → Uses: Current inventory + scenarios        │
│                                              │
│ RL Allocation:    "Best transfer route?"     │
│ → Uses: Hospital locations + history        │
│                                              │
│ Graph Intelligence: "What breaks if...?"    │
│ → Uses: Network topology + dependencies     │
│                                              │
│ Anomaly Detection: "Is this abnormal?"       │
│ → Uses: Real-time inventory changes         │
│                                              │
│ 🔄 All models: Fetch LIVE → Compute LIVE    │
│              → Fresh results every time     │
│                                              │
└──────────────────────────────────────────────┘
```

---

## **For Your Viva: Show This Data Flow**

When asked "Where's your dataset?", open your laptop and show:

1. **Open MongoDB Atlas → Collections:**
   - `hospitalprofiles` → Click → Show 5 hospitals (names, coordinates)
   - `bloodinventories` → Click → Show 10 units (groups, expiry)
   - `emergencyrequests` → Click → Show recent requests
   - `donations` → Click → Show donation history

2. **Show Code:**
   - `shared_utils.py` → Point to `fetch_hospital_data()` etc.
   - Show how each function queries MongoDB

3. **Show Live Demo:**
   - Create request in Postman → Show MongoDB query → Show results
   - Explain: "Each request triggers a fresh query"

