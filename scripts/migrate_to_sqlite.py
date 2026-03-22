import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT_DIR / "database" / "schema.sql"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dumps_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def ensure_schema(conn: sqlite3.Connection) -> None:
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema_sql)


def collect_subject_paths(root_dir: Path) -> List[Path]:
    subjects_index = root_dir / "subjects.json"
    items = load_json(subjects_index)
    paths: List[Path] = []
    for item in items:
        rel_path = item.get("path")
        if not rel_path:
            continue
        full_path = root_dir / rel_path
        if full_path.exists():
            paths.append(full_path)
    return paths


def upsert_school(cursor: sqlite3.Cursor, name: Optional[str], short_name: Optional[str]) -> Optional[int]:
    if not name:
        return None
    cursor.execute(
        """
        INSERT INTO schools(name, short_name)
        VALUES(?, ?)
        ON CONFLICT(name, short_name) DO NOTHING
        """,
        (name, short_name),
    )
    cursor.execute("SELECT id FROM schools WHERE name = ? AND IFNULL(short_name, '') = IFNULL(?, '')", (name, short_name))
    row = cursor.fetchone()
    return row[0] if row else None


def insert_subject(cursor: sqlite3.Cursor, subject: Dict[str, Any], subject_dir: Path, school_id: Optional[int]) -> str:
    subject_id = subject.get("id") or subject_dir.name
    cursor.execute(
        """
        INSERT INTO subjects(id, name, short_name, icon, school_id, source_path, exam_path)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            icon = excluded.icon,
            school_id = excluded.school_id,
            source_path = excluded.source_path,
            exam_path = excluded.exam_path
        """,
        (
            subject_id,
            subject.get("name", subject_id),
            subject.get("shortName"),
            subject.get("icon"),
            school_id,
            str(subject_dir.relative_to(ROOT_DIR)).replace("\\", "/"),
            subject.get("examPath"),
        ),
    )
    return subject_id


def insert_chapters(cursor: sqlite3.Cursor, subject_id: str, chapters: Iterable[Dict[str, Any]]) -> None:
    for chapter in chapters:
        cursor.execute(
            """
            INSERT INTO subject_chapters(subject_id, chapter_no, chapter_name, chapter_file)
            VALUES(?, ?, ?, ?)
            ON CONFLICT(subject_id, chapter_no) DO UPDATE SET
                chapter_name = excluded.chapter_name,
                chapter_file = excluded.chapter_file
            """,
            (
                subject_id,
                chapter.get("id"),
                chapter.get("name", ""),
                chapter.get("file"),
            ),
        )


def insert_simulation_config(cursor: sqlite3.Cursor, subject_id: str, simulation_config: Dict[str, Any]) -> None:
    cursor.execute(
        """
        INSERT INTO simulation_configs(subject_id, total_questions, time_minutes)
        VALUES(?, ?, ?)
        ON CONFLICT(subject_id) DO UPDATE SET
            total_questions = excluded.total_questions,
            time_minutes = excluded.time_minutes
        """,
        (
            subject_id,
            simulation_config.get("totalQuestions"),
            simulation_config.get("timeMinutes"),
        ),
    )

    distribution = simulation_config.get("distribution") or []
    for item in distribution:
        cursor.execute(
            """
            INSERT INTO simulation_distribution(subject_id, chapter_no, percent)
            VALUES(?, ?, ?)
            ON CONFLICT(subject_id, chapter_no) DO UPDATE SET
                percent = excluded.percent
            """,
            (subject_id, item.get("chapter"), item.get("percent")),
        )


def insert_study_topics(cursor: sqlite3.Cursor, subject_id: str, topics: List[Dict[str, Any]]) -> None:
    cursor.execute("DELETE FROM study_topics WHERE subject_id = ?", (subject_id,))
    for topic in topics:
        cursor.execute(
            """
            INSERT INTO study_topics(
                subject_id, topic_ref_id, title, icon, content_html,
                goals_json, tips_json, keywords_json, chapters_json, videos_json, question_ids_json
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                subject_id,
                topic.get("id"),
                topic.get("title", ""),
                topic.get("icon"),
                topic.get("content"),
                dumps_json(topic.get("goals", [])),
                dumps_json(topic.get("tips", [])),
                dumps_json(topic.get("keywords", [])),
                dumps_json(topic.get("chapters", [])),
                dumps_json(topic.get("videos", [])),
                dumps_json(topic.get("questionIds", {})),
            ),
        )


def parse_exam_file(subject_id: str, chapter_no: Optional[int], source_file: Path) -> Dict[str, Any]:
    data = load_json(source_file)
    if isinstance(data, dict) and "questions" in data:
        return {
            "subject_id": subject_id,
            "chapter_no": chapter_no if chapter_no is not None else data.get("chapter"),
            "title": data.get("title", source_file.stem),
            "source_file": str(source_file).replace("\\", "/"),
            "total_questions": data.get("total_questions", len(data.get("questions", []))),
            "questions": data.get("questions", []),
        }
    raise ValueError(f"Unsupported exam JSON format: {source_file}")


def insert_question_set_and_questions(cursor: sqlite3.Cursor, question_set: Dict[str, Any], root_dir: Path) -> None:
    rel_source = str(Path(question_set["source_file"]).resolve().relative_to(root_dir)).replace("\\", "/")
    cursor.execute(
        """
        INSERT INTO question_sets(subject_id, chapter_no, title, source_file, total_questions)
        VALUES(?, ?, ?, ?, ?)
        ON CONFLICT(subject_id, source_file) DO UPDATE SET
            chapter_no = excluded.chapter_no,
            title = excluded.title,
            total_questions = excluded.total_questions
        """,
        (
            question_set["subject_id"],
            question_set["chapter_no"],
            question_set["title"],
            rel_source,
            question_set["total_questions"],
        ),
    )
    cursor.execute(
        "SELECT id FROM question_sets WHERE subject_id = ? AND source_file = ?",
        (question_set["subject_id"], rel_source),
    )
    question_set_id = cursor.fetchone()[0]

    cursor.execute("DELETE FROM questions WHERE question_set_id = ?", (question_set_id,))

    for q in question_set["questions"]:
        extra_payload = {k: v for k, v in q.items() if k not in {"id", "question", "answer", "explain", "topic", "noShuffle", "options"}}
        cursor.execute(
            """
            INSERT INTO questions(
                question_set_id, subject_id, chapter_no, question_id_in_set,
                question_text, answer, explanation, topic, no_shuffle, extra_json
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                question_set_id,
                question_set["subject_id"],
                question_set["chapter_no"],
                q.get("id"),
                q.get("question", ""),
                q.get("answer"),
                q.get("explain"),
                q.get("topic"),
                1 if q.get("noShuffle") else 0,
                dumps_json(extra_payload) if extra_payload else None,
            ),
        )
        question_id = cursor.lastrowid

        options = q.get("options") or []
        for idx, opt in enumerate(options, start=1):
            cursor.execute(
                """
                INSERT INTO question_options(question_id, option_label, option_content, option_order)
                VALUES(?, ?, ?, ?)
                """,
                (
                    question_id,
                    opt.get("id"),
                    opt.get("content", ""),
                    idx,
                ),
            )


def parse_markdown_answer_items(text: str) -> List[Tuple[Optional[int], int, Optional[str], str]]:
    current_chapter: Optional[int] = None
    items: List[Tuple[Optional[int], int, Optional[str], str]] = []

    chapter_pattern = re.compile(r"ch(?:ư|u)o(?:ng|\u031bng)\s*(\d+)", re.IGNORECASE)
    qa_pattern = re.compile(r"Câu\s*(\d+)\s*:\s*Đáp án\s*([A-E])\.?\s*(.*)", re.IGNORECASE)

    for raw_line in text.splitlines():
        line = raw_line.strip().strip("*").strip()
        if not line:
            continue

        chapter_match = chapter_pattern.search(line)
        if chapter_match:
            current_chapter = int(chapter_match.group(1))

        qa_match = qa_pattern.search(line)
        if qa_match:
            question_no = int(qa_match.group(1))
            answer = qa_match.group(2).upper()
            detail = qa_match.group(3).strip(" .")
            items.append((current_chapter, question_no, answer, detail))

    return items


def insert_markdown_sources(cursor: sqlite3.Cursor, subject_id: str, markdown_dir: Path, root_dir: Path) -> None:
    for md_file in sorted(markdown_dir.glob("*.md")):
        full_text = md_file.read_text(encoding="utf-8")
        rel_file = str(md_file.resolve().relative_to(root_dir)).replace("\\", "/")

        cursor.execute(
            """
            INSERT INTO markdown_sources(subject_id, source_file, full_text)
            VALUES(?, ?, ?)
            ON CONFLICT(subject_id, source_file) DO UPDATE SET
                full_text = excluded.full_text
            """,
            (subject_id, rel_file, full_text),
        )

        cursor.execute(
            "SELECT id FROM markdown_sources WHERE subject_id = ? AND source_file = ?",
            (subject_id, rel_file),
        )
        source_id = cursor.fetchone()[0]

        cursor.execute("DELETE FROM markdown_answer_items WHERE markdown_source_id = ?", (source_id,))
        for chapter_no, question_no, answer, detail_text in parse_markdown_answer_items(full_text):
            cursor.execute(
                """
                INSERT INTO markdown_answer_items(markdown_source_id, chapter_no, question_no, answer, detail_text)
                VALUES(?, ?, ?, ?, ?)
                """,
                (source_id, chapter_no, question_no, answer, detail_text or None),
            )


def migrate_subject(cursor: sqlite3.Cursor, subject_dir: Path, root_dir: Path) -> None:
    subject_file = subject_dir / "subject.json"
    if not subject_file.exists():
        return

    subject = load_json(subject_file)

    school_id = upsert_school(cursor, subject.get("school"), subject.get("shortSchool"))
    subject_id = insert_subject(cursor, subject, subject_dir, school_id)

    insert_chapters(cursor, subject_id, subject.get("chapters", []))

    simulation = subject.get("simulationConfig")
    if simulation:
        insert_simulation_config(cursor, subject_id, simulation)

    study_file = subject_dir / "study_data.json"
    if study_file.exists():
        study_data = load_json(study_file)
        if isinstance(study_data, list):
            insert_study_topics(cursor, subject_id, study_data)

    exam_dir = subject_dir / (subject.get("examPath") or "exam")
    if exam_dir.exists():
        chapter_by_file = {c.get("file"): c.get("id") for c in subject.get("chapters", [])}
        for exam_file in sorted(exam_dir.glob("*.json")):
            chapter_no = chapter_by_file.get(exam_file.name)
            parsed = parse_exam_file(subject_id, chapter_no, exam_file)
            insert_question_set_and_questions(cursor, parsed, root_dir)


def migrate_tthcm_markdown(cursor: sqlite3.Cursor, root_dir: Path) -> None:
    markdown_dir = root_dir / "subjects" / "utt" / "ttHCM"
    if not markdown_dir.exists():
        return

    subject_id = "tthcm"
    school_id = upsert_school(cursor, "Đại học Công nghệ GTVT", "UTT")
    cursor.execute(
        """
        INSERT INTO subjects(id, name, short_name, icon, school_id, source_path, exam_path)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            icon = excluded.icon,
            school_id = excluded.school_id,
            source_path = excluded.source_path,
            exam_path = excluded.exam_path
        """,
        (
            subject_id,
            "Tư tưởng Hồ Chí Minh",
            "ttHCM",
            "📘",
            school_id,
            "subjects/utt/ttHCM",
            None,
        ),
    )
    insert_markdown_sources(cursor, subject_id, markdown_dir, root_dir)


def migrate_legacy_root_data(cursor: sqlite3.Cursor, root_dir: Path) -> None:
    study_file = root_dir / "study_data.json"
    data_js = root_dir / "data.js"

    if not study_file.exists() and not data_js.exists():
        return

    subject_id = "legacy-root"
    school_id = upsert_school(cursor, "Đại học Công nghệ GTVT", "UTT")

    cursor.execute(
        """
        INSERT INTO subjects(id, name, short_name, icon, school_id, source_path, exam_path)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            icon = excluded.icon,
            school_id = excluded.school_id,
            source_path = excluded.source_path,
            exam_path = excluded.exam_path
        """,
        (subject_id, "Legacy Root Data", "legacy", "🗂️", school_id, ".", "exam"),
    )

    if study_file.exists():
        study_data = load_json(study_file)
        if isinstance(study_data, list):
            insert_study_topics(cursor, subject_id, study_data)

    if data_js.exists():
        content = data_js.read_text(encoding="utf-8")
        marker = "window.QUIZ_DATA ="
        if marker in content:
            json_raw = content.split(marker, 1)[1].strip().rstrip(";")
            quiz_map = json.loads(json_raw)
            for key, payload in quiz_map.items():
                chapter_no = None
                chapter_match = re.search(r"chuong_(\d+)", key)
                if chapter_match:
                    chapter_no = int(chapter_match.group(1))
                parsed = {
                    "subject_id": subject_id,
                    "chapter_no": chapter_no,
                    "title": payload.get("title", key),
                    "source_file": str((root_dir / key).resolve()).replace("\\", "/"),
                    "total_questions": payload.get("total_questions", len(payload.get("questions", []))),
                    "questions": payload.get("questions", []),
                }
                insert_question_set_and_questions(cursor, parsed, root_dir)


def build_stats(conn: sqlite3.Connection) -> Dict[str, int]:
    stats = {}
    for table in [
        "schools",
        "subjects",
        "subject_chapters",
        "study_topics",
        "question_sets",
        "questions",
        "question_options",
        "markdown_sources",
        "markdown_answer_items",
    ]:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        stats[table] = count
    return stats


def run(db_path: Path, root_dir: Path, clear_existing: bool) -> Dict[str, int]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        ensure_schema(conn)

        if clear_existing:
            # Clear data while preserving schema.
            conn.executescript(
                """
                DELETE FROM markdown_answer_items;
                DELETE FROM markdown_sources;
                DELETE FROM question_options;
                DELETE FROM questions;
                DELETE FROM question_sets;
                DELETE FROM study_topics;
                DELETE FROM simulation_distribution;
                DELETE FROM simulation_configs;
                DELETE FROM subject_chapters;
                DELETE FROM subjects;
                DELETE FROM schools;
                """
            )

        cursor = conn.cursor()
        for subject_dir in collect_subject_paths(root_dir):
            migrate_subject(cursor, subject_dir, root_dir)

        migrate_tthcm_markdown(cursor, root_dir)
        migrate_legacy_root_data(cursor, root_dir)

        conn.commit()
        return build_stats(conn)


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate project quiz data into SQLite database.")
    parser.add_argument(
        "--db",
        default=str(ROOT_DIR / "database" / "triet_utt.db"),
        help="Target SQLite database path.",
    )
    parser.add_argument(
        "--no-clear",
        action="store_true",
        help="Do not clear existing rows before importing.",
    )

    args = parser.parse_args()
    db_path = Path(args.db).resolve()

    stats = run(db_path=db_path, root_dir=ROOT_DIR, clear_existing=not args.no_clear)

    print(f"Database generated at: {db_path}")
    for name, count in stats.items():
        print(f"- {name}: {count}")


if __name__ == "__main__":
    main()
