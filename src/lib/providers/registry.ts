/**
 * Provider Registry — central catalogue of all supported statement importers.
 * 
 * Adding a new provider:
 * 1. Create a file in ./brazil/ or ./uk/ exporting an object matching the provider interface
 * 2. Import it here and add it to the PROVIDERS array
 */

// ─── Brazil ────────────────────────────────────────────────────────────────────
import { b3Cei } from './brazil/b3Cei';
import { xpInvestimentos } from './brazil/xpInvestimentos';
import { nubank } from './brazil/nubank';
import { btgPactual } from './brazil/btgPactual';
import { rico } from './brazil/rico';
import { inter } from './brazil/inter';

// ─── UK ────────────────────────────────────────────────────────────────────────
import { trading212 } from './uk/trading212';
import { interactiveBrokers } from './uk/interactiveBrokers';
import { vanguardUk } from './uk/vanguardUk';
import { hargreavesLansdown } from './uk/hargreavesLansdown';
import { fidelity } from './uk/fidelity';

// ─── Provider Registry ────────────────────────────────────────────────────────

const PROVIDERS = [
    // Brazil
    b3Cei,
    xpInvestimentos,
    nubank,
    btgPactual,
    rico,
    inter,
    // UK
    trading212,
    interactiveBrokers,
    vanguardUk,
    hargreavesLansdown,
    fidelity,
];

/**
 * Get all registered providers.
 */
export function getAllProviders() {
    return PROVIDERS;
}

/**
 * Get providers filtered by country code ('BR' or 'UK').
 */
export function getProvidersByCountry(country: string) {
    return PROVIDERS.filter(p => p.country === country);
}

/**
 * Get a single provider by its unique ID.
 */
export function getProviderById(id: string) {
    return PROVIDERS.find(p => p.id === id) || null;
}

/**
 * Auto-detect which provider a file came from by examining its headers
 * and sample data rows.
 * 
 * @param {string[]} headers - Column headers from the parsed file
 * @param {object[]} sampleRows - First ~10 rows of data
 * @returns {{ provider: object|null, confidence: number }}
 */
export function detectProvider(headers: string[], sampleRows: any[]) {
    let bestMatch = null;
    let bestScore = 0;

    for (const provider of PROVIDERS) {
        try {
            const score = (provider as any).detect(headers, sampleRows);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = provider;
            }
        } catch {
            // Skip providers that fail detection
        }
    }

    return {
        provider: bestScore >= 0.5 ? bestMatch : null,
        confidence: bestScore,
    };
}

/**
 * Parse a file using a specific provider.
 * 
 * @param {string} providerId - Provider ID
 * @param {string[]} headers - Parsed file headers
 * @param {object[]} rows - All data rows
 * @param {object} options - { defaultCurrency, defaultBroker }
 * @returns {{ transactions: object[], summary: object }}
 */
export function parseWithProvider(providerId: string, headers: string[], rows: any[], options: any = {}) {
    const provider = getProviderById(providerId);
    if (!provider) {
        throw new Error(`Unknown provider: ${providerId}`);
    }
    return provider.parse(headers, rows, options);
}
