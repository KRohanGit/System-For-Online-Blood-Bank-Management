import os
from pymongo import MongoClient
from functools import lru_cache


@lru_cache()
def get_mongo_client():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/lifelink")
    return MongoClient(mongo_uri)


@lru_cache()
def get_database():
    client = get_mongo_client()
    db_name = os.getenv("MONGO_DB_NAME", "lifelink")
    return client[db_name]


def get_collection(name: str):
    db = get_database()
    return db[name]
