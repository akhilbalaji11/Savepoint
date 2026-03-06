import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../../styles/tokens';

interface StarRatingProps {
    value: number;   // 0 to 5, increments of 0.5
    onChange?: (rating: number) => void;
    onCommit?: (rating: number) => void;
    size?: number;
    readonly?: boolean;
}

// Individual star with glow effect
function GlowStar({
    filled,
    halfFilled,
    size,
    glowIntensity,
}: {
    filled: boolean;
    halfFilled: boolean;
    size: number;
    glowIntensity: Animated.Value;
}) {
    const getIcon = (): 'star' | 'star-half-full' | 'star-o' => {
        if (filled) return 'star';
        if (halfFilled) return 'star-half-full';
        return 'star-o';
    };

    const isActive = filled || halfFilled;

    return (
        <Animated.View
            style={[
                styles.starContainer,
                isActive && {
                    shadowColor: colors.star,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: glowIntensity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.8],
                    }),
                    shadowRadius: glowIntensity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [4, 12],
                    }),
                },
            ]}
        >
            <FontAwesome
                name={getIcon()}
                size={size}
                color={isActive ? colors.star : colors.text.muted}
            />
        </Animated.View>
    );
}

export function StarRating({ value, onChange, onCommit, size = 30, readonly = false }: StarRatingProps) {
    const display = value;
    const touchSize = size + 8;
    const trackWidthRef = useRef(0);
    const startLocalXRef = useRef(0);
    const glowAnim = useRef(new Animated.Value(0.5)).current;
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const onCommitRef = useRef(onCommit);

    // Keep refs updated
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onCommitRef.current = onCommit;
    }, [onCommit]);

    // Pulsing glow animation - use useEffect, not useMemo
    useEffect(() => {
        if (readonly || !onChange) return;

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.5,
                    duration: 1500,
                    useNativeDriver: false,
                }),
            ])
        );
        animation.start();

        return () => animation.stop();
    }, [readonly, onChange]);

    const resolveRatingFromLocalX = (localX: number): number => {
        const width = trackWidthRef.current;
        if (width <= 0) return Math.max(0.5, Math.min(5, valueRef.current || 0.5));

        const clamped = Math.max(0, Math.min(width, localX));
        const slotWidth = width / 5;
        const starIndex = Math.min(5, Math.max(1, Math.floor(clamped / slotWidth) + 1));
        const inSlotX = clamped - (starIndex - 1) * slotWidth;

        // Left half = .5, right half = full star
        return inSlotX < slotWidth / 2 ? starIndex - 0.5 : starIndex;
    };

    // Create panResponder once with stable refs
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !readonly && !!onChangeRef.current,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: () => !readonly && !!onChangeRef.current,
            onMoveShouldSetPanResponderCapture: () => false,
            onPanResponderGrant: (event) => {
                if (readonly || !onChangeRef.current) return;
                startLocalXRef.current = event.nativeEvent.locationX;
                const next = resolveRatingFromLocalX(startLocalXRef.current);
                onChangeRef.current(next);
            },
            onPanResponderMove: (_event, gestureState) => {
                if (readonly || !onChangeRef.current) return;
                const localX = startLocalXRef.current + gestureState.dx;
                const next = resolveRatingFromLocalX(localX);
                onChangeRef.current(next);
            },
            onPanResponderRelease: (_event, gestureState) => {
                if (readonly || !onChangeRef.current) return;
                const localX = startLocalXRef.current + gestureState.dx;
                const next = resolveRatingFromLocalX(localX);
                onChangeRef.current(next);
                onCommitRef.current?.(next);
            },
            onPanResponderTerminationRequest: () => false,
            onPanResponderTerminate: (_event, gestureState) => {
                if (readonly || !onChangeRef.current) return;
                const localX = startLocalXRef.current + gestureState.dx;
                const next = resolveRatingFromLocalX(localX);
                onChangeRef.current(next);
                onCommitRef.current?.(next);
            },
            onShouldBlockNativeResponder: () => true,
        })
    ).current;

    if (readonly) {
        return (
            <View style={styles.row}>
                <View style={styles.track}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <View
                            key={star}
                            pointerEvents="none"
                            style={[styles.starWrapper, { height: touchSize }]}
                        >
                            <FontAwesome
                                name={display >= star ? 'star' : display >= star - 0.5 ? 'star-half-full' : 'star-o'}
                                size={size}
                                color={display >= star - 0.5 ? colors.star : colors.text.muted}
                            />
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.row}>
            <View
                style={styles.track}
                onLayout={(event) => {
                    trackWidthRef.current = event.nativeEvent.layout.width;
                }}
                {...panResponder.panHandlers}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <View
                        key={star}
                        pointerEvents="none"
                        style={[styles.starWrapper, { height: touchSize }]}
                    >
                        <GlowStar
                            filled={display >= star}
                            halfFilled={display >= star - 0.5 && display < star}
                            size={size}
                            glowIntensity={glowAnim}
                        />
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { width: '100%' },
    track: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    starWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 1,
        borderRadius: 9999,
    },
    starContainer: {
        // Container for glow effect
    },
});
