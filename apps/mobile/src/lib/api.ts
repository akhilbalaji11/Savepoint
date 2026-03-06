// API client — thin wrapper over Supabase Edge Functions
// All game data flows through here; keys stay server-side.

import type { GameDetail, GameSearchResult, BrowseFilters } from '../domain/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const EDGE_BASE = `${supabaseUrl}/functions/v1`;

const DEFAULT_TIMEOUT = 15000; // 15 seconds

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    // Race between fetch and timeout
    return Promise.race([
        fetch(url, options),
        timeoutPromise,
    ]) as Promise<Response>;
}

async function edgeFetch<T>(path: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const res = await fetchWithTimeout(`${EDGE_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            ...options?.headers,
        },
    }, timeout);

    if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`Edge function error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

// ---- Game Metadata API ----
export const gamesApi = {
    search: (query: string, page = 1): Promise<{ results: GameSearchResult[] }> =>
        edgeFetch(`/games-search?q=${encodeURIComponent(query)}&page=${page}`),

    getById: (providerId: string): Promise<GameDetail> =>
        edgeFetch(`/games-detail?id=${encodeURIComponent(providerId)}`),

    browse: (filters: BrowseFilters): Promise<{ results: GameSearchResult[] }> => {
        const params = new URLSearchParams();

        if (filters.genres && filters.genres.length > 0) {
            params.set('genres', filters.genres.join(','));
        }
        if (filters.minRating !== undefined) {
            params.set('minRating', String(filters.minRating));
        }
        if (filters.maxRating !== undefined) {
            params.set('maxRating', String(filters.maxRating));
        }
        if (filters.dateFrom) {
            params.set('dateFrom', filters.dateFrom);
        }
        if (filters.dateTo) {
            params.set('dateTo', filters.dateTo);
        }
        if (filters.sort) {
            params.set('sort', filters.sort);
        }
        if (filters.sortOrder) {
            params.set('sortOrder', filters.sortOrder);
        }
        if (filters.excludeIds && filters.excludeIds.length > 0) {
            params.set('excludeIds', filters.excludeIds.join(','));
        }
        if (filters.page !== undefined) {
            params.set('page', String(filters.page));
        }
        if (filters.limit !== undefined) {
            params.set('limit', String(filters.limit));
        }

        const queryString = params.toString();
        return edgeFetch(`/games-browse${queryString ? `?${queryString}` : ''}`);
    },
};

// ---- AI Tags API (feature-flagged) ----
export const aiApi = {
    tagReview: (
        reviewText: string,
        gameTitle: string
    ): Promise<{ tags: string[] }> =>
        edgeFetch('/ai-tag-review', {
            method: 'POST',
            body: JSON.stringify({ review_text: reviewText, game_title: gameTitle }),
        }),
};
