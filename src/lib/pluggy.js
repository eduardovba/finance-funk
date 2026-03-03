import { PluggyClient } from 'pluggy-sdk';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;

let clientInstance = null;
let tokenCache = {
    token: null,
    expiresAt: null
};

export const getPluggyClient = async () => {
    if (clientInstance) return clientInstance;

    clientInstance = new PluggyClient({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
    });

    return clientInstance;
};

/**
 * Refined Brazilian Asset Classification Mapper
 * Maps Pluggy account/investment types to Finance Funk buckets:
 * Cash, Equity, Fixed Income, Real Estate, Crypto.
 */
export const mapPluggyToFinanceFunk = (pluggyAsset) => {
    const { type, subtype, name, balance, value, quantity, amount, code } = pluggyAsset;

    // 1. True Market Value Calculator (Crucial for XP)
    // XP returns:
    // - value * quantity: Gross Market Value
    // - balance / amount: Often purchase price or provision
    // - amountWithdrawal: Net Value (after taxes/liquidated)
    // We prefer amountWithdrawal as it matches what users see in the XP app.
    const calculatedValue = pluggyAsset.amountWithdrawal ||
        ((quantity > 0 && value > 0) ? (quantity * value) : (balance || amount || 0));




    const assetName = name || 'Unknown Asset';
    const ticker = code || '';
    const sub = (subtype || '').toUpperCase();

    // 2. Strict Brazilian Classification Rules
    let category = 'Equity';

    // Cash / Accounts
    if (type === 'CHECKING_ACCOUNT' || type === 'SAVINGS_ACCOUNT' || type === 'BANK' || sub === 'CHECKING_ACCOUNT') {
        category = 'Cash';
    }
    // Investments
    else if (['INVESTMENT', 'FIXED_INCOME', 'EQUITY', 'MUTUAL_FUND'].includes(type)) {

        // A. Real Estate Funds (FIIs) - Regex and Keyword Rule
        const isFII = ticker.match(/11$/) || assetName.toUpperCase().includes('FII') || assetName.toUpperCase().includes('IMOB');

        if (isFII && (type === 'EQUITY' || type === 'MUTUAL_FUND' || sub === 'REAL_ESTATE_FUND')) {
            category = 'Real Estate';
        }
        // B. Fixed Income
        else if (
            type === 'FIXED_INCOME' ||
            ['TREASURY', 'CDB', 'LCI', 'LCA', 'LC', 'CRI', 'CRA', 'DEBENTURES', 'FIXED_INCOME_FUND'].includes(sub) ||
            (type === 'MUTUAL_FUND' && (assetName.toUpperCase().includes('RENDA FIXA') || assetName.toUpperCase().includes(' DI ')))
        ) {
            category = 'Fixed Income';
        }
        // C. Crypto
        else if (['CRYPTO', 'CRYPTOCURRENCY'].includes(sub)) {
            category = 'Crypto';
        }
        // D. Defaults to Equity (Stocks, ETFs, BDRs, Non-FII/Non-RF Funds)
        else {
            category = 'Equity';
        }
    }

    return {
        category,
        name: assetName,
        ticker: ticker || assetName,
        value: calculatedValue,
        balance: calculatedValue,
        quantity: quantity || 0,
        pluggy_asset_id: pluggyAsset.id || null,
        currency: pluggyAsset.currency || 'BRL',
        institution: pluggyAsset.institution?.name || null
    };
};
