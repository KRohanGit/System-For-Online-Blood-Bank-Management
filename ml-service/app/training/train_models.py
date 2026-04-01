import numpy as np
import pandas as pd
import pickle
import os
from datetime import datetime, timedelta
from pymongo import MongoClient


MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


def get_db():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/lifelink")
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
        print(f"Insufficient data for demand model training ({len(results)} records)")
        return False
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
        print(f"Insufficient hospitals for crisis model ({len(hospitals)})")
        return False
    features = []
    labels = []
    for hospital_id in hospitals:
        inv_pipeline = [
            {"$match": {"hospital": hospital_id, "status": "Available"}},
            {"$group": {"_id": "$bloodGroup", "count": {"$sum": 1}}}
        ]
        inv = {r["_id"]: r["count"] for r in inv_col.aggregate(inv_pipeline)}
        cutoff = datetime.utcnow() - timedelta(days=30)
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
        row = []
        for bg in BLOOD_GROUPS:
            supply = inv.get(bg, 0)
            demand_info = dem.get(bg, {"total": 0, "critical": 0})
            row.extend([supply, demand_info["total"], demand_info["critical"]])
        features.append(row)
        total_supply = sum(inv.values())
        total_demand = sum(d["total"] for d in dem.values())
        crisis = 1 if total_supply < total_demand * 0.5 else 0
        labels.append(crisis)
    X = np.array(features)
    y = np.array(labels)
    from sklearn.ensemble import GradientBoostingClassifier
    model = GradientBoostingClassifier(
        n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42
    )
    model.fit(X, y)
    model_path = os.path.join(MODEL_DIR, "crisis_xgboost.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"Crisis Model Trained with {len(hospitals)} hospitals")
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
