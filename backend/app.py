from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.database import init_db
from backend.auth import auth_bp
from backend.analyzer import analyzer_bp
from backend.report import report_bp
from backend.google_oauth import google_bp, oauth

app = Flask(__name__)
app.config.from_object(Config)

# Initialize OAuth helper with our Flask app
oauth.init_app(app)

# Enable CORS for the React frontend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(google_bp, url_prefix="/api")
app.register_blueprint(analyzer_bp, url_prefix="/api")
app.register_blueprint(report_bp, url_prefix="/api")

@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        # Check database connection
        db = init_db()
        db.command("ping")
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "message": "SkillGap Analyzer Backend API is running successfully!"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }), 500

@app.route("/api/debug/config", methods=["GET"])
def debug_config():
    # Return Config variables as JSON
    return jsonify(Config.as_dict()), 200

if __name__ == "__main__":
    # Run the server on port 5000
    app.run(host="0.0.0.0", port=5000, debug=True)
