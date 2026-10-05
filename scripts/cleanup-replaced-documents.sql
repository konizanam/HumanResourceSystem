-- One-off cleanup: delete job seeker documents and CVs that were replaced by a
-- newer upload. Since the "one document per type" change the API does this on
-- every upload; this removes the history that built up before it.
--
-- Rules (same as the API):
--   * id_document, license_document, conduct_certificate (and any other type
--     except qualification_evidence): keep only the newest per user.
--   * qualification_evidence: keep only files an education entry links to.
--   * resumes: keep only the primary CV per user (else the newest).
--
-- THIS PERMANENTLY DELETES FILES. Take a backup first.
-- Run step 1 on its own to preview; run step 2 to delete; step 3 to reclaim disk.

-- ---------------------------------------------------------------------------
-- Step 1: preview (read-only)
-- ---------------------------------------------------------------------------
WITH single_type AS (
  SELECT d.id, octet_length(d.file_data) AS bytes,
         ROW_NUMBER() OVER (PARTITION BY d.user_id, d.document_type ORDER BY d.created_at DESC, d.id DESC) AS rn
  FROM documents d
  WHERE d.user_id IS NOT NULL AND d.company_id IS NULL
    AND d.document_type <> 'qualification_evidence'
),
orphan_evidence AS (
  SELECT d.id, octet_length(d.file_data) AS bytes
  FROM documents d
  WHERE d.user_id IS NOT NULL AND d.company_id IS NULL
    AND d.document_type = 'qualification_evidence'
    AND NOT EXISTS (
      SELECT 1 FROM job_seeker_education e
      WHERE e.user_id = d.user_id AND e.certificate_url LIKE '%' || d.id::text || '%'
    )
),
old_resumes AS (
  SELECT r.id, octet_length(r.file_data) AS bytes,
         ROW_NUMBER() OVER (PARTITION BY r.job_seeker_id ORDER BY r.is_primary DESC, r.uploaded_at DESC, r.id DESC) AS rn
  FROM resumes r
)
SELECT 'replaced documents' AS what, COUNT(*) AS files, pg_size_pretty(COALESCE(SUM(bytes), 0)) AS size FROM single_type WHERE rn > 1
UNION ALL
SELECT 'unlinked qualification evidence', COUNT(*), pg_size_pretty(COALESCE(SUM(bytes), 0)) FROM orphan_evidence
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
    AND document_type <> 'qualification_evidence'
) ranked
WHERE d.id = ranked.id AND ranked.rn > 1;

DELETE FROM documents d
WHERE d.user_id IS NOT NULL AND d.company_id IS NULL
  AND d.document_type = 'qualification_evidence'
  AND NOT EXISTS (
    SELECT 1 FROM job_seeker_education e
    WHERE e.user_id = d.user_id AND e.certificate_url LIKE '%' || d.id::text || '%'
  );

-- Point personal details at the ID document that was kept.
UPDATE job_seeker_personal_details pd
SET id_document_url = '/api/v1/documents/' || d.id || '/download'
FROM documents d
WHERE d.user_id = pd.user_id AND d.company_id IS NULL AND d.document_type = 'id_document';

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
