import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parent
SUBJECT_DIR = ROOT / "subjects" / "utt" / "ttHCM"
SUBJECT_FILE = SUBJECT_DIR / "subject.json"
STUDY_DATA_FILE = SUBJECT_DIR / "study_data.json"
DEFAULT_OUTPUT = SUBJECT_DIR / "ttHCM_cau_hoi_dap_an.pdf"
CHAPTER_OUTPUT_TEMPLATE = "ttHCM_chuong_{chapter_number}.pdf"


def register_fonts():
    font_path = Path("C:/Windows/Fonts/arial.ttf")
    bold_path = Path("C:/Windows/Fonts/arialbd.ttf")

    if not font_path.exists():
        raise FileNotFoundError(f"Khong tim thay font: {font_path}")
    if not bold_path.exists():
        raise FileNotFoundError(f"Khong tim thay font dam: {bold_path}")

    pdfmetrics.registerFont(TTFont("Arial", str(font_path)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(bold_path)))


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="DocTitle",
            parent=styles["Title"],
            fontName="Arial-Bold",
            fontSize=18,
            leading=22,
            alignment=TA_CENTER,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DocSubTitle",
            parent=styles["Normal"],
            fontName="Arial",
            fontSize=11,
            leading=14,
            alignment=TA_CENTER,
            textColor="#444444",
            spaceAfter=16,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ChapterTitle",
            parent=styles["Heading1"],
            fontName="Arial-Bold",
            fontSize=14,
            leading=18,
            spaceBefore=10,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ChapterName",
            parent=styles["Heading2"],
            fontName="Arial-Bold",
            fontSize=12.5,
            leading=16,
            spaceBefore=0,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="QuestionText",
            parent=styles["Normal"],
            fontName="Arial",
            fontSize=11,
            leading=15,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="OptionText",
            parent=styles["Normal"],
            fontName="Arial",
            fontSize=10.5,
            leading=14,
            leftIndent=14,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="AnswerText",
            parent=styles["Normal"],
            fontName="Arial-Bold",
            fontSize=11,
            leading=14,
            textColor="#1f4e79",
            spaceBefore=2,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="MetaText",
            parent=styles["Normal"],
            fontName="Arial",
            fontSize=9,
            leading=12,
            textColor="#666666",
            spaceAfter=8,
        )
    )
    return styles


def load_subject():
    with SUBJECT_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_study_data():
    with STUDY_DATA_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_chapter(chapter_file):
    chapter_path = SUBJECT_DIR / "exam" / chapter_file
    with chapter_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def make_question_block(question, index, styles):
    story = []

    question_text = escape(question.get("question", ""))
    story.append(Paragraph(f"<b>Cau {index}.</b> {question_text}", styles["QuestionText"]))

    for option in question.get("options", []):
        option_id = escape(str(option.get("id", "")))
        option_content = escape(option.get("content", ""))
        story.append(Paragraph(f"<b>{option_id}.</b> {option_content}", styles["OptionText"]))

    answer = escape(str(question.get("answer", "")))
    story.append(Paragraph(f"<b>Answer:</b> {answer}", styles["AnswerText"]))

    explanation = question.get("explain")
    if explanation:
        story.append(Paragraph(f"<b>explain:</b> {escape(explanation)}", styles["MetaText"]))

    return story


def create_pdf(output_filename):
    register_fonts()
    styles = build_styles()
    subject = load_subject()
    study_data = load_study_data()
    chapter_titles = {}

    for item in study_data:
        title = item.get("title")
        for chapter_id in item.get("chapters", []):
            chapter_titles[int(chapter_id)] = title

    doc = SimpleDocTemplate(
        str(output_filename),
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title=f"{subject.get('name', 'ttHCM')} - Cau hoi va dap an",
        author="GitHub Copilot",
    )

    story = []
    story.append(Paragraph(escape(subject.get("name", "Tu tuong Ho Chi Minh")), styles["DocTitle"]))
    story.append(
        Paragraph(
            escape("Tong hop toan bo cau hoi, dap an va giai thich theo tung chuong."),
            styles["DocSubTitle"],
        )
    )

    chapter_count = 0
    total_questions = 0

    for chapter in subject.get("chapters", []):
        chapter_count += 1
        chapter_data = load_chapter(chapter["file"])
        chapter_title = chapter_titles.get(chapter_count) or chapter.get("name") or chapter_data.get("title") or f"Chuong {chapter_count}"
        questions = chapter_data.get("questions", [])
        total_questions += len(questions)

        story.append(Paragraph(escape(f"Chuong {chapter_count}"), styles["ChapterTitle"]))
        story.append(Paragraph(escape(chapter_title), styles["ChapterName"]))

        for index, question in enumerate(questions, start=1):
            story.extend(make_question_block(question, index, styles))
            story.append(Spacer(1, 8))

        story.append(PageBreak())

    if story and isinstance(story[-1], PageBreak):
        story.pop()

    doc.build(story)
    print(f"Da tao PDF: {output_filename}")
    print(f"So chuong: {chapter_count}, so cau hoi: {total_questions}")


def create_chapter_pdfs():
    register_fonts()
    styles = build_styles()
    subject = load_subject()
    study_data = load_study_data()
    chapter_titles = {}

    for item in study_data:
        title = item.get("title")
        for chapter_id in item.get("chapters", []):
            chapter_titles[int(chapter_id)] = title

    for chapter in subject.get("chapters", []):
        chapter_number = int(chapter["id"])
        chapter_data = load_chapter(chapter["file"])
        chapter_title = chapter_titles.get(chapter_number) or chapter.get("name") or chapter_data.get("title") or f"Chuong {chapter_number}"
        questions = chapter_data.get("questions", [])

        output_filename = SUBJECT_DIR / CHAPTER_OUTPUT_TEMPLATE.format(chapter_number=chapter_number)
        doc = SimpleDocTemplate(
            str(output_filename),
            pagesize=A4,
            rightMargin=1.8 * cm,
            leftMargin=1.8 * cm,
            topMargin=1.8 * cm,
            bottomMargin=1.8 * cm,
            title=f"{subject.get('name', 'ttHCM')} - Chuong {chapter_number}",
            author="GitHub Copilot",
        )

        story = []
        story.append(Paragraph(escape(subject.get("name", "Tu tuong Ho Chi Minh")), styles["DocTitle"]))
        story.append(Paragraph(escape(f"Chuong {chapter_number}"), styles["ChapterTitle"]))
        story.append(Paragraph(escape(chapter_title), styles["ChapterName"]))
        story.append(
            Paragraph(
                escape(f"Tong hop cau hoi, dap an va giai thich cua chuong {chapter_number}."),
                styles["DocSubTitle"],
            )
        )

        for index, question in enumerate(questions, start=1):
            story.extend(make_question_block(question, index, styles))
            story.append(Spacer(1, 8))

        doc.build(story)
        print(f"Da tao PDF: {output_filename}")


if __name__ == "__main__":
    create_chapter_pdfs()