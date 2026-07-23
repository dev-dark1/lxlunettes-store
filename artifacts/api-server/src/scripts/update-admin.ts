/**
 * One-time admin credentials update script
 * Run: pnpm --filter @workspace/api-server exec tsx src/scripts/update-admin.ts
 */
import bcrypt from "bcryptjs";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const newEmail = process.env.NEW_ADMIN_EMAIL!;
  const newPassword = process.env.NEW_ADMIN_PASSWORD!;
  const oldEmail = process.env.OLD_ADMIN_EMAIL ?? "admin@lxlunettes.com";

  if (!newEmail || !newPassword) {
    console.error("NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD must be set");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const [updated] = await db
    .update(adminUsersTable)
    .set({ email: newEmail, passwordHash })
    .where(eq(adminUsersTable.email, oldEmail))
    .returning({ id: adminUsersTable.id, email: adminUsersTable.email });

  if (!updated) {
    // Try inserting if doesn't exist
    const [inserted] = await db
      .insert(adminUsersTable)
      .values({ email: newEmail, passwordHash, isActive: true })
      .returning({ id: adminUsersTable.id, email: adminUsersTable.email });
    console.log("✅ Admin créé:", inserted?.email);
  } else {
    console.log("✅ Admin mis à jour:", updated.email);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
