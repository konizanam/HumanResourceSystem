import { query } from "./db";

/** Row shape returned from the users table joined with roles. */
export type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
};

/** Public user shape returned to the client (no password). */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

/** Find a user by email (case-insensitive). */
export async function findUserByEmail(email: string): Promise<
  | (UserRow & { roles: string[] })
  | null
> {
  const { rows } = await query<UserRow & { roles: string[] }>(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.is_active,
            COALESCE(
              array_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
              '{}'
            ) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE LOWER(u.email) = LOWER($1)
     GROUP BY u.id`,
    [email]
  );
  return rows[0] ?? null;
}

/** Find a user by id. */
export async function findUserById(id: string): Promise<
  | (UserRow & { roles: string[] })
  | null
> {
  const { rows } = await query<UserRow & { roles: string[] }>(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.is_active,
            COALESCE(
              array_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
              '{}'
            ) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [id]
  );
  return rows[0] ?? null;
}

/** Convert a user row to a public-safe shape. */
export function publicUser(
  user: UserRow & { roles: string[] }
): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`.trim(),
    roles: user.roles,
  };
}
