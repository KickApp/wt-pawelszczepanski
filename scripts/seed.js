const { truncateAndLoad } = require('../dist/services/ingest.service');
const { db } = require('../dist/db/connection');

async function main() {
  const result = await truncateAndLoad();
  console.log('Load complete:', result);
  await db.destroy();
}

main().catch((err) => {
  console.error('Load failed:', err);
  process.exit(1);
});
