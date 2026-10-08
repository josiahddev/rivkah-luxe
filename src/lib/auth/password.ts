import "server-only";
import bcrypt from "bcryptjs";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

let dummyHash: Promise<string> | null = null;

/** Compares against a dummy hash when the user doesn't exist so timing doesn't reveal which emails are registered. */
export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) {
    dummyHash ??= bcrypt.hash("timing-equaliser", 12);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
