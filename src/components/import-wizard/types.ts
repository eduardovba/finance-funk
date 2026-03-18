export interface ImportWizardProps {
    // ImportWizard takes no props (it's self-contained)
}

export interface SheetConfig {
    sheetName: string;
    headers: string[];
    rows: Record<string, unknown>[];
    enabled: boolean;
    assetClass: string;
    defaultCurrency: string;
    defaultBroker: string;
    columnMapping: Record<string, string>;
}

export interface ParsedData {
    headers: string[];
    rows: Record<string, unknown>[];
    sheets: {
        sheetName: string;
        headers: string[];
        rows: Record<string, unknown>[];
    }[];
}

export interface ImportResult {
    inserted: number;
    skipped: number;
    errors: string[];
}

export interface TransformedTransaction {
    date: string;
    asset: string;
    broker: string;
    currency: string;
    ticker?: string;
    investment: number;
    quantity: number;
    type: string;
    assetClass?: string;
}

export interface ProviderInfo {
    id: string;
    name: string;
    country?: string;
    detect: (headers: string[], rows: Record<string, unknown>[]) => number;
}
