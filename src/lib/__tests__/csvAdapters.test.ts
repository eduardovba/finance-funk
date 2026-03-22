import { describe, it, expect } from 'vitest';
import {
    detectCsvFormat,
    getAdapter,
    detectAndParse,
    parseBrCents,
    BANK_ADAPTERS,
} from '@/lib/csvAdapters';

// ═══════════ parseBrCents ═══════════

describe('parseBrCents', () => {
    it('parses positive BR amount "1.250,50" → 125050', () => {
        const { isNegative, cents } = parseBrCents('1.250,50');
        expect(isNegative).toBe(false);
        expect(cents).toBe(125050);
    });

    it('parses negative BR amount "-1.250,50" → 125050 (negative)', () => {
        const { isNegative, cents } = parseBrCents('-1.250,50');
        expect(isNegative).toBe(true);
        expect(cents).toBe(125050);
    });

    it('parses simple BR amount "350,00" → 35000', () => {
        const { isNegative, cents } = parseBrCents('350,00');
        expect(isNegative).toBe(false);
        expect(cents).toBe(35000);
    });

    it('parses amount with multiple thousands "1.000.000,99" → 100000099', () => {
        const { isNegative, cents } = parseBrCents('1.000.000,99');
        expect(isNegative).toBe(false);
        expect(cents).toBe(100000099);
    });

    it('parses small BR amount "5,50" → 550', () => {
        const { isNegative, cents } = parseBrCents('5,50');
        expect(isNegative).toBe(false);
        expect(cents).toBe(550);
    });
});

// ═══════════ Detection ═══════════

describe('detectCsvFormat', () => {
    it('detects Amex from "Card Member" header', () => {
        const csv = 'Date,Description,Card Member,Account #,Amount\n01/03/2026,TESCO,John,1234,45.50';
        expect(detectCsvFormat(csv)).toBe('amex');
    });

    it('detects Amex from "Account #" header', () => {
        const csv = 'Date,Description,Account #,Amount\n01/03/2026,SHOP,1234,10.00';
        expect(detectCsvFormat(csv)).toBe('amex');
    });

    it('detects Barclays from "Subcategory" header', () => {
        const csv = 'Number,Date,Account,Amount,Subcategory,Memo\n1,01/03/2026,12345,-50.00,Shopping,Tesco';
        expect(detectCsvFormat(csv)).toBe('barclays');
    });

    it('detects Lloyds from "Money In" header', () => {
        const csv = 'Date,Type,Description,Money In,Money Out,Balance\n01/03/2026,DEB,SHOP,,45.00,1000.00';
        expect(detectCsvFormat(csv)).toBe('lloyds');
    });

    it('detects Monzo from "Transaction ID" + "Emoji"', () => {
        const csv = 'Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency\nabc,01/03/2026,12:00,Payment,Tesco,🛒,Shopping,-5.00,GBP';
        expect(detectCsvFormat(csv)).toBe('monzo');
    });

    it('detects Santander UK from simple 3-column header', () => {
        const csv = 'Date,Description,Amount\n01/03/2026,DIRECT DEBIT,-100.00';
        expect(detectCsvFormat(csv)).toBe('santander_uk');
    });

    it('detects Nubank from semicolon + "Valor" header', () => {
        const csv = 'Data;Descrição;Valor\n01/03/2026;PIX RECEBIDO;1.250,50';
        expect(detectCsvFormat(csv)).toBe('nubank');
    });

    it('detects HSBC from headerless DD/MM/YYYY first field', () => {
        const csv = '01/03/2026,GROCERY STORE,-25.50';
        expect(detectCsvFormat(csv)).toBe('hsbc');
    });

    it('returns unknown for unrecognizable CSV', () => {
        const csv = 'foo,bar,baz\n1,2,3';
        expect(detectCsvFormat(csv)).toBe('unknown');
    });
});

// ═══════════ HSBC Adapter ═══════════

describe('HSBC adapter', () => {
    const adapter = getAdapter('hsbc')!;

    it('parses expenses (negative amounts)', () => {
        const csv = '01/03/2026,TESCO STORES,-45.50\n02/03/2026,RENT PAYMENT,-1200.00';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(2);
        expect(rows[0].description).toBe('TESCO STORES');
        expect(rows[0].amount_cents).toBe(4550);
        expect(rows[0].is_income).toBe(false);
        expect(rows[0].currency).toBe('GBP');
        expect(rows[0].source).toBe('HSBC');
    });

    it('parses income (positive amounts)', () => {
        const csv = '15/03/2026,SALARY PAYMENT,2500.00';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(true);
        expect(rows[0].amount_cents).toBe(250000);
    });

    it('skips rows with zero/empty amount', () => {
        const csv = '01/03/2026,BAD ROW,\n01/03/2026,GOOD ROW,-10.00';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].description).toBe('GOOD ROW');
    });
});

// ═══════════ Amex Adapter ═══════════

describe('Amex adapter', () => {
    const adapter = getAdapter('amex')!;

    it('parses expenses (positive amounts — inverted sign)', () => {
        const csv = 'Date,Description,Card Member,Account #,Amount\n01/03/2026,AMAZON,John Doe,1234,29.99';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(false); // positive = expense for Amex
        expect(rows[0].amount_cents).toBe(2999);
        expect(rows[0].source).toBe('AMEX');
    });

    it('parses credits (negative amounts — inverted sign)', () => {
        const csv = 'Date,Description,Card Member,Account #,Amount\n01/03/2026,REFUND,John Doe,1234,-15.00';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(true); // negative = income for Amex
    });
});

// ═══════════ Barclays Adapter ═══════════

describe('Barclays adapter', () => {
    const adapter = getAdapter('barclays')!;

    it('parses with Memo as description', () => {
        const csv = 'Number,Date,Account,Amount,Subcategory,Memo\n1,05/03/2026,12345678,-32.50,Shopping,Sainsburys Weekly Shop';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].description).toBe('Sainsburys Weekly Shop');
        expect(rows[0].amount_cents).toBe(3250);
        expect(rows[0].is_income).toBe(false);
        expect(rows[0].source).toBe('BARCLAYS');
    });

    it('parses income (positive amount)', () => {
        const csv = 'Number,Date,Account,Amount,Subcategory,Memo\n2,10/03/2026,12345678,1500.00,Income,Monthly Salary';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(true);
        expect(rows[0].amount_cents).toBe(150000);
    });
});

// ═══════════ Lloyds Adapter ═══════════

describe('Lloyds adapter', () => {
    const adapter = getAdapter('lloyds')!;

    it('parses expense from Money Out column', () => {
        const csv = 'Date,Type,Description,Money In,Money Out,Balance\n01/03/2026,DEB,TESCO STORES,,45.99,954.01';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(false);
        expect(rows[0].amount_cents).toBe(4599);
        expect(rows[0].source).toBe('LLOYDS');
    });

    it('parses income from Money In column', () => {
        const csv = 'Date,Type,Description,Money In,Money Out,Balance\n15/03/2026,FPI,SALARY PAYMENT,2500.00,,3454.01';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(true);
        expect(rows[0].amount_cents).toBe(250000);
    });

    it('handles both Money In and Money Out in same file', () => {
        const csv = [
            'Date,Type,Description,Money In,Money Out,Balance',
            '01/03/2026,DEB,SHOP,,25.00,975.00',
            '02/03/2026,FPI,REFUND,10.00,,985.00',
        ].join('\n');
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(2);
        expect(rows[0].is_income).toBe(false);
        expect(rows[1].is_income).toBe(true);
    });
});

// ═══════════ Monzo Adapter ═══════════

describe('Monzo adapter', () => {
    const adapter = getAdapter('monzo')!;

    it('parses expense (negative amount)', () => {
        const csv = 'Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency,Local amount,Local currency,Notes and #tags,Address,Receipt,Description,Category split\nabc123,01/03/2026,14:30:00,Payment,Tesco,🛒,Groceries,-12.50,GBP,-12.50,GBP,,London,,Tesco Express,';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].description).toBe('Tesco');
        expect(rows[0].amount_cents).toBe(1250);
        expect(rows[0].is_income).toBe(false);
        expect(rows[0].currency).toBe('GBP');
        expect(rows[0].source).toBe('MONZO');
    });

    it('parses income (positive amount)', () => {
        const csv = 'Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency,Local amount,Local currency,Notes and #tags,Address,Receipt,Description,Category split\ndef456,05/03/2026,09:00:00,Incoming,Employer,,Income,2000.00,GBP,2000.00,GBP,,,,';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(true);
        expect(rows[0].amount_cents).toBe(200000);
    });
});

// ═══════════ Santander UK Adapter ═══════════

describe('Santander UK adapter', () => {
    const adapter = getAdapter('santander_uk')!;

    it('parses expense (negative amount)', () => {
        const csv = 'Date,Description,Amount\n01/03/2026,DIRECT DEBIT WATER CO,-85.00';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].description).toBe('DIRECT DEBIT WATER CO');
        expect(rows[0].amount_cents).toBe(8500);
        expect(rows[0].is_income).toBe(false);
        expect(rows[0].source).toBe('SANTANDER');
    });

    it('parses income (positive amount)', () => {
        const csv = 'Date,Description,Amount\n15/03/2026,SALARY,3000.00';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(true);
        expect(rows[0].amount_cents).toBe(300000);
    });
});

// ═══════════ Nubank Adapter ═══════════

describe('Nubank adapter', () => {
    const adapter = getAdapter('nubank')!;

    it('parses expense with BR format (semicolons + comma decimal)', () => {
        const csv = 'Data;Descrição;Valor\n01/03/2026;SUPERMERCADO PAO DE ACUCAR;-350,00';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].description).toBe('SUPERMERCADO PAO DE ACUCAR');
        expect(rows[0].amount_cents).toBe(35000);
        expect(rows[0].is_income).toBe(false);
        expect(rows[0].currency).toBe('BRL');
        expect(rows[0].source).toBe('NUBANK');
    });

    it('parses income with BR format', () => {
        const csv = 'Data;Descrição;Valor\n15/03/2026;PIX RECEBIDO;1.250,50';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].is_income).toBe(true);
        expect(rows[0].amount_cents).toBe(125050);
    });

    it('correctly parses "-1.250,50" → 125050 cents (BR thousands+decimal)', () => {
        const csv = 'Data;Descrição;Valor\n20/03/2026;ALUGUEL;-1.250,50';
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0].amount_cents).toBe(125050);
        expect(rows[0].is_income).toBe(false);
    });

    it('handles multiple rows', () => {
        const csv = [
            'Data;Descrição;Valor',
            '01/03/2026;UBER;-25,90',
            '02/03/2026;PIX;500,00',
            '03/03/2026;IFOOD;-42,50',
        ].join('\n');
        const rows = adapter.parse(csv);
        expect(rows).toHaveLength(3);
        expect(rows[0].amount_cents).toBe(2590);
        expect(rows[1].amount_cents).toBe(50000);
        expect(rows[2].amount_cents).toBe(4250);
    });
});

// ═══════════ detectAndParse convenience ═══════════

describe('detectAndParse', () => {
    it('detects and parses HSBC in one call', () => {
        const csv = '01/03/2026,SHOP,-10.00';
        const { format, adapter, transactions } = detectAndParse(csv);
        expect(format).toBe('hsbc');
        expect(adapter?.label).toBe('HSBC UK');
        expect(transactions).toHaveLength(1);
    });

    it('returns empty transactions for unknown format', () => {
        const { format, adapter, transactions } = detectAndParse('garbage,data');
        expect(format).toBe('unknown');
        expect(adapter).toBeUndefined();
        expect(transactions).toHaveLength(0);
    });
});

// ═══════════ Registry integrity ═══════════

describe('BANK_ADAPTERS registry', () => {
    it('has 7 adapters', () => {
        expect(BANK_ADAPTERS).toHaveLength(7);
    });

    it('all adapters have unique IDs', () => {
        const ids = BANK_ADAPTERS.map(a => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('HSBC is last (broadest detector)', () => {
        expect(BANK_ADAPTERS[BANK_ADAPTERS.length - 1].id).toBe('hsbc');
    });
});
