/**
 * Global Merchant Dictionary
 *
 * Maps UPPERCASE merchant substrings to standard category names.
 * Used as Tier 2 fallback in the auto-categorization engine.
 * Tier 1 (user-defined rules) always takes priority.
 */

export const MERCHANT_TO_CATEGORY: Record<string, string> = {
    // ─── Groceries ──────────────────────────────────────────
    TESCO:        'Groceries',
    SAINSBURY:    'Groceries',
    ASDA:         'Groceries',
    ALDI:         'Groceries',
    LIDL:         'Groceries',
    WAITROSE:     'Groceries',
    MORRISONS:    'Groceries',
    'CO-OP':      'Groceries',
    OCADO:        'Groceries',
    'M&S FOOD':   'Groceries',
    'MARKS SPENCER': 'Groceries',

    // ─── Dining ─────────────────────────────────────────────
    MCDONALDS:    'Dining',
    'BURGER KING':'Dining',
    NANDOS:       'Dining',
    'PIZZA HUT':  'Dining',
    DELIVEROO:    'Dining',
    'UBER EATS':  'Dining',
    'JUST EAT':   'Dining',
    KFC:          'Dining',
    WAGAMAMA:     'Dining',
    STARBUCKS:    'Dining',
    COSTA:        'Dining',
    PRET:         'Dining',
    GREGGS:       'Dining',
    SUBWAY:       'Dining',
    'FIVE GUYS':  'Dining',
    'PIZZA EXPRESS': 'Dining',
    'ITSU':       'Dining',

    // ─── Transport ──────────────────────────────────────────
    TFL:          'Transport',
    TRAINLINE:    'Transport',
    UBER:         'Transport',
    'BP ':        'Transport',
    SHELL:        'Transport',
    'ESSO ':      'Transport',
    BOLT:         'Transport',
    'NATIONAL RAIL': 'Transport',

    // ─── Shopping ───────────────────────────────────────────
    AMAZON:       'Shopping',
    EBAY:         'Shopping',
    ASOS:         'Shopping',
    ARGOS:        'Shopping',
    'JOHN LEWIS': 'Shopping',
    IKEA:         'Shopping',
    PRIMARK:      'Shopping',
    ZARA:         'Shopping',
    'NEXT ':      'Shopping',
    CURRYS:       'Shopping',
    HALFORDS:     'Shopping',

    // ─── Subscriptions ──────────────────────────────────────
    NETFLIX:      'Subscriptions',
    SPOTIFY:      'Subscriptions',
    'DISNEY+':    'Subscriptions',
    'APPLE.COM':  'Subscriptions',
    'AMAZON PRIME': 'Subscriptions',
    YOUTUBE:      'Subscriptions',
    OPENAI:       'Subscriptions',
    'CHAT GPT':   'Subscriptions',
    'APPLE MUSIC':'Subscriptions',
    'NOW TV':     'Subscriptions',

    // ─── Utilities ──────────────────────────────────────────
    'BRITISH GAS':'Utilities',
    OCTOPUS:      'Utilities',
    'EDF ENERGY': 'Utilities',
    THAMES:       'Utilities',
    'VIRGIN MEDIA':'Utilities',
    'SKY ':       'Utilities',
    'O2 ':        'Utilities',
    'THREE ':     'Utilities',
    VODAFONE:     'Utilities',

    // ─── Health ─────────────────────────────────────────────
    BOOTS:        'Health',
    'NHS ':       'Health',
    SPECSAVERS:   'Health',
    SUPERDRUG:    'Health',

    // ─── Entertainment ──────────────────────────────────────
    ODEON:        'Entertainment',
    VUE:          'Entertainment',
    CINEWORLD:    'Entertainment',
    TICKETMASTER: 'Entertainment',
};
