import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../styles/tokens';

interface FormFieldProps extends TextInputProps {
    label: string;
    error?: string;
}

export function FormField({ label, error, secureTextEntry, ...props }: FormFieldProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <View
                style={[
                    styles.inputWrapper,
                    error ? styles.inputError : isFocused && styles.inputFocused,
                ]}
            >
                <TextInput
                    style={styles.input}
                    placeholderTextColor={colors.text.muted}
                    selectionColor={colors.neon.cyan}
                    secureTextEntry={secureTextEntry && !showPassword}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />
                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={() => setShowPassword((v) => !v)}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={18}
                            color={isFocused ? colors.neon.cyan : colors.text.muted}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={12} color={colors.neon.pink} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xs,
    },
    label: {
        fontSize: typography.size.sm,
        fontFamily: 'Inter_500Medium',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg.card,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: spacing.base,
    },
    inputFocused: {
        borderColor: colors.neon.cyan,
        shadowColor: colors.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    inputError: {
        borderColor: colors.neon.pink,
        shadowColor: colors.neon.pink,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    input: {
        flex: 1,
        fontSize: typography.size.base,
        fontFamily: 'Inter_400Regular',
        color: colors.text.primary,
        paddingVertical: spacing.md,
        minHeight: 52,
    },
    eyeBtn: {
        padding: spacing.xs,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: 2,
    },
    errorText: {
        fontSize: typography.size.xs,
        fontFamily: 'Inter_400Regular',
        color: colors.neon.pink,
    },
});
