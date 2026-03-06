import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../../src/styles/tokens';

// Animated neon orb
function NeonOrb({ color, size, style }: { color: string; size: number; style: any }) {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.6,
                    duration: 3000,
                    useNativeDriver: false,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 3000,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    opacity: pulseAnim,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowRadius: size / 2,
                },
            ]}
        />
    );
}

// Feature row with icon
function FeatureRow({ icon, text }: { icon: string; text: string }) {
    const glowAnim = useRef(new Animated.Value(0)).current;

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

    return (
        <View style={styles.featureRow}>
            <Animated.View
                style={[
                    styles.featureIcon,
                    {
                        shadowColor: colors.neon.cyan,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: glowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.2, 0.5],
                        }),
                        shadowRadius: 8,
                    },
                ]}
            >
                <Ionicons name={icon as any} size={20} color={colors.neon.cyan} />
            </Animated.View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

// Neon button with glow
function NeonButton({
    title,
    onPress,
    primary = true,
}: {
    title: string;
    onPress: () => void;
    primary?: boolean;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (primary) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 0.8,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.5,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        }
    }, [primary]);

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

    if (primary) {
        return (
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                style={styles.primaryBtnContainer}
            >
                <Animated.View
                    style={[
                        styles.primaryBtnGlow,
                        { opacity: glowAnim },
                    ]}
                />
                <Animated.View style={[styles.primaryBtn, { transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                        colors={[colors.neon.cyan, colors.neon.purple]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryBtnGradient}
                    >
                        <Text style={styles.primaryBtnText}>{title}</Text>
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
        >
            <Animated.View style={[styles.secondaryBtnInner, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.secondaryBtnText}>{title}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function WelcomeScreen() {
    const router = useRouter();
    const logoAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(logoAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.container}>
            {/* Background gradient */}
            <LinearGradient
                colors={[colors.bg.primary, colors.bg.secondary, colors.bg.primary]}
                style={StyleSheet.absoluteFill}
            />

            {/* Decorative neon orbs */}
            <NeonOrb color={colors.neon.cyan} size={300} style={styles.orb1} />
            <NeonOrb color={colors.neon.purple} size={200} style={styles.orb2} />
            <NeonOrb color={colors.neon.pink} size={150} style={styles.orb3} />

            <SafeAreaView style={styles.inner}>
                {/* Logo */}
                <Animated.View
                    style={[
                        styles.logoSection,
                        {
                            transform: [
                                { scale: logoAnim },
                                { translateY: logoAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                })},
                            ],
                        },
                    ]}
                >
                    <View style={styles.logoIcon}>
                        <View style={styles.logoIconGlow} />
                        <Ionicons name="game-controller" size={40} color={colors.neon.cyan} />
                    </View>
                    <Text style={styles.logoText}>Backlogd</Text>
                    <Text style={styles.tagline}>Your games. Your story.</Text>
                </Animated.View>

                {/* Features */}
                <View style={styles.features}>
                    <FeatureRow icon="star" text="Rate & review every game you play" />
                    <FeatureRow icon="people" text="Follow friends and share discoveries" />
                    <FeatureRow icon="bulb" text="Get smart recommendations" />
                </View>

                {/* CTAs */}
                <View style={styles.ctas}>
                    <NeonButton
                        title="Create Account"
                        onPress={() => router.push('/(auth)/sign-up')}
                        primary
                    />
                    <NeonButton
                        title="Sign In"
                        onPress={() => router.push('/(auth)/sign-in')}
                    />
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.primary,
    },
    inner: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'space-between',
        paddingVertical: spacing.xl,
    },

    // Orbs
    orb1: {
        position: 'absolute',
        top: -100,
        right: -100,
    },
    orb2: {
        position: 'absolute',
        bottom: 200,
        left: -80,
    },
    orb3: {
        position: 'absolute',
        bottom: -50,
        right: 50,
    },

    // Logo
    logoSection: {
        alignItems: 'center',
        marginTop: spacing['2xl'],
    },
    logoIcon: {
        width: 88,
        height: 88,
        borderRadius: radius.xl,
        backgroundColor: colors.bg.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.neon.cyan + '40',
        marginBottom: spacing.lg,
        position: 'relative',
    },
    logoIconGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: radius.xl + 4,
        backgroundColor: colors.neon.cyan,
        opacity: 0.2,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
    },
    logoText: {
        fontSize: typography.size['4xl'],
        color: colors.text.primary,
        fontFamily: 'Inter_700Bold',
        letterSpacing: -1.5,
    },
    tagline: {
        fontSize: typography.size.base,
        color: colors.neon.cyan,
        fontFamily: 'Inter_400Regular',
        marginTop: spacing.xs,
        letterSpacing: 0.5,
    },

    // Features
    features: {
        gap: spacing.lg,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        backgroundColor: colors.bg.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.neon.cyan + '30',
    },
    featureText: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.secondary,
        fontFamily: 'Inter_400Regular',
    },

    // CTAs
    ctas: {
        gap: spacing.md,
        paddingBottom: spacing.base,
    },
    primaryBtnContainer: {
        position: 'relative',
        borderRadius: radius.lg,
    },
    primaryBtnGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: radius.lg + 2,
        backgroundColor: colors.neon.cyan,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
    },
    primaryBtn: {
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    primaryBtnGradient: {
        paddingVertical: spacing.base + 4,
        alignItems: 'center',
    },
    primaryBtnText: {
        fontSize: typography.size.md,
        color: colors.bg.primary,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 0.5,
    },
    secondaryBtn: {
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    secondaryBtnInner: {
        borderWidth: 1.5,
        borderColor: colors.neon.cyan + '60',
        paddingVertical: spacing.base + 4,
        alignItems: 'center',
        borderRadius: radius.lg,
    },
    secondaryBtnText: {
        fontSize: typography.size.md,
        color: colors.neon.cyan,
        fontFamily: 'Inter_600SemiBold',
    },
});
