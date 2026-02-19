/**
 * Utility for currency conversion and formatting.
 * Handles GBP, BRL, and USD as seen in the source spreadsheet.
 */

// Initial exchange rates based on the spreadsheet analysis (R$7.10 / GBP)
// In a real scenario, these would be fetched from an API.
const INITIAL_RATES = {
    GBP: 1,
    BRL: 7.10,
    USD: 1.28, // Default GBP/USD rate
};

/**
 * Formats a number as a currency string.
 * @param {number} amount 
 * @param {string} currency 'GBP' | 'BRL' | 'USD'
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'GBP') => {
    const locales = {
        GBP: 'en-GB',
        BRL: 'pt-BR',
        USD: 'en-US',
    };

    const symbols = {
        GBP: '£',
        BRL: 'R$',
        USD: '$',
    };

    return new Intl.NumberFormat(locales[currency] || 'en-GB', {
        style: 'currency',
        currency: currency,
        currencyDisplay: 'symbol',
    }).format(amount);
};

/**
 * Converts an amount from one currency to another.
 * @param {number} amount 
 * @param {string} from 'GBP' | 'BRL' | 'USD'
 * @param {string} to 'GBP' | 'BRL' | 'USD'
 * @param {object} rates Optional override rates
 * @returns {number}
 */
export const convertCurrency = (amount, from, to, rates = INITIAL_RATES) => {
    if (from === to) return amount;

    // Convert to base (GBP)
    const amountInGBP = amount / rates[from];

    // Convert to target
    return amountInGBP * rates[to];
};

/**
 * Returns the current live rates (Mocked for now)
 */
export const getLiveRates = async () => {
    // TODO: Integrate with a real exchange rate API (e.g., ExchangeRate-API)
    return INITIAL_RATES;
};
