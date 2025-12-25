#!/usr/bin/env python3
"""
PDF Generator for Exam Questions
Generates PDF files from JSON exam data with correct answers highlighted in red.
"""

import json
import argparse
import os
from pathlib import Path

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import black, red
    from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
except ImportError:
    print("Error: reportlab is not installed. Please run:")
    print("  pip install reportlab")
    exit(1)


def setup_fonts():
    """Setup Vietnamese font support."""
    # Try to register a Vietnamese-compatible font
    # Common locations for fonts on Windows
    font_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/times.ttf",
        "C:/Windows/Fonts/tahoma.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                font_name = Path(font_path).stem.capitalize()
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                return font_name
            except Exception:
                continue
    
    # Fallback to default (may not support Vietnamese fully)
    return "Helvetica"


def create_styles(font_name):
    """Create paragraph styles for the PDF."""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='ChapterTitle',
        fontName=font_name,
        fontSize=18,
        leading=22,
        alignment=TA_LEFT,
        spaceAfter=12*mm,
        spaceBefore=6*mm,
        textColor=black,
        bold=True,
    ))
    
    # Question style
    styles.add(ParagraphStyle(
        name='Question',
        fontName=font_name,
        fontSize=11,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=3*mm,
        spaceBefore=4*mm,
        textColor=black,
    ))
    
    # Option style (normal)
    styles.add(ParagraphStyle(
        name='Option',
        fontName=font_name,
        fontSize=10,
        leading=13,
        alignment=TA_LEFT,
        leftIndent=8*mm,
        spaceAfter=1.5*mm,
        textColor=black,
    ))
    
    # Option style (correct answer - red)
    styles.add(ParagraphStyle(
        name='OptionCorrect',
        fontName=font_name,
        fontSize=10,
        leading=13,
        alignment=TA_LEFT,
        leftIndent=8*mm,
        spaceAfter=1.5*mm,
        textColor=red,
    ))
    
    return styles


def load_json(filepath):
    """Load exam data from JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def escape_text(text):
    """Escape special characters for ReportLab."""
    if text is None:
        return ""
    text = str(text)
    # Replace special XML characters
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text


def generate_pdf(json_path, output_path=None, show_answers=True):
    """
    Generate PDF from JSON exam file.
    
    Args:
        json_path: Path to JSON file
        output_path: Output PDF path (optional, defaults to same name as JSON)
        show_answers: If True, highlight correct answers in red
    """
    # Load JSON data
    data = load_json(json_path)
    
    # Determine output path
    if output_path is None:
        output_path = Path(json_path).with_suffix('.pdf')
    
    # Setup fonts
    font_name = setup_fonts()
    styles = create_styles(font_name)
    
    # Create PDF document
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )
    
    # Build content
    story = []
    
    # Add title
    chapter = data.get('chapter', 'Exam')
    title = data.get('title', '')
    total_questions = data.get('total_questions', len(data.get('questions', [])))
    
    title_text = f"<b>{escape_text(chapter)}</b>"
    if title:
        title_text += f" - {escape_text(title)}"
    story.append(Paragraph(title_text, styles['ChapterTitle']))
    
    # Add question count info
    info_text = f"Tổng số câu hỏi: {total_questions}"
    story.append(Paragraph(info_text, styles['Question']))
    story.append(Spacer(1, 5*mm))
    
    # Add questions
    questions = data.get('questions', [])
    for q in questions:
        q_num = q.get('question', '')
        q_text = q.get('text', '')
        options = q.get('options', [])
        correct = q.get('correct_answer', '')
        
        # Question text
        question_text = f"<b>Câu {q_num}:</b> {escape_text(q_text)}"
        story.append(Paragraph(question_text, styles['Question']))
        
        # Options
        for opt in options:
            letter = opt.get('letter', '')
            opt_text = opt.get('text', '')
            option_content = f"<b>{escape_text(letter)}.</b> {escape_text(opt_text)}"
            
            # Check if this is the correct answer
            if show_answers and letter.upper() == correct.upper():
                story.append(Paragraph(option_content, styles['OptionCorrect']))
            else:
                story.append(Paragraph(option_content, styles['Option']))
        
        # Add spacing after each question
        story.append(Spacer(1, 3*mm))
    
    # Build PDF
    try:
        doc.build(story)
        print(f"✓ Generated: {output_path}")
        return True
    except Exception as e:
        print(f"✗ Error generating PDF: {e}")
        return False


def generate_all(exam_folder, output_folder=None, show_answers=True):
    """
    Generate PDFs for all JSON files in a folder.
    
    Args:
        exam_folder: Folder containing JSON files
        output_folder: Output folder for PDFs (optional)
        show_answers: If True, highlight correct answers in red
    """
    exam_path = Path(exam_folder)
    
    if output_folder:
        output_path = Path(output_folder)
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = exam_path
    
    json_files = list(exam_path.glob('*.json'))
    
    if not json_files:
        print(f"No JSON files found in {exam_folder}")
        return
    
    # Determine suffix based on answer mode
    suffix = "_answer" if show_answers else "_no_answer"
    print(f"Found {len(json_files)} JSON file(s) to process...")
    print(f"Mode: {'With Answers (red)' if show_answers else 'No Answers'}\n")
    
    success_count = 0
    for json_file in sorted(json_files):
        pdf_name = json_file.stem + suffix + '.pdf'
        pdf_path = output_path / pdf_name
        
        print(f"Processing: {json_file.name}")
        if generate_pdf(json_file, pdf_path, show_answers):
            success_count += 1
    
    print(f"\n{'='*50}")
    print(f"Completed: {success_count}/{len(json_files)} PDFs generated")


def main():
    parser = argparse.ArgumentParser(
        description='Generate PDF exam files from JSON with highlighted answers'
    )
    
    parser.add_argument(
        'input',
        nargs='?',
        default='exam',
        help='Input JSON file or folder containing JSON files (default: exam folder)'
    )
    
    parser.add_argument(
        '-o', '--output',
        help='Output PDF file or folder (default: same as input)'
    )
    
    parser.add_argument(
        '--no-answers',
        action='store_true',
        help='Do not highlight correct answers (generate blank exam)'
    )
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    
    if not input_path.exists():
        print(f"Error: Path not found: {args.input}")
        return
    
    show_answers = not args.no_answers
    
    if input_path.is_file():
        # Single file mode
        generate_pdf(input_path, args.output, show_answers)
    else:
        # Folder mode
        generate_all(input_path, args.output, show_answers)


if __name__ == '__main__':
    main()
