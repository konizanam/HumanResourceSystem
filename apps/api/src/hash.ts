import bcrypt from "bcrypt";

async function generateHash() {
  const password = "1234";
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Hashed password:");
  console.log(hashedPassword);
}

generateHash();