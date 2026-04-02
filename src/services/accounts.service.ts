import { db } from '../db/connection';
import { Account, AccountClass } from '../types';

export async function listAccounts(): Promise<Account[]> {
  return db('accounts').orderBy('code');
}

export async function getAccountById(id: string): Promise<Account | undefined> {
  return db('accounts').where({ id }).first();
}

export async function getAccountByCode(code: string): Promise<Account | undefined> {
  return db('accounts').where({ code }).first();
}

export async function createAccount(data: {
  code: string;
  name: string;
  class: AccountClass;
  type: string;
}): Promise<Account> {
  const [account] = await db('accounts').insert(data).returning('*');
  return account;
}

export async function upsertAccount(data: {
  code: string;
  name: string;
  class: AccountClass;
  type: string;
}): Promise<Account> {
  const [account] = await db('accounts')
    .insert(data)
    .onConflict('code')
    .merge(['name', 'class', 'type'])
    .returning('*');
  return account;
}
