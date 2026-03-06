import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/styles/tokens';

// Custom tab bar icon with glow effect
function TabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
    return (
        <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
            <Ionicons name={name as any} size={22} color={color} />
            {focused && <View style={styles.glowDot} />}
        </View>
    );
}

export default function TabsLayout() {
    const { session, isInitialized } = useAuthStore();

    if (!isInitialized) return null;

    if (!session) {
        return <Redirect href="/(auth)" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.bg.primary,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 10,
                    elevation: 0,
                    shadowColor: colors.neon.cyan,
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                },
                tabBarActiveTintColor: colors.neon.cyan,
                tabBarInactiveTintColor: colors.text.muted,
                tabBarLabelStyle: {
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 10,
                    marginTop: 4,
                    letterSpacing: 0.3,
                },
            }}
        >
            <Tabs.Screen
                name="discover/index"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="compass" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search/index"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="search" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="diary/index"
                options={{
                    title: 'Diary',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="calendar" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="lists/index"
                options={{
                    title: 'Lists',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="list" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile/index"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="person" color={color} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 28,
        borderRadius: 14,
    },
    iconContainerActive: {
        backgroundColor: colors.neon.cyan + '10',
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    glowDot: {
        position: 'absolute',
        bottom: -4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neon.cyan,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
});
