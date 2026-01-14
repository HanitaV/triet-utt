import json
import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

def create_pdf(output_filename):
    doc = SimpleDocTemplate(output_filename, pagesize=A4,
                            rightMargin=50, leftMargin=50,
                            topMargin=50, bottomMargin=50)

    # Register a font that supports Vietnamese
    # Windows usually has Arial.ttf
    font_path = "C:\\Windows\\Fonts\\arial.ttf"
    if not os.path.exists(font_path):
        # Fallback or error handling if font doesn't exist. 
        # On Windows, this path is standard.
        print(f"Warning: Font not found at {font_path}")
        return

    pdfmetrics.registerFont(TTFont('Arial', font_path))
    pdfmetrics.registerFont(TTFont('Arial-Bold', "C:\\Windows\\Fonts\\arialbd.ttf"))

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Vietnamese', fontName='Arial', fontSize=12, leading=14))
    styles.add(ParagraphStyle(name='VietnameseBold', fontName='Arial-Bold', fontSize=12, leading=14, spaceAfter=6))
    
    # Check if Title exists, if so update it, otherwise add it.
    if 'Title' in styles:
        title_style = styles['Title']
        title_style.fontName = 'Arial-Bold'
        title_style.alignment = 1
    else:
        styles.add(ParagraphStyle(name='Title', fontName='Arial-Bold', fontSize=16, leading=20, alignment=1, spaceAfter=20))

    story = []

    # Title of the document
    story.append(Paragraph("TỔNG HỢP CÂU HỎI TRẮC NGHIỆM TRIẾT HỌC (CHƯƠNG 1-3)", styles['Title']))
    story.append(Spacer(1, 12))

    chapters = [
        {"file": "subjects/utt/triet-mac-lenin/exam/chuong_1.json", "name": "CHƯƠNG 1"},
        {"file": "subjects/utt/triet-mac-lenin/exam/chuong_2.json", "name": "CHƯƠNG 2"},
        {"file": "subjects/utt/triet-mac-lenin/exam/chuong_3.json", "name": "CHƯƠNG 3"},
    ]

    for chapter in chapters:
        file_path = chapter["file"]
        chapter_name = chapter["name"]
        
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Chapter Title
        story.append(Paragraph(chapter_name, styles['Title']))
        story.append(Spacer(1, 10))

        questions = data.get("questions", [])
        for i, q in enumerate(questions):
            question_text = f"<b>Câu {i+1}:</b> {q['question']}"
            story.append(Paragraph(question_text, styles['Vietnamese']))
            story.append(Spacer(1, 5))

            options = q.get("options", [])
            for opt in options:
                opt_id = opt.get("id", "")
                opt_content = opt.get("content", "")
                option_text = f"<b>{opt_id}.</b> {opt_content}"
                story.append(Paragraph(option_text, styles['Vietnamese']))
            
            story.append(Spacer(1, 4))
            answer = q.get("answer", "")
            answer_text = f"<b>Đáp án: {answer}</b>"
            story.append(Paragraph(answer_text, styles['Vietnamese']))
            
            story.append(Spacer(1, 12)) # Space between questions
        
        story.append(Spacer(1, 20)) # Space between chapters

    doc.build(story)
    print(f"PDF generated successfully: {output_filename}")

if __name__ == "__main__":
    create_pdf("dethi_triet_c123.pdf")
