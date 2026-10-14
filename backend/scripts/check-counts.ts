import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.count();
  const companies = await prisma.company.count();
  const operations = await prisma.operation.count();
  const radarItems = await prisma.radarItem.count();
  const suppliers = await prisma.supplier.count();
  const employees = await prisma.employee.count();
  console.log('AIVEN_COUNTS:', { users, companies, operations, radarItems, suppliers, employees });
}
main().finally(() => prisma.$disconnect());
