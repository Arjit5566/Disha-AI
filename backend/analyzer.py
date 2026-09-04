import os
import tempfile
import json
import pdfplumber
import google.generativeai as genai
import requests
from flask import Blueprint, request, jsonify
from bson import ObjectId
from backend.config import Config
from backend.auth import get_current_user
from backend.database import get_analyses_collection
import datetime

analyzer_bp = Blueprint("analyzer", __name__)

# Configure Gemini API
genai.configure(api_key=Config.GEMINI_API_KEY)

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

@analyzer_bp.route("/analyze", methods=["POST"])
def analyze_resume():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if "resume" not in request.files:
        return jsonify({"error": "No resume file uploaded"}), 400

    resume_file = request.files["resume"]
    target_role = request.form.get("target_role")

    if not target_role:
        return jsonify({"error": "Target career goal is required"}), 400

    if resume_file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Save to a temporary file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, resume_file.filename)
    resume_file.save(temp_path)

    try:
        # 1. Extract text from PDF
        resume_text = extract_text_from_pdf(temp_path)
        if not resume_text.strip():
            return jsonify({"error": "Failed to extract text from the PDF. Please ensure it is a valid PDF with selectable text."}), 400

        # 2. Query Gemini
        # We instruct Gemini to return JSON
        prompt = f"""
        You are an elite Tech Career Advisor and Technical Recruiter.
        Analyze the following candidate's resume text and compare it against the requirements of the target career role: "{target_role}".

        Identify:
        1. Extracted Skills: Skills in their resume that match or are relevant to the target role.
        2. Missing Skills: Essential skills they lack that are critical for the target role.
        3. Career Readiness Score: An integer from 0 to 100 representing how ready they are for this role.
        4. Personalized Learning Roadmap: A detailed, practical 4-week timeline to bridge their skill gaps. Focus each week on the missing skills, including concrete objectives and learning outcomes.
        5. Recommended Resources: High-quality course topics or tutorial recommendations that match their missing skills.

        Candidate's Resume Text:
        ---
        {resume_text}
        ---

        You must respond with a JSON object. Ensure the JSON format matches the schema below exactly. Do not include markdown code block wrapper (like ```json) in your actual response text, just return the raw JSON string.

        JSON Schema:
        {{
            "readiness_score": 75,
            "summary": "Short 2-3 sentence overview of their profile matching the target role.",
            "skills_found": ["Python", "SQL", "Excel", "Communication"],
            "missing_skills": ["Power BI", "Tableau", "Statistics"],
            "roadmap": [
                {{
                    "week": 1,
                    "title": "Power BI Fundamentals",
                    "objectives": "Learn Power BI basics, data modeling, connecting data sources and dashboards.",
                    "outcomes": [
                        "Understand Power BI interface",
                        "Create your first dashboard",
                        "Build interactive reports"
                    ]
                }},
                {{
                    "week": 2,
                    "title": "Statistics Basics",
                    "objectives": "Learn essential statistics concepts for data analysis.",
                    "outcomes": [
                        "Understand descriptive statistics",
                        "Mean, Median, Mode, Standard Deviation",
                        "Apply statistics in real-world problems"
                    ]
                }},
                {{
                    "week": 3,
                    "title": "Tableau Visualization",
                    "objectives": "Learn Tableau from scratch and create powerful visualizations.",
                    "outcomes": [
                        "Work with Tableau interface",
                        "Create charts and dashboards",
                        "Build real-world projects"
                    ]
                }},
                {{
                    "week": 4,
                    "title": "Capstone Project",
                    "objectives": "Build an end-to-end data analytics project to apply your skills.",
                    "outcomes": [
                        "Combine Power BI + Statistics + Tableau",
                        "Build complete analytics project",
                        "Add project to your portfolio"
                    ]
                }}
            ],
            "resources": [
                {{
                    "title": "Power BI Course",
                    "description": "Complete Power BI course for beginners with hands-on projects.",
                    "duration": "6 Hours",
                    "difficulty": "Beginner",
                    "button_text": "View Course",
                    "tag": "Beginner Friendly"
                }},
                {{
                    "title": "Statistics Basics",
                    "description": "Learn essential statistics concepts with practical examples.",
                    "duration": "4 Hours",
                    "difficulty": "Beginner",
                    "button_text": "Learn Now",
                    "tag": "Highly Rated"
                }},
                {{
                    "title": "Tableau Tutorials",
                    "description": "Step-by-step Tableau tutorials to create stunning dashboards.",
                    "duration": "5 Hours",
                    "difficulty": "Beginner",
                    "button_text": "Start Learning",
                    "tag": "Best for You"
                }}
            ]
        }}
        """

        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Request JSON response
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )

        try:
            analysis_data = json.loads(response.text)
        except Exception as e:
            # Fallback if parsing fails or model returned slightly invalid JSON
            print(f"Error parsing Gemini response: {e}")
            # Try cleaning up markdown code block if present
            cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(cleaned_text)

        # 3. Save to MongoDB
        analysis_doc = {
            "user_id": ObjectId(user["_id"]),
            "target_role": target_role,
            "readiness_score": int(analysis_data.get("readiness_score", 50)),
            "summary": analysis_data.get("summary", ""),
            "skills_found": analysis_data.get("skills_found", []),
            "missing_skills": analysis_data.get("missing_skills", []),
            "roadmap": analysis_data.get("roadmap", []),
            "resources": analysis_data.get("resources", []),
            "created_at": datetime.datetime.utcnow()
        }

        analyses_col = get_analyses_collection()
        result = analyses_col.insert_one(analysis_doc)
        analysis_doc["_id"] = str(result.inserted_id)
        analysis_doc["user_id"] = str(analysis_doc["user_id"])

        return jsonify(analysis_doc), 200

    except Exception as e:
        print(f"Error analyzing resume: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Remove the temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@analyzer_bp.route("/history", methods=["GET"])
def get_analyses_history():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    analyses_col = get_analyses_collection()
    cursor = analyses_col.find({"user_id": ObjectId(user["_id"])}).sort("created_at", -1)
    
    history = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        history.append(doc)

    return jsonify(history), 200

@analyzer_bp.route("/analysis/<analysis_id>", methods=["GET"])
def get_analysis_by_id(analysis_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    analyses_col = get_analyses_collection()
    doc = analyses_col.find_one({"_id": ObjectId(analysis_id), "user_id": ObjectId(user["_id"])})
    if not doc:
        return jsonify({"error": "Analysis not found"}), 404

    doc["_id"] = str(doc["_id"])
    doc["user_id"] = str(doc["user_id"])
    return jsonify(doc), 200

@analyzer_bp.route("/analysis/<analysis_id>/opportunities", methods=["GET"])
def get_adzuna_opportunities(analysis_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    analyses_col = get_analyses_collection()
    analysis = analyses_col.find_one({"_id": ObjectId(analysis_id), "user_id": ObjectId(user["_id"])})
    if not analysis:
        return jsonify({"error": "Analysis not found"}), 404

    target_role = analysis.get("target_role", "Data Analyst")
    user_skills = analysis.get("skills_found", [])
    if not user_skills:
        user_skills = analysis.get("extracted_skills", [])

    country = request.args.get("country", "in").lower()
    
    app_id = Config.ADZUNA_APP_ID
    app_key = Config.ADZUNA_APP_KEY

    def clean_html(text):
        if not text:
            return ""
        import re
        return re.sub(r'<\/?[^>]+(>|$)', '', text).strip()

    def format_salary(salary_min, salary_max, c):
        if not salary_min and not salary_max:
            return "Competitive Salary"
        
        currency = "₹" if c == "in" else "$" if c == "us" else "£" if c == "gb" else "$"
        
        def format_num(num):
            if c == "in":
                if num >= 100000:
                    return f"{num / 100000:.1f}L"
                if num >= 1000:
                    return f"{num / 1000:.0f}k"
            else:
                if num >= 1000:
                    return f"{num / 1000:.0f}k"
            return str(num)

        period = "/mo" if c == "in" and (salary_min or 0) < 100000 else " PA"
        
        if salary_min and salary_max:
            return f"{currency}{format_num(salary_min)} - {currency}{format_num(salary_max)}{period}"
        return f"{currency}{format_num(salary_min or salary_max)}{period}"

    def calculate_match(title, description):
        t = title.lower()
        d = description.lower()
        
        matched = [skill for skill in user_skills if skill.lower() in t or skill.lower() in d]
        
        base_score = 55
        target_keywords = target_role.lower().split()
        keyword_matches = [kw for kw in target_keywords if len(kw) > 2 and kw in t]
        base_score += (len(keyword_matches) / max(1, len(target_keywords))) * 20
        
        score = min(98, int(base_score + len(matched) * 8))
        reason = f"Matches your skill{'s' if len(matched) > 1 else ''}: {', '.join(matched[:3])}" if matched else f"Good alignment with your target role: {target_role}"
        
        return score, reason

    def generate_mock_opportunities():
        import random
        import urllib.parse
        is_in = country == "in"
        company_pool = ["Tata Consultancy Services", "Infosys", "Wipro", "Razorpay", "Cred", "Swiggy", "Zomato", "Jio Platforms", "Flipkart"] if is_in else ["Google", "Meta", "Amazon", "Microsoft", "Stripe", "Netflix", "Atlassian", "Uber", "Airbnb"]
        locations = ["Bengaluru, Karnataka", "Mumbai, Maharashtra", "Hyderabad, Telangana", "Gurugram, Haryana", "Pune, Maharashtra", "Remote, India"] if is_in else ["San Francisco, CA", "Seattle, WA", "New York, NY", "Austin, TX", "London, UK", "Remote, US"]
        
        opps = []
        
        # 4 Jobs
        job_titles = [target_role, f"Senior {target_role}", f"Associate {target_role}", f"Lead {target_role}"]
        for idx, title in enumerate(job_titles):
            salary_min = 400000 + idx * 250000 if is_in else 70000 + idx * 25005
            salary_max = 800000 + idx * 350000 if is_in else 110000 + idx * 35005
            score = 95 - idx * 7
            
            if user_skills:
                skills_show = user_skills[:2 + (idx % 2)]
                reason = f"Matches your skill{'s' if len(skills_show) > 1 else ''}: {', '.join(skills_show)}"
            else:
                reason = f"Good alignment with your target role of {target_role}"
                
            comp = random.choice(company_pool)
            encoded_query = urllib.parse.quote(f"{title} {comp}")
            opps.append({
                "id": f"mock-job-{idx}",
                "title": title,
                "company": comp,
                "location": random.choice(locations),
                "salary": format_salary(salary_min, salary_max, country),
                "redirectUrl": f"https://www.linkedin.com/jobs/search/?keywords={encoded_query}",
                "created": datetime.datetime.utcnow().isoformat(),
                "matchScore": score,
                "matchReason": reason,
                "type": "job"
            })
            
        # 3 Internships
        intern_titles = [f"{target_role} Intern", f"Graduate {target_role} Trainee", f"Summer Intern - {target_role}"]
        for idx, title in enumerate(intern_titles):
            salary_min = 15000 + idx * 5000 if is_in else 2500 + idx * 500
            salary_max = 30000 + idx * 8000 if is_in else 4500 + idx * 800
            score = 90 - idx * 5
            
            if user_skills:
                skills_show = user_skills[:2]
                reason = f"Excellent chance to apply {' and '.join(skills_show)}"
            else:
                reason = f"Perfect gateway role for {target_role}"
                
            comp = random.choice(company_pool)
            encoded_query = urllib.parse.quote(f"{title} {comp}")
            opps.append({
                "id": f"mock-intern-{idx}",
                "title": title,
                "company": comp,
                "location": random.choice(locations),
                "salary": format_salary(salary_min, salary_max, country),
                "redirectUrl": f"https://www.indeed.com/jobs?q={encoded_query}",
                "created": datetime.datetime.utcnow().isoformat(),
                "matchScore": score,
                "matchReason": reason,
                "type": "internship"
            })
            
        return opps

    if not app_id or not app_key or app_id == "your_adzuna_app_id" or app_key == "your_adzuna_app_key":
        return jsonify({
            "opportunities": generate_mock_opportunities(),
            "isMock": True
        }), 200

    try:
        # Fetch jobs
        jobs_url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1?app_id={app_id}&app_key={app_key}&what={target_role}&results_per_page=6&content-type=application/json"
        internships_url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1?app_id={app_id}&app_key={app_key}&what={target_role} internship&results_per_page=6&content-type=application/json"
        
        jobs_res = requests.get(jobs_url)
        intern_res = requests.get(internships_url)
        
        jobs_data = jobs_res.json() if jobs_res.status_code == 200 else {"results": []}
        intern_data = intern_res.json() if intern_res.status_code == 200 else {"results": []}
        
        opportunities = []
        import urllib.parse
        
        # Process jobs
        for job in jobs_data.get("results", []):
            title = clean_html(job.get("title"))
            desc = clean_html(job.get("description"))
            company_name = job.get("company", {}).get("display_name") or "Confidential"
            score, reason = calculate_match(title, desc)
            encoded_query = urllib.parse.quote(f"{title} {company_name}")
            opportunities.append({
                "id": str(job.get("id")) or str(random.random()),
                "title": title,
                "company": company_name,
                "location": job.get("location", {}).get("display_name") or "Multiple Locations",
                "salary": format_salary(job.get("salary_min"), job.get("salary_max"), country),
                "redirectUrl": f"https://www.linkedin.com/jobs/search/?keywords={encoded_query}",
                "created": job.get("created") or datetime.datetime.utcnow().isoformat(),
                "matchScore": score,
                "matchReason": reason,
                "type": "job"
            })
            
        # Process internships
        for intern in intern_data.get("results", []):
            title = clean_html(intern.get("title"))
            desc = clean_html(intern.get("description"))
            company_name = intern.get("company", {}).get("display_name") or "Confidential"
            score, reason = calculate_match(title, desc)
            encoded_query = urllib.parse.quote(f"{title} {company_name}")
            opportunities.append({
                "id": str(intern.get("id")) or str(random.random()),
                "title": title,
                "company": company_name,
                "location": intern.get("location", {}).get("display_name") or "Multiple Locations",
                "salary": format_salary(intern.get("salary_min"), intern.get("salary_max"), country),
                "redirectUrl": f"https://www.indeed.com/jobs?q={encoded_query}",
                "created": intern.get("created") or datetime.datetime.utcnow().isoformat(),
                "matchScore": score,
                "matchReason": reason,
                "type": "internship"
            })
            
        if not opportunities:
            return jsonify({
                "opportunities": generate_mock_opportunities(),
                "isMock": True
            }), 200
            
        opportunities.sort(key=lambda x: x["matchScore"], reverse=True)
        return jsonify({
            "opportunities": opportunities,
            "isMock": False
        }), 200

    except Exception as e:
        print(f"Error fetching from Adzuna: {e}")
        return jsonify({
            "opportunities": generate_mock_opportunities(),
            "isMock": True
        }), 200

