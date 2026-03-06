import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import type { GameList } from '../../../src/domain/types';
import { supabase } from '../../../src/lib/supabase';
import { withTimeout } from '../../../src/lib/withTimeout';
import { useAuthStore } from '../../../src/stores/authStore';
import { colors, radius, spacing, typography } from '../../../src/styles/tokens';

// List card with glow effect
function ListCard({ list, onPress }: { list: GameList; onPress?: () => void }) {
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

    return (
        <TouchableOpacity
            style={styles.listCardContainer}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
        >
            <Animated.View style={[styles.listCard, { transform: [{ scale: scaleAnim }] }]}>
                {/* Gradient accent */}
                <View style={styles.listCardAccent} />

                {/* Content */}
                <View style={styles.listCardContent}>
                    <View style={styles.listCardHeader}>
                        <View style={styles.listIconContainer}>
                            <Ionicons name="list" size={20} color={colors.neon.cyan} />
                        </View>
                        <View style={styles.listCardInfo}>
                            <Text style={styles.listTitle} numberOfLines={1}>{list.title}</Text>
                            {list.description && (
                                <Text style={styles.listDesc} numberOfLines={1}>{list.description}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.listCardFooter}>
                        <View style={styles.listMeta}>
                            <Ionicons name="game-controller" size={12} color={colors.text.muted} />
                            <Text style={styles.listMetaText}>{list.itemCount ?? 0} games</Text>
                        </View>

                        {!list.isPublic && (
                            <View style={styles.privateBadge}>
                                <Ionicons name="lock-closed" size={10} color={colors.text.muted} />
                                <Text style={styles.privateText}>Private</Text>
                            </View>
                        )}

                        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function ListsScreen() {
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const { data: lists = [], isLoading } = useQuery<GameList[]>({
        queryKey: ['lists', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await withTimeout(
                supabase
                    .from('lists')
                    .select('*, item_count:list_items(count)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false }),
                8_000,
                'Load lists'
            );
            if (error) throw error;
            return (data ?? []).map((l) => ({
                id: l.id,
                userId: l.user_id,
                title: l.title,
                description: l.description,
                isPublic: l.is_public,
                createdAt: l.created_at,
                updatedAt: l.updated_at,
                itemCount: Array.isArray(l.item_count) ? l.item_count[0]?.count ?? 0 : 0,
            }));
        },
        enabled: !!user,
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!user || !newTitle.trim()) throw new Error('Title is required');
            const { error } = await withTimeout(
                supabase.from('lists').insert({
                    user_id: user.id,
                    title: newTitle.trim(),
                    description: newDesc.trim() || null,
                    is_public: isPublic,
                }),
                8_000,
                'Create list'
            );
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['lists', user?.id] });
            qc.invalidateQueries({ queryKey: ['profile-lists', user?.id] });
            setShowCreate(false);
            setNewTitle('');
            setNewDesc('');
        },
        onError: (e: Error) => Alert.alert('Error', e.message),
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Lists</Text>
                    <Text style={styles.subtitle}>Curate your collections</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
                    <Ionicons name="add" size={24} color={colors.bg.primary} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.neon.cyan} />
                </View>
            ) : lists.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="list-outline" size={48} color={colors.text.muted} />
                    </View>
                    <Text style={styles.emptyTitle}>No lists yet</Text>
                    <Text style={styles.emptySubtitle}>Create curated collections like "Best Indie Games" or "Co-op Favorites"</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreate(true)}>
                        <Ionicons name="add" size={18} color={colors.bg.primary} />
                        <Text style={styles.emptyButtonText}>Create a List</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={lists}
                    keyExtractor={(l) => l.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <ListCard list={item} />
                    )}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Create Modal */}
            <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
                <SafeAreaView style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowCreate(false)}>
                            <Text style={styles.cancelBtn}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>New List</Text>
                        <TouchableOpacity
                            onPress={() => createMutation.mutate()}
                            disabled={createMutation.isPending || !newTitle.trim()}
                        >
                            <Text style={[
                                styles.saveBtn,
                                (createMutation.isPending || !newTitle.trim()) && { opacity: 0.4 },
                            ]}>
                                {createMutation.isPending ? 'Creating…' : 'Create'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <Text style={styles.fieldLabel}>Title *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Best RPGs of 2024"
                            placeholderTextColor={colors.text.muted}
                            value={newTitle}
                            onChangeText={setNewTitle}
                            selectionColor={colors.neon.cyan}
                            autoFocus
                        />

                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What's this list about?"
                            placeholderTextColor={colors.text.muted}
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                            textAlignVertical="top"
                            selectionColor={colors.neon.cyan}
                        />

                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>Public list</Text>
                                <Text style={styles.toggleDescription}>Others can discover and follow this list</Text>
                            </View>
                            <Switch
                                value={isPublic}
                                onValueChange={setIsPublic}
                                trackColor={{ false: colors.border, true: colors.neon.cyan }}
                                thumbColor={colors.white}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
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
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.neon.cyan,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Empty state
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    emptyIcon: {
        marginBottom: spacing.lg,
        padding: spacing.xl,
        backgroundColor: colors.bg.card,
        borderRadius: radius.full,
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
        marginBottom: spacing.lg,
        maxWidth: 300,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.neon.cyan,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    },
    emptyButtonText: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.bg.primary,
    },

    // List content
    listContent: {
        padding: spacing.lg,
        paddingBottom: spacing['3xl'],
    },
    listCardContainer: {
        marginBottom: spacing.md,
    },
    listCard: {
        backgroundColor: colors.bg.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    listCardAccent: {
        height: 3,
        backgroundColor: colors.neon.cyan,
    },
    listCardContent: {
        padding: spacing.lg,
    },
    listCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    listIconContainer: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: colors.neon.cyan + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listCardInfo: {
        flex: 1,
        gap: 4,
    },
    listTitle: {
        fontSize: typography.size.lg,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
    },
    listDesc: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },
    listCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    listMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    listMetaText: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
    },
    privateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.bg.tertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
    },
    privateText: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_500Medium',
        color: colors.text.muted,
    },

    // Modal
    modal: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    cancelBtn: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },
    modalTitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.text.primary,
    },
    saveBtn: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.neon.cyan,
    },
    modalBody: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    fieldLabel: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_500Medium',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: colors.bg.card,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        padding: spacing.md,
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.primary,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bg.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    toggleLabel: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_500Medium',
        color: colors.text.primary,
    },
    toggleDescription: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.text.muted,
        marginTop: 2,
    },
});
