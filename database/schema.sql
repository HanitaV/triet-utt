PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    UNIQUE(name, short_name)
);

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    icon TEXT,
    school_id INTEGER REFERENCES schools(id),
    source_path TEXT,
    exam_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subject_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_no INTEGER,
    chapter_name TEXT NOT NULL,
    chapter_file TEXT,
    UNIQUE(subject_id, chapter_no)
);

CREATE TABLE IF NOT EXISTS simulation_configs (
    subject_id TEXT PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
    total_questions INTEGER,
    time_minutes INTEGER
);

CREATE TABLE IF NOT EXISTS simulation_distribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_no INTEGER,
    percent REAL,
    UNIQUE(subject_id, chapter_no)
);

CREATE TABLE IF NOT EXISTS study_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    topic_ref_id INTEGER,
    title TEXT NOT NULL,
    icon TEXT,
    content_html TEXT,
    goals_json TEXT,
    tips_json TEXT,
    keywords_json TEXT,
    chapters_json TEXT,
    videos_json TEXT,
    question_ids_json TEXT
);

CREATE TABLE IF NOT EXISTS question_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_no INTEGER,
    title TEXT,
    source_file TEXT NOT NULL,
    total_questions INTEGER,
    UNIQUE(subject_id, source_file)
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_no INTEGER,
    question_id_in_set INTEGER,
    question_text TEXT NOT NULL,
    answer TEXT,
    explanation TEXT,
    topic TEXT,
    no_shuffle INTEGER,
    extra_json TEXT
);

CREATE TABLE IF NOT EXISTS question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_label TEXT,
    option_content TEXT NOT NULL,
    option_order INTEGER
);

CREATE TABLE IF NOT EXISTS markdown_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    source_file TEXT NOT NULL,
    full_text TEXT NOT NULL,
    UNIQUE(subject_id, source_file)
);

CREATE TABLE IF NOT EXISTS markdown_answer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    markdown_source_id INTEGER NOT NULL REFERENCES markdown_sources(id) ON DELETE CASCADE,
    chapter_no INTEGER,
    question_no INTEGER,
    answer TEXT,
    detail_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter
ON questions(subject_id, chapter_no);

CREATE INDEX IF NOT EXISTS idx_question_options_question
ON question_options(question_id);

CREATE INDEX IF NOT EXISTS idx_study_topics_subject
ON study_topics(subject_id);
