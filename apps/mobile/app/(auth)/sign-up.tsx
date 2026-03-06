import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { FormField } from '../../src/components/ui/FormField';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing, typography } from '../../src/styles/tokens';

const schema = z.object({
    displayName: z.string().min(2, 'Name must be at least 2 characters').max(30),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

// Neon submit button with gradient
function NeonSubmitButton({
    title,
    loadingTitle,
    onPress,
    isLoading,
}: {
    title: string;
    loadingTitle: string;
    onPress: () => void;
    isLoading: boolean;
}) {
    const glowAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        if (!isLoading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 0.7,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.4,
                        duration: 1500,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        }
    }, [isLoading]);

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isLoading}
            activeOpacity={0.9}
            style={styles.submitBtnContainer}
        >
            <Animated.View
                style={[
                    styles.submitBtnGlow,
                    { opacity: isLoading ? 0.3 : glowAnim },
                ]}
            />
            <View style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <Ionicons name="sync" size={18} color={colors.bg.primary} />
                        <Text style={styles.submitBtnText}>{loadingTitle}</Text>
                    </View>
                ) : (
                    <Text style={styles.submitBtnText}>{title}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

// Step indicator
function StepIndicator({ current }: { current: number }) {
    return (
        <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((step) => (
                <View
                    key={step}
                    style={[
                        styles.stepDot,
                        step <= current && styles.stepDotActive,
                    ]}
                >
                    {step < current && (
                        <Ionicons name="checkmark" size={10} color={colors.bg.primary} />
                    )}
                </View>
            ))}
        </View>
    );
}

export default function SignUpScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        const { error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: { display_name: data.displayName },
            },
        });
        setIsLoading(false);
        if (error) {
            Alert.alert('Sign Up Failed', error.message);
            return;
        }
        router.replace('/(auth)/profile-setup');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Back button */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={colors.neon.cyan} />
                    </TouchableOpacity>

                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="person-add" size={24} color={colors.neon.purple} />
                            </View>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Start your gaming journey today</Text>
                            <StepIndicator current={1} />
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            <Controller
                                control={control}
                                name="displayName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FormField
                                        label="Display Name"
                                        placeholder="GamerTag99"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.displayName?.message}
                                        autoCapitalize="words"
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FormField
                                        label="Email"
                                        placeholder="you@example.com"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.email?.message}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FormField
                                        label="Password"
                                        placeholder="Min 8 characters"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.password?.message}
                                        secureTextEntry
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="confirmPassword"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FormField
                                        label="Confirm Password"
                                        placeholder="••••••••"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.confirmPassword?.message}
                                        secureTextEntry
                                    />
                                )}
                            />
                        </View>

                        {/* Submit */}
                        <NeonSubmitButton
                            title="Create Account"
                            loadingTitle="Creating account..."
                            onPress={handleSubmit(onSubmit)}
                            isLoading={isLoading}
                        />

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
                                <Text style={styles.footerLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    header: {
        marginBottom: spacing.xl,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: radius.lg,
        backgroundColor: colors.neon.purple + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.neon.purple + '30',
    },
    title: {
        fontSize: typography.size['2xl'],
        fontFamily: 'Inter_700Bold',
        color: colors.text.primary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },

    // Step indicator
    stepIndicator: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.bg.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepDotActive: {
        backgroundColor: colors.neon.purple,
        borderColor: colors.neon.purple,
        shadowColor: colors.neon.purple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },

    // Form
    form: {
        gap: spacing.base,
        marginBottom: spacing.xl,
    },

    // Submit button
    submitBtnContainer: {
        position: 'relative',
        borderRadius: radius.lg,
    },
    submitBtnGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: radius.lg + 2,
        backgroundColor: colors.neon.purple,
        shadowColor: colors.neon.purple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },
    submitBtn: {
        backgroundColor: colors.neon.purple,
        borderRadius: radius.lg,
        paddingVertical: spacing.base + 4,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    submitBtnText: {
        fontSize: typography.size.md,
        fontFamily: 'Inter_700Bold',
        color: colors.white,
        letterSpacing: 0.3,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
        paddingVertical: spacing.md,
    },
    footerText: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.secondary,
    },
    footerLink: {
        fontSize: typography.size.base,
        fontFamily: 'Inter_600SemiBold',
        color: colors.neon.purple,
    },
});
