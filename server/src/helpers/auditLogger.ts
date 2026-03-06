import { query } from "../config/database";

export async function logAudit({
  userId,
  action,
  targetType,
  targetId,
  details,
}: {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: object;
}) {
  try {
    await query(
      `INSERT INTO audit_logs (
         user_id,
         action_type,
         module_name,
         table_name,
         record_id,
         new_data,
         created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId,
        action,
        targetType,
        targetType,
        targetId || null,
        details ? JSON.stringify(details) : null,
      ],
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
