import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE account_class AS ENUM ('Assets', 'Liabilities', 'Equity', 'Income', 'Expenses')
  `);

  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 10).notNullable().unique();
    table.string('name', 255).notNullable();
    table.specificType('class', 'account_class').notNullable();
    table.string('type', 100).notNullable();
    table.timestamps(true, true);
  });

  await knex.raw('CREATE INDEX idx_accounts_code ON accounts(code)');
  await knex.raw('CREATE INDEX idx_accounts_class ON accounts(class)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('accounts');
  await knex.raw('DROP TYPE IF EXISTS account_class');
}
