"""Batch retraining utility for clinical recommendation models."""

import os
import sys

# Ensure project root is importable when script is run as a file.
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app.services.clinical_recommendations import clinical_recommendation_engine


def main():
    result = clinical_recommendation_engine.retrain_if_needed(force=True)
    print('Clinical model retraining result:')
    print(result)


if __name__ == '__main__':
    main()
