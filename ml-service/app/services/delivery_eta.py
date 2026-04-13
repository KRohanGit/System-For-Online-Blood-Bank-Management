import os
from datetime import datetime
from typing import Dict, Any, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

try:
    from xgboost import XGBRegressor  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    XGBRegressor = None

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DATASET_PATH = os.path.join(DATA_DIR, 'delivery_eta_training.csv')
MODEL_VERSION = 'delivery-eta-v1'
FEATURE_COLUMNS = [
    'distance_km',
    'base_eta_minutes',
    'hour_of_day',
    'day_of_week',
    'traffic_ratio',
    'weather_score',
    'priority_flag',
    'route_complexity_score',
    'historical_delay_factor'
]


class DeliveryEtaPredictor:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.model = None
        self.metrics = {}
        self.feature_importance = {feature: 0.0 for feature in FEATURE_COLUMNS}
        self.sample_size = 0
        self.model_name = 'RandomForestRegressor'
        self.model_version = MODEL_VERSION
        self._train_or_load()

    def _generate_dataset(self, rows: int = 240) -> pd.DataFrame:
        rng = np.random.default_rng(42)
        records = []

        for _ in range(rows):
            distance_km = float(rng.uniform(1.0, 85.0))
            hour_of_day = int(rng.integers(0, 24))
            day_of_week = int(rng.integers(0, 7))
            traffic_ratio = float(rng.uniform(1.02, 1.95))
            weather_score = float(rng.uniform(0.35, 1.0))
            priority_flag = int(rng.choice([0, 1], p=[0.8, 0.2]))
            route_complexity_score = float(rng.uniform(0.12, 0.95))
            historical_delay_factor = float(rng.uniform(0.9, 1.9))

            free_flow_speed = 46 if priority_flag else 40
            base_eta_minutes = (distance_km / free_flow_speed) * 60 * traffic_ratio
            congestion_boost = 1.0 + (0.15 if hour_of_day in range(7, 10) or hour_of_day in range(17, 21) else 0.0)
            weekend_boost = 0.96 if day_of_week in (0, 6) else 1.0
            weather_penalty = 1.0 + (1.0 - weather_score) * 0.18

            actual_delivery_time_minutes = (
                base_eta_minutes * congestion_boost * weekend_boost * weather_penalty
                * (1.0 + route_complexity_score * 0.12)
                * historical_delay_factor
                + (distance_km * 0.18)
                - (priority_flag * 2.5)
                + rng.normal(0, 2.0)
            )

            records.append({
                'distance_km': round(distance_km, 2),
                'base_eta_minutes': round(base_eta_minutes, 2),
                'hour_of_day': hour_of_day,
                'day_of_week': day_of_week,
                'traffic_ratio': round(traffic_ratio, 2),
                'weather_score': round(weather_score, 2),
                'priority_flag': priority_flag,
                'route_complexity_score': round(route_complexity_score, 2),
                'historical_delay_factor': round(historical_delay_factor, 2),
                'actual_delivery_time_minutes': round(max(actual_delivery_time_minutes, 2.0), 2)
            })

        dataset = pd.DataFrame.from_records(records)
        dataset.to_csv(DATASET_PATH, index=False)
        return dataset

    def _load_dataset(self) -> pd.DataFrame:
        if os.path.exists(DATASET_PATH):
            dataset = pd.read_csv(DATASET_PATH)
            missing_columns = [column for column in FEATURE_COLUMNS + ['actual_delivery_time_minutes'] if column not in dataset.columns]
            if missing_columns:
                return self._generate_dataset()
            return dataset
        return self._generate_dataset()

    def _build_model(self):
        if XGBRegressor is not None:
            self.model_name = 'XGBRegressor'
            return XGBRegressor(
                n_estimators=240,
                max_depth=5,
                learning_rate=0.08,
                subsample=0.9,
                colsample_bytree=0.9,
                random_state=42,
                objective='reg:squarederror'
            )

        self.model_name = 'RandomForestRegressor'
        return RandomForestRegressor(
            n_estimators=240,
            random_state=42,
            min_samples_split=3,
            min_samples_leaf=2
        )

    def _train_or_load(self):
        dataset = self._load_dataset()
        self.sample_size = len(dataset)

        X = dataset[FEATURE_COLUMNS].astype(float)
        y = dataset['actual_delivery_time_minutes'].astype(float)

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42
        )

        self.model = self._build_model()
        self.model.fit(X_train, y_train)

        predictions = self.model.predict(X_test)
        mae = float(mean_absolute_error(y_test, predictions))
        rmse = float(mean_squared_error(y_test, predictions, squared=False))
        r2 = float(r2_score(y_test, predictions))
        target_mean = float(np.mean(y)) if len(y) else 1.0

        confidence = 1.0 - min(mae / max(target_mean, 1.0), 0.45)
        self.metrics = {
            'mae': round(mae, 2),
            'rmse': round(rmse, 2),
            'r2': round(r2, 3),
            'confidence': round(confidence, 2)
        }

        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            self.feature_importance = {
                feature: round(float(score), 4)
                for feature, score in zip(FEATURE_COLUMNS, importances)
            }

    def retrain(self):
        self._train_or_load()
        return {
            'retrained': True,
            'model_version': self.model_version,
            'sample_size': self.sample_size,
            'metrics': self.metrics,
            'generated_at': datetime.utcnow().isoformat()
        }

    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if self.model is None:
            self._train_or_load()

        distance_km = float(payload.get('distance_km', 0))
        base_eta_minutes = float(payload.get('base_eta_minutes', 0))
        hour_of_day = int(payload.get('hour_of_day', datetime.utcnow().hour))
        day_of_week = int(payload.get('day_of_week', datetime.utcnow().weekday()))
        traffic_ratio = float(payload.get('traffic_ratio', 1.0))
        weather_score = float(payload.get('weather_score', 0.5))
        priority_flag = int(payload.get('priority_flag', 0))
        route_complexity_score = float(payload.get('route_complexity_score', 0.5))
        historical_delay_factor = float(payload.get('historical_delay_factor', 1.0))

        features = pd.DataFrame([{
            'distance_km': distance_km,
            'base_eta_minutes': base_eta_minutes,
            'hour_of_day': hour_of_day,
            'day_of_week': day_of_week,
            'traffic_ratio': traffic_ratio,
            'weather_score': weather_score,
            'priority_flag': priority_flag,
            'route_complexity_score': route_complexity_score,
            'historical_delay_factor': historical_delay_factor
        }])

        prediction = float(self.model.predict(features)[0])
        confidence = float(self.metrics.get('confidence', 0.72))

        if priority_flag:
            prediction *= 0.96
        prediction *= max(0.92, min(1.18, historical_delay_factor))
        prediction *= max(0.9, min(1.1, 1.0 + (route_complexity_score - 0.5) * 0.16))

        predicted_minutes = round(max(prediction, 1.0), 1)
        estimated_arrival_at = datetime.utcnow().timestamp() + (predicted_minutes * 60)

        return {
            'distance_km': round(distance_km, 2),
            'base_eta_minutes': round(base_eta_minutes, 1),
            'ml_eta_minutes': predicted_minutes,
            'predicted_eta_minutes': predicted_minutes,
            'confidence': round(confidence, 2),
            'model_version': self.model_version,
            'model_name': self.model_name,
            'feature_importance': self.feature_importance,
            'metrics': self.metrics,
            'generated_at': datetime.utcnow().isoformat(),
            'estimated_arrival_at': datetime.utcfromtimestamp(estimated_arrival_at).isoformat() + 'Z',
            'traffic_ratio': round(traffic_ratio, 2),
            'route_complexity_score': round(route_complexity_score, 2),
            'historical_delay_factor': round(historical_delay_factor, 2)
        }


delivery_eta_predictor = DeliveryEtaPredictor()
