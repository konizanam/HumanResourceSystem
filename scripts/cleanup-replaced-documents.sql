-- One-off cleanup: delete job seeker documents and CVs that were replaced by a
-- newer upload. Since the "one document per type" change the API does this on
-- every upload; this removes the history that built up before it.
--
-- Rules (same as the API):
--   * every document type (ID document, licence, conduct certificate and
--     qualification evidence): keep only the newest per user.
--   * qualification evidence is one file for all of a user's qualifications,
--     so every education entry is pointed at the kept file.
--   * resumes: keep only the primary CV per user (else the newest).
--
-- THIS PERMANENTLY DELETES FILES. Take a backup first.
-- Run step 1 on its own to preview; run step 2 to delete; step 3 to reclaim disk.

-- ---------------------------------------------------------------------------
-- Step 1: preview (read-only)
-- ---------------------------------------------------------------------------
WITH old_documents AS (
  SELECT d.document_type, octet_length(d.file_data) AS bytes,
         ROW_NUMBER() OVER (PARTITION BY d.user_id, d.document_type ORDER BY d.created_at DESC, d.id DESC) AS rn
  FROM documents d
  WHERE d.user_id IS NOT NULL AND d.company_id IS NULL
),
old_resumes AS (
  SELECT r.id, octet_length(r.file_data) AS bytes,
         ROW_NUMBER() OVER (PARTITION BY r.job_seeker_id ORDER BY r.is_primary DESC, r.uploaded_at DESC, r.id DESC) AS rn
  FROM resumes r
)
SELECT 'replaced ' || document_type AS what, COUNT(*) AS files, pg_size_pretty(COALESCE(SUM(bytes), 0)) AS size
FROM old_documents WHERE rn > 1 GROUP BY document_type
UNION ALL
SELECT 'replaced CVs', COUNT(*), pg_size_pretty(COALESCE(SUM(bytes), 0)) FROM old_resumes WHERE rn > 1;

-- ---------------------------------------------------------------------------
-- Step 2: delete (run as one transaction)
-- ---------------------------------------------------------------------------
BEGIN;

DELETE FROM documents d
USING (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, document_type ORDER BY created_at DESC, id DESC) AS rn
  FROM documents
  WHERE user_id IS NOT NULL AND company_id IS NULL
) ranked
WHERE d.id = ranked.id AND ranked.rn > 1;

-- Point personal details at the ID document that was kept.
UPDATE job_seeker_personal_details pd
SET id_document_url = '/api/v1/documents/' || d.id || '/download'
FROM documents d
WHERE d.user_id = pd.user_id AND d.company_id IS NULL AND d.document_type = 'id_document';

-- Point every education entry at the user's one qualification file.
UPDATE job_seeker_education e
SET certificate_url = '/api/v1/documents/' || d.id || '/download'
FROM documents d
WHERE d.user_id = e.user_id AND d.company_id IS NULL AND d.document_type = 'qualification_evidence';

DELETE FROM resumes r
USING (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY job_seeker_id ORDER BY is_primary DESC, uploaded_at DESC, id DESC) AS rn
  FROM resumes
) ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

-- The remaining CV is each user's only (and primary) one.
UPDATE resumes SET is_primary = TRUE WHERE is_primary IS DISTINCT FROM TRUE;
UPDATE users u
SET resume_url = '/api/v1/job-seeker/resume/' || r.id || '/download'
FROM resumes r
WHERE r.job_seeker_id = u.id;

COMMIT;

-- ---------------------------------------------------------------------------
-- Step 3: give the freed space back to the disk
-- ---------------------------------------------------------------------------
-- Deleted rows only become reusable space; VACUUM FULL rewrites the tables so
-- the database file actually shrinks. It locks each table while it runs and
-- needs free disk roughly equal to the table's remaining size, so run it at a
-- quiet time. Run each statement on its own (not inside a transaction).
-- VACUUM FULL documents;
-- VACUUM FULL resumes;
