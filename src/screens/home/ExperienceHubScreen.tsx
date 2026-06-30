import React, { useRef } from 'react';
import { View, Text, ScrollView, Animated, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { T42, Fonts, Shadow } from '../../theme/theme';
import { Card, MatchAvatar, AnimatedCard, Label, TrustBadge } from '../../components/SharedComponents';
import { useApp } from '../../context/AppContext';
import { useScreenAnimation, useStaggerAnimation } from '../../hooks/useScreenAnimation';
import type { MainStackParams } from '../../navigation/RootNavigator';
import type { DateCommitment, DateBooking } from '../../models/types';

type Nav = NativeStackNavigationProp<MainStackParams>;

const HOW_STEPS = [
  { icon: 'location-outline' as const, title: 'State your intention', body: 'Your zip code, preferred evening, and what kind of experience you seek.' },
  { icon: 'sparkles'          as const, title: 'Curated introductions', body: 'Our AI selects 2–3 members who meet your criteria — height, lifestyle, and interests.' },
  { icon: 'card-outline'      as const, title: 'Mutual commitment', body: 'A $50 hold is placed on both cards. No ghosting. No wasted evenings.' },
  { icon: 'compass-outline'   as const, title: 'We arrange everything', body: 'Reservations, transport, flowers — handled. You simply arrive.' },
];

export default function ExperienceHubScreen() {
  const nav = useNavigation<Nav>();
  const { state } = useApp();
  const { animStyle } = useScreenAnimation();
  const stepAnims = useStaggerAnimation(HOW_STEPS.length, 80);
  const ctaScale = useRef(new Animated.Value(1)).current;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const hasCommitment = !!state.activeCommitment;
  const upcomingDate = state.upcomingBookings.find(b => b.status === 'confirmed');

  const onCtaIn  = () => Animated.spring(ctaScale, { toValue: 0.97, useNativeDriver: true, tension: 280, friction: 10 }).start();
  const onCtaOut = () => Animated.spring(ctaScale, { toValue: 1,    useNativeDriver: true, tension: 280, friction: 10 }).start();

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Greeting ── */}
      <Animated.View style={[animStyle, s.greetingBlock]}>
        <Label text="Private Members" color={T42.gold} />
        <Text style={[Fonts.displayMedium, { color: T42.textPrimary, marginTop: 8 }]}>
          {greeting},{'\n'}{state.currentUser.firstName}.
        </Text>
        <Text style={[Fonts.body, { color: T42.textSecondary, marginTop: 8, lineHeight: 22 }]}>
          {hasCommitment
            ? 'You have an active commitment this evening.'
            : 'No swiping. No messaging. Curated introductions only.'}
        </Text>
      </Animated.View>

      {/* ── Active commitment ── */}
      {state.activeCommitment && (
        <CommitmentWidget
          commitment={state.activeCommitment}
          onContinue={() => nav.navigate('Commitment', { commitment: state.activeCommitment! })}
        />
      )}

      {/* ── Upcoming confirmed date ── */}
      {upcomingDate && !hasCommitment && (
        <UpcomingDateCard booking={upcomingDate} />
      )}

      {/* ── Primary CTA ── */}
      <Pressable onPress={() => nav.navigate('DateIntent')} onPressIn={onCtaIn} onPressOut={onCtaOut}>
        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
          <LinearGradient
            colors={[T42.goldLight, T42.gold, T42.goldDeep]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.heroCta}
          >
            <View style={s.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={[Fonts.label, { color: T42.onGold + 'AA', letterSpacing: 1.6 }]}>
                  REQUEST AN INTRODUCTION
                </Text>
                <Text style={[Fonts.displaySmall, { color: T42.onGold, marginTop: 6 }]}>
                  Reserve an evening
                </Text>
                <Text style={[Fonts.caption, { color: T42.onGold + 'BB', marginTop: 4, lineHeight: 18 }]}>
                  Tell us when & where. We handle everything else.
                </Text>
              </View>
              <View style={s.heroArrow}>
                <Ionicons name="arrow-forward" size={18} color={T42.onGold} />
              </View>
            </View>

            <View style={s.heroPills}>
              {['No swiping', 'AI curated', '$50 hold'].map(p => (
                <View key={p} style={s.heroPill}>
                  <Text style={[Fonts.label, { color: T42.onGold + 'AA', letterSpacing: 1.2 }]}>{p.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* ── Membership trust signals ── */}
      <View style={s.trustRow}>
        <TrustBadge label="Verified Members" icon="shield-checkmark-outline" />
        <TrustBadge label="Background Checked" icon="finger-print-outline" />
        <TrustBadge label="Private & Secure" icon="lock-closed-outline" />
      </View>

      {/* ── How it works — staggered ── */}
      <View style={s.howBox}>
        <Label text="How it works" color={T42.textSecondary} />
        <View style={{ height: 14 }} />
        {HOW_STEPS.map((step, i) => (
          <Animated.View key={step.title} style={[s.howStep, stepAnims[i]]}>
            <View style={s.howNum}>
              <Text style={[Fonts.label, { color: T42.onGold, letterSpacing: 0.5 }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[Fonts.headline, { color: T42.textPrimary }]}>{step.title}</Text>
              <Text style={[Fonts.caption, { color: T42.textSecondary, lineHeight: 17 }]}>{step.body}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* ── Past introductions ── */}
      {state.pastBookings.length > 0 && (
        <View style={{ gap: 10 }}>
          <Label text="Past introductions" color={T42.textSecondary} />
          {state.pastBookings.slice(0, 3).map(b => (
            <AnimatedCard key={b.id} onPress={() => nav.navigate('Feedback', { booking: b })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <MatchAvatar name={b.companion.firstName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[Fonts.headline, { color: T42.textPrimary }]}>{b.companion.firstName}</Text>
                  <Text style={[Fonts.caption, { color: T42.textSecondary, marginTop: 2 }]}>
                    {b.experience.venueName} · {b.scheduledFor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                {b.paymentSplit === 'full' && (
                  <View style={s.wentWellChip}>
                    <Ionicons name="heart" size={10} color={T42.success} />
                    <Text style={[Fonts.label, { color: T42.success, marginLeft: 4 }]}>Well</Text>
                  </View>
                )}
              </View>
            </AnimatedCard>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

// ── CommitmentWidget ───────────────────────────────────────────────────────

function CommitmentWidget({ commitment, onContinue }: {
  commitment: DateCommitment; onContinue: () => void;
}) {
  const both = commitment.yourHold && commitment.theirHold;
  const hrs  = Math.max(0, Math.floor((commitment.expiresAt.getTime() - Date.now()) / 3_600_000));
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 280, friction: 10 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 280, friction: 10 }).start();

  return (
    <Pressable onPress={onContinue} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[s.commitCard, { borderColor: both ? T42.success + '50' : T42.gold + '40' }]}>
          <LinearGradient
            colors={both ? [T42.success + '18', 'transparent'] : [T42.gold + '12', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <View style={s.commitRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={both ? 'heart' : 'time-outline'} size={16}
                color={both ? T42.success : T42.gold} />
              <Text style={[Fonts.headline, { color: T42.textPrimary }]}>
                {both ? 'Commitment confirmed' : 'Awaiting confirmation'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={T42.textTertiary} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <MatchAvatar name={commitment.candidate.firstName} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={[Fonts.subheadline, { color: T42.textPrimary }]}>
                {commitment.candidate.firstName} · {commitment.intent.intentType}
              </Text>
              <Text style={[Fonts.caption, { color: T42.textSecondary, marginTop: 2 }]}>
                {commitment.proposedTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}{both ? 'Venue revealed' : `${hrs}h remaining`}
              </Text>
            </View>
            <View style={{ gap: 5, alignItems: 'flex-end' }}>
              <HoldDot placed={commitment.yourHold} label="You" />
              <HoldDot placed={commitment.theirHold} label={commitment.candidate.firstName} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function HoldDot({ placed, label }: { placed: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={[s.holdDot, placed && { backgroundColor: T42.success }]} />
      <Text style={[Fonts.caption2, { color: T42.textTertiary }]}>{label}</Text>
    </View>
  );
}

function UpcomingDateCard({ booking }: { booking: DateBooking }) {
  return (
    <Card style={{ borderColor: T42.gold + '50' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ionicons name="calendar" size={14} color={T42.gold} />
        <Label text="Upcoming evening" color={T42.gold} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <MatchAvatar name={booking.companion.firstName} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={[Fonts.headline, { color: T42.textPrimary }]}>{booking.companion.firstName}</Text>
          <Text style={[Fonts.caption, { color: T42.textSecondary, marginTop: 2 }]}>
            {booking.experience.venueName}
          </Text>
          <Text style={[Fonts.caption, { color: T42.gold, marginTop: 3 }]}>
            {booking.scheduledFor.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={s.confirmedBadge}>
          <Ionicons name="checkmark" size={11} color={T42.success} />
          <Text style={[Fonts.label, { color: T42.success, marginLeft: 4 }]}>Confirmed</Text>
        </View>
      </View>
    </Card>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T42.background },
  content: { padding: 24, paddingBottom: 56, gap: 24 },

  greetingBlock: { gap: 0 },

  heroCta:   { borderRadius: 16, padding: 22, gap: 16 },
  heroRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroArrow: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroPill:  {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  howBox: {
    backgroundColor: T42.surface,
    borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: T42.strokeLight,
    gap: 12,
  },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  howNum: {
    width: 24, height: 24, borderRadius: 4,
    backgroundColor: T42.gold,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },

  commitCard: {
    borderRadius: 16, padding: 18,
    backgroundColor: T42.surface,
    borderWidth: 0.5, overflow: 'hidden',
  },
  commitRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  holdDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: T42.strokeLight,
  },

  wentWellChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    backgroundColor: T42.success + '12',
    borderWidth: 0.5, borderColor: T42.success + '40',
  },
  confirmedBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    backgroundColor: T42.success + '12',
    borderWidth: 0.5, borderColor: T42.success + '40',
    alignSelf: 'flex-start',
  },
});
