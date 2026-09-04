import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "db6146f2541eb655dcd7d955c0a813f1dbd1abde90254f46586e8ec38afcefd5")
    JWT_SECRET = os.getenv("JWT_SECRET", "db6146f2541eb655dcd7d955c0a813f1dbd1abde90254f46586e8ec38afcefd5")
    MONGO_URI = os.getenv("MONGO_URI", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5000/api/auth/google/callback")
    
    # Supabase credentials (in case they are needed backend-side)
    SUPABASE_PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID")
    SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    SUPABASE_URL = os.getenv("SUPABASE_URL")

    # Adzuna API credentials
    ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
    ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")


    @classmethod
    def as_dict(cls) -> dict:
        """Return a dictionary of every Config attribute that is not None."""
        return {
            name: value
            for name, value in vars(cls).items()
            if not name.startswith("__") and not callable(value) and value is not None
        }
