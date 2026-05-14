import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from the db package root
config({ path: resolve(__dirname, '../.env') })

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding test data...')

  // Clean existing seed data
  await prisma.parent.deleteMany({ where: { email: 'parent@test.com' } })

  // Create parent
  const passwordHash = await bcrypt.hash('password123', 12)

  const parent = await prisma.parent.create({
    data: {
      email: 'parent@test.com',
      passwordHash,
      displayName: 'Test Parent',
      consentGiven: true,
      consentGivenAt: new Date(),
      consentIpAddress: '127.0.0.1',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  console.log(`Created parent: ${parent.email}`)

  // PIN: "TEST01" — hashed
  const pinHash = await bcrypt.hash('TEST01', 10)

  const explorer = await prisma.childProfile.create({
    data: {
      parentId: parent.id,
      displayName: 'Lily',
      dateOfBirth: new Date('2019-03-15'), // age ~7, Explorer tier
      ageTier: 'EXPLORER',
      avatarEmoji: '🦊',
      pinHash,
      dailyLimitMinutes: 60,
    },
  })

  console.log(`Created child: ${explorer.displayName} (${explorer.ageTier}) — PIN: TEST01`)

  // PIN: "TEST02"
  const pinHash2 = await bcrypt.hash('TEST02', 10)

  const builder = await prisma.childProfile.create({
    data: {
      parentId: parent.id,
      displayName: 'Sam',
      dateOfBirth: new Date('2015-07-20'), // age ~10, Builder tier
      ageTier: 'BUILDER',
      avatarEmoji: '🐻',
      pinHash: pinHash2,
      dailyLimitMinutes: 90,
    },
  })

  console.log(`Created child: ${builder.displayName} (${builder.ageTier}) — PIN: TEST02`)

  // PIN: "TEST03"
  const pinHash3 = await bcrypt.hash('TEST03', 10)

  const creator = await prisma.childProfile.create({
    data: {
      parentId: parent.id,
      displayName: 'Jordan',
      dateOfBirth: new Date('2011-11-05'), // age ~14, Creator tier
      ageTier: 'CREATOR',
      avatarEmoji: '🚀',
      pinHash: pinHash3,
      dailyLimitMinutes: 120,
    },
  })

  console.log(`Created child: ${creator.displayName} (${creator.ageTier}) — PIN: TEST03`)

  console.log('\n--- Test credentials ---')
  console.log('Parent login:')
  console.log('  Email:    parent@test.com')
  console.log('  Password: password123')
  console.log('\nChild logins (go to /child):')
  console.log(`  Lily    (Explorer 4-7)   ID: ${explorer.id}   PIN: TEST01`)
  console.log(`  Sam     (Builder 8-11)   ID: ${builder.id}   PIN: TEST02`)
  console.log(`  Jordan  (Creator 12-15)  ID: ${creator.id}   PIN: TEST03`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
