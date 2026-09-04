from flask import Blueprint, redirect, url_for, session, jsonify, request
from authlib.integrations.flask_client import OAuth
from backend.config import Config
from backend.auth import generate_token
from backend.database import get_users_collection
from bson import ObjectId
import os

# Blueprint registration
google_bp = Blueprint('google_auth', __name__)

# OAuth client configuration (using Authlib)
oauth = OAuth()

# Register Google provider if client ID/secret are present
if Config.GOOGLE_CLIENT_ID and Config.GOOGLE_CLIENT_SECRET:
    oauth.register(
        name='google',
        client_id=Config.GOOGLE_CLIENT_ID,
        client_secret=Config.GOOGLE_CLIENT_SECRET,
        access_token_url='https://oauth2.googleapis.com/token',
        authorize_url='https://accounts.google.com/o/oauth2/v2/auth',
        api_base_url='https://www.googleapis.com/oauth2/v2/',
        client_kwargs={
            'scope': 'openid email profile',
            'prompt': 'consent',
        },
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'
    )
else:
    raise RuntimeError('Google OAuth client ID/secret not set in .env')

@google_bp.route('/auth/google')
def login_google():
    """Redirect user to Google's OAuth consent screen.
    The redirect URI is taken from Config.GOOGLE_REDIRECT_URI.
    """
    redirect_uri = Config.GOOGLE_REDIRECT_URI
    return oauth.google.authorize_redirect(redirect_uri)

@google_bp.route('/auth/google/callback')
def google_callback():
    """Handle callback from Google, exchange code for token, fetch profile,
    upsert user in MongoDB and return a JWT.
    The frontend expects a JSON response: { token, user }.
    """
    token = oauth.google.authorize_access_token()
    if not token:
        return jsonify({"error": "Failed to obtain token"}), 400

    # Fetch user info
    resp = oauth.google.get('userinfo')
    if not resp.ok:
        return jsonify({"error": "Failed to fetch user info"}), 400
    info = resp.json()
    email = info.get('email')
    name = info.get('name') or info.get('given_name') or ''

    # Upsert user in MongoDB
    users_col = get_users_collection()
    user = users_col.find_one({"email": email})
    if not user:
        user_id = users_col.insert_one({"email": email, "name": name, "created_at": __import__('datetime').datetime.utcnow()}).inserted_id
    else:
        user_id = user['_id']
        # optional: update name if changed
        if name and user.get('name') != name:
            users_col.update_one({"_id": user_id}, {"$set": {"name": name}})

    jwt_token = generate_token(user_id)
    return jsonify({
        "token": jwt_token,
        "user": {
            "id": str(user_id),
            "name": name,
            "email": email
        }
    })
