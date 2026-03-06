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

import { GameCard } from '../../../src/components/game/GameCard';
import type { GameSearchResult, GameStatus, Profile, Review, GameList } from '../../../src/domain/types';
import { supabase } from '../../../src/lib/supabase';
import { withTimeout } from '../../../src/lib/withTimeout';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing, typography, STATUS_LABELS, PLATFORM_COLORS } from '../../../src/styles/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ProfileTabKey = 'played' | 'playing' | 'backlog' | 'wishlist' | 'reviews' | 'lists';

interface ProfileStatusItem {
    status: GameStatus;
    lastUpdated: string;
    game: GameSearchResult;
}

interface ProfileReviewItem {
    id: string;
    rating: number;
    reviewText?: string;
    spoiler: boolean;
    updatedAt: string;
    game: GameSearchResult;
}

interface ProfileListItem {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
    itemCount: number;
    updatedAt: string;
}

const TABS: Array<{ key: ProfileTabKey; label: string; icon: string }> = [
    { key: 'played', label: 'Played', icon: 'checkmark-circle' },
    { key: 'playing', label: 'Playing', icon: 'game-controller' },
    { key: 'backlog', label: 'Backlog', icon: 'time' },
    { key: 'wishlist', label: 'Wishlist', icon: 'heart' },
    { key: 'reviews', label: 'Reviews', icon: 'star' },
    { key: 'lists', label: 'Lists', icon: 'list' },
];

// Stat counter component
function StatCounter({ value, label }: { value: number; label: string }) {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[styles.statItem, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Animated.View>
    );
}

// Platform chip component
function PlatformChip({ platform }: { platform: string }) {
    const platformColor = PLATFORM_COLORS[platform] || colors.text.muted;
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[
            styles.platformChip,
            {
                borderColor: platformColor,
                transform: [{ scale: scaleAnim }],
            },
        ]}>
            <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
            <Text style={[styles.platformText, { color: platformColor }]}>{platform}</Text>
        </Animated.View>
    );
}

// Empty state component
function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name={icon as any} size={48} color={colors.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
        </View>
    );
}

export default function ProfileScreen() {
    const { profile, user, signOut } = useAuthStore();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ProfileTabKey>('played');
    const [refreshing, setRefreshing] = useState(false);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut },
        ]);
    };

    // Load user's statuses
    const {
        data: statuses = [],
        isLoading: statusesLoading,
    } = useQuery<ProfileStatusItem[]>({
        queryKey: ['profile-statuses', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await withTimeout(
                supabase
                    .from('user_game_status')
                    .select('status,last_updated,game:games(id,provider_game_id,title,cover_url,release_date,genres,platforms,rating)')
                    .eq('user_id', user.id)
                    .order('last_updated', { ascending: false }),
                8_000,
                'Load profile statuses'
            );
            if (error) throw error;
            return (data ?? []).filter((row: any) => !!row.game).map((row: any) => ({
                status: row.status as GameStatus,
                lastUpdated: row.last_updated,
                game: {
                    id: row.game.id,
                    providerId: row.game.provider_game_id ?? row.id,
                    provider: 'igdb' as const,
                    title: row.game.title,
                    coverUrl: row.game.cover_url ?? undefined,
                    releaseDate: row.game.release_date ?? undefined,
                    genres: row.game.genres ?? [],
                    platforms: row.game.platforms ?? [],
                    rating: row.game.rating ?? undefined,
                },
            }));
        },
        enabled: !!user,
    });

    // Load user's reviews
    const {
        data: reviews = [],
        isLoading: reviewsLoading,
    } = useQuery<ProfileReviewItem[]>({
        queryKey: ['profile-reviews', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await withTimeout(
                supabase
                    .from('reviews')
                    .select('id,rating,review_text,spoiler,updated_at,game:games(id,provider_game_id,title,cover_url,release_date,genres,platforms,rating)')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false }),
                8_000,
                'Load profile reviews'
            );
            if (error) throw error;
            return (data ?? []).filter((row: any) => !!row.game).map((row: any) => ({
                id: row.id,
                rating: Number(row.rating),
                reviewText: row.review_text ?? undefined,
                spoiler: row.spoiler ?? false,
                updatedAt: row.updated_at,
                game: {
                    id: row.game.id,
                    providerId: row.game.provider_game_id ?? row.id,
                    provider: 'igdb' as const,
                    title: row.game.title,
                    coverUrl: row.game.cover_url ?? undefined,
                    releaseDate: row.game.release_date ?? undefined,
                    genres: row.game.genres ?? [],
                    platforms: row.game.platforms ?? [],
                    rating: row.game.rating ?? undefined,
                },
            }));
        },
        enabled: !!user,
    });

    // Load user's lists
    const {
        data: lists = [],
        isLoading: listsLoading,
    } = useQuery<ProfileListItem[]>({
        queryKey: ['profile-lists', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await withTimeout(
                supabase
                    .from('lists')
                    .select('id,title,description,is_public,updated_at,item_count:list_items(count)')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false }),
                8_000,
                'Load profile lists'
            );
            if (error) throw error;
            return (data ?? []).map((row: any) => ({
                id: row.id,
                title: row.title,
                description: row.description ?? undefined,
                isPublic: row.is_public,
                updatedAt: row.updated_at,
                itemCount: Array.isArray(row.item_count) ? row.item_count[0]?.count ?? 0 : 0,
            }));
        },
        enabled: !!user,
    });

    const isLoading = statusesLoading || reviewsLoading || listsLoading;

    const playedCount = statuses.filter((s) => s.status === 'played').length;
    const reviewCount = reviews.length;
    const listCount = lists.length;

    const statusItems = statuses.filter((s) => s.status === activeTab);

    const onRefresh = async () => {
        setRefreshing(true);
        // Refetch would happen automatically
        setTimeout(() => setRefreshing(false), 1000);
    };

    const renderTabContent = () => {
        if (activeTab === 'reviews') {
            if (reviews.length === 0) {
                return (
                    <EmptyState
                        icon="star-outline"
                        title="No reviews yet"
                        subtitle="Rate a game and write your first review."
                    />
                );
            }
            return (
                <View style={styles.contentList}>
                    {reviews.map((review) => (
                        <TouchableOpacity
                            key={review.id}
                            style={styles.reviewCard}
                            activeOpacity={0.85}
                            onPress={() => router.push(`/game/${review.game.providerId}`)}
                        >
                            <View style={styles.reviewHeader}>
                                <Text style={styles.reviewGame}>{review.game.title}</Text>
                                <View style={styles.reviewMeta}>
                                    <Ionicons name="star" size={14} color={colors.star} />
                                    <Text style={styles.reviewRating}>{review.rating.toFixed(1)}</Text>
                                    {review.spoiler && (
                                        <View style={styles.spoilerBadge}>
                                            <Text style={styles.spoilerText}>Spoiler</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <Text style={styles.reviewText} numberOfLines={3}>
                                {review.reviewText?.trim() ? review.reviewText : 'No review text'}
                            </Text>
                            <Text style={styles.reviewDate}>
                                {new Date(review.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        if (activeTab === 'lists') {
            if (lists.length === 0) {
                return (
                    <EmptyState
                        icon="list-outline"
                        title="No lists yet"
                        subtitle="Create a list to organize your games."
                    />
                );
            }
            return (
                <View style={styles.contentList}>
                    {lists.map((list) => (
                        <TouchableOpacity key={list.id} style={styles.listCard}>
                            <View style={styles.listHeader}>
                                <Ionicons name="list" size={20} color={colors.neon.cyan} />
                                <Text style={styles.listTitle}>{list.title}</Text>
                            </View>
                            {list.description && (
                                <Text style={styles.listDesc} numberOfLines={2}>{list.description}</Text>
                            )}
                            <View style={styles.listMeta}>
                                <Text style={styles.listCount}>{list.itemCount} games</Text>
                                {!list.isPublic && (
                                    <View style={styles.privateBadge}>
                                        <Ionicons name="lock-closed" size={12} color={colors.text.muted} />
                                        <Text style={styles.privateText}>Private</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        if (statusItems.length === 0) {
            const statusLabel = TABS.find((t) => t.key === activeTab)?.label ?? 'games';
            return (
                <EmptyState
                    icon="game-controller-outline"
                    title={`No ${statusLabel.toLowerCase()} games yet`}
                    subtitle="Search for games and update your activity."
                />
            );
        }

        return (
            <View style={styles.contentList}>
                {statusItems.map((item, idx) => (
                    <GameCard
                        key={`${item.game.providerId}_${item.lastUpdated}_${idx}`}
                        game={item.game}
                        status={item.status}
                        showStatus={false}
                        onPress={() => router.push(`/game/${item.game.providerId}`)}
                    />
                ))}
            </View>
        );
    };

    const displayName = profile?.displayName ?? user?.email?.split('@')[0] ?? 'Gamer';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.neon.cyan}
                    />
                }
            >
                {/* ===== HEADER SECTION ===== */}
                <View style={styles.header}>
                    {/* Avatar with glow effect */}
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarGlow} />
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={32} color={colors.text.muted} />
                            </View>
                        )}
                    </View>

                    {/* Profile info */}
                    <View style={styles.headerInfo}>
                        <Text style={styles.displayName}>{displayName}</Text>
                        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                        {!profile && (
                            <TouchableOpacity onPress={() => router.push('/(auth)/profile-setup')}>
                                <Text style={styles.completeProfile}>Complete your profile →</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Settings button */}
                    <TouchableOpacity style={styles.settingsBtn} onPress={handleSignOut}>
                        <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                {/* ===== STATS SECTION ===== */}
                <View style={styles.statsContainer}>
                    <View style={styles.statsRow}>
                        <StatCounter value={playedCount} label="PLAYED" />
                        <View style={styles.statDivider} />
                        <StatCounter value={reviewCount} label="REVIEWS" />
                        <View style={styles.statDivider} />
                        <StatCounter value={listCount} label="LISTS" />
                    </View>
                </View>

                {/* ===== PLATFORM CHIPS ===== */}
                {profile?.favoritePlatforms && profile.favoritePlatforms.length > 0 && (
                    <View style={styles.platformsSection}>
                        <Text style={styles.platformsLabel}>FAVORITE PLATFORMS</Text>
                        <View style={styles.platformsRow}>
                            {profile.favoritePlatforms.map((platform) => (
                                <PlatformChip key={platform} platform={platform} />
                            ))}
                        </View>
                    </View>
                )}

                {/* ===== COLLECTION TABS ===== */}
                <View style={styles.tabsSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContainer}
                    >
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.key;
                            const tabColor = isActive ? colors.status[tab.key as GameStatus] || colors.neon.cyan : colors.text.secondary;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[styles.tab, isActive && styles.tabActive]}
                                    onPress={() => setActiveTab(tab.key)}
                                >
                                    <Ionicons
                                        name={tab.icon as any}
                                        size={18}
                                        color={tabColor}
                                    />
                                    <Text style={[styles.tabLabel, isActive && { color: tabColor }]}>
                                        {tab.label}
                                    </Text>
                                    {isActive && (
                                        <View style={[styles.tabIndicator, { backgroundColor: tabColor }]} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ===== CONTENT SECTION ===== */}
                <View style={styles.contentSection}>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={colors.neon.cyan} size="large" />
                        </View>
                    ) : (
                        renderTabContent()
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    scroll: {
        flexGrow: 1,
        paddingBottom: spacing['2xl'],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 40,
        backgroundColor: colors.neon.cyan,
        opacity: 0.2,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: colors.border,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.bg.tertiary,
        borderWidth: 3,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: spacing.lg,
    },
    displayName: {
        fontSize: typography.size['2xl'],
        fontFamily: 'Inter_700Bold',
        color: colors.text.primary,
        letterSpacing: -0.5,
    },
    bio: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    completeProfile: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_500Medium',
        color: colors.neon.cyan,
        marginTop: spacing.xs,
    },
    settingsBtn: {
        padding: spacing.md,
    },

    // Stats section
    statsContainer: {
        marginHorizontal: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.bg.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: spacing.md,
    },
    statItem: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    statValue: {
        fontSize: typography.size['3xl'],
        fontFamily: 'Inter_700Bold',
        color: colors.neon.cyan,
    },
    statLabel: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_500Medium',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },

    // Platforms section
    platformsSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    platformsLabel: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: spacing.sm,
    },
    platformsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    platformChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        borderWidth: 1.5,
        backgroundColor: colors.bg.card,
        gap: spacing.xs,
    },
    platformDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    platformText: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_500Medium',
    },

    // Tabs section
    tabsSection: {
        marginBottom: spacing.md,
    },
    tabsContainer: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        gap: spacing.xs,
        position: 'relative',
    },
    tabActive: {
        backgroundColor: colors.bg.card,
    },
    tabLabel: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_500Medium',
        color: colors.text.secondary,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: -2,
        left: 0,
        right: 0,
        height: 3,
        borderRadius: 1.5,
    },

    // Content section
    contentSection: {
        paddingHorizontal: spacing.lg,
    },
    contentList: {
        gap: spacing.md,
    },
    loadingContainer: {
        paddingVertical: spacing['2xl'],
        alignItems: 'center',
    },

    // Review card
    reviewCard: {
        backgroundColor: colors.bg.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.xs,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    reviewGame: {
        flex: 1,
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
    },
    reviewMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    reviewRating: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_600SemiBold',
        color: colors.star,
    },
    spoilerBadge: {
        backgroundColor: colors.bg.tertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    spoilerText: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_500Medium',
        color: colors.text.muted,
    },
    reviewText: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
        lineHeight: 20,
        marginTop: spacing.xs,
    },
    reviewDate: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
        marginTop: spacing.xs,
    },

    // List card
    listCard: {
        backgroundColor: colors.bg.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.xs,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    listTitle: {
        flex: 1,
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
    },
    listDesc: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    listMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing.xs,
    },
    listCount: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
    },
    privateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.bg.tertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    privateText: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        paddingHorizontal: spacing.lg,
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
