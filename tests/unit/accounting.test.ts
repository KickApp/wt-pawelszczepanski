import { describe, it, expect } from 'vitest';
import { classFromCode, isCreditNormal, computeBalance, getPnLSection, getBalanceSheetSection } from '../../src/utils/accounting';
import { AccountClass } from '../../src/types';

describe('classFromCode', () => {
  it('maps 1xxxx to Assets', () => {
    expect(classFromCode('10100')).toBe(AccountClass.Assets);
  });

  it('maps 2xxxx to Liabilities', () => {
    expect(classFromCode('21000')).toBe(AccountClass.Liabilities);
  });

  it('maps 3xxxx to Equity', () => {
    expect(classFromCode('31000')).toBe(AccountClass.Equity);
  });

  it('maps 4xxxx to Income', () => {
    expect(classFromCode('40000')).toBe(AccountClass.Income);
  });

  it('maps 5xxxx-9xxxx to Expenses', () => {
    expect(classFromCode('60000')).toBe(AccountClass.Expenses);
    expect(classFromCode('71100')).toBe(AccountClass.Expenses);
    expect(classFromCode('80100')).toBe(AccountClass.Expenses);
    expect(classFromCode('90100')).toBe(AccountClass.Expenses);
  });

  it('throws for invalid code', () => {
    expect(() => classFromCode('0xxxx')).toThrow();
  });
});

describe('isCreditNormal', () => {
  it('returns true for Liabilities, Equity, Income', () => {
    expect(isCreditNormal(AccountClass.Liabilities)).toBe(true);
    expect(isCreditNormal(AccountClass.Equity)).toBe(true);
    expect(isCreditNormal(AccountClass.Income)).toBe(true);
  });

  it('returns false for Assets, Expenses', () => {
    expect(isCreditNormal(AccountClass.Assets)).toBe(false);
    expect(isCreditNormal(AccountClass.Expenses)).toBe(false);
  });
});

describe('computeBalance', () => {
  it('returns debit - credit for debit-normal accounts', () => {
    expect(computeBalance(1000, 400, AccountClass.Assets)).toBe(600);
    expect(computeBalance(500, 200, AccountClass.Expenses)).toBe(300);
  });

  it('returns credit - debit for credit-normal accounts', () => {
    expect(computeBalance(200, 1000, AccountClass.Income)).toBe(800);
    expect(computeBalance(100, 500, AccountClass.Liabilities)).toBe(400);
  });
});

describe('getPnLSection', () => {
  it('classifies 4xxxx as income', () => {
    expect(getPnLSection('40000')).toBe('income');
  });

  it('classifies 5xxxx as cogs', () => {
    expect(getPnLSection('50000')).toBe('cogs');
  });

  it('classifies 6xxxx-7xxxx as operating expenses', () => {
    expect(getPnLSection('60000')).toBe('operatingExpenses');
    expect(getPnLSection('71100')).toBe('operatingExpenses');
  });

  it('classifies 8xxxx-9xxxx as other income/expenses', () => {
    expect(getPnLSection('80100')).toBe('otherIncomeExpenses');
    expect(getPnLSection('90100')).toBe('otherIncomeExpenses');
  });
});

describe('getBalanceSheetSection', () => {
  it('classifies Bank Account as Current Assets', () => {
    expect(getBalanceSheetSection(AccountClass.Assets, 'Bank Account')).toBe('Current Assets');
  });

  it('classifies Credit Card as Current Liabilities', () => {
    expect(getBalanceSheetSection(AccountClass.Liabilities, 'Credit Card')).toBe('Current Liabilities');
  });

  it('classifies Equity accounts as Equity', () => {
    expect(getBalanceSheetSection(AccountClass.Equity, 'Owner Draws')).toBe('Equity');
  });
});
