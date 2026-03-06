import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { igdbFetch } from '../_shared/igdb.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
    game: any;
    matchType: 'title' | 'company' | 'character';
    relevanceScore: number;
}

// Map raw IGDB game data to our format
function mapGame(g: any): any {
    return {
        providerId: String(g.id),
        provider: 'igdb',
        title: g.name,
        coverUrl: g.cover?.image_id
            ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
            : undefined,
        releaseDate: g.first_release_date
            ? new Date(g.first_release_date * 1000).toISOString().split('T')[0]
            : undefined,
        genres: (g.genres ?? []).map((x: any) => x.name),
        platforms: (g.platforms ?? []).map((x: any) => x.name),
        rating: g.rating ? Math.round(g.rating * 10) / 10 : undefined,
    };
}

// Calculate relevance score for title matches
function calculateTitleRelevance(game: any, query: string): number {
    const title = game.name.toLowerCase();
    const q = query.toLowerCase();

    if (title === q) return 1.0;                    // Exact match
    if (title.startsWith(q)) return 0.95;           // Starts with query
    if (title.includes(q)) return 0.8;              // Contains query

    // Fuzzy match bonus for partial word matches
    const words = q.split(/\s+/);
    const matchCount = words.filter(w => title.includes(w)).length;
    return 0.5 + (matchCount / words.length) * 0.3;
}

// Search by game title
async function searchByTitle(query: string, limit: number): Promise<SearchResult[]> {
    try {
        const results = await igdbFetch('/games', `
            search "${query}";
            fields id, name, cover.image_id, first_release_date, genres.name, platforms.name, rating;
            limit ${limit};
        `);

        return results.map((game: any) => ({
            game,
            matchType: 'title' as const,
            relevanceScore: calculateTitleRelevance(game, query),
        }));
    } catch (err) {
        console.error('[searchByTitle]', err);
        return [];
    }
}

// Search by company name (developer/publisher)
async function searchByCompany(query: string): Promise<SearchResult[]> {
    try {
        // First, find companies matching the query
        const companies = await igdbFetch('/companies', `
            search "${query}";
            fields id, name, developed, published;
            limit 5;
        `);

        if (!companies || companies.length === 0) return [];

        // Collect game IDs from developed/published arrays
        const gameIds = new Set<number>();
        companies.forEach((c: any) => {
            (c.developed ?? []).forEach((id: number) => gameIds.add(id));
            (c.published ?? []).forEach((id: number) => gameIds.add(id));
        });

        if (gameIds.size === 0) return [];

        // Fetch those games
        const games = await igdbFetch('/games', `
            fields id, name, cover.image_id, first_release_date, genres.name, platforms.name, rating;
            where id = (${Array.from(gameIds).slice(0, 50).join(',')});
            sort rating desc;
            limit 20;
        `);

        // Score based on how well company name matches
        return games.map((game: any) => ({
            game,
            matchType: 'company' as const,
            relevanceScore: 0.7,  // Company matches get 0.7 base score
        }));
    } catch (err) {
        console.error('[searchByCompany]', err);
        return [];
    }
}

// Search by character name
async function searchByCharacter(query: string): Promise<SearchResult[]> {
    try {
        // First, find characters matching the query
        const characters = await igdbFetch('/characters', `
            search "${query}";
            fields id, name, games;
            limit 5;
        `);

        if (!characters || characters.length === 0) return [];

        // Collect game IDs from characters
        const gameIds = new Set<number>();
        characters.forEach((c: any) => {
            (c.games ?? []).forEach((id: number) => gameIds.add(id));
        });

        if (gameIds.size === 0) return [];

        // Fetch those games
        const games = await igdbFetch('/games', `
            fields id, name, cover.image_id, first_release_date, genres.name, platforms.name, rating;
            where id = (${Array.from(gameIds).slice(0, 50).join(',')});
            sort rating desc;
            limit 20;
        `);

        return games.map((game: any) => ({
            game,
            matchType: 'character' as const,
            relevanceScore: 0.5,  // Character matches get 0.5 base score
        }));
    } catch (err) {
        console.error('[searchByCharacter]', err);
        return [];
    }
}

// Merge and deduplicate results, keeping highest score
function mergeResults(allResults: SearchResult[]): SearchResult[] {
    const gameMap = new Map<number, SearchResult>();

    for (const result of allResults) {
        const gameId = result.game.id;
        const existing = gameMap.get(gameId);

        if (!existing || result.relevanceScore > existing.relevanceScore) {
            gameMap.set(gameId, result);
        }
    }

    // Sort by relevance score, then by rating
    return Array.from(gameMap.values())
        .sort((a, b) => {
            if (b.relevanceScore !== a.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            const ratingA = a.game.rating ?? 0;
            const ratingB = b.game.rating ?? 0;
            return ratingB - ratingA;
        });
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const query = url.searchParams.get('q')?.trim();
        const page = parseInt(url.searchParams.get('page') ?? '1', 10);
        const limit = 20;
        const offset = (page - 1) * limit;

        if (!query) {
            return new Response(
                JSON.stringify({ error: 'Missing q parameter' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Escape special characters for IGDB query
        const sanitizedQuery = query.replace(/"/g, '\\"');

        // Run parallel searches
        const [titleResults, companyResults, characterResults] = await Promise.allSettled([
            searchByTitle(sanitizedQuery, limit),
            searchByCompany(sanitizedQuery),
            searchByCharacter(sanitizedQuery),
        ]);

        // Collect all successful results
        const allResults: SearchResult[] = [];

        if (titleResults.status === 'fulfilled') {
            allResults.push(...titleResults.value);
        }
        if (companyResults.status === 'fulfilled') {
            allResults.push(...companyResults.value);
        }
        if (characterResults.status === 'fulfilled') {
            allResults.push(...characterResults.value);
        }

        // Merge, deduplicate, and sort
        const merged = mergeResults(allResults);

        // Paginate
        const paginated = merged.slice(offset, offset + limit);

        // Map to output format
        const mapped = paginated.map(r => ({
            ...mapGame(r.game),
            matchType: r.matchType,
        }));

        // Cache results into Supabase games table
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        if (mapped.length > 0) {
            const upsertData = mapped.map((g: any) => ({
                provider: 'igdb',
                provider_game_id: g.providerId,
                title: g.title,
                cover_url: g.coverUrl ?? null,
                release_date: g.releaseDate ?? null,
                genres: g.genres,
                platforms: g.platforms,
                rating: g.rating ?? null,
                updated_at: new Date().toISOString(),
            }));

            await supabase
                .from('games')
                .upsert(upsertData, { onConflict: 'provider,provider_game_id', ignoreDuplicates: false });
        }

        return new Response(
            JSON.stringify({ results: mapped, total: merged.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err: any) {
        console.error('[games-search]', err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
