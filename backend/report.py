import io
from flask import Blueprint, jsonify, send_file
from bson import ObjectId
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.auth import get_current_user
from backend.database import get_analyses_collection, get_users_collection

report_bp = Blueprint("report", __name__)

def create_pdf(analysis, name):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#6366F1'),
        alignment=0, # Left
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#8B5CF6'),
        spaceAfter=25
    )
    
    heading2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )

    bold_body_style = ParagraphStyle(
        'BoldBodyTextCustom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    list_item_style = ParagraphStyle(
        'ListItemText',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4
    )
    
    story = []
    
    # Title & Metadata
    story.append(Paragraph("SKILLGAP ANALYZER", subtitle_style))
    story.append(Paragraph("Career Readiness & Roadmap Report", title_style))
    
    # Meta Info Table
    date_str = analysis.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if isinstance(analysis.get("created_at"), datetime.datetime) else "Date generated"
    if not isinstance(date_str, str):
        # Fallback if datetime is imported from datetime
        try:
            import datetime
            if isinstance(analysis.get("created_at"), datetime.datetime):
                date_str = analysis.get("created_at").strftime("%B %d, %Y")
        except:
            date_str = str(analysis.get("created_at"))[:10]
            
    meta_data = [
        [Paragraph("Candidate Name:", bold_body_style), Paragraph(name, body_style)],
        [Paragraph("Target Role:", bold_body_style), Paragraph(analysis.get("target_role"), body_style)],
        [Paragraph("Report Date:", bold_body_style), Paragraph(date_str, body_style)],
        [Paragraph("Readiness Score:", bold_body_style), Paragraph(f"{analysis.get('readiness_score')}/100", bold_body_style)]
    ]
    
    meta_table = Table(meta_data, colWidths=[120, 410])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    
    story.append(meta_table)
    story.append(Spacer(1, 20))
    
    # Summary
    story.append(Paragraph("Executive Summary", heading2_style))
    story.append(Paragraph(analysis.get("summary", "No summary available."), body_style))
    story.append(Spacer(1, 15))
    
    # Skills Found & Missing
    skills_data = [
        [Paragraph("Skills Found (Strength)", bold_body_style), Paragraph("Missing Skills (Gap)", bold_body_style)]
    ]
    
    # Pair them up
    found = analysis.get("skills_found", [])
    missing = analysis.get("missing_skills", [])
    max_len = max(len(found), len(missing))
    
    for i in range(max_len):
        f_val = f"• {found[i]}" if i < len(found) else ""
        m_val = f"• {missing[i]}" if i < len(missing) else ""
        skills_data.append([
            Paragraph(f_val, ParagraphStyle('GreenText', parent=body_style, textColor=colors.HexColor('#16A34A'))),
            Paragraph(m_val, ParagraphStyle('RedText', parent=body_style, textColor=colors.HexColor('#DC2626')))
        ])
        
    skills_table = Table(skills_data, colWidths=[265, 265])
    skills_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    
    story.append(Paragraph("Skills Analysis", heading2_style))
    story.append(skills_table)
    story.append(Spacer(1, 20))
    
    # PageBreak for Roadmap
    story.append(PageBreak())
    
    # Roadmap Section
    story.append(Paragraph("Personalized 4-Week Learning Roadmap", heading2_style))
    story.append(Paragraph("Follow this structured roadmap to bridge your skill gaps and achieve your target role.", body_style))
    story.append(Spacer(1, 10))
    
    roadmap = analysis.get("roadmap", [])
    for step in roadmap:
        week = step.get("week")
        title = step.get("title")
        objs = step.get("objectives")
        outcomes = step.get("outcomes", [])
        
        story.append(Paragraph(f"Week {week}: {title}", ParagraphStyle('WeekHeader', parent=heading2_style, fontSize=12, leading=16, textColor=colors.HexColor('#6366F1'), spaceBefore=10)))
        story.append(Paragraph(f"<b>Objective:</b> {objs}", body_style))
        
        if outcomes:
            story.append(Paragraph("<b>Expected Learning Outcomes:</b>", body_style))
            for out in outcomes:
                story.append(Paragraph(f"- {out}", list_item_style))
                
        story.append(Spacer(1, 10))
        
    doc.build(story)
    buffer.seek(0)
    return buffer

@report_bp.route("/report/<analysis_id>", methods=["GET"])
def download_report(analysis_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    analyses_col = get_analyses_collection()
    analysis = analyses_col.find_one({"_id": ObjectId(analysis_id), "user_id": ObjectId(user["_id"])})
    if not analysis:
        return jsonify({"error": "Analysis not found"}), 404
        
    pdf_buffer = create_pdf(analysis, user.get("name", "User"))
    
    # Build a file name
    clean_role = analysis.get("target_role", "Career").replace(" ", "_")
    filename = f"SkillGap_{clean_role}_Report.pdf"
    
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf"
    )
import datetime
