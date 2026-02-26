import pkg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function run() {
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();
  const res = await pgClient.query('SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 5');
  console.log("Recent Auth Users:", res.rows);
  await pgClient.end();
}
run().catch(console.error);
