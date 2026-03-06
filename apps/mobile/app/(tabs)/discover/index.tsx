import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import type { ActivityEvent, ActivityType, GameSearchResult, GameStatus } from '../../../src/domain/types';
import { IGDB_GENRE_IDS } from '../../../src/domain/types';
import { gamesApi } from '../../../src/lib/api';
import { buildPreferenceVector, recommend } from '../../../src/lib/recommender';
import { supabase } from '../../../src/lib/supabase';
import { withTimeout } from '../../../src/lib/withTimeout';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing, typography, PLATFORM_COLORS, GENRE_COLORS } from '../../../src/styles/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;

// ===== SHIMMER COMPONENT =====
function ShimmerView({ width, height }: { width: number; height: number }) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width],
    });

    return (
        <Animated.View
            style={[
                styles.shimmer,
                {
                    width: width * 2,
                    height,
                    transform: [{ translateX }],
                },
            ]}
            pointerEvents="none"
        >
            <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
            />
        </Animated.View>
    );
}

// ===== TRENDING GAME POSTER =====
function TrendingGamePoster({ game, onPress }: { game: GameSearchResult; onPress?: () => void }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [imageError, setImageError] = useState(false);
    const normalizedRating = game.rating ? (game.rating / 20).toFixed(1) : null;
    const coverUrl = game.coverUrl?.replace('t_cover_big', 't_cover_big_2x');
    const showImage = coverUrl && !imageError;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    return (
        <TouchableOpacity
            style={styles.posterContainer}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
        >
            <Animated.View style={[styles.poster, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.coverWrapper}>
                    {/* Neon glow effect */}
                    <View style={styles.coverGlow} />

                    {showImage ? (
                        <Image
                            source={{ uri: coverUrl }}
                            style={styles.cover}
                            contentFit="cover"
                            transition={200}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <Ionicons name="game-controller" size={36} color={colors.text.muted} />
                        </View>
                    )}

                    {/* Bottom gradient */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradientOverlay}
                        pointerEvents="none"
                    />
                </View>

                {/* Game info */}
                <View style={styles.posterInfo}>
                    <Text style={styles.posterTitle} numberOfLines={2}>{game.title}</Text>
                    <View style={styles.posterMeta}>
                        {game.releaseDate && (
                            <Text style={styles.posterYear}>{new Date(game.releaseDate).getFullYear()}</Text>
                        )}
                        {normalizedRating && (
                            <View style={styles.posterRating}>
                                <Ionicons name="star" size={12} color={colors.star} />
                                <Text style={styles.posterRatingValue}>{normalizedRating}</Text>
                            </View>
                        )}
                    </View>

                    {/* Genre chips */}
                    {game.genres.length > 0 && (
                        <View style={styles.genreChips}>
                            {game.genres.slice(0, 2).map((genre) => {
                                const genreStyle = GENRE_COLORS[genre] || GENRE_COLORS.default;
                                return (
                                    <View key={genre} style={[styles.genreChip, { backgroundColor: genreStyle.bg }]}>
                                        <Text style={[styles.genreChipText, { color: genreStyle.text }]}>{genre}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

// ===== RECOMMENDATION CARD =====
function RecommendationCard({
    recommendation,
    onPress,
}: {
    recommendation: { game: GameSearchResult; reason: string; score: number };
    onPress?: () => void;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [imageError, setImageError] = useState(false);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const normalizedRating = recommendation.game.rating ? (recommendation.game.rating / 20).toFixed(1) : null;
    const coverUrl = recommendation.game.coverUrl?.replace('t_cover_big', 't_cover_big_2x');
    const showImage = coverUrl && !imageError;

    return (
        <TouchableOpacity
            style={styles.recommendContainer}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
        >
            <Animated.View style={[styles.recommendCard, { transform: [{ scale: scaleAnim }] }]}>
                {/* Cover section */}
                <View style={styles.recommendCoverWrapper}>
                    <View style={styles.recommendGlow} />
                    {showImage ? (
                        <Image
                            source={{ uri: coverUrl }}
                            style={styles.recommendCover}
                            contentFit="cover"
                            transition={200}
                            onError={() => setImageError(true)}
                            placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
                        />
                    ) : (
                        <View style={styles.recommendCoverPlaceholder}>
                            <Ionicons name="game-controller" size={28} color={colors.text.muted} />
                        </View>
                    )}
                </View>

                {/* Info section */}
                <View style={styles.recommendInfo}>
                    <Text style={styles.recommendTitle} numberOfLines={2}>{recommendation.game.title}</Text>

                    <View style={styles.recommendMeta}>
                        {recommendation.game.releaseDate && (
                            <Text style={styles.recommendYear}>
                                {new Date(recommendation.game.releaseDate).getFullYear()}
                            </Text>
                        )}
                        {normalizedRating && (
                            <View style={styles.recommendRating}>
                                <Ionicons name="star" size={12} color={colors.star} />
                                <Text style={styles.recommendRatingValue}>{normalizedRating}</Text>
                            </View>
                        )}
                    </View>

                    {/* Reason text */}
                    <View style={styles.reasonContainer}>
                        <Ionicons name="sparkles" size={12} color={colors.neon.cyan} />
                        <Text style={styles.reasonText} numberOfLines={2}>{recommendation.reason}</Text>
                    </View>

                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={18} color={colors.text.muted} style={styles.recommendChevron} />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

// ===== ACTIVITY EVENT CARD =====
function ActivityEventCard({ event }: { event: ActivityEvent }) {
    const meta = event.metadata as Record<string, any>;
    const actorName = event.actor?.displayName || 'Someone';

    const getIcon = (type: ActivityType): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'review': return 'create';
            case 'rating': return 'star';
            case 'status_change': return 'game-controller';
            case 'list_add': return 'list';
            case 'follow': return 'person-add';
            default: return 'ellipse';
        }
    };

    const getIconColor = (type: ActivityType): string => {
        switch (type) {
            case 'review': return colors.neon.pink;
            case 'rating': return colors.star;
            case 'status_change': return colors.neon.cyan;
            case 'list_add': return colors.neon.lime;
            case 'follow': return colors.neon.purple;
            default: return colors.text.muted;
        }
    };

    const getLabel = (): string => {
        const gameTitle = meta?.game_title || 'a game';
        switch (event.type) {
            case 'review': return `${actorName} reviewed ${gameTitle}`;
            case 'rating': return `${actorName} rated ${gameTitle} ${meta?.rating || ''}★`;
            case 'status_change': return `${actorName} added ${gameTitle} to ${meta?.status || 'collection'}`;
            case 'list_add': return `${actorName} added ${gameTitle} to "${meta?.list_title || 'a list'}"`;
            case 'follow': return `${actorName} followed someone`;
            default: return `${actorName} did something`;
        }
    };

    const timeAgo = (iso: string): string => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <View style={styles.eventCard}>
            {/* Avatar */}
            <View style={styles.eventAvatar}>
                {event.actor?.avatarUrl ? (
                    <Image source={{ uri: event.actor.avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={16} color={colors.text.muted} />
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.eventContent}>
                <View style={styles.eventIconRow}>
                    <Ionicons name={getIcon(event.type)} size={14} color={getIconColor(event.type)} />
                    <Text style={styles.eventLabel}>{getLabel()}</Text>
                </View>
                <Text style={styles.eventTime}>{timeAgo(event.createdAt)}</Text>
            </View>

            {/* Game cover if available */}
            {meta?.cover_url && (
                <Image source={{ uri: meta.cover_url }} style={styles.eventCover} />
            )}
        </View>
    );
}

// ===== MAIN DISCOVER SCREEN =====
export default function DiscoverScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    // Load trending games
    const { data: trending = [], isLoading: trendingLoading } = useQuery<GameSearchResult[]>({
        queryKey: ['trending-games'],
        queryFn: async () => {
            const { results } = await gamesApi.search('', 1);
            return results.slice(0, 10);
        },
        staleTime: 1000 * 60 * 30,
    });

    // Load activity feed
    const { data: feed = [], isLoading: feedLoading, refetch: refetchFeed } = useQuery<ActivityEvent[]>({
        queryKey: ['activity-feed', user?.id],
        queryFn: async () => {
            if (!user) return [];
            try {
                const { data, error } = await withTimeout(
                    supabase
                        .from('activity_events')
                        .select('*, actor:profiles(id, display_name, avatar_url)')
                        .order('created_at', { ascending: false })
                        .limit(20),
                    8_000,
                    'Load friend activity'
                );
                if (error) {
                    console.warn('[Discover] activity feed error:', error.message);
                    return [];
                }
                return (data ?? []).map((e) => ({
                    id: e.id,
                    actorId: e.actor_id,
                    type: e.type as ActivityType,
                    entityId: e.entity_id,
                    metadata: e.metadata,
                    createdAt: e.created_at,
                    actor: e.actor ? {
                        id: e.actor.id,
                        displayName: e.actor.display_name,
                        avatarUrl: e.actor.avatar_url,
                    } : undefined,
                }));
            } catch (err: any) {
                console.warn('[Discover] activity feed exception:', err.message);
                return [];
            }
        },
        enabled: !!user,
        refetchInterval: 30_000,
        retry: 0,
    });

    // Load recommendations
    const { data: recommendations = [] } = useQuery({
        queryKey: ['recommendations', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const [{ data: reviews }, { data: statuses }] = await Promise.all([
                supabase.from('reviews').select('*, game:games(*)').eq('user_id', user.id),
                supabase.from('user_game_status').select('*, game:games(*)').eq('user_id', user.id),
            ]);

            const mappedReviews = (reviews ?? []).map((r) => ({
                id: r.id, userId: r.user_id, gameId: r.game_id,
                rating: Number(r.rating), reviewText: r.review_text,
                spoiler: r.spoiler, createdAt: r.created_at, updatedAt: r.updated_at,
                game: r.game ? {
                    providerId: r.game.provider_game_id,
                    provider: 'igdb' as const,
                    title: r.game.title,
                    genres: r.game.genres ?? [],
                    platforms: r.game.platforms ?? [],
                    rating: r.game.rating
                } : undefined,
            }));

            const mappedStatuses = (statuses ?? []).map((s) => ({
                userId: s.user_id, gameId: s.game_id, status: s.status,
                addedAt: s.added_at, lastUpdated: s.last_updated,
                game: s.game ? {
                    providerId: s.game.provider_game_id,
                    provider: 'igdb' as const,
                    title: s.game.title,
                    genres: s.game.genres ?? [],
                    platforms: s.game.platforms ?? [],
                    rating: s.game.rating
                } : undefined,
            }));

            if (mappedReviews.length === 0 && mappedStatuses.length === 0) return [];

            const vector = buildPreferenceVector(mappedReviews as any, mappedStatuses as any);

            // Get top 3 genres and convert to IGDB IDs
            const topGenreIds = Object.entries(vector.genres)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name]) => IGDB_GENRE_IDS[name])
                .filter((id): id is number => id !== undefined);

            if (topGenreIds.length === 0) return [];

            // Get IGDB provider IDs (not database UUIDs) for exclusion
            const playedProviderIds = new Set([
                ...mappedReviews.filter(r => r.game?.providerId).map((r) => r.game!.providerId),
                ...mappedStatuses.filter(s => s.game?.providerId).map((s) => s.game!.providerId),
            ]);

            // Use browse API with genre filters, with fallback to text search if it fails
            try {
                const { results: candidates } = await gamesApi.browse({
                    genres: topGenreIds,
                    minRating: 70, // Quality threshold
                    sort: 'rating',
                    sortOrder: 'desc',
                    excludeIds: Array.from(playedProviderIds),
                    limit: 30,
                });

                return recommend(candidates, mappedReviews as any, mappedStatuses as any, 5);
            } catch (error) {
                console.error('[recommendations] Browse API failed, falling back to text search:', error);
                // Fallback to the old text search method if browse fails
                const topGenre = Object.entries(vector.genres).sort((a, b) => b[1] - a[1])[0]?.[0];
                if (!topGenre) return [];

                const { results: candidates } = await gamesApi.search(topGenre, 1);
                const unseenCandidates = candidates.filter((c) => !playedProviderIds.has(c.providerId));

                return recommend(unseenCandidates, mappedReviews as any, mappedStatuses as any, 5);
            }
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10,
        retry: 1,
        retryDelay: 2000,
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetchFeed();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.neon.cyan}
                        colors={[colors.neon.cyan]}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Discover</Text>
                    <Text style={styles.subtitle}>Find your next favorite game</Text>
                </View>

                {/* Trending Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="trending-up" size={20} color={colors.neon.cyan} />
                        <Text style={styles.sectionTitle}>Trending</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>Popular this week</Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.trendingScroll}
                        decelerationRate="fast"
                        snapToInterval={CARD_WIDTH + spacing.md}
                    >
                        {trendingLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={colors.neon.cyan} />
                            </View>
                        ) : (
                            trending.map((game, index) => (
                                <TrendingGamePoster
                                    key={game.providerId}
                                    game={game}
                                    onPress={() => router.push(`/game/${game.providerId}`)}
                                />
                            ))
                        )}
                    </ScrollView>
                </View>

                {/* Recommendations Section */}
                {recommendations.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="sparkles" size={20} color={colors.neon.pink} />
                            <Text style={styles.sectionTitle}>Recommended For You</Text>
                        </View>
                        <Text style={styles.sectionSubtitle}>Based on your gaming taste</Text>

                        {recommendations.map((rec) => (
                            <RecommendationCard
                                key={rec.game.providerId}
                                recommendation={rec}
                                onPress={() => router.push(`/game/${rec.game.providerId}`)}
                            />
                        ))}
                    </View>
                )}

                {/* Activity Feed Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="people" size={20} color={colors.neon.lime} />
                        <Text style={styles.sectionTitle}>Friend Activity</Text>
                    </View>

                    {feedLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={colors.neon.cyan} />
                        </View>
                    ) : feed.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="people-outline" size={48} color={colors.text.muted} />
                            </View>
                            <Text style={styles.emptyTitle}>No activity yet</Text>
                            <Text style={styles.emptySubtitle}>Follow friends to see their gaming activity here</Text>
                        </View>
                    ) : (
                        feed.map((event) => <ActivityEventCard key={event.id} event={event} />)
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ===== STYLES =====
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    scrollContent: {
        paddingBottom: spacing['2xl'],
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        marginBottom: spacing.base,
    },
    title: {
        fontSize: typography.size['3xl'],
        fontFamily: 'Inter_700Bold',
        color: colors.text.primary,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.neon.cyan,
        marginTop: spacing.xs,
    },

    // Sections
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xs,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontFamily: 'Inter_700Bold',
        color: colors.text.primary,
    },
    sectionSubtitle: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },

    // Trending
    trendingScroll: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    posterContainer: {
        width: CARD_WIDTH,
    },
    poster: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    coverWrapper: {
        height: 180,
        position: 'relative',
    },
    coverGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: radius.lg,
        backgroundColor: colors.neon.cyan,
        opacity: 0.08,
        transform: [{ scale: 1.05 }],
    },
    cover: {
        width: '100%',
        height: '100%',
        borderRadius: radius.lg,
    },
    coverPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.bg.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    posterInfo: {
        padding: spacing.md,
        gap: spacing.xs,
    },
    posterTitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
        lineHeight: 20,
    },
    posterMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    posterYear: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },
    posterRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    posterRatingValue: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_600SemiBold',
        color: colors.star,
    },
    genreChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    genreChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    genreChipText: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_500Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Shimmer
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.6,
    },

    // Recommendations
    recommendContainer: {
        paddingHorizontal: spacing.lg,
    },
    recommendCard: {
        flexDirection: 'row',
        backgroundColor: colors.bg.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    recommendCoverWrapper: {
        position: 'relative',
        margin: spacing.md,
    },
    recommendGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: radius.md,
        backgroundColor: colors.neon.purple,
        opacity: 0.1,
        transform: [{ scale: 1.08 }],
    },
    recommendCover: {
        width: 80,
        height: 110,
        borderRadius: radius.md,
    },
    recommendCoverPlaceholder: {
        width: 80,
        height: 110,
        borderRadius: radius.md,
        backgroundColor: colors.bg.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recommendInfo: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingRight: spacing.md,
        justifyContent: 'center',
        gap: spacing.xs,
    },
    recommendTitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
    },
    recommendMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    recommendYear: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },
    recommendRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    recommendRatingValue: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_600SemiBold',
        color: colors.star,
    },
    reasonContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    reasonText: {
        flex: 1,
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.neon.cyan,
        fontStyle: 'italic',
    },
    recommendChevron: {
        position: 'absolute',
        right: spacing.md,
        top: '50%',
        marginTop: -9,
    },

    // Activity
    eventCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: colors.bg.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    eventAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.bg.tertiary,
        overflow: 'hidden',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventContent: {
        flex: 1,
        gap: 4,
    },
    eventIconRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
    },
    eventLabel: {
        flex: 1,
        fontSize: typography.size.sm,
        fontFamily: 'Inter_400Regular',
        color: colors.text.primary,
        lineHeight: 18,
    },
    eventTime: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
    },
    eventCover: {
        width: 36,
        height: 50,
        borderRadius: radius.sm,
    },

    // Empty states
    loadingContainer: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        marginHorizontal: spacing.lg,
    },
    emptyIcon: {
        marginBottom: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.bg.card,
        borderRadius: radius.full,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
        textAlign: 'center',
    },
});
