import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { igdbFetch, mapGame } from '../_shared/igdb.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);

        // Parse filter parameters
        const genres = url.searchParams.get('genres')?.split(',').map(Number).filter(Boolean);
        const minRating = parseInt(url.searchParams.get('minRating') ?? '0', 10);
        const maxRating = parseInt(url.searchParams.get('maxRating') ?? '100', 10);
        const dateFrom = url.searchParams.get('dateFrom');
        const dateTo = url.searchParams.get('dateTo');
        const sortField = url.searchParams.get('sort') ?? 'rating';
        const sortOrder = url.searchParams.get('sortOrder') ?? 'desc';
        const excludeIds = url.searchParams.get('excludeIds')?.split(',').filter(Boolean) ?? [];
        const page = parseInt(url.searchParams.get('page') ?? '1', 10);
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 50);
        const offset = (page - 1) * limit;

        // Build IGDB where clause
        const whereParts: string[] = [];

        // Genre filter
        if (genres && genres.length > 0) {
            whereParts.push(`genres = (${genres.join(',')})`);
        }

        // Rating filter
        if (minRating > 0 || maxRating < 100) {
            whereParts.push(`rating >= ${minRating} & rating <= ${maxRating}`);
        }

        // Date range filter (convert ISO date to Unix timestamp)
        if (dateFrom) {
            const fromTimestamp = Math.floor(new Date(dateFrom).getTime() / 1000);
            if (!isNaN(fromTimestamp)) {
                whereParts.push(`first_release_date >= ${fromTimestamp}`);
            }
        }
        if (dateTo) {
            const toTimestamp = Math.floor(new Date(dateTo).getTime() / 1000);
            if (!isNaN(toTimestamp)) {
                whereParts.push(`first_release_date <= ${toTimestamp}`);
            }
        }

        // Exclude already played/owned games
        if (excludeIds.length > 0) {
            whereParts.push(`id != (${excludeIds.join(',')})`);
        }

        // Build the full IGDB query
        const whereClause = whereParts.length > 0 ? `where ${whereParts.join(' & ')};` : '';
        const sortClause = `sort ${sortField} ${sortOrder};`;

        const igdbQuery = `
            fields id, name, cover.image_id, first_release_date, genres.name, platforms.name, themes.name, rating, summary, hypes;
            ${whereClause}
            ${sortClause}
            limit ${limit};
            offset ${offset};
        `;

        console.log('[games-browse] IGDB query:', igdbQuery);

        const results = await igdbFetch('/games', igdbQuery);
        const mapped = results.map(mapGame);

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
                themes: g.themes,
                description: g.description ?? null,
                rating: g.rating ?? null,
                similar_game_ids: g.similarGameIds,
                updated_at: new Date().toISOString(),
            }));

            await supabase
                .from('games')
                .upsert(upsertData, { onConflict: 'provider,provider_game_id', ignoreDuplicates: false });
        }

        return new Response(
            JSON.stringify({ results: mapped }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err: any) {
        console.error('[games-browse]', err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
