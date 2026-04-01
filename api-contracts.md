# LifeLink API Contracts

## Base URLs
- Backend API: `http://localhost:5000/api`
- ML Service: `http://localhost:8000`
- WebSocket: `ws://localhost:5000`

## Authentication
All authenticated endpoints require `Authorization: Bearer <token>` header.

---

## Auth Routes (`/api/auth`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | /register | `{name, email, password, role}` | `{token, user}` |
| POST | /login | `{email, password}` | `{token, user}` |
| GET | /me | - | `{user}` |

## Donor Auth (`/api/donor-auth`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | /register | `{name, email, password, phone, bloodGroup}` | `{token, user}` |
| POST | /login | `{email, password}` | `{token, user}` |

## Hospital Routes (`/api/hospital`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | /profile | - | `{hospital}` |
| PUT | /profile | `{hospitalName, address, ...}` | `{hospital}` |
| GET | /inventory | - | `{inventory[]}` |
| POST | /create-donor | `{name, email, password, bloodGroup}` | `{donor}` |

## Blood Inventory (`/api/blood-inventory`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | / | - | `{inventory[]}` |
| POST | / | `{bloodGroup, component, units, expiryDate}` | `{unit}` |
| PUT | /:id | `{status, ...}` | `{unit}` |
| DELETE | /:id | - | `{success}` |

## Emergency Routes (`/api/emergency`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | /request | `{bloodGroup, unitsRequired, urgencyLevel, patientInfo}` | `{request}` |
| GET | /requests | - | `{requests[]}` |
| PUT | /request/:id | `{lifecycleStatus}` | `{request}` |

## Emergency Coordination (`/api/emergency-coordination`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | /create-request | `{requestingHospitalId, bloodGroup, unitsRequired, urgencyLevel, patientInfo}` | `{request}` |
| GET | /active-requests | - | `{requests[]}` |
| PATCH | /:id/assign | `{assignedHospitalId}` | `{request}` |
| PATCH | /:id/status | `{status}` | `{request}` |

## Blockchain Audit (`/api/blockchain`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | /chain/verify | - | `{valid, blocks}` |
| GET | /chain/stats | - | `{totalBlocks, totalTransactions, ...}` |
| GET | /block/:index | - | `{block}` |
| GET | /transactions/type/:type | - | `{transactions[]}` |
| GET | /audit/:entityType/:entityId | - | `{auditTrail[]}` |
| POST | /record/transfer | `{transferId, fromHospital, toHospital, bloodGroup, units}` | `{transactionId}` |
| POST | /record/donation | `{donationId, donorId, hospitalId, bloodGroup, volume}` | `{transactionId}` |
| POST | /record/emergency | `{requestId, hospitalId, bloodGroup, units, urgency}` | `{transactionId}` |

## ML Intelligence (`/api/ml`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | /predict/demand | `{hospitalId, bloodGroup, horizonDays}` | `{predictions[], confidence_interval}` |
| POST | /predict/crisis | `{hospitalId, lookaheadHours}` | `{crisis_probability, risk_level, contributing_factors[]}` |
| POST | /predict/donor-return | `{donorId, donationHistory, demographics}` | `{return_probability, churn_risk}` |
| POST | /predict/wastage | `{hospitalId, bloodGroup, horizonDays}` | `{at_risk_units[], fifo_recommendations[]}` |
| POST | /predict/anomalies | `{hospitalId, metricType, timeWindowHours}` | `{anomalies[], anomaly_count}` |
| POST | /predict/hospital-ranking | `{bloodGroup, urgency, patientLocation, unitsNeeded}` | `{ranked_hospitals[]}` |
| POST | /simulation/run | `{scenarioType, parameters, durationDays, monteCarloRuns}` | `{results, recommendations[]}` |
| POST | /optimize/transfers | `{objective, constraints, hospitalIds}` | `{optimal_transfers[], cost_savings}` |
| POST | /synthetic/generate | `{dataType, count, seed}` | `{data[], count}` |

## ML Service Direct (`http://localhost:8000`)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | /health | - | `{status, version, uptime_seconds}` |
| POST | /predict/demand | `{hospital_id, blood_group, horizon_days}` | Demand forecast |
| POST | /predict/crisis | `{hospital_id, lookahead_hours}` | Crisis prediction |
| POST | /predict/donor-return | `{donor_id, donation_history, demographics}` | Donor return probability |
| POST | /predict/wastage | `{hospital_id, blood_group, horizon_days}` | Wastage risk |
| POST | /predict/anomalies | `{hospital_id, metric_type, time_window_hours}` | Anomalies |
| POST | /predict/hospital-ranking | `{blood_group, urgency, patient_location, units_needed}` | Hospital rankings |
| POST | /federated/train | `{hospital_ids, model_type, rounds}` | Federated training results |
| POST | /federated/aggregate | `{session_id, local_weights}` | Aggregated model |
| POST | /simulation/run | `{scenario_type, parameters, duration_days}` | Simulation results |
| POST | /simulation/causal | `{treatment, outcome, confounders}` | Causal inference |
| GET | /simulation/scenarios | - | Available scenario types |
| POST | /optimize/classical | `{objective, constraints, hospital_ids}` | Classical optimization |
| POST | /optimize/quantum | `{hospital_ids, blood_groups, objective}` | Quantum-inspired optimization |
| POST | /optimize/compare | `{objective, hospital_ids}` | Comparison results |
| POST | /synthetic/generate | `{data_type, count, seed}` | Synthetic data |

## WebSocket Events

### Client-to-Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join:hospital` | `hospitalId` | Join hospital room |
| `join:emergency` | `emergencyId` | Join emergency room |
| `join:bloodcamp` | `campId` | Join blood camp room |

### Server-to-Client
| Event | Payload | Description |
|-------|---------|-------------|
| `emergency:new` | `{requestId, bloodGroup, urgency}` | New emergency |
| `emergency:critical` | `{requestId, bloodGroup, message}` | Critical emergency broadcast |
| `emergency:update` | `{requestId, newStatus}` | Emergency status change |
| `inventory:change` | `{hospitalId, bloodGroup, action}` | Inventory update |
| `alert:low_stock` | `{hospitalId, bloodGroup, currentStock}` | Low stock warning |
| `transfer:update` | `{transferId, status}` | Transfer status |
| `transfer:completed` | `{transferId}` | Transfer done |
| `donation:confirmed` | `{donationId, donorId}` | Donation confirmed |
| `appointment:reminder` | `{appointmentId, donorId}` | Appointment reminder |
| `system:alert` | `{services[], details}` | System health degradation |
