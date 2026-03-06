import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameSearchResult, GameStatus } from '../../domain/types';
import { colors, radius, spacing, typography, STATUS_LABELS, PLATFORM_COLORS, GENRE_COLORS } from '../../styles/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GameCardProps {
    game: GameSearchResult;
    onPress?: () => void;
    status?: GameStatus | null;
    userRating?: number;
    compact?: boolean;
    showStatus?: boolean;
}

// Holographic shimmer effect component
function HolographicShimmer({ visible }: { visible: boolean }) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.loop(
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
            ).start();
        }
    }, [visible]);

    if (!visible) return null;

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 100],
    });

    return (
        <Animated.View
            style={[
                styles.shimmerOverlay,
                {
                    transform: [{ translateX }, { skewX: '-20deg' }],
                    opacity: shimmerAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.3, 0],
                    }),
                },
            ]}
            pointerEvents="none"
        >
            <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
            />
        </Animated.View>
    );
}

// Status indicator badge
function StatusBadge({ status }: { status: GameStatus }) {
    const statusColor = colors.status[status];

    return (
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[status]}</Text>
        </View>
    );
}

export function GameCard({ game, onPress, status, userRating, compact = false, showStatus = true }: GameCardProps) {
    const normalizedRating = game.rating ? (game.rating / 20).toFixed(1) : null;
    const scaleAnim = useRef(new Animated.Value(1)).current;

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

    if (compact) {
        return (
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.compactContainer}
            >
                <Animated.View style={[styles.compactCard, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.compactCoverContainer}>
                        {game.coverUrl ? (
                            <Image
                                source={{ uri: game.coverUrl }}
                                style={styles.compactCover}
                                contentFit="cover"
                                transition={150}
                            />
                        ) : (
                            <View style={styles.compactCoverPlaceholder}>
                                <Ionicons name="game-controller" size={16} color={colors.text.muted} />
                            </View>
                        )}
                        <HolographicShimmer visible={!!game.coverUrl} />
                    </View>
                    <View style={styles.compactInfo}>
                        <Text style={styles.compactTitle} numberOfLines={1}>{game.title}</Text>
                        {game.releaseDate && (
                            <Text style={styles.compactYear}>{new Date(game.releaseDate).getFullYear()}</Text>
                        )}
                    </View>
                </Animated.View>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.container}
        >
            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
                {/* Cover art with glow effect */}
                <View style={styles.coverWrapper}>
                    <View style={[styles.coverGlow, game.coverUrl && styles.coverGlowVisible]} />
                    <View style={styles.coverContainer}>
                        {game.coverUrl ? (
                            <Image
                                source={{ uri: game.coverUrl }}
                                style={styles.cover}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <View style={styles.coverPlaceholder}>
                                <Ionicons name="game-controller-outline" size={28} color={colors.text.muted} />
                            </View>
                        )}
                        <HolographicShimmer visible={!!game.coverUrl} />
                    </View>
                </View>

                {/* Info section */}
                <View style={styles.info}>
                    {/* Title and year */}
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>{game.title}</Text>
                        {game.releaseDate && (
                            <Text style={styles.year}>{new Date(game.releaseDate).getFullYear()}</Text>
                        )}
                    </View>

                    {/* Genre chips - max 2 */}
                    {game.genres.length > 0 && (
                        <View style={styles.chips}>
                            {game.genres.slice(0, 2).map((genre) => {
                                const genreStyle = GENRE_COLORS[genre] || GENRE_COLORS.default;
                                return (
                                    <View key={genre} style={[styles.genreChip, { backgroundColor: genreStyle.bg, borderColor: genreStyle.text + '30' }]}>
                                        <Text style={[styles.genreText, { color: genreStyle.text }]}>{genre}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Rating row */}
                    <View style={styles.ratingRow}>
                        {userRating !== undefined && userRating > 0 ? (
                            <View style={styles.userRating}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Ionicons
                                        key={star}
                                        name={star <= userRating ? 'star' : 'star-outline'}
                                        size={12}
                                        color={star <= userRating ? colors.star : colors.starEmpty}
                                    />
                                ))}
                                <Text style={styles.userRatingText}>Your rating</Text>
                            </View>
                        ) : normalizedRating ? (
                            <>
                                <Ionicons name="star" size={12} color={colors.star} />
                                <Text style={styles.ratingValue}>{normalizedRating}</Text>
                                <Text style={styles.ratingSource}>IGDB</Text>
                            </>
                        ) : null}
                    </View>

                    {/* Platform icons */}
                    {game.platforms.length > 0 && (
                        <View style={styles.platforms}>
                            {game.platforms.slice(0, 3).map((platform) => (
                                <View
                                    key={platform}
                                    style={[
                                        styles.platformDot,
                                        { backgroundColor: (PLATFORM_COLORS[platform] || colors.text.muted) + '30' },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.platformDotInner,
                                            { backgroundColor: PLATFORM_COLORS[platform] || colors.text.muted },
                                        ]}
                                    />
                                </View>
                            ))}
                            {game.platforms.length > 3 && (
                                <Text style={styles.platformMore}>+{game.platforms.length - 3}</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Status badge */}
                {showStatus && status && <StatusBadge status={status} />}

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={18} color={colors.text.muted} style={styles.chevron} />
            </Animated.View>
        </Pressable>
    );
}

// Large hero card for featured games
export function GameHeroCard({ game, onPress }: { game: GameSearchResult; onPress?: () => void }) {
    const normalizedRating = game.rating ? (game.rating / 20).toFixed(1) : null;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, friction: 8 }).start()}
            onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
            style={styles.heroContainer}
        >
            <Animated.View style={[styles.heroCard, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.heroCoverWrapper}>
                    <View style={styles.heroCoverGlow} />
                    {game.coverUrl ? (
                        <Image
                            source={{ uri: game.coverUrl }}
                            style={styles.heroCover}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View style={styles.heroCoverPlaceholder}>
                            <Ionicons name="game-controller" size={40} color={colors.text.muted} />
                        </View>
                    )}
                    <HolographicShimmer visible={!!game.coverUrl} />
                    <LinearGradient
                        colors={['transparent', 'rgba(6,6,10,0.8)']}
                        style={styles.heroGradient}
                    />
                </View>

                <View style={styles.heroInfo}>
                    <Text style={styles.heroTitle} numberOfLines={2}>{game.title}</Text>
                    {game.releaseDate && (
                        <Text style={styles.heroYear}>{new Date(game.releaseDate).getFullYear()}</Text>
                    )}
                    {normalizedRating && (
                        <View style={styles.heroRating}>
                            <Ionicons name="star" size={14} color={colors.star} />
                            <Text style={styles.heroRatingValue}>{normalizedRating}</Text>
                        </View>
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.sm,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.md,
    },

    // Cover styles with glow
    coverWrapper: {
        position: 'relative',
    },
    coverGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: radius.md + 4,
        backgroundColor: colors.neon.cyan,
        opacity: 0,
    },
    coverGlowVisible: {
        opacity: 0.15,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
    },
    coverContainer: {
        width: 60,
        height: 82,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.bg.tertiary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cover: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg.tertiary,
    },

    // Holographic shimmer
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    shimmerGradient: {
        width: 60,
        height: '100%',
    },

    // Info section
    info: {
        flex: 1,
        gap: spacing.xs,
    },
    titleRow: {
        gap: 2,
    },
    title: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
        lineHeight: 20,
    },
    year: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },

    // Genre chips
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    genreChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.full,
        borderWidth: 1,
    },
    genreText: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_500Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Rating row
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    ratingValue: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_600SemiBold',
        color: colors.star,
    },
    ratingSource: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
        marginLeft: 2,
    },
    userRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    userRatingText: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
        marginLeft: 4,
    },

    // Platforms
    platforms: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    platformDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        padding: 1,
    },
    platformDotInner: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    platformMore: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
        marginLeft: 2,
    },

    // Status badge
    statusBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.xl + spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
        borderWidth: 1,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    statusText: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    chevron: {
        marginLeft: 'auto',
    },

    // Compact variant
    compactContainer: {
        width: 100,
    },
    compactCard: {
        alignItems: 'center',
    },
    compactCoverContainer: {
        width: 80,
        height: 110,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.bg.tertiary,
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative',
    },
    compactCover: {
        width: '100%',
        height: '100%',
    },
    compactCoverPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactInfo: {
        marginTop: spacing.xs,
        alignItems: 'center',
    },
    compactTitle: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_500Medium',
        color: colors.text.primary,
        textAlign: 'center',
    },
    compactYear: {
        fontSize: typography.size['2xs'],
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },

    // Hero card
    heroContainer: {
        width: SCREEN_WIDTH * 0.4,
    },
    heroCard: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    heroCoverWrapper: {
        height: 180,
        position: 'relative',
    },
    heroCoverGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: radius.lg + 8,
        backgroundColor: colors.neon.purple,
        opacity: 0.1,
    },
    heroCover: {
        width: '100%',
        height: '100%',
    },
    heroCoverPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg.tertiary,
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    heroInfo: {
        padding: spacing.md,
        gap: 2,
    },
    heroTitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
    },
    heroYear: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },
    heroRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.xs,
    },
    heroRatingValue: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_600SemiBold',
        color: colors.star,
    },
});
