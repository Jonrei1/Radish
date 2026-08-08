import bcrypt from 'bcryptjs';
import { dbConnect } from '../src/lib/db';
import { User } from '../src/models/User';

interface AdminCredential {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

async function seedAdmins() {
  const adminCredentials: AdminCredential[] = [];

  // Primary admin from ADMIN_EMAIL / ADMIN_PASSWORD
  const primaryEmail = process.env.ADMIN_EMAIL?.trim();
  const primaryPassword = process.env.ADMIN_PASSWORD;

  if (primaryEmail) {
    if (!primaryPassword) {
      throw new Error(`ADMIN_EMAIL is set (${primaryEmail}) but ADMIN_PASSWORD is missing in environment.`);
    }
    adminCredentials.push({
      email: primaryEmail,
      password: primaryPassword,
      firstName: process.env.ADMIN_FIRST_NAME?.trim() || 'System',
      lastName: process.env.ADMIN_LAST_NAME?.trim() || 'Admin 1',
    });
  }

  // Additional numbered admins from ADMIN_EMAIL_X / ADMIN_PASSWORD_X
  const envKeys = Object.keys(process.env);
  for (const key of envKeys) {
    const match = key.match(/^ADMIN_EMAIL_(\d+)$/);
    if (match) {
      const index = match[1];
      const email = process.env[key]?.trim();
      const password = process.env[`ADMIN_PASSWORD_${index}`] || process.env.ADMIN_PASSWORD;

      if (email) {
        if (!password) {
          throw new Error(`ADMIN_EMAIL_${index} is set (${email}) but no password found (set ADMIN_PASSWORD_${index} or ADMIN_PASSWORD).`);
        }

        if (!adminCredentials.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
          adminCredentials.push({
            email,
            password,
            firstName: process.env[`ADMIN_FIRST_NAME_${index}`]?.trim() || 'System',
            lastName: process.env[`ADMIN_LAST_NAME_${index}`]?.trim() || `Admin ${index}`,
          });
        }
      }
    }
  }

  if (adminCredentials.length === 0) {
    throw new Error(
      'No admin credentials found in environment. Please set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.'
    );
  }

  console.log(`[Seed] Connecting to MongoDB...`);
  await dbConnect();

  const saltRounds = 12;

  for (const cred of adminCredentials) {
    const normalizedEmail = cred.email.toLowerCase();
    console.log(`[Seed] Checking admin account: ${normalizedEmail}`);

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      console.log(`[Seed] User ${normalizedEmail} already exists (Role: ${existingUser.role}). Skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(cred.password, saltRounds);

    const adminUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      firstName: cred.firstName,
      lastName: cred.lastName,
      role: 'ADMIN',
      isActive: true,
      requiresPasswordChange: false,
    });

    console.log(`[Seed] Successfully created admin user:`, {
      id: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
      requiresPasswordChange: adminUser.requiresPasswordChange,
    });
  }

  console.log(`[Seed] Admin seeding process completed.`);
  process.exit(0);
}

seedAdmins().catch((err) => {
  console.error('[Seed] Error seeding admin accounts:', err instanceof Error ? err.message : err);
  process.exit(1);
});
