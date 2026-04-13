import json
import os
import pickle
import importlib
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from ..db import get_collection

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'saved_models', 'clinical')
os.makedirs(MODEL_DIR, exist_ok=True)

ANNOY_INDEX_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'clinical_case_index.ann')
os.makedirs(os.path.dirname(ANNOY_INDEX_PATH), exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, 'outcome_rf.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'outcome_rf_metadata.json')

CATEGORICAL_OPTIONS = {
    'gender': ['male', 'female', 'other', 'unknown'],
    'bloodGroup': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'conditionType': ['trauma', 'surgery', 'postpartum', 'oncology', 'anemia', 'internal_bleeding', 'other']
}

NUMERIC_FEATURE_ORDER = [
    'age',
    'hemoglobinLevel',
    'bloodLossEstimate',
    'systolicBP',
    'diastolicBP',
    'heartRate'
]

TRAINING_FEATURE_ORDER = [
    'age',
    'hemoglobinLevel',
    'bloodLossEstimate',
    'systolicBP',
    'diastolicBP',
    'heartRate',
    'unitsGiven',
    'timingScore'
]


def _is_truthy(value: str) -> bool:
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def _is_falsy(value: str) -> bool:
    return str(value or '').strip().lower() in {'0', 'false', 'no', 'off'}


def _should_use_annoy() -> bool:
    # Windows default is disabled due to known native instability with some runtimes.
    # Override with CLINICAL_USE_ANNOY=true when environment is validated.
    env_value = os.getenv('CLINICAL_USE_ANNOY')
    if env_value is not None:
        if _is_truthy(env_value):
            return True
        if _is_falsy(env_value):
            return False

    return not sys.platform.startswith('win')


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _l2_normalize(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    if norm <= 0:
        return vector
    return vector / norm


class ClinicalRecommendationEngine:
    def __init__(self):
        self.clinical_cases = get_collection('clinicalcases')
        self.case_embeddings = get_collection('caseembeddings')
        self.model = None
        self.model_version = 'clinical-outcome-rf-v1'
        self.last_trained_at = None
        self.last_seen_case_count = 0
        self._load_or_initialize_model()

    def _load_or_initialize_model(self) -> None:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, 'rb') as f:
                self.model = pickle.load(f)

            if os.path.exists(METADATA_PATH):
                with open(METADATA_PATH, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    self.model_version = metadata.get('model_version', self.model_version)
                    self.last_trained_at = metadata.get('trained_at')
                    self.last_seen_case_count = metadata.get('sample_size', 0)
        else:
            self.model = RandomForestClassifier(
                n_estimators=200,
                random_state=42,
                class_weight='balanced'
            )

    def _extract_feature_values(self, patient_features: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, float]]:
        vitals = patient_features.get('vitals') or {}
        numeric_values = {
            'age': _safe_float(patient_features.get('age'), 0.0),
            'hemoglobinLevel': _safe_float(patient_features.get('hemoglobinLevel'), 11.0),
            'bloodLossEstimate': _safe_float(patient_features.get('bloodLossEstimate'), 0.0),
            'systolicBP': _safe_float(vitals.get('systolicBP'), 110.0),
            'diastolicBP': _safe_float(vitals.get('diastolicBP'), 70.0),
            'heartRate': _safe_float(vitals.get('heartRate'), 85.0)
        }

        normalized = np.array([
            numeric_values['age'] / 100.0,
            numeric_values['hemoglobinLevel'] / 20.0,
            numeric_values['bloodLossEstimate'] / 5000.0,
            numeric_values['systolicBP'] / 200.0,
            numeric_values['diastolicBP'] / 130.0,
            numeric_values['heartRate'] / 200.0
        ], dtype=np.float32)

        return normalized, numeric_values

    def _encode_categorical(self, patient_features: Dict[str, Any]) -> np.ndarray:
        encoded = []
        for key, options in CATEGORICAL_OPTIONS.items():
            value = str(patient_features.get(key, 'unknown')).strip().lower()
            option_values = [str(option).lower() for option in options]
            row = [1.0 if value == option else 0.0 for option in option_values]
            if not any(row):
                fallback_index = option_values.index('unknown') if 'unknown' in option_values else len(option_values) - 1
                row[fallback_index] = 1.0
            encoded.extend(row)
        return np.array(encoded, dtype=np.float32)

    def build_feature_vector(self, patient_features: Dict[str, Any]) -> Dict[str, Any]:
        numeric_vector, numeric_values = self._extract_feature_values(patient_features)
        categorical_vector = self._encode_categorical(patient_features)
        feature_vector = np.concatenate([numeric_vector, categorical_vector])
        embedding_vector = _l2_normalize(feature_vector.copy())

        return {
            'feature_vector': feature_vector,
            'embedding_vector': embedding_vector,
            'numeric_values': numeric_values
        }

    def _fetch_case_records(self, limit: int = 5000) -> List[Dict[str, Any]]:
        records = list(
            self.clinical_cases.find(
                {},
                {
                    'caseId': 1,
                    'anonymizedPatientFeatures': 1,
                    'treatment': 1,
                    'outcome': 1,
                    'hospitalId': 1,
                    'timestamp': 1
                }
            ).sort('timestamp', -1).limit(limit)
        )
        return records

    def _get_or_create_case_embedding(self, case_doc: Dict[str, Any]) -> np.ndarray:
        case_id = case_doc.get('caseId')
        if not case_id:
            return np.array([], dtype=np.float32)

        existing = self.case_embeddings.find_one({'caseId': case_id}, {'embeddingVector': 1})
        if existing and isinstance(existing.get('embeddingVector'), list) and existing['embeddingVector']:
            return np.array(existing['embeddingVector'], dtype=np.float32)

        patient_features = case_doc.get('anonymizedPatientFeatures') or {}
        vector_data = self.build_feature_vector(patient_features)
        embedding = vector_data['embedding_vector']

        self.case_embeddings.update_one(
            {'caseId': case_id},
            {
                '$set': {
                    'caseId': case_id,
                    'embeddingVector': embedding.astype(float).tolist(),
                    'modelVersion': 'clinical-embed-v1',
                    'updatedAt': datetime.utcnow()
                }
            },
            upsert=True
        )

        return embedding

    def _build_annoy_index(self, vectors: List[np.ndarray]):
        if not _should_use_annoy():
            return None

        try:
            annoy_module = importlib.import_module('annoy')
            AnnoyIndex = getattr(annoy_module, 'AnnoyIndex')
        except Exception:
            return None

        if not vectors:
            return None

        dims = len(vectors[0])
        annoy_index = AnnoyIndex(dims, 'angular')
        for idx, vec in enumerate(vectors):
            annoy_index.add_item(idx, vec.tolist())
        annoy_index.build(20)
        annoy_index.save(ANNOY_INDEX_PATH)
        return annoy_index

    def find_similar_cases(self, patient_features: Dict[str, Any], top_k: int = 10) -> Dict[str, Any]:
        top_k = max(1, min(int(top_k), 50))
        vector_data = self.build_feature_vector(patient_features)
        query_embedding = vector_data['embedding_vector']

        case_docs = self._fetch_case_records(limit=5000)
        if not case_docs:
            return {
                'similarCases': [],
                'queryEmbedding': query_embedding.astype(float).tolist(),
                'basedOnCases': 0,
                'modelVersion': 'clinical-embed-v1',
                'generatedAt': datetime.utcnow().isoformat()
            }

        vectors = []
        normalized_docs = []
        for doc in case_docs:
            embedding = self._get_or_create_case_embedding(doc)
            if embedding.size == 0:
                continue
            vectors.append(_l2_normalize(embedding))
            normalized_docs.append(doc)

        if not vectors:
            return {
                'similarCases': [],
                'queryEmbedding': query_embedding.astype(float).tolist(),
                'basedOnCases': 0,
                'modelVersion': 'clinical-embed-v1',
                'generatedAt': datetime.utcnow().isoformat()
            }

        annoy_index = self._build_annoy_index(vectors)

        if annoy_index is not None:
            neighbor_ids = annoy_index.get_nns_by_vector(query_embedding.tolist(), top_k, include_distances=False)
            candidate_indices = neighbor_ids
        else:
            scores = [float(np.dot(query_embedding, vec)) for vec in vectors]
            candidate_indices = np.argsort(scores)[::-1][:top_k].tolist()

        similar_cases = []
        for idx in candidate_indices:
            if idx >= len(normalized_docs):
                continue
            doc = normalized_docs[idx]
            score = float(np.dot(query_embedding, vectors[idx]))
            treatment = doc.get('treatment') or {}
            outcome = doc.get('outcome') or {}
            patient = doc.get('anonymizedPatientFeatures') or {}

            similar_cases.append({
                'caseId': doc.get('caseId'),
                'similarityScore': round(max(min(score, 1.0), -1.0), 4),
                'conditionType': patient.get('conditionType', 'other'),
                'bloodGroup': patient.get('bloodGroup', 'unknown'),
                'treatmentSummary': {
                    'unitsGiven': treatment.get('unitsGiven', 0),
                    'bloodTypeUsed': treatment.get('bloodTypeUsed', 'unknown'),
                    'timing': treatment.get('timing', 'unknown')
                },
                'outcomeSummary': {
                    'survival': outcome.get('survival'),
                    'recoveryTime': outcome.get('recoveryTime'),
                    'complicationCount': len(outcome.get('complications') or [])
                }
            })

        similar_cases.sort(key=lambda item: item['similarityScore'], reverse=True)

        return {
            'similarCases': similar_cases[:top_k],
            'queryEmbedding': query_embedding.astype(float).tolist(),
            'basedOnCases': len(vectors),
            'modelVersion': 'clinical-embed-v1',
            'generatedAt': datetime.utcnow().isoformat()
        }

    def recommend_treatment(self, patient_features: Dict[str, Any], top_k: int = 10) -> Dict[str, Any]:
        similarity_result = self.find_similar_cases(patient_features, top_k=top_k)
        similar_cases = similarity_result.get('similarCases', [])

        if not similar_cases:
            default_units = 2
            return {
                'recommendedUnits': default_units,
                'preferredBloodGroup': patient_features.get('bloodGroup', 'O+'),
                'confidenceScore': 0.5,
                'basedOnCases': 0,
                'successRate': 'N/A',
                'reasoning': 'No historical matches available. Using conservative transfusion baseline.',
                'evidenceSummary': {
                    'avgUnitsFromSimilarCases': default_units,
                    'successfulCaseCount': 0,
                    'weightedSurvivalRate': 0.0
                },
                'generatedAt': datetime.utcnow().isoformat()
            }

        weighted_units = []
        weighted_survival = []
        blood_group_scores: Dict[str, float] = {}
        successful_count = 0

        for item in similar_cases:
            score = max(item.get('similarityScore', 0.0), 0.01)
            units = _safe_float(item.get('treatmentSummary', {}).get('unitsGiven'), 0.0)
            blood_type = item.get('treatmentSummary', {}).get('bloodTypeUsed') or patient_features.get('bloodGroup', 'O+')
            survival = item.get('outcomeSummary', {}).get('survival')

            weighted_units.append((units, score))
            blood_group_scores[blood_type] = blood_group_scores.get(blood_type, 0.0) + score
            if survival is True:
                successful_count += 1
                weighted_survival.append(score)

        sum_weights = sum(weight for _, weight in weighted_units) or 1.0
        avg_units = sum(value * weight for value, weight in weighted_units) / sum_weights

        preferred_blood_group = max(blood_group_scores.items(), key=lambda item: item[1])[0] if blood_group_scores else patient_features.get('bloodGroup', 'O+')
        weighted_success = (sum(weighted_survival) / sum_weights) if sum_weights > 0 else 0.0

        numeric_values = self.build_feature_vector(patient_features)['numeric_values']
        reasoning_parts = []
        if numeric_values['hemoglobinLevel'] < 8.0:
            reasoning_parts.append('Low hemoglobin level indicates higher transfusion urgency')
        if numeric_values['bloodLossEstimate'] > 1000:
            reasoning_parts.append('High blood loss estimate aligns with early transfusion benefit')
        if not reasoning_parts:
            reasoning_parts.append('Closest historical cases show favorable response to selected transfusion plan')

        return {
            'recommendedUnits': int(round(max(1.0, min(avg_units, 6.0)))),
            'preferredBloodGroup': preferred_blood_group,
            'confidenceScore': round(max(min(weighted_success, 0.99), 0.3), 4),
            'basedOnCases': len(similar_cases),
            'successRate': f"{round(weighted_success * 100, 1)}%",
            'reasoning': '. '.join(reasoning_parts),
            'evidenceSummary': {
                'avgUnitsFromSimilarCases': round(avg_units, 2),
                'successfulCaseCount': successful_count,
                'weightedSurvivalRate': round(weighted_success, 4)
            },
            'generatedAt': datetime.utcnow().isoformat()
        }

    def _timing_to_score(self, timing: str) -> float:
        timing_map = {
            'immediate': 1.0,
            'within_1_hour': 0.9,
            'within_3_hours': 0.75,
            'within_6_hours': 0.6,
            'delayed': 0.3,
            'unknown': 0.5
        }
        return timing_map.get(str(timing or 'unknown').lower(), 0.5)

    def _prepare_training_rows(self) -> Tuple[np.ndarray, np.ndarray]:
        rows = []
        labels = []

        for case_doc in self._fetch_case_records(limit=10000):
            outcome = case_doc.get('outcome') or {}
            survival = outcome.get('survival')
            if survival is None:
                continue

            patient_features = case_doc.get('anonymizedPatientFeatures') or {}
            treatment = case_doc.get('treatment') or {}

            _, numeric_values = self._extract_feature_values(patient_features)
            timing_score = self._timing_to_score(treatment.get('timing', 'unknown'))

            row = np.array([
                numeric_values['age'],
                numeric_values['hemoglobinLevel'],
                numeric_values['bloodLossEstimate'],
                numeric_values['systolicBP'],
                numeric_values['diastolicBP'],
                numeric_values['heartRate'],
                _safe_float(treatment.get('unitsGiven'), 0.0),
                timing_score
            ], dtype=np.float32)

            rows.append(row)
            labels.append(1 if survival else 0)

        if not rows:
            return np.array([]), np.array([])

        return np.vstack(rows), np.array(labels, dtype=np.int32)

    def retrain_if_needed(self, force: bool = False) -> Dict[str, Any]:
        case_count = self.clinical_cases.count_documents({
            'outcome.survival': {'$in': [True, False]}
        })

        should_retrain = force
        if not should_retrain:
            enough_new_samples = case_count >= max(50, self.last_seen_case_count + 25)
            stale_model = self.last_trained_at is None
            if self.last_trained_at is not None:
                try:
                    stale_model = datetime.utcnow() - datetime.fromisoformat(self.last_trained_at) > timedelta(hours=12)
                except ValueError:
                    stale_model = True
            should_retrain = enough_new_samples and stale_model

        if not should_retrain:
            return {
                'retrained': False,
                'modelVersion': self.model_version,
                'trainingSampleSize': int(case_count),
                'generatedAt': datetime.utcnow().isoformat()
            }

        X, y = self._prepare_training_rows()
        if X.size == 0 or len(np.unique(y)) < 2:
            return {
                'retrained': False,
                'modelVersion': self.model_version,
                'trainingSampleSize': int(case_count),
                'generatedAt': datetime.utcnow().isoformat()
            }

        self.model = RandomForestClassifier(
            n_estimators=250,
            random_state=42,
            class_weight='balanced',
            min_samples_leaf=3
        )
        self.model.fit(X, y)

        version = f"clinical-outcome-rf-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        self.model_version = version
        self.last_trained_at = datetime.utcnow().isoformat()
        self.last_seen_case_count = int(len(y))

        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(self.model, f)

        metadata = {
            'model_version': self.model_version,
            'trained_at': self.last_trained_at,
            'sample_size': self.last_seen_case_count,
            'feature_order': TRAINING_FEATURE_ORDER
        }
        with open(METADATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

        return {
            'retrained': True,
            'modelVersion': self.model_version,
            'trainingSampleSize': self.last_seen_case_count,
            'generatedAt': datetime.utcnow().isoformat()
        }

    def predict_outcome(self, patient_features: Dict[str, Any], treatment_plan: Dict[str, Any]) -> Dict[str, Any]:
        self.retrain_if_needed(force=False)

        _, numeric_values = self._extract_feature_values(patient_features)
        timing_score = self._timing_to_score((treatment_plan or {}).get('timing', 'unknown'))

        input_row = np.array([
            numeric_values['age'],
            numeric_values['hemoglobinLevel'],
            numeric_values['bloodLossEstimate'],
            numeric_values['systolicBP'],
            numeric_values['diastolicBP'],
            numeric_values['heartRate'],
            _safe_float((treatment_plan or {}).get('unitsGiven'), 0.0),
            timing_score
        ], dtype=np.float32).reshape(1, -1)

        survival_probability = 0.5
        if self.model is not None and hasattr(self.model, 'predict_proba'):
            try:
                probabilities = self.model.predict_proba(input_row)
                survival_probability = float(probabilities[0][1])
            except Exception:
                survival_probability = 0.5

        if survival_probability >= 0.8:
            risk_level = 'low'
        elif survival_probability >= 0.6:
            risk_level = 'moderate'
        elif survival_probability >= 0.4:
            risk_level = 'high'
        else:
            risk_level = 'critical'

        feature_importance = []
        if self.model is not None and hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            weighted = []
            for idx, feature_name in enumerate(TRAINING_FEATURE_ORDER):
                value = float(input_row[0][idx])
                importance = float(importances[idx]) if idx < len(importances) else 0.0
                weighted.append((feature_name, abs(value) * importance, importance))

            weighted.sort(key=lambda item: item[1], reverse=True)
            feature_importance = [
                {
                    'feature': item[0],
                    'importance': round(item[2], 4)
                }
                for item in weighted[:5]
            ]

            top_factors = [item[0] for item in weighted[:3]]
            reasoning = (
                f"{', '.join(top_factors)} strongly influenced the survival estimate. "
                f"Model predicts {round(survival_probability * 100, 1)}% survival probability under the proposed plan."
            )
        else:
            reasoning = 'Outcome prediction generated using conservative baseline due to limited training data.'

        return {
            'survivalProbability': round(max(min(survival_probability, 0.99), 0.01), 4),
            'riskLevel': risk_level,
            'featureImportance': feature_importance,
            'reasoning': reasoning,
            'modelVersion': self.model_version,
            'generatedAt': datetime.utcnow().isoformat()
        }


clinical_recommendation_engine = ClinicalRecommendationEngine()
