import bcrypt from "bcryptjs";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  roles: string[];
};

const users: User[] = [
  {
    id: "u_admin",
    email: "admin@example.com",
    name: "Admin",
    passwordHash: bcrypt.hashSync("Admin@1234", 10),
    roles: ["Admin"],
  },
];

export function findUserByEmail(email: string) {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, roles: user.roles };
}
