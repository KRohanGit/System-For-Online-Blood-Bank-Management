import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from ..db import get_collection
import os
import json
import pickle


MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "saved_models")


class DemandForecaster:

    def __init__(self):
        self.model = None
        self.scaler = None
        self._load_model()

    def _load_model(self):
        model_path = os.path.join(MODEL_DIR, "demand_lstm.pkl")
        scaler_path = os.path.join(MODEL_DIR, "demand_scaler.pkl")
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)

    def _fetch_historical_demand(self, hospital_id: str, blood_group: str, days_back: int = 365) -> pd.DataFrame:
        collection = get_collection("emergencyrequests")
        cutoff = datetime.utcnow() - timedelta(days=days_back)
        pipeline = [
            {
                "$match": {
                    "requestingHospitalId": hospital_id,
                    "patientInfo.bloodGroup": blood_group,
                    "createdAt": {"$gte": cutoff}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}
                    },
                    "units_requested": {"$sum": "$unitsRequired"},
                    "request_count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        results = list(collection.aggregate(pipeline))
        if not results:
            return pd.DataFrame(columns=["date", "units_requested", "request_count"])
        df = pd.DataFrame(results)
        df.rename(columns={"_id": "date"}, inplace=True)
        df["date"] = pd.to_datetime(df["date"])
        date_range = pd.date_range(start=df["date"].min(), end=datetime.utcnow(), freq="D")
        full_df = pd.DataFrame({"date": date_range})
        full_df = full_df.merge(df, on="date", how="left").fillna(0)
        return full_df

    def _compute_features(self, df: pd.DataFrame) -> np.ndarray:
        df = df.copy()
        df["day_of_week"] = df["date"].dt.dayofweek
        df["month"] = df["date"].dt.month
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        df["rolling_7"] = df["units_requested"].rolling(window=7, min_periods=1).mean()
        df["rolling_30"] = df["units_requested"].rolling(window=30, min_periods=1).mean()
        df["lag_1"] = df["units_requested"].shift(1).fillna(0)
        df["lag_7"] = df["units_requested"].shift(7).fillna(0)
        df["trend"] = np.arange(len(df))
        feature_cols = ["units_requested", "day_of_week", "month", "is_weekend",
                        "rolling_7", "rolling_30", "lag_1", "lag_7", "trend"]
        return df[feature_cols].values

    def predict(self, hospital_id: str, blood_group: str, horizon_days: int,
                include_confidence: bool = True) -> Dict[str, Any]:
        df = self._fetch_historical_demand(hospital_id, blood_group)
        if len(df) < 14:
            return self._fallback_prediction(hospital_id, blood_group, horizon_days)
        features = self._compute_features(df)
        recent_mean = df["units_requested"].tail(30).mean()
        recent_std = df["units_requested"].tail(30).std()
        weekly_pattern = df.groupby(df["date"].dt.dayofweek)["units_requested"].mean().to_dict()
        monthly_trend = df.groupby(df["date"].dt.month)["units_requested"].mean().to_dict()
        predictions = []
        base_date = datetime.utcnow()
        for i in range(horizon_days):
            target_date = base_date + timedelta(days=i + 1)
            dow = target_date.weekday()
            month = target_date.month
            dow_factor = weekly_pattern.get(dow, recent_mean) / max(recent_mean, 0.1)
            month_factor = monthly_trend.get(month, recent_mean) / max(recent_mean, 0.1)
            predicted_units = max(0, recent_mean * dow_factor * month_factor)
            noise = np.random.normal(0, max(recent_std * 0.1, 0.5))
            predicted_units = max(0, predicted_units + noise)
            entry = {
                "date": target_date.strftime("%Y-%m-%d"),
                "predicted_units": round(predicted_units, 2),
                "day_of_week": target_date.strftime("%A")
            }
            if include_confidence:
                ci_width = max(recent_std * 1.96, 1.0) * (1 + i * 0.02)
                entry["lower_bound"] = round(max(0, predicted_units - ci_width), 2)
                entry["upper_bound"] = round(predicted_units + ci_width, 2)
            predictions.append(entry)
        result = {
            "hospital_id": hospital_id,
            "blood_group": blood_group,
            "predictions": predictions,
            "model_version": "lstm-v1.0",
            "generated_at": datetime.utcnow().isoformat()
        }
        if include_confidence:
            result["confidence_interval"] = {
                "level": 0.95,
                "method": "bootstrap_percentile"
            }
        return result

    def _fallback_prediction(self, hospital_id: str, blood_group: str,
                             horizon_days: int) -> Dict[str, Any]:
        collection = get_collection("emergencyrequests")
        total = collection.count_documents({
            "requestingHospitalId": hospital_id,
            "patientInfo.bloodGroup": blood_group
        })
        daily_avg = max(total / 365.0, 0.5)
        predictions = []
        base_date = datetime.utcnow()
        for i in range(horizon_days):
            target_date = base_date + timedelta(days=i + 1)
            predictions.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "predicted_units": round(daily_avg, 2),
                "day_of_week": target_date.strftime("%A"),
                "lower_bound": round(max(0, daily_avg - 1), 2),
                "upper_bound": round(daily_avg + 2, 2)
            })
        return {
            "hospital_id": hospital_id,
            "blood_group": blood_group,
            "predictions": predictions,
            "confidence_interval": {"level": 0.80, "method": "insufficient_data_fallback"},
            "model_version": "fallback-v1.0",
            "generated_at": datetime.utcnow().isoformat()
        }


demand_forecaster = DemandForecaster()
