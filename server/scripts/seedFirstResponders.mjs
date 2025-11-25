import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFirstResponders() {
  console.log('🌱 Seeding first responders...');

  const responders = [
    {
      name: 'Captain Sarah Johnson',
      badgeNumber: 'FD-101',
      department: 'Fire',
      phoneNumber: '+1-555-0101',
      email: 'sjohnson@firedept.local',
      status: 'on-duty',
    },
    {
      name: 'Officer Michael Chen',
      badgeNumber: 'PD-2547',
      department: 'Police',
      phoneNumber: '+1-555-0202',
      email: 'mchen@police.local',
      status: 'on-duty',
    },
    {
      name: 'Dr. Emily Rodriguez',
      badgeNumber: 'EMT-8834',
      department: 'Medical',
      phoneNumber: '+1-555-0303',
      email: 'erodriguez@ems.local',
      status: 'available',
    },
    {
      name: 'Lieutenant James Anderson',
      badgeNumber: 'FD-205',
      department: 'Fire',
      phoneNumber: '+1-555-0104',
      email: 'janderson@fireept.local',
      status: 'available',
    },
    {
      name: 'Sergeant Lisa Williams',
      badgeNumber: 'PD-1823',
      department: 'Police',
      phoneNumber: '+1-555-0205',
      email: 'lwilliams@police.local',
      status: 'on-duty',
    },
    {
      name: 'Coordinator David Martinez',
      badgeNumber: 'EM-001',
      department: 'Emergency Management',
      phoneNumber: '+1-555-0401',
      email: 'dmartinez@emergency.local',
      status: 'on-duty',
    },
  ];

  for (const responder of responders) {
    try {
      const created = await prisma.firstResponder.upsert({
        where: { badgeNumber: responder.badgeNumber },
        update: responder,
        create: responder,
      });
      console.log(`✅ Created/Updated: ${created.name} (${created.department})`);
    } catch (error) {
      console.error(`❌ Failed to create ${responder.name}:`, error.message);
    }
  }

  console.log('✨ First responders seeding complete!');
}

seedFirstResponders()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
