/**
 * Vendor Normalization Engine
 *
 * Normalises raw bank transaction descriptions into canonical vendor names.
 * Used by the Top Vendors card to group "AMZN MKTP", "AMAZON PRIME", etc.
 * under a single "Amazon" entry.
 *
 * Pattern matching is case-insensitive substring-based, ordered longest-first
 * so "AMAZON PRIME" matches before "AMAZON" (both map to "Amazon").
 */

/* ─── Known vendor patterns ────────────────────────────────────────
 * Keys are UPPERCASE substrings matched against the raw description.
 * Values are the canonical display name.
 *
 * Order doesn't matter — at runtime we sort by key length descending
 * so longer/more specific patterns match first.
 */
const VENDOR_PATTERNS: Record<string, string> = {
    // Amazon family
    'AMAZON PRIME':       'Amazon',
    'AMAZON FRESH':       'Amazon',
    'AMAZON.CO':          'Amazon',
    'AMAZON MARKETPLACE': 'Amazon',
    'AMZN MKTP':          'Amazon',
    'AMZN':               'Amazon',
    'AMAZON':             'Amazon',

    // Google family
    'GOOGLE PLAY':      'Google',
    'GOOGLE CLOUD':     'Google',
    'GOOGLE STORAGE':   'Google',
    'GOOGLE *':         'Google',

    // Apple family
    'APPLE.COM/BILL':   'Apple',
    'APPLE.COM':        'Apple',
    'APPLE MUSIC':      'Apple',
    'ITUNES':           'Apple',

    // Uber family
    'UBER EATS':        'Uber Eats',
    'UBEREATS':         'Uber Eats',
    'UBER BV':          'Uber',
    'UBER':             'Uber',

    // Transport
    'TFL ':             'TfL',
    'TFL.GOV':          'TfL',
    'TRAINLINE':        'Trainline',
    'NATIONAL RAIL':    'National Rail',
    'BOLT':             'Bolt',

    // Delivery / Dining
    'DELIVEROO':        'Deliveroo',
    'JUST EAT':         'Just Eat',
    'MCDONALDS':        "McDonald's",
    'BURGER KING':      'Burger King',
    'NANDOS':           "Nando's",
    'WAGAMAMA':         'Wagamama',
    'STARBUCKS':        'Starbucks',
    'COSTA COFFEE':     'Costa',
    'COSTA':            'Costa',
    'PRET A MANGER':    'Pret',
    'PRET ':            'Pret',
    'GREGGS':           'Greggs',
    'KFC':              'KFC',
    'FIVE GUYS':        'Five Guys',
    'PIZZA EXPRESS':    'Pizza Express',

    // Groceries
    'TESCO':            'Tesco',
    'SAINSBURY':        "Sainsbury's",
    'ASDA':             'Asda',
    'ALDI':             'Aldi',
    'LIDL':             'Lidl',
    'WAITROSE':         'Waitrose',
    'MORRISONS':        'Morrisons',
    'CO-OP':            'Co-op',
    'OCADO':            'Ocado',
    'M&S FOOD':         'M&S',
    'MARKS SPENCER':    'M&S',

    // Shopping
    'EBAY':             'eBay',
    'ASOS':             'ASOS',
    'ARGOS':            'Argos',
    'JOHN LEWIS':       'John Lewis',
    'IKEA':             'IKEA',
    'PRIMARK':          'Primark',
    'ZARA':             'Zara',
    'CURRYS':           'Currys',
    'HALFORDS':         'Halfords',

    // Subscriptions
    'NETFLIX':          'Netflix',
    'SPOTIFY':          'Spotify',
    'DISNEY+':          'Disney+',
    'YOUTUBE':          'YouTube',
    'OPENAI':           'OpenAI',
    'CHATGPT':          'ChatGPT',
    'CHAT GPT':         'ChatGPT',
    'NOW TV':           'Now TV',

    // Utilities
    'BRITISH GAS':      'British Gas',
    'OCTOPUS ENERGY':   'Octopus Energy',
    'OCTOPUS':          'Octopus Energy',
    'EDF ENERGY':       'EDF Energy',
    'THAMES WATER':     'Thames Water',
    'VIRGIN MEDIA':     'Virgin Media',
    'VODAFONE':         'Vodafone',

    // Health
    'BOOTS':            'Boots',
    'SPECSAVERS':       'Specsavers',
    'SUPERDRUG':        'Superdrug',

    // Entertainment
    'TICKETMASTER':     'Ticketmaster',
    'CINEWORLD':        'Cineworld',

    // Finance & Bills
    'PAYPAL':           'PayPal',
    'STRIPE':           'Stripe',
    'COUNCIL TAX':      'Council Tax',
};

// Pre-sorted by key length descending so longer patterns match first
const SORTED_PATTERNS = Object.entries(VENDOR_PATTERNS)
    .sort((a, b) => b[0].length - a[0].length);

/**
 * Normalise a raw transaction description into a canonical vendor name.
 * Returns the canonical name if matched, or the cleaned-up original description.
 */
export function normalizeVendor(description: string): string {
    const upper = description.toUpperCase().trim();

    // Try known patterns (longest match first)
    for (const [pattern, canonical] of SORTED_PATTERNS) {
        if (upper.includes(pattern)) {
            return canonical;
        }
    }

    // Fallback: clean up the raw description
    // Remove trailing reference numbers / dates / codes
    return description
        .replace(/\b\d{4,}\b/g, '')          // remove long numbers (refs, account numbers)
        .replace(/\b[A-Z]{2}\d{2}\b/g, '')   // remove short codes like "BP01"
        .replace(/\s{2,}/g, ' ')             // collapse whitespace
        .trim()
        || description.trim();
}
