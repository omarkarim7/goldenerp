import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const ops = await prisma.operation.findMany({
    include: {
      dates: true,
      companies: true,
      documents: true,
      guarantees: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Total operations:', ops.length);
  for (const op of ops) {
    console.log('=== Op:', op.id, op.name.substring(0, 30), 'status:', op.status);
    console.log('companies:', op.companies.map(c => c.displayCode));
    console.log('dates:', op.dates);
    console.log('guarantees:', op.guarantees.map(g => ({ type: g.type, amount: g.amount })));
    console.log('documents:', op.documents.map(d => ({ type: d.type, name: d.fileName })));
  }
  await prisma.$disconnect();
}
run();
