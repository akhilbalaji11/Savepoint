import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameCard } from '../../../src/components/game/GameCard';
import type { GameSearchResult } from '../../../src/domain/types';
import { gamesApi } from '../../../src/lib/api';
import { colors, radius, spacing, typography } from '../../../src/styles/tokens';

// Animated search bar with neon glow
function NeonSearchBar({
    value,
    onChange,
    onClear,
}: {
    value: string;
    onChange: (v: string) => void;
    onClear: () => void;
}) {
    const glowAnim = useRef(new Animated.Value(0)).current;
    const isFocused = useRef(false);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.6],
    });

    return (
        <View style={styles.searchBarContainer}>
            <Animated.View
                style={[
                    styles.searchBarGlow,
                    { opacity: value.length > 0 ? 0.6 : glowOpacity },
                ]}
            />
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={value.length > 0 ? colors.neon.cyan : colors.text.muted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search games..."
                    placeholderTextColor={colors.text.muted}
                    selectionColor={colors.neon.cyan}
                    value={value}
                    onChangeText={onChange}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => { isFocused.current = true; }}
                    onBlur={() => { isFocused.current = false; }}
                />
                {value.length > 0 && (
                    <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
                        <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// Popular search suggestions
function SearchSuggestions({ onSelect }: { onSelect: (q: string) => void }) {
    const suggestions = [
        { icon: 'flame', label: 'Trending', query: 'zelda' },
        { icon: 'star', label: 'Top Rated', query: 'elden ring' },
        { icon: 'rocket', label: 'New Releases', query: '2024' },
        { icon: 'game-controller', label: 'Indie', query: 'hollow knight' },
    ];

    return (
        <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Quick Searches</Text>
            <View style={styles.suggestionChips}>
                {suggestions.map((s) => (
                    <TouchableOpacity
                        key={s.query}
                        style={styles.suggestionChip}
                        onPress={() => onSelect(s.query)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={s.icon as any} size={14} color={colors.neon.cyan} />
                        <Text style={styles.suggestionLabel}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

// Empty state with animated icon
function EmptyState({ type }: { type: 'initial' | 'no-results' }) {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    if (type === 'initial') {
        return (
            <View style={styles.emptyContainer}>
                <Animated.View style={[styles.emptyIconContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={styles.emptyIconGlow} />
                    <Ionicons name="search" size={48} color={colors.neon.cyan} />
                </Animated.View>
                <Text style={styles.emptyTitle}>Find Any Game</Text>
                <Text style={styles.emptySubtitle}>
                    Search millions of games to log, rate, and review
                </Text>
                <View style={styles.emptyDecor}>
                    <View style={styles.decorLine} />
                    <Ionicons name="game-controller" size={16} color={colors.text.muted} />
                    <View style={styles.decorLine} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="sad-outline" size={48} color={colors.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Games Found</Text>
            <Text style={styles.emptySubtitle}>
                Try a different title or check your spelling
            </Text>
        </View>
    );
}

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce via effect
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 450);
        return () => clearTimeout(t);
    }, [query]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['game-search', debouncedQuery],
        queryFn: () => gamesApi.search(debouncedQuery),
        enabled: debouncedQuery.length >= 2,
        staleTime: 1000 * 60 * 5,
        placeholderData: (prev) => prev,
    });

    const results: GameSearchResult[] = data?.results ?? [];

    const handleClear = () => {
        setQuery('');
        setDebouncedQuery('');
    };

    const handleSuggestionSelect = (suggestion: string) => {
        setQuery(suggestion);
        setDebouncedQuery(suggestion);
    };

    const showLoading = isLoading || (isFetching && results.length === 0);
    const showResults = results.length > 0;
    const showNoResults = debouncedQuery.length >= 2 && !showLoading && !showResults;
    const showInitial = debouncedQuery.length < 2 && !showLoading;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Search</Text>
                <Text style={styles.subtitle}>Discover your next adventure</Text>
            </View>

            {/* Search bar */}
            <NeonSearchBar
                value={query}
                onChange={setQuery}
                onClear={handleClear}
            />

            {/* Content */}
            {showLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.neon.cyan} />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            ) : showResults ? (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.providerId}
                    renderItem={({ item }) => (
                        <GameCard
                            game={item}
                            onPress={() => router.push(`/game/${item.providerId}`)}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListHeaderComponent={
                        <Text style={styles.resultsCount}>
                            {results.length} result{results.length !== 1 ? 's' : ''}
                        </Text>
                    }
                />
            ) : showNoResults ? (
                <EmptyState type="no-results" />
            ) : showInitial ? (
                <View style={styles.initialContainer}>
                    <EmptyState type="initial" />
                    <SearchSuggestions onSelect={handleSuggestionSelect} />
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontFamily: 'Inter_700Bold',
        color: colors.text.primary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_400Regular',
        color: colors.neon.cyan,
        marginTop: 2,
    },

    // Search bar
    searchBarContainer: {
        marginHorizontal: spacing.lg,
        position: 'relative',
    },
    searchBarGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: radius.xl + 2,
        backgroundColor: colors.neon.cyan,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        backgroundColor: colors.bg.card,
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: colors.border,
        height: 52,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.primary,
        paddingVertical: 0,
    },
    clearBtn: {
        padding: spacing.xs,
    },

    // Loading
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_500Medium',
        color: colors.text.muted,
    },

    // Results
    list: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['3xl'],
    },
    separator: {
        height: spacing.sm,
    },
    resultsCount: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_500Medium',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
        marginTop: spacing.sm,
    },

    // Initial state
    initialContainer: {
        flex: 1,
    },

    // Empty state
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    emptyIconContainer: {
        marginBottom: spacing.lg,
        padding: spacing.xl,
        backgroundColor: colors.bg.card,
        borderRadius: radius.full,
        position: 'relative',
    },
    emptyIconGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: radius.full + 4,
        backgroundColor: colors.neon.cyan,
        opacity: 0.15,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
        textAlign: 'center',
        maxWidth: 280,
    },
    emptyDecor: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    decorLine: {
        width: 40,
        height: 1,
        backgroundColor: colors.border,
    },

    // Suggestions
    suggestionsContainer: {
        padding: spacing.lg,
    },
    suggestionsTitle: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    suggestionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.bg.card,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.base,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestionLabel: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_500Medium',
        color: colors.text.primary,
    },
});
