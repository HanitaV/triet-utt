# Data Migration to SQLite

This folder contains a normalized SQLite schema and migration script for the project data.

## Files

- `schema.sql`: Database schema.
- `triet_utt.db`: Generated SQLite database (created after running migration).
- `README.md`: Usage guide.

## Run Migration

From project root:

```bash
C:/Users/Nelovo/AppData/Local/Programs/Python/Python312/python.exe scripts/migrate_to_sqlite.py
```

Optional arguments:

- `--db <path>`: custom output database path.
- `--no-clear`: keep existing rows and upsert where possible.

Example:

```bash
C:/Users/Nelovo/AppData/Local/Programs/Python/Python312/python.exe scripts/migrate_to_sqlite.py --db database/custom.db
```

## Imported Data Sources

1. `subjects.json` index.
2. Subject directories under `subjects/**`:
   - `subject.json`
   - `study_data.json`
   - `exam/*.json`
3. `subjects/utt/ttHCM/*.md`:
   - store full markdown text in `markdown_sources`
   - extract lines matching `Câu X: Đáp án Y` into `markdown_answer_items`
4. Legacy root data:
   - `study_data.json`
   - `data.js` (`window.QUIZ_DATA`)

## Main Tables

- `schools`
- `subjects`
- `subject_chapters`
- `simulation_configs`
- `simulation_distribution`
- `study_topics`
- `question_sets`
- `questions`
- `question_options`
- `markdown_sources`
- `markdown_answer_items`

## Quick Query Examples

Get total questions by subject:

```sql
SELECT s.id, s.name, COUNT(q.id) AS question_count
FROM subjects s
LEFT JOIN questions q ON q.subject_id = s.id
GROUP BY s.id, s.name
ORDER BY question_count DESC;
```

Get all options for one question:

```sql
SELECT q.question_text, qo.option_label, qo.option_content
FROM questions q
JOIN question_options qo ON qo.question_id = q.id
WHERE q.subject_id = 'triet-mac-lenin' AND q.question_id_in_set = 1
ORDER BY qo.option_order;
```

Get parsed TT HCM answer items:

```sql
SELECT ms.source_file, mai.chapter_no, mai.question_no, mai.answer, mai.detail_text
FROM markdown_answer_items mai
JOIN markdown_sources ms ON ms.id = mai.markdown_source_id
ORDER BY ms.source_file, mai.question_no;
```
