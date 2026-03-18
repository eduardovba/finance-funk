import { PluggyClient } from 'pluggy-sdk';

let pluggyClient: PluggyClient | null = null;

/**
 * Get a Pluggy SDK client (singleton).
 */
export function getPluggyClient(): PluggyClient {
    if (pluggyClient) return pluggyClient;

    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET environment variables are required');
    }

    pluggyClient = new PluggyClient({
        clientId,
        clientSecret,
    });

    return pluggyClient;
}

// ─── Pluggy -> Finance Funk Asset Class Mapping ───

interface PluggyAsset {
    type?: string;
    subtype?: string;
    name?: string;
    currencyCode?: string;
    balance?: number;
    value?: number;
    quantity?: number;
    code?: string;
    isin?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
}

interface MappedAsset {
    assetClass: string;
    category: string;
    name: string;
    ticker: string;
    currency: string;
    value: number;
    quantity: number;
    broker: string;
}

const PLUGGY_TYPE_MAP: Record<string, { assetClass: string; category: string }> = {
    'FIXED_INCOME': { assetClass: 'Fixed Income', category: 'Fixed Income' },
    'MUTUAL_FUND': { assetClass: 'Fixed Income', category: 'Fixed Income' },
    'SECURITY': { assetClass: 'Equity', category: 'Equity' },
    'EQUITY': { assetClass: 'Equity', category: 'Equity' },
    'ETF': { assetClass: 'Equity', category: 'Equity' },
    'COE': { assetClass: 'Fixed Income', category: 'Fixed Income' },
    'OTHER': { assetClass: 'Fixed Income', category: 'Fixed Income' },
};

/**
 * Map a Pluggy investment to Finance Funk's asset format.
 */
export function mapPluggyToFinanceFunk(asset: PluggyAsset, institutionName: string): MappedAsset {
    const typeKey = (asset.type || 'OTHER').toUpperCase();
    const mapping = PLUGGY_TYPE_MAP[typeKey] || PLUGGY_TYPE_MAP['OTHER'];

    // Detect crypto
    let { assetClass, category } = mapping;
    const name = asset.name || 'Unknown';
    const nameLower = name.toLowerCase();

    if (nameLower.includes('bitcoin') || nameLower.includes('btc') || nameLower.includes('ethereum') || nameLower.includes('eth') || nameLower.includes('crypto')) {
        assetClass = 'Crypto';
        category = 'Crypto';
    }

    // Detect real estate funds (FIIs)
    if (nameLower.includes('fii') || nameLower.includes('fundo imobili') || (asset.code && asset.code.match(/^[A-Z]{4}11$/))) {
        assetClass = 'Real Estate';
        category = 'Real Estate';
    }

    return {
        assetClass,
        category,
        name: asset.name || 'Unknown',
        ticker: asset.code || asset.isin || '',
        currency: asset.currencyCode || 'BRL',
        value: asset.balance || asset.value || 0,
        quantity: asset.quantity || 0,
        broker: institutionName,
    };
}
