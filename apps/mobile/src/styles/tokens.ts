// Design tokens — "Neon Arcade" aesthetic for Backlogd
// Inspired by retro arcades + modern gaming UIs

export const colors = {
    // Core backgrounds - deep space dark
    bg: {
        primary: '#06060a',      // Near black with subtle blue
        secondary: '#0c0c14',    // Slightly lighter
        tertiary: '#12121c',     // Card backgrounds
        card: '#16161f',         // Elevated cards
        elevated: '#1a1a26',     // Highest elevation
    },

    // Neon accent palette
    neon: {
        cyan: '#00f0ff',         // Electric cyan
        cyanDim: '#00a8b3',
        pink: '#ff2d6a',         // Hot pink
        pinkDim: '#b3204a',
        lime: '#00ff88',         // Neon green
        limeDim: '#00b35e',
        purple: '#a855f7',       // Vivid purple
        purpleDim: '#7c3aed',
        orange: '#ff6b35',       // Arcade orange
        blue: '#3b82f6',         // Gaming blue
    },

    // Legacy purple scale for compatibility
    purple: {
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
    },

    rose: {
        400: '#fb7185',
        500: '#f43f5e',
    },

    // Text colors
    text: {
        primary: '#f8fafc',      // Almost white
        secondary: '#94a3b8',    // Slate gray
        muted: '#475569',        // Darker slate
        dim: '#334155',          // Very muted
    },

    // Status colors - vibrant gaming palette
    status: {
        played: '#00ff88',       // Neon green - completed
        playing: '#00f0ff',      // Cyan - in progress
        backlog: '#fbbf24',      // Golden yellow - pending
        wishlist: '#ff2d6a',     // Hot pink - desired
    },

    // UI colors
    star: '#fbbf24',             // Golden rating stars
    starEmpty: '#334155',
    border: '#1e293b',           // Subtle borders
    borderLight: '#334155',      // Lighter borders
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',

    // Special effects
    glow: {
        cyan: 'rgba(0, 240, 255, 0.4)',
        pink: 'rgba(255, 45, 106, 0.4)',
        lime: 'rgba(0, 255, 136, 0.4)',
        purple: 'rgba(168, 85, 247, 0.4)',
    },

    // Gradients (for LinearGradient)
    gradients: {
        hero: ['rgba(6, 6, 10, 0)', 'rgba(6, 6, 10, 0.7)', '#06060a'],
        cardShine: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)'],
        neonCyan: ['#00f0ff', '#00a8b3'],
        neonPink: ['#ff2d6a', '#b3204a'],
        neonPurple: ['#a855f7', '#7c3aed'],
    },
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
} as const;

export const radius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    full: 9999,
} as const;

export const typography = {
    size: {
        '2xs': 9,
        xs: 11,
        sm: 13,
        base: 15,
        md: 17,
        lg: 20,
        xl: 24,
        '2xl': 28,
        '3xl': 34,
        '4xl': 42,
    },
    lineHeight: {
        tight: 1.15,
        normal: 1.4,
        relaxed: 1.6,
    },
} as const;

// Animation timing
export const animation = {
    duration: {
        fast: 150,
        normal: 250,
        slow: 400,
        verySlow: 600,
    },
    easing: {
        // These are for Reanimated
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
} as const;

export const STATUS_LABELS = {
    played: 'Played',
    playing: 'Playing',
    backlog: 'Backlog',
    wishlist: 'Wishlist',
} as const;

export const STATUS_ICONS = {
    played: 'checkmark-circle',
    playing: 'game-controller',
    backlog: 'time',
    wishlist: 'heart',
} as const;

// Platform brand colors
export const PLATFORM_COLORS: Record<string, string> = {
    'PS5': '#00f0ff',
    'PS4': '#00f0ff',
    'Xbox': '#00ff88',
    'Switch': '#ff2d6a',
    'PC': '#a855f7',
    'iOS': '#94a3b8',
    'Android': '#00ff88',
    'Other': '#475569',
};

// Genre colors for visual variety
export const GENRE_COLORS: Record<string, { bg: string; text: string }> = {
    'Action': { bg: 'rgba(255, 45, 106, 0.15)', text: '#ff2d6a' },
    'Adventure': { bg: 'rgba(0, 240, 255, 0.15)', text: '#00f0ff' },
    'RPG': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
    'Strategy': { bg: 'rgba(0, 255, 136, 0.15)', text: '#00ff88' },
    'Shooter': { bg: 'rgba(255, 107, 53, 0.15)', text: '#ff6b35' },
    'Puzzle': { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },
    'Racing': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
    'Sports': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
    'Simulation': { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' },
    'Fighting': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
    'Horror': { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
    'Platformer': { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
    'default': { bg: 'rgba(71, 85, 105, 0.15)', text: '#94a3b8' },
};
