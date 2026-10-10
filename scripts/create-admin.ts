// Create (or reset) a dashboard account.
//   npm run admin:create -- owner@example.com "Full Name" [SUPER_ADMIN|STORE_MANAGER|CONTENT_MANAGER]
// You'll be asked for the password, so it never appears in your shell history.
import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "node:readline";
import { createClient } from "../src/lib/db-client";

const db = createClient();

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => out.output.write(s.includes(question) ? s : "*");
    }
    rl.question(question, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

async function main() {
  const [emailArg, nameArg, roleArg] = process.argv.slice(2);
  const email = (emailArg || (await ask("Email: "))).toLowerCase();
  const name = nameArg || (await ask("Name: "));
  const role = (roleArg || "SUPER_ADMIN").toUpperCase();
  if (!["SUPER_ADMIN", "STORE_MANAGER", "CONTENT_MANAGER"].includes(role)) throw new Error("Role must be SUPER_ADMIN, STORE_MANAGER or CONTENT_MANAGER");
  const password = process.env.ADMIN_PASSWORD || (await ask("Password (10+ characters): ", true));
  if (password.length < 10) throw new Error("Password must be at least 10 characters");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role: role as "SUPER_ADMIN" },
    update: { name, passwordHash, role: role as "SUPER_ADMIN", status: "ACTIVE" },
  });
  await db.session.deleteMany({ where: { userId: user.id } });
  console.log(`✓ ${email} can now sign in at /admin/login as ${role.replace(/_/g, " ").toLowerCase()}.`);
}

main()
  .catch((e) => {
    console.error("✕", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
