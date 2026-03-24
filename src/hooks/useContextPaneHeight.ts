import { useState, useEffect } from 'react';

/**
 * Measures the full left-pane content height (hero card + accordion section)
 * so the ContextPane matches bottom-aligned. The ContextPane sits alongside
 * both the hero and the accordions in the same flex row, so its height
 * needs to span both. Falls back to 2x hero height when no accordions exist.
 *
 * @param {string} sectionId  - DOM id of the accordion/broker section
 * @param {string} heroId     - DOM id of the hero header card
 * @returns {number|undefined} height in pixels
 */
export default function useContextPaneHeight(sectionId: string, heroId: string) {
    const [paneHeight, setPaneHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        const measure = () => {
            const section = document.getElementById(sectionId);
            const hero = document.getElementById(heroId);

            if (section && hero && section.offsetHeight > 50) {
                // Calculate the total distance from the top of the hero
                // to the bottom of the accordion section
                const heroRect = hero.getBoundingClientRect();
                const sectionRect = section.getBoundingClientRect();
                const totalHeight = sectionRect.bottom - heroRect.top;
                setPaneHeight(totalHeight);
            } else if (hero) {
                setPaneHeight(hero.offsetHeight * 2);
            }
        };

        // Delay initial measure to ensure DOM has rendered
        const timer = setTimeout(measure, 150);

        const observer = new ResizeObserver(measure);
        const section = document.getElementById(sectionId);
        const hero = document.getElementById(heroId);
        if (section) observer.observe(section);
        if (hero) observer.observe(hero);

        window.addEventListener('resize', measure);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [sectionId, heroId]);

    return paneHeight;
}

