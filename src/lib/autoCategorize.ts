/**
 * Two-Tier Auto-Categorization Engine
 *
 * Tier 1: User-defined rules (from app-settings.categoryRules)
 *         Record<substring, category_id> — highest priority.
 *
 * Tier 2: Global merchant dictionary
 *         Record<substring, categoryName> — matched to categories by name.
 */

import { MERCHANT_TO_CATEGORY } from '@/lib/merchantDictionary';
import type { BudgetCategory } from '@/types';

/**
 * Find a matching category for a transaction description.
 * Returns category_id or null if no match found.
 */
export function findCategoryMatch(
    description: string,
    categoryRules: Record<string, number>,
    categories: BudgetCategory[],
): number | null {
    const upper = description.toUpperCase();

    // ─── Tier 1: User-defined rules (exact substring match) ───
    for (const [substring, categoryId] of Object.entries(categoryRules)) {
        if (upper.includes(substring.toUpperCase())) {
            // Validate the category still exists
            if (categories.some(c => c.id === categoryId)) {
                return categoryId;
            }
        }
    }

    // ─── Tier 2: Global merchant dictionary ───────────────────
    for (const [merchantKey, categoryName] of Object.entries(MERCHANT_TO_CATEGORY)) {
        if (upper.includes(merchantKey)) {
            const match = categories.find(
                c => c.name.toUpperCase() === categoryName.toUpperCase()
            );
            if (match) return match.id;
        }
    }

    return null;
}

/**
 * Extract a clean rule key from a transaction description.
 * Takes the first 1-2 alphanumeric words, uppercased.
 * e.g. "MCDONALDS RESTAURANT LONDON" → "MCDONALDS RESTAURANT"
 */
export function suggestRuleKey(description: string): string {
    const words = description
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0);
    return words.slice(0, 2).join(' ');
}
