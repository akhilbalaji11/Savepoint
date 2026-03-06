import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameCard } from '../../../src/components/game/GameCard';
import type { GameSearchResult } from '../../../src/domain/types';
import { AVAILABLE_GENRES } from '../../../src/domain/types';
import { gamesApi } from '../../../src/lib/api';
import { colors, radius, spacing, typography } from '../../../src/styles/tokens';

// Rating presets
const RATING_PRESETS = [
    { label: 'Any', value: null as number | null },
    { label: '60+', value: 60 },
    { label: '70+', value: 70 },
    { label: '80+', value: 80 },
    { label: '90+', value: 90 },
];

// Date range presets
const DATE_PRESETS = [
    { label: 'All Time', value: 'all' },
    { label: '2 Years', value: '2y' },
    { label: '1 Year', value: '1y' },
    { label: '6 Months', value: '6m' },
    { label: '30 Days', value: '30d' },
];

// Sort presets
const SORT_PRESETS = [
    { label: 'Rating', value: 'rating' as const },
    { label: 'Trending', value: 'hypes' as const },
    { label: 'Release Date', value: 'first_release_date' as const },
];

// Quick search presets
const QUICK_SEARCH_PRESETS = [
    { icon: 'flame' as const, label: 'Trending', sort: 'hypes' as const },
    { icon: 'star' as const, label: 'Top Rated', sort: 'rating' as const },
    { icon: 'rocket' as const, label: 'New Releases', sort: 'first_release_date' as const },
    { icon: 'game-controller' as const, label: 'Indie', genreId: 32 },
];

// Helper to convert date range to days
function dateRangeToDays(range: string): number | null {
    switch (range) {
        case '30d': return 30;
        case '6m': return 180;
        case '1y': return 365;
        case '2y': return 730;
        default: return null;
    }
}

// Animated search bar
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

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
            ])
        ).start();
    }, []);

    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

    return (
        <View style={styles.searchBarContainer}>
            <Animated.View style={[styles.searchBarGlow, { opacity: value.length > 0 ? 0.6 : glowOpacity }]} />
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

// Filter panel
function FilterPanel({
    rating,
    dateRange,
    genres,
    sort,
    onRatingChange,
    onDateRangeChange,
    onGenreToggle,
    onSortChange,
    onClear,
}: {
    rating: number | null;
    dateRange: string;
    genres: number[];
    sort: 'rating' | 'hypes' | 'first_release_date' | null;
    onRatingChange: (rating: number | null) => void;
    onDateRangeChange: (range: string) => void;
    onGenreToggle: (genreId: number) => void;
    onSortChange: (sort: 'rating' | 'hypes' | 'first_release_date' | null) => void;
    onClear: () => void;
}) {
    const hasFilters = rating !== null || dateRange !== 'all' || genres.length > 0;

    return (
        <View style={styles.filterPanel}>
            {/* Sort */}
            <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Sort By</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterChips}>
                        {SORT_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.value}
                                style={[styles.filterChip, sort === preset.value && styles.filterChipActive]}
                                onPress={() => onSortChange(preset.value)}
                            >
                                <Text style={[styles.filterChipText, sort === preset.value && styles.filterChipTextActive]}>
                                    {preset.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Rating */}
            <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Rating</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterChips}>
                        {RATING_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.label}
                                style={[styles.filterChip, rating === preset.value && styles.filterChipActive]}
                                onPress={() => onRatingChange(preset.value)}
                            >
                                <Text style={[styles.filterChipText, rating === preset.value && styles.filterChipTextActive]}>
                                    {preset.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Date Range */}
            <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Release Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterChips}>
                        {DATE_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.value}
                                style={[styles.filterChip, dateRange === preset.value && styles.filterChipActive]}
                                onPress={() => onDateRangeChange(preset.value)}
                            >
                                <Text style={[styles.filterChipText, dateRange === preset.value && styles.filterChipTextActive]}>
                                    {preset.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Genres */}
            <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                    <Text style={styles.filterLabel}>Genres</Text>
                    {hasFilters && (
                        <TouchableOpacity onPress={onClear}>
                            <Text style={styles.clearFiltersText}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterChips}>
                        {AVAILABLE_GENRES.map((genre) => (
                            <TouchableOpacity
                                key={genre.id}
                                style={[styles.filterChip, genres.includes(genre.id) && styles.filterChipActive]}
                                onPress={() => onGenreToggle(genre.id)}
                            >
                                <Text style={[styles.filterChipText, genres.includes(genre.id) && styles.filterChipTextActive]}>
                                    {genre.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

// Quick search suggestions
function SearchSuggestions({ onSelect }: { onSelect: (preset: typeof QUICK_SEARCH_PRESETS[0]) => void }) {
    return (
        <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Quick Searches</Text>
            <View style={styles.suggestionChips}>
                {QUICK_SEARCH_PRESETS.map((preset) => (
                    <TouchableOpacity
                        key={preset.label}
                        style={styles.suggestionChip}
                        onPress={() => onSelect(preset)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={preset.icon as any} size={14} color={colors.neon.cyan} />
                        <Text style={styles.suggestionLabel}>{preset.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

// Empty state
function EmptyState({ type }: { type: 'initial' | 'no-results' }) {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
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
                <Text style={styles.emptySubtitle}>Search millions of games to log, rate, and review</Text>
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
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search terms</Text>
        </View>
    );
}

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filter state
    const [rating, setRating] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState('all');
    const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
    const [sort, setSort] = useState<'rating' | 'hypes' | 'first_release_date' | null>(null);

    // Debounce
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 450);
        return () => clearTimeout(t);
    }, [query]);

    // Determine search mode
    const isTextSearch = debouncedQuery.length >= 2;
    const hasFilters = rating !== null || dateRange !== 'all' || selectedGenres.length > 0;
    const shouldBrowse = hasFilters || sort !== null; // Browse if filters OR explicit sort

    // Text search query
    const textSearchQuery = useQuery({
        queryKey: ['game-search', debouncedQuery],
        queryFn: () => gamesApi.search(debouncedQuery),
        enabled: isTextSearch,
        staleTime: 1000 * 60 * 5,
    });

    // Browse query (when filters are active or sort is set, without text search)
    const browseQuery = useQuery({
        queryKey: ['game-browse', { rating, dateRange, genres: selectedGenres, sort }],
        queryFn: () => {
            const daysAgo = dateRangeToDays(dateRange);
            const dateFrom = daysAgo
                ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                : undefined;

            return gamesApi.browse({
                minRating: rating ?? undefined,
                dateFrom,
                genres: selectedGenres.length > 0 ? selectedGenres : undefined,
                sort: sort ?? 'rating', // Default to rating if not set
                sortOrder: 'desc',
                limit: 30,
            });
        },
        enabled: !isTextSearch && shouldBrowse,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });

    // Get results
    const results: GameSearchResult[] = isTextSearch
        ? (textSearchQuery.data?.results ?? [])
        : shouldBrowse
            ? (browseQuery.data?.results ?? [])
            : [];

    const isLoading = (isTextSearch && textSearchQuery.isLoading) || (shouldBrowse && browseQuery.isLoading);

    const handleClear = () => {
        setQuery('');
        setDebouncedQuery('');
    };

    const handleClearFilters = () => {
        setRating(null);
        setDateRange('all');
        setSelectedGenres([]);
        setSort(null);
    };

    const handleQuickSearch = (preset: typeof QUICK_SEARCH_PRESETS[0]) => {
        handleClearFilters();
        if (preset.genreId) {
            setSelectedGenres([preset.genreId]);
        }
        if (preset.sort) {
            setSort(preset.sort);
        }
        // For "New Releases", also set date range
        if (preset.sort === 'first_release_date') {
            setDateRange('30d');
        }
    };

    const toggleGenre = (genreId: number) => {
        setSelectedGenres((prev) =>
            prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
        );
    };

    const showLoading = isLoading;
    const showResults = results.length > 0;
    const showNoResults = (isTextSearch || shouldBrowse) && !showLoading && !showResults;
    const showInitial = !isTextSearch && !shouldBrowse;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Search</Text>
                <Text style={styles.subtitle}>Discover your next adventure</Text>
            </View>

            {/* Search bar with filter toggle and clear button */}
            <View style={styles.searchRow}>
                <NeonSearchBar value={query} onChange={setQuery} onClear={handleClear} />
                <TouchableOpacity
                    style={[styles.filterToggle, shouldBrowse && styles.filterToggleActive]}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Ionicons
                        name={showFilters ? 'options' : 'options-outline'}
                        size={22}
                        color={shouldBrowse ? colors.bg.primary : colors.text.secondary}
                    />
                </TouchableOpacity>
                {shouldBrowse && (
                    <TouchableOpacity
                        style={styles.clearFiltersBtn}
                        onPress={handleClearFilters}
                    >
                        <Ionicons name="close-circle" size={22} color={colors.neon.pink} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Panel */}
            {showFilters && (
                <FilterPanel
                    rating={rating}
                    dateRange={dateRange}
                    genres={selectedGenres}
                    sort={sort}
                    onRatingChange={setRating}
                    onDateRangeChange={setDateRange}
                    onGenreToggle={toggleGenre}
                    onSortChange={setSort}
                    onClear={handleClearFilters}
                />
            )}

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
                        <GameCard game={item} onPress={() => router.push(`/game/${item.providerId}`)} />
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
                    <SearchSuggestions onSelect={handleQuickSearch} />
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg.primary },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
    title: { fontSize: typography.size['2xl'], fontFamily: 'Inter_700Bold', color: colors.text.primary, letterSpacing: -0.5 },
    subtitle: { fontSize: typography.size.sm, fontFamily: 'Inter_400Regular', color: colors.neon.cyan, marginTop: 2 },

    // Search
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm },
    searchBarContainer: { flex: 1, position: 'relative' },
    searchBarGlow: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: radius.xl + 2, backgroundColor: colors.neon.cyan, shadowColor: colors.neon.cyan, shadowOffset: { width: 0, height: 0 }, shadowRadius: 12 },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, backgroundColor: colors.bg.card, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.border, height: 52, gap: spacing.sm },
    searchInput: { flex: 1, fontSize: typography.size.base, fontFamily: 'Inter_400Regular', color: colors.text.primary, paddingVertical: 0 },
    clearBtn: { padding: spacing.xs },
    filterToggle: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.bg.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    filterToggleActive: { backgroundColor: colors.neon.cyan, borderColor: colors.neon.cyan },
    clearFiltersBtn: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.bg.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

    // Filters
    filterPanel: { backgroundColor: colors.bg.card, marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.base },
    filterSection: { marginBottom: spacing.base },
    filterSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    filterLabel: { fontSize: typography.size.sm, fontFamily: 'Inter_600SemiBold', color: colors.text.secondary, marginBottom: spacing.sm },
    clearFiltersText: { fontSize: typography.size.xs, fontFamily: 'Inter_500Medium', color: colors.neon.pink },
    filterChips: { flexDirection: 'row', gap: spacing.xs },
    filterChip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border },
    filterChipActive: { backgroundColor: colors.neon.cyan, borderColor: colors.neon.cyan },
    filterChipText: { fontSize: typography.size.xs, fontFamily: 'Inter_500Medium', color: colors.text.secondary },
    filterChipTextActive: { color: colors.bg.primary },

    // Loading
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    loadingText: { fontSize: typography.size.sm, fontFamily: 'Inter_500Medium', color: colors.text.muted },

    // Results
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
    separator: { height: spacing.sm },
    resultsCount: { fontSize: typography.size.xs, fontFamily: 'Inter_500Medium', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md, marginTop: spacing.sm },

    // Initial
    initialContainer: { flex: 1 },

    // Empty
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    emptyIconContainer: { marginBottom: spacing.lg, padding: spacing.xl, backgroundColor: colors.bg.card, borderRadius: radius.full, position: 'relative' },
    emptyIconGlow: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: radius.full + 4, backgroundColor: colors.neon.cyan, opacity: 0.15, shadowColor: colors.neon.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16 },
    emptyTitle: { fontSize: typography.size.xl, fontFamily: 'Inter_600SemiBold', color: colors.text.primary, marginBottom: spacing.sm },
    emptySubtitle: { fontSize: typography.size.base, fontFamily: 'Inter_400Regular', color: colors.text.secondary, textAlign: 'center', maxWidth: 280 },
    emptyDecor: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
    decorLine: { width: 40, height: 1, backgroundColor: colors.border },

    // Suggestions
    suggestionsContainer: { padding: spacing.lg },
    suggestionsTitle: { fontSize: typography.size.sm, fontFamily: 'Inter_600SemiBold', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
    suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.bg.card, paddingVertical: spacing.sm, paddingHorizontal: spacing.base, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
    suggestionLabel: { fontSize: typography.size.sm, fontFamily: 'Inter_500Medium', color: colors.text.primary },
});
