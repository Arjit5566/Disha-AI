import pymongo
from pymongo import MongoClient
from backend.config import Config

client = None
db = None

def init_db():
    global client, db
    if db is None:
        client = MongoClient(Config.MONGO_URI)
        db = client.get_database()
        
        # Ensure indexes
        db.users.create_index("email", unique=True)
        db.analyses.create_index([("user_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
        
    return db

def get_db():
    global db
    if db is None:
        return init_db()
    return db

def get_users_collection():
    return get_db().users

def get_analyses_collection():
    return get_db().analyses
