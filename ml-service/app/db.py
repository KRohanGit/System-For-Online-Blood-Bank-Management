import os
from pymongo import MongoClient
from functools import lru_cache


@lru_cache()
def get_mongo_client():
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("Missing MongoDB URI. Set MONGO_URI (or MONGODB_URI).")
    return MongoClient(mongo_uri)


@lru_cache()
def get_database():
    client = get_mongo_client()
    db_name = os.getenv("MONGO_DB_NAME", "lifelink")
    return client[db_name]


def get_collection(name: str):
    db = get_database()
    return db[name]
