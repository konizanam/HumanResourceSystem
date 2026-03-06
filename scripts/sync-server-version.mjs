import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const version = String(process.argv[2] ?? "").trim();
  if (!version) {
    throw new Error("Missing release version argument.");
  }

  const serverPkgPath = path.resolve(process.cwd(), "server", "package.json");
  const raw = await fs.readFile(serverPkgPath, "utf8");
  const pkg = JSON.parse(raw);

  pkg.version = version;

  await fs.writeFile(serverPkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  process.stdout.write(`Synced server/package.json version to ${version}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
