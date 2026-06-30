import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { T42, Fonts, Shadow } from '../theme/theme';
import type { PartnerProvider } from '../models/types';

// ── Spring press helper ────────────────────────────────────────────────────

function useSpringScale(toValue = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue, useNativeDriver: true, tension: 280, friction: 10 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,  useNativeDriver: true, tension: 280, friction: 10 }).start();
  return { scale, onIn, onOut };
}

// ── PressableScale ─────────────────────────────────────────────────────────

export function PressableScale({
  children, onPress, style, disabled, scale = 0.96,
}: {
  children: React.ReactNode; onPress: () => void;
  style?: any; disabled?: boolean; scale?: number;
}) {
  const { scale: scaleAnim, onIn, onOut } = useSpringScale(scale);
  return (
    <Pressable onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : onIn}
      onPressOut={disabled ? undefined : onOut}>
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ── Label (luxury small-caps with tracking) ───────────────────────────────

export function Label({ text, color }: { text: string; color?: string }) {
  return (
    <Text style={[Fonts.label, { color: color ?? T42.textSecondary, textTransform: 'uppercase' }]}>
      {text}
    </Text>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[Fonts.displaySmall, { color: T42.textPrimary }]}>{title}</Text>
      {subtitle && (
        <Text style={[Fonts.caption, { color: T42.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: any }) {
  return <View style={[dividerStyle, style]} />;
}
const dividerStyle = {
  height: 0.5,
  backgroundColor: T42.stroke,
  marginVertical: 12,
};

// ── Tag chip ───────────────────────────────────────────────────────────────

export function TagChip({
  label, selected, onPress,
}: {
  label: string; selected: boolean; onPress: () => void;
}) {
  const { scale, onIn, onOut } = useSpringScale(0.93);
  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {selected ? (
          <LinearGradient
            colors={[T42.gold, T42.goldDeep]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.chip}
          >
            <Ionicons name="checkmark" size={12} color={T42.onGold} style={{ marginRight: 5 }} />
            <Text style={[Fonts.subheadline, { color: T42.onGold, fontWeight: '600' }]}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.chip, { backgroundColor: T42.surfaceRaised, borderWidth: 0.5, borderColor: T42.strokeLight }]}>
            <Text style={[Fonts.subheadline, { color: T42.textPrimary }]}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Gold button — primary CTA ──────────────────────────────────────────────

export function GoldButton({
  label, onPress, disabled, loading, icon,
}: {
  label: string; onPress: () => void;
  disabled?: boolean; loading?: boolean; icon?: string;
}) {
  const isOff = disabled || loading;
  const { scale, onIn, onOut } = useSpringScale(0.97);
  return (
    <Pressable onPress={isOff ? undefined : onPress}
      onPressIn={isOff ? undefined : onIn}
      onPressOut={isOff ? undefined : onOut}>
      <Animated.View style={[{ transform: [{ scale }] }, isOff && { opacity: 0.4 }]}>
        <LinearGradient
          colors={[T42.goldLight, T42.gold, T42.goldDeep]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.primaryBtn}
        >
          {icon ? <Text style={{ marginRight: 6 }}>{icon}</Text> : null}
          <Text style={[Fonts.label, { color: T42.onGold, letterSpacing: 1.6 }]}>
            {loading ? 'PLEASE WAIT' : label.toUpperCase()}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ── Ghost button — secondary CTA ──────────────────────────────────────────

export function GhostButton({
  label, onPress, tint,
}: {
  label: string; onPress: () => void; tint?: string;
}) {
  const color = tint ?? T42.plum;
  const { scale, onIn, onOut } = useSpringScale(0.97);
  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={[styles.ghostBtn, { borderColor: color + '70' }, { transform: [{ scale }] }]}>
        <Text style={[Fonts.label, { color, letterSpacing: 1.4 }]}>
          {label.toUpperCase()}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Card — liquid glass ────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

// ── AnimatedCard — card with press-to-scale ───────────────────────────────

export function AnimatedCard({
  children, style, onPress,
}: {
  children: React.ReactNode; style?: any; onPress?: () => void;
}) {
  const { scale, onIn, onOut } = useSpringScale(0.97);
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={[styles.card, style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ── GoldCard — gold-tinted highlight card ─────────────────────────────────

export function GoldCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.card, { borderColor: T42.gold + '40', borderWidth: 0.5 }, style]}>
      <LinearGradient
        colors={[T42.goldMuted, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View>{children}</View>
    </View>
  );
}

// ── Countdown pill ─────────────────────────────────────────────────────────

export function CountdownPill({ label, urgent }: { label: string; urgent?: boolean }) {
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons name="timer-outline" size={13} color={urgent ? '#fff' : T42.onGold} />
      <Text style={[Fonts.label, { color: urgent ? '#fff' : T42.onGold, fontVariant: ['tabular-nums'] }]}>
        {label}
      </Text>
    </View>
  );
  if (urgent) {
    return <View style={[styles.pill, { backgroundColor: T42.danger }]}>{inner}</View>;
  }
  return (
    <LinearGradient colors={[T42.gold, T42.goldDeep]} style={styles.pill}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {inner}
    </LinearGradient>
  );
}

// ── Partner badge ──────────────────────────────────────────────────────────

export function PartnerBadge({ provider }: { provider: PartnerProvider }) {
  return (
    <View style={styles.partnerBadge}>
      <Ionicons name="link-outline" size={10} color={T42.plumLight} style={{ marginRight: 3 }} />
      <Text style={[Fonts.label, { color: T42.plumLight }]}>via {provider}</Text>
    </View>
  );
}

// ── Star rating ────────────────────────────────────────────────────────────

export function StarRating({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Ionicons
            name={n <= rating ? 'star' : 'star-outline'}
            size={28}
            color={n <= rating ? T42.gold : T42.strokeLight}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Match avatar ───────────────────────────────────────────────────────────

export function MatchAvatar({ name, size = 64 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatarWrapper, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
      <LinearGradient
        colors={[T42.plum, T42.plumDeep]}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={{ fontSize: size * 0.40, color: '#fff', fontFamily: 'serif', fontWeight: '400', letterSpacing: -0.5 }}>
          {name[0].toUpperCase()}
        </Text>
      </LinearGradient>
    </View>
  );
}

// ── Icon label ─────────────────────────────────────────────────────────────

export function IconLabel({ icon, label, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={16} color={color ?? T42.textSecondary} />
      <Text style={[Fonts.subheadline, { color: color ?? T42.textPrimary }]}>{label}</Text>
    </View>
  );
}

// ── Trust badge ────────────────────────────────────────────────────────────

export function TrustBadge({ label, icon }: {
  label: string; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.trustBadge}>
      <Ionicons name={icon ?? 'shield-checkmark-outline'} size={12} color={T42.success} />
      <Text style={[Fonts.label, { color: T42.success, marginLeft: 5 }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 52,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 0.5,
    minHeight: 52,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: T42.plumMuted,
    borderWidth: 0.5,
    borderColor: T42.plum + '40',
  },
  card: {
    padding: 20,
    borderRadius: T42.cardRadius,
    backgroundColor: T42.surface,
    borderWidth: 0.5,
    borderColor: T42.strokeLight,
    ...Shadow.card,
  },
  avatarWrapper: {
    borderWidth: 1,
    borderColor: T42.gold + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: T42.success + '12',
    borderWidth: 0.5,
    borderColor: T42.success + '40',
  },
});
