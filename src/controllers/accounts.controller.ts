import { Request, Response, NextFunction } from 'express';
import * as accountsService from '../services/accounts.service';
import { classFromCode } from '../utils/accounting';
import { Account, AccountClass } from '../types';

function toCamelCase(row: Account) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    class: row.class,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const accounts = await accountsService.listAccounts();
    res.json({ data: accounts.map(toCamelCase) });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, name, type } = req.body;
    const accountClass = classFromCode(code) as AccountClass;
    const account = await accountsService.createAccount({ code, name, class: accountClass, type });
    res.status(201).json({ data: toCamelCase(account) });
  } catch (err) {
    next(err);
  }
}
