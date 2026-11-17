import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo accounts...');
  const usersPath = path.join(__dirname, 'seed-users.json');
  const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Demo123!', saltRounds);

  for (const u of usersData) {
    const skillsJson = JSON.stringify(u.skills || []);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        specialization: u.specialization,
        skills: skillsJson,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        specialization: u.specialization,
        skills: skillsJson,
      },
    });
    console.log(`  ✓ Upserted ${u.role}: ${u.name} (${u.email})`);
  }

  console.log('✅ Seed complete. All 10 demo accounts ready with password Demo123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
