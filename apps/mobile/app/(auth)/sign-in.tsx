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
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

// Neon submit button
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
                    <Animated.View style={styles.loadingContainer}>
                        <Ionicons name="sync" size={18} color={colors.bg.primary} />
                        <Text style={styles.submitBtnText}>{loadingTitle}</Text>
                    </Animated.View>
                ) : (
                    <Text style={styles.submitBtnText}>{title}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function SignInScreen() {
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
        const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        });
        setIsLoading(false);
        if (error) {
            Alert.alert('Sign In Failed', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Back button */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={colors.neon.cyan} />
                    </TouchableOpacity>

                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="log-in" size={24} color={colors.neon.cyan} />
                            </View>
                            <Text style={styles.title}>Welcome Back</Text>
                            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
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
                                        placeholder="••••••••"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        error={errors.password?.message}
                                        secureTextEntry
                                    />
                                )}
                            />
                        </View>

                        {/* Submit */}
                        <NeonSubmitButton
                            title="Sign In"
                            loadingTitle="Signing in..."
                            onPress={handleSubmit(onSubmit)}
                            isLoading={isLoading}
                        />

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-up')}>
                                <Text style={styles.footerLink}>Create one</Text>
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
        backgroundColor: colors.neon.cyan + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.neon.cyan + '30',
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
    },
    form: {
        gap: spacing.base,
        marginBottom: spacing.xl,
    },
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
        backgroundColor: colors.neon.cyan,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },
    submitBtn: {
        backgroundColor: colors.neon.cyan,
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
        color: colors.bg.primary,
        letterSpacing: 0.3,
    },
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
        color: colors.neon.cyan,
    },
});
