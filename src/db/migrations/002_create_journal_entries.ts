import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('journal_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('date').notNullable();
    table.uuid('account_id').notNullable().references('id').inTable('accounts');
    table.string('description', 500);
    table.decimal('debit_amount', 15, 2);
    table.decimal('credit_amount', 15, 2);
    table.string('reference_number', 50).notNullable();
    table.string('counterparty', 255);
    table.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE journal_entries ADD CONSTRAINT chk_one_side CHECK (
      (debit_amount IS NOT NULL AND debit_amount > 0 AND credit_amount IS NULL)
      OR (credit_amount IS NOT NULL AND credit_amount > 0 AND debit_amount IS NULL)
    )
  `);

  await knex.raw('CREATE INDEX idx_je_date ON journal_entries(date)');
  await knex.raw('CREATE INDEX idx_je_reference ON journal_entries(reference_number)');
  await knex.raw('CREATE INDEX idx_je_account_id ON journal_entries(account_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('journal_entries');
}
