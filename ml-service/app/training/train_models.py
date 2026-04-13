import numpy as np
import pandas as pd
import pickle
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score, confusion_matrix


MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
CRISIS_LOOKBACK_DAYS = int(os.getenv("CRISIS_LOOKBACK_DAYS", "180"))
CRISIS_WINDOW_STEP_DAYS = int(os.getenv("CRISIS_WINDOW_STEP_DAYS", "3"))
CRISIS_AUGMENT_PER_WINDOW = int(os.getenv("CRISIS_AUGMENT_PER_WINDOW", "5"))
CRISIS_MIN_SAMPLES = int(os.getenv("CRISIS_MIN_SAMPLES", "300"))


def get_db():
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("Missing MongoDB URI. Set MONGO_URI (or MONGODB_URI).")
    client = MongoClient(mongo_uri)
    db_name = os.getenv("MONGO_DB_NAME", "lifelink")
    return client[db_name]


def train_demand_model():
    db = get_db()
    collection = db["emergencyrequests"]
    cutoff = datetime.utcnow() - timedelta(days=365)
    pipeline = [
        {"$match": {"createdAt": {"$gte": cutoff}}},
        {
            "$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                    "hospital": "$requestingHospitalId",
                    "bloodGroup": "$patientInfo.bloodGroup"
                },
                "units": {"$sum": "$unitsRequired"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.date": 1}}
    ]
    results = list(collection.aggregate(pipeline))
    if len(results) < 30:
        rng = np.random.default_rng(42)
        synthetic_rows = []
        synthetic_hospitals = [f"synthetic_hospital_{idx}" for idx in range(1, 7)]
        synthetic_days = pd.date_range(
            end=datetime.utcnow().date(),
            periods=120,
            freq="D"
        )

        for date_value in synthetic_days:
            day_of_week = int(date_value.dayofweek)
            month = int(date_value.month)
            weekend_boost = 1.18 if day_of_week >= 5 else 1.0
            seasonal_boost = 1.12 if month in (6, 7, 8, 12) else 1.0

            for hospital in synthetic_hospitals:
                hospital_factor = float(rng.uniform(0.8, 1.25))
                for blood_group in BLOOD_GROUPS:
                    blood_group_base = {
                        "A+": 12,
                        "A-": 5,
                        "B+": 10,
                        "B-": 4,
                        "AB+": 3,
                        "AB-": 2,
                        "O+": 14,
                        "O-": 6,
                    }.get(blood_group, 8)

                    units = max(
                        0,
                        int(round(
                            blood_group_base
                            * hospital_factor
                            * weekend_boost
                            * seasonal_boost
                            + rng.normal(0, 2.4)
                        ))
                    )
                    request_count = max(1, int(round(units / max(rng.uniform(1.8, 3.6), 1.0))))
                    synthetic_rows.append({
                        "date": date_value.strftime("%Y-%m-%d"),
                        "hospital": hospital,
                        "blood_group": blood_group,
                        "units": units,
                        "count": request_count,
                    })

        print(
            f"Insufficient demand data ({len(results)} records); using synthetic fallback "
            f"with {len(synthetic_rows)} rows"
        )
        df = pd.DataFrame(synthetic_rows)
    else:
        df = pd.DataFrame([{
            "date": r["_id"]["date"],
            "hospital": r["_id"]["hospital"],
            "blood_group": r["_id"]["bloodGroup"],
            "units": r["units"],
            "count": r["count"]
        } for r in results])
    df["date"] = pd.to_datetime(df["date"])
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import GradientBoostingRegressor
    feature_cols = ["day_of_week", "month", "is_weekend"]
    X = df[feature_cols].values
    y = df["units"].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    model.fit(X_scaled, y)
    model_path = os.path.join(MODEL_DIR, "demand_lstm.pkl")
    scaler_path = os.path.join(MODEL_DIR, "demand_scaler.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    from sklearn.metrics import mean_absolute_error, r2_score
    y_pred = model.predict(X_scaled)
    mae = mean_absolute_error(y, y_pred)
    r2 = r2_score(y, y_pred)
    print(f"Demand Model Trained: MAE={mae:.4f}, R2={r2:.4f}")
    print(f"Models saved to {MODEL_DIR}")
    return True


def train_crisis_model():
    db = get_db()
    inv_col = db["bloodinventories"]
    req_col = db["emergencyrequests"]
    hospitals = inv_col.distinct("hospital")
    if len(hospitals) < 3:
        print(f"Insufficient hospitals for crisis model ({len(hospitals)}); using synthetic fallback data")
    features = []
    labels = []

    def build_feature_row(inventory, demand, lookahead_hours, hospital_seed, phase_shift):
        row = []
        total_supply = 0
        total_demand = 0
        total_critical = 0
        total_expiring = 0

        for idx, bg in enumerate(BLOOD_GROUPS):
            supply = int(inventory.get(bg, 0))
            demand_info = demand.get(bg, {"total": 0, "critical": 0})
            requested = int(demand_info.get("total", 0))
            critical = int(demand_info.get("critical", 0))

            supply_jitter = max(0, supply + phase_shift + (hospital_seed % 3) - 1)
            demand_jitter = max(0, requested + ((hospital_seed + idx + phase_shift) % 4) - 1)
            critical_jitter = max(0, critical + (1 if (idx + phase_shift) % 5 == 0 else 0))
            expiring_jitter = max(0, int(round(supply_jitter * (0.05 + ((idx + phase_shift) % 3) * 0.02))))

            row.extend([
                supply_jitter,
                demand_jitter,
                critical_jitter,
                max(0.0, round(supply_jitter / max(demand_jitter, 1), 3)),
                round(max(0.0, 30 - phase_shift * 1.7 - idx * 0.35), 2),
                expiring_jitter
            ])

            total_supply += supply_jitter
            total_demand += demand_jitter
            total_critical += critical_jitter
            total_expiring += expiring_jitter

        crisis = 1 if (total_supply < total_demand * 0.55 or total_critical > 6 or total_expiring > total_supply * 0.25) else 0
        severity_score = round(
            min(1.0, max(0.0, (total_demand - total_supply) / max(total_demand, 1) + (total_critical * 0.04) + (total_expiring * 0.03))),
            4
        )
        row.extend([lookahead_hours, total_supply, total_demand, total_critical, total_expiring, severity_score])
        return row, crisis

    lookahead_windows = list(range(6, 169, 6))
    for hospital_index, hospital_id in enumerate(hospitals):
        inv_pipeline = [
            {"$match": {"hospital": hospital_id, "status": "Available"}},
            {"$group": {"_id": "$bloodGroup", "count": {"$sum": 1}}}
        ]
        inv = {r["_id"]: r["count"] for r in inv_col.aggregate(inv_pipeline)}

        for window_index, lookahead_hours in enumerate(lookahead_windows):
            cutoff = datetime.utcnow() - timedelta(days=min(CRISIS_LOOKBACK_DAYS, max(lookahead_hours // 24 + 7, 30)))
            req_pipeline = [
                {"$match": {"requestingHospitalId": hospital_id, "createdAt": {"$gte": cutoff}}},
                {
                    "$group": {
                        "_id": "$patientInfo.bloodGroup",
                        "total": {"$sum": "$unitsRequired"},
                        "critical": {"$sum": {"$cond": [{"$eq": ["$urgencyLevel", "critical"]}, 1, 0]}}
                    }
                }
            ]
            dem = {r["_id"]: {"total": r["total"], "critical": r["critical"]}
                   for r in req_col.aggregate(req_pipeline)}

            for augment_index in range(CRISIS_AUGMENT_PER_WINDOW):
                row, crisis = build_feature_row(
                    inv,
                    dem,
                    lookahead_hours=lookahead_hours,
                    hospital_seed=hospital_index + 1,
                    phase_shift=window_index + augment_index
                )
                features.append(row)
                labels.append(crisis)

    if len(features) < CRISIS_MIN_SAMPLES:
        synthetic_target = max(CRISIS_MIN_SAMPLES * 4, 4000)
        rng = np.random.default_rng(42)
        while len(features) < synthetic_target:
            target_crisis = len(labels) % 2 == 0
            if target_crisis:
                synthetic_inventory = {
                    bg: int(rng.integers(0, 8))
                    for bg in BLOOD_GROUPS
                }
                synthetic_demand = {
                    bg: {
                        "total": int(rng.integers(40, 120)),
                        "critical": int(rng.integers(3, 10))
                    }
                    for bg in BLOOD_GROUPS
                }
                phase_shift = int(rng.integers(8, 16))
            else:
                synthetic_inventory = {
                    bg: int(rng.integers(55, 130))
                    for bg in BLOOD_GROUPS
                }
                synthetic_demand = {
                    bg: {
                        "total": int(rng.integers(0, 6)),
                        "critical": int(rng.integers(0, 2))
                    }
                    for bg in BLOOD_GROUPS
                }
                phase_shift = int(rng.integers(0, 4))

            lookahead_hours = int(rng.choice(lookahead_windows))
            hospital_seed = int(rng.integers(1, max(len(hospitals), 25) + 1))
            row, crisis = build_feature_row(
                synthetic_inventory,
                synthetic_demand,
                lookahead_hours=lookahead_hours,
                hospital_seed=hospital_seed,
                phase_shift=phase_shift
            )
            if crisis != int(target_crisis):
                continue
            features.append(row)
            labels.append(crisis)

        print(f"Crisis training augmented with {len(features)} synthetic samples")

    X = np.array(features, dtype=float)
    y = np.array(labels, dtype=int)

    if len(X) < CRISIS_MIN_SAMPLES:
        print(f"Insufficient crisis samples after augmentation ({len(X)} samples)")
        return False
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y if len(np.unique(y)) > 1 else None
    )

    candidate_models = [
        GradientBoostingClassifier(
            n_estimators=180,
            max_depth=3,
            learning_rate=0.06,
            random_state=42
        ),
        RandomForestClassifier(
            n_estimators=240,
            max_depth=12,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        )
    ]

    best_model = None
    best_score = -1.0
    best_metrics = {}

    for candidate in candidate_models:
        candidate.fit(X_train, y_train)
        preds = candidate.predict(X_test)
        probs = candidate.predict_proba(X_test)[:, 1] if hasattr(candidate, "predict_proba") else preds
        accuracy = accuracy_score(y_test, preds)
        precision = precision_score(y_test, preds, zero_division=0)
        recall = recall_score(y_test, preds, zero_division=0)
        f1 = f1_score(y_test, preds, zero_division=0)
        auc = roc_auc_score(y_test, probs) if len(np.unique(y_test)) > 1 else 0.5
        score = (f1 * 0.45) + (recall * 0.25) + (precision * 0.15) + (accuracy * 0.15)
        if score > best_score:
            best_score = score
            best_model = candidate
            best_metrics = {
                "accuracy": round(float(accuracy), 4),
                "precision": round(float(precision), 4),
                "recall": round(float(recall), 4),
                "f1": round(float(f1), 4),
                "roc_auc": round(float(auc), 4),
                "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
                "train_samples": int(len(X_train)),
                "test_samples": int(len(X_test))
            }

    model = best_model
    model_path = os.path.join(MODEL_DIR, "crisis_xgboost.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    metrics_path = os.path.join(MODEL_DIR, "crisis_xgboost_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        import json
        json.dump(best_metrics, f, indent=2)

    print(f"Crisis Model Trained with {len(hospitals)} hospitals and {len(X)} samples")
    print(f"Crisis Model Metrics: {best_metrics}")
    return True


if __name__ == "__main__":
    print("Starting model training pipeline...")
    print("=" * 50)
    print("Training demand forecasting model...")
    train_demand_model()
    print("=" * 50)
    print("Training crisis prediction model...")
    train_crisis_model()
    print("=" * 50)
    print("Training complete.")
