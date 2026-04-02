import 'dotenv/config';
import * as readline from 'readline';
import { getRecordCounts, truncateAndLoad } from '../src/services/ingest.service';
import { db } from '../src/db/connection';

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function main() {
  try {
    const counts = await getRecordCounts();
    console.log(`Current data: ${counts.accounts} accounts, ${counts.journalEntries} journal entries`);

    if (counts.accounts > 0 || counts.journalEntries > 0) {
      const ok = await confirm('This will DELETE all existing data and reload from Excel. Continue? (y/N) ');
      if (!ok) {
        console.log('Aborted.');
        process.exit(0);
      }
    }

    const filePath = process.argv[2];
    const result = await truncateAndLoad(filePath);
    console.log('Load complete:', result);
  } catch (err) {
    console.error('Load failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
