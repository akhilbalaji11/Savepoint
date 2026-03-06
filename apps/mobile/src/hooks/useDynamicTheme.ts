import { useMemo } from 'react';

// Predefined color palettes for dynamic theming
// These are carefully selected to work well with game covers
const COLOR_PALETTES = [
    { dominant: '#1a365d', vibrant: '#4299e1', name: 'ocean' },      // Deep blue
    { dominant: '#553c9a', vibrant: '#9f7aea', name: 'purple' },     // Purple
    { dominant: '#744210', vibrant: '#f6ad55', name: 'amber' },      // Amber/Gold
    { dominant: '#1a4731', vibrant: '#48bb78', name: 'forest' },     // Green
    { dominant: '#742a2a', vibrant: '#fc8181', name: 'crimson' },    // Red
    { dominant: '#234e52', vibrant: '#4fd1c5', name: 'teal' },       // Teal
    { dominant: '#322659', vibrant: '#b794f4', name: 'violet' },     // Violet
    { dominant: '#2d3748', vibrant: '#a0aec0', name: 'slate' },      // Slate gray
    { dominant: '#702459', vibrant: '#ed64a6', name: 'pink' },       // Pink
    { dominant: '#654321', vibrant: '#c4a35a', name: 'bronze' },     // Bronze
];

export interface DynamicTheme {
    dominant: string;
    vibrant: string;
    textPrimary: string;
    textSecondary: string;
    isDark: boolean;
}

/**
 * Hook to generate dynamic theme colors based on cover image URL.
 * Uses a deterministic hash of the URL to select from curated color palettes.
 * This ensures consistent colors for the same image while providing visual variety.
 */
export function useDynamicTheme(coverUrl?: string): DynamicTheme | null {
    return useMemo(() => {
        if (!coverUrl) return null;

        // Generate a deterministic hash from the cover URL
        const hash = hashString(coverUrl);

        // Select palette based on hash
        const paletteIndex = Math.abs(hash) % COLOR_PALETTES.length;
        const palette = COLOR_PALETTES[paletteIndex];

        // Calculate luminance to determine if we need light or dark text
        const luminance = getLuminance(palette.dominant);
        const isDark = luminance < 0.5;

        return {
            dominant: palette.dominant,
            vibrant: palette.vibrant,
            textPrimary: isDark ? '#ffffff' : '#0a0a0f',
            textSecondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(10,10,15,0.7)',
            isDark,
        };
    }, [coverUrl]);
}

/**
 * Simple string hash function for deterministic color selection
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}

/**
 * Calculate relative luminance of a hex color
 * Uses the formula from WCAG 2.0
 */
function getLuminance(hexColor: string): number {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Apply gamma correction
    const gamma = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

    // Calculate luminance
    return 0.2126 * gamma(r) + 0.7152 * gamma(g) + 0.0722 * gamma(b);
}

/**
 * Convert hex color to RGBA string
 */
export function hexToRgba(hex: string, alpha: number): string {
    const hexClean = hex.replace('#', '');
    const r = parseInt(hexClean.substring(0, 2), 16);
    const g = parseInt(hexClean.substring(2, 4), 16);
    const b = parseInt(hexClean.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}
