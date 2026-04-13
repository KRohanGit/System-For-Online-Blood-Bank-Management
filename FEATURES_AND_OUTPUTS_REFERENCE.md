# ML Intelligence Hub: Specific Features & Outputs Reference

## **QUICK OUTPUT EXAMPLES (Show these, don't just explain)**

---

## **DEMAND FORECASTING FEATURES**

### What It Returns
```
{
  "forecast": {
    "O_positive": 120,          ← Predicted units needed
    "O_negative": 45,
    "A_positive": 85,
    "A_negative": 30,
    "B_positive": 60,
    "B_negative": 25,
    "AB_positive": 15,
    "AB_negative": 8
  },
  "confidence": 0.87,            ← How sure we are
  "trend": "upward",             ← Is demand rising or stable?
  "basis": "7-day historical pattern with 3% weekend variance"
}
```

### Feature to Highlight
**NOT just prediction—it's pattern-aware:**
- "We don't just say 'O+ = 120'. We say 'O+ = 120 with 87% confidence; compared to last week's 110 (9% increase). Weekends drop 3%.'"
- This shows **data-driven reasoning**, not magic numbers.

---

## **DIGITAL TWIN FEATURES**

### What It Returns
```
{
  "scenario": "disaster",
  "simulation_runs": 1000,
  
  "risk_level": "CRITICAL",
  "stockout_probability": 0.78,     ← How likely we run out
  "time_to_failure": "14 hours",     ← When we run out
  
  "resilience_score": 41,            ← Out of 100
  "status": "VULNERABLE",
  
  "vulnerable_blood_groups": {
    "O_negative": {
      "stockout_prob": 0.92,
      "average_shortage_duration": "8.3 hours",
      "unmet_requests": 23                ← People couldn't get blood
    },
    "AB_positive": {
      "stockout_prob": 0.64,
      "average_shortage_duration": "5.2 hours",
      "unmet_requests": 8
    }
  },
  
  "confidence_score": 0.82,           ← We're 82% confident in this prediction
  "decision_urgency": "URGENT - Next 6 hours critical"
}
```

### Features to Highlight
1. **Stochastic modeling** (not just averages—we simulate 1000 different outcomes)
2. **Per-blood-group vulnerability** (AB- might be fine, but O- is critical)
3. **Unmet requests tracking** (it's not just numbers; real people couldn't get blood in simulation)
4. **Confidence scoring** (we tell admin HOW SURE we are)
5. **Actionability** (we say "next 6 hours critical", not just "risk is high")

---

## **RL ALLOCATION FEATURES**

### What It Returns
```
{
  "allocation_plan": [
    {
      "action": 1,
      "from_hospital": "City Hospital (stock: 85 units O+)",
      "to_hospital": "Rural Clinic (demand: 50 units O+)",
      "blood_type": "O_positive",
      "quantity": 40,
      "route_time": "2.3 hours",           ← Optimized to save time
      "expiry_risk": "Low (20% wastage)",
      "priority": 1,
      "rationale": "Closest hospital with surplus; prevents expiry"
    },
    {
      "action": 2,
      "from_hospital": "Hospital B",
      "to_hospital": "District Medical",
      "blood_type": "AB_negative",
      "quantity": 8,
      "route_time": "1.8 hours",
      "expiry_risk": "Medium (rare blood, 4-day shelf life)",
      "priority": 2,
      "rationale": "Only source for rare blood group"
    }
  ],
  
  "total_wastage_saved": "12 units",      ← Concrete saving
  "total_delivery_time_saved": "4.7 hours",
  "network_utilization": 0.89             ← How efficiently network is used
}
```

### Features to Highlight
1. **Per-route optimization** (not just "send blood"—here's the route, time, and why)
2. **Expiry-aware routing** (we don't just send; we minimize wastage based on shelf life)
3. **Concrete savings** (12 units saved, 4.7 hours saved—measurable impact)
4. **Justification for each step** (Why Hospital B? Because only source for rare blood)
5. **Network efficiency score** (89% utilization = we're using the network well)

---

## **GRAPH INTELLIGENCE FEATURES**

### What It Returns
```
{
  "network_topology": {
    "total_hospitals": 24,
    "connections": 67,
    "density": 0.24,                   ← Network is sparse (good for resilience)
    "fragmentation_risk": 0.18         ← 18% risk of split if key node fails
  },
  
  "centrality_metrics": {
    "City Hospital": {
      "degree_centrality": 0.95,       ← Connected to 95% of network
      "betweenness": 0.78,             ← Critical intermediary (78% of paths go through it)
      "closeness": 0.82,               ← Can reach others quickly
      "pagerank": 0.34                 ← Overall network importance
    },
    "Rural Clinic": {
      "degree_centrality": 0.12,       ← Connected to only 12% of network
      "betweenness": 0.02,             ← Not used as intermediary
      "closeness": 0.45,               ← Slow to reach others
      "pagerank": 0.03                 ← Low network importance
    }
  },
  
  "bottleneck_analysis": [
    {
      "hospital": "City Hospital",
      "risk_level": "CRITICAL",
      "why": "Betweenness 0.78 AND stock only 15 units while demand is 45",
      "impact_if_fails": "67% of network loses access to primary supplier",
      "recommendation": "Build backup supply route via Hospital B"
    },
    {
      "hospital": "District Medical",
      "risk_level": "HIGH",
      "why": "Betweenness 0.45; handles rare blood group AB-",
      "impact_if_fails": "AB- not available to 18 hospitals",
      "recommendation": "Train secondary coordinator at Hospital A for AB-"
    }
  ],
  
  "stability_index": 0.68,              ← Overall network robustness (0-1)
  "stability_status": "MODERATE",
  "key_vulnerabilities": [
    "Single point of failure: City Hospital (67% dependency)",
    "Sparse connections reduce redundancy",
    "AB- availability isolated to one supplier"
  ]
}
```

### Features to Highlight
1. **Bottleneck identification** (not just "City Hospital is important"—here's WHY and WHAT BREAKS if it fails)
2. **Per-hospital criticality** (Each hospital gets centrality metrics + impact score)
3. **Stability index** (One number: is the network resilient or fragile?)
4. **Specific recommendations** (Not just diagnosis; here's how to fix it)
5. **Network dependency mapping** (67% of network depends on City Hospital—that's a concrete risk)

---

## **ANOMALY DETECTION FEATURES**

### What It Returns
```
{
  "alerts": [
    {
      "timestamp": "2025-04-07T09:15:00Z",
      "type": "INVENTORY_ANOMALY",
      "blood_group": "O_negative",
      "metric": "stock_drop",
      "detected_value": 3,             ← Current stock
      "baseline": 45,                  ← Normal stock
      "deviation": "93% drop",
      "z_score": 4.2,                  ← Statistically extreme (>3 is anomaly)
      "iqr_status": "Beyond upper whisker",
      "severity": "CRITICAL",
      "probable_causes": [
        "Emergency demand spike (8 requests vs normal 1-2)",
        "Expiry event (12 units expired batch)",
        "Transfusion event (30 units used in 4 hours)"
      ],
      "recommended_action": "Trigger emergency donor call"
    },
    {
      "timestamp": "2025-04-07T10:22:00Z",
      "type": "DEMAND_ANOMALY",
      "blood_group": "AB_positive",
      "metric": "request_spike",
      "detected_value": 12,             ← Current requests (hourly avg)
      "baseline": 1.5,                  ← Normal hourly average
      "deviation": "700% above normal",
      "z_score": 3.8,
      "severity": "HIGH",
      "probable_causes": [
        "Planned surgery day (8 surgeries scheduled)",
        "Accident/mass casualty event"
      ],
      "recommended_action": "Pre-alert nearby hospitals for AB+ transfer"
    }
  ],
  
  "detection_method": "Z-score (>3 sigma) + IQR (outlier detection)",
  "monitoring_frequency": "Every 15 minutes",
  "false_positive_rate": 0.02          ← 2% false alarms (good)
}
```

### Features to Highlight
1. **Real-time monitoring** (Not batch processing; alerts within minutes)
2. **Statistical rigor** (Z-score > 3, IQR analysis—not just threshold rules)
3. **Root-cause analysis** (Why did it happen? Expiry? Demand spike? Emergency?)
4. **Severity ranking** (CRITICAL vs HIGH vs MODERATE)
5. **Low false-positive rate** (Only 2% false alarms—admin can trust it)

---

## **RESILIENCE SCORING FEATURES**

### What It Returns
```
{
  "hospitals_ranked": [
    {
      "rank": 1,
      "hospital_name": "District Hospital",
      "resilience_score": 82,          ← Out of 100
      "status": "STABLE",
      "components": {
        "stock_availability": 0.88,     ← 35% weight
        "recovery_capacity": 0.75,      ← 25% weight
        "redundancy_factor": 0.92,      ← 20% weight (well-connected network)
        "volatility_index": 0.81        ← 20% weight (stable demand)
      },
      "interpretation": "Can survive 3-day demand spike 85% of time",
      "intervention_priority": "NONE - Stable"
    },
    {
      "rank": 2,
      "hospital_name": "Rural Clinic",
      "resilience_score": 45,
      "status": "VULNERABLE",
      "components": {
        "stock_availability": 0.35,     ← Low (disconnected from donors)
        "recovery_capacity": 0.42,      ← Slow to recover
        "redundancy_factor": 0.15,      ← Low (only 1 supplier connection)
        "volatility_index": 0.68        ← Erratic demand pattern
      },
      "interpretation": "Cannot handle 2-day demand spike; needs support",
      "intervention_priority": "HIGH - Recommend training backup coordinator + pre-position stock"
    },
    {
      "rank": 3,
      "hospital_name": "City Hospital",
      "resilience_score": 28,           ← CRITICAL
      "status": "CRITICAL",
      "components": {
        "stock_availability": 0.10,     ← Severely understocked
        "recovery_capacity": 0.18,      ← Cannot recover from shortage
        "redundancy_factor": 0.08,      ← Single-point failure risk
        "volatility_index": 0.35        ← Chaotic demand pattern
      },
      "intervention_priority": "URGENT - Immediate supply transfer + demand stabilization"
    }
  ],
  
  "insights": {
    "most_stable_blood_group": "O_positive (avg resilience 0.81 across all hospitals)",
    "most_vulnerable": "AB_negative (avg resilience 0.34; limited donors)",
    "network_overall": 0.64,            ← Average hospital resilience
    "recommendation": "Focus intervention on Rural Clinic & City Hospital before district-wide crisis"
  }
}
```

### Features to Highlight
1. **Ranked hospital list** (Not just data—here's who needs help FIRST)
2. **Component breakdown** (Admin can see: is it stock issue? Network issue? Demand issue?)
3. **Interpretation in plain English** ("Can survive 3-day spike" vs just "resilience 82")
4. **Actionable recommendations** (Not diagnosis only; here's the intervention)
5. **Network-wide insight** (Which blood groups are safe? Which are vulnerable?)

---

## **STRATEGY RECOMMENDATION FEATURES**

### What It Returns
```
{
  "current_situation": {
    "risk_level": "HIGH",
    "scenario": "demand_spike_moderate",
    "trigger": "Forecast suggests 35% demand increase; Anomaly detected 2 hours ago"
  },
  
  "recommended_strategy": "Donor Campaign + Stock Transfer",
  "confidence": 0.87,                  ← 87% sure this is the right call
  
  "ranked_actions": [
    {
      "action_number": 1,
      "action": "TRIGGER_DONOR_CAMPAIGN",
      "description": "SMS + Call to registered donors for O+, A+, B+",
      "urgency": "CRITICAL",
      "time_to_execute": "15 minutes",
      "expected_units_collected": "45-60 within 6 hours",
      "cost": "$200 (SMS + phone)",
      "success_probability": 0.92,
      "rationale": "Demand spike is demand-driven (supply normal). Fastest turnaround."
    },
    {
      "action_number": 2,
      "action": "PRE_COORDINATE_TRANSFER",
      "description": "Contact Hospital B + Hospital C for pre-positioned stock transfer",
      "urgency": "HIGH",
      "time_to_execute": "30 minutes",
      "expected_units": "30-40",
      "cost": "$150 (courier + coordination)",
      "success_probability": 0.78,
      "rationale": "If donor campaign delays, transfer acts as backup. Parallel execution."
    },
    {
      "action_number": 3,
      "action": "ALERT_RARE_BLOOD_COORDINATORS",
      "description": "Notify AB- coordinator (low frequency but high impact)",
      "urgency": "MODERATE",
      "time_to_execute": "10 minutes",
      "expected_units": "2-5 (low volume, high value)",
      "cost": "$50",
      "success_probability": 0.65,
      "rationale": "Rare blood unlikely in spike, but prep now prevents panic later."
    }
  ],
  
  "alternative_strategies": [
    {
      "strategy": "Do Nothing",
      "confidence": 0.12,
      "reason": "Risk is HIGH; passive approach fails 78% of time in simulations"
    },
    {
      "strategy": "Stock Transfer Only (no campaign)",
      "confidence": 0.31,
      "reason": "Slower than donor campaign; increases stockout risk from 0.45 to 0.62"
    }
  ],
  
  "success_metrics": {
    "if_executed": "Risk drops from HIGH to MODERATE; time-to-failure extends from 18h to 36h",
    "estimated_outcome": "10 units surplus by end of campaign window; 0 unmet requests"
  },
  
  "time_sensitivity": "URGENT - Every 30 minutes delay reduces success probability by 3%"
}
```

### Features to Highlight
1. **Ranked action sequence** (Not just "do this"—here's priority 1, 2, 3)
2. **Per-action details** (Time to execute, cost, success probability)
3. **Confidence scoring** (87% sure this is right, labeled alternatives are worse)
4. **Parallel execution** (Actions 1 & 2 run simultaneously, not sequential)
5. **Measurable outcomes** (If you do this, risk drops from HIGH to MODERATE; here's proof)
6. **Time sensitivity** (Every 30-min delay costs 3% success—this creates urgency)

---

## **How to Show These in Your Review**

### **Slide 1: Show the Outputs, Then Explain**
```
[Show a screenshot of Digital Twin output: Risk CRITICAL, 14 hours, 78% stockout prob]

"This isn't just a number—it's a complete risk picture. We know:
- We're 78% likely to run out
- We have 14 hours to respond
- These 3 blood groups are most critical
- We're 82% confident in this prediction
- Decision urgency: Next 6 hours are critical"
```

### **Slide 2: Show the Actionability**
```
[Show Strategy Recommendation output: Donor Campaign + Transfer, ranked, 0.87 confidence]

"And here's what to DO about it:
- Step 1: Trigger Donor Campaign (87% confidence this works)
- Step 2: Pre-coordinate Transfer (parallel execution)
- Step 3: Rare blood alert (backup)
- If you execute all 3, risk drops from CRITICAL to MODERATE"
```

### **Slide 3: The Differentiation**
```
Most systems say: "You need 120 units of O+"
We say: "You need 120 units O+ (Forecast), but only 87% sure (Digital Twin),
so trigger Donor Campaign + Transfer (Strategy), which saves 4.7 hours (RL),
targets Rural Clinic first (Resilience), and works around these 2 critical hospitals (Graph),
unless anomaly happens—we'll alert you in 15 min if it does (Anomaly)"
```

