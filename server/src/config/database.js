import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/client/index.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('Database connected (PostgreSQL)');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
