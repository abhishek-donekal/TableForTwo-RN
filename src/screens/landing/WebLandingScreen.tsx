/**
 * WebLandingScreen — Companion website entry point (web platform only).
 * Shows before onboarding. Premium private-members-club aesthetic.
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Animated, Pressable,
  StyleSheet, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { T42, Fonts, Shadow } from '../../theme/theme';
import { Label, TrustBadge } from '../../components/SharedComponents';

const { width } = Dimensions.get('window');
const IS_WIDE  = width >= 768;

interface Props {
  onBegin: () => void;
}

const PILLARS = [
  {
    icon: 'eye-off-outline'           as const,
    heading: 'No Swiping, Ever',
    body: 'Every introduction is personally curated by our AI concierge — based on your lifestyle, not your looks.',
  },
  {
    icon: 'card-outline'              as const,
    heading: 'Mutual Commitment',
    body: 'A $50 hold is placed on both parties before the venue is revealed. No ghosting. No wasted evenings.',
  },
  {
    icon: 'compass-outline'           as const,
    heading: 'Fully Arranged',
    body: 'Reservations, transport, floristry — we orchestrate every detail. You simply arrive.',
  },
  {
    icon: 'shield-checkmark-outline'  as const,
    heading: 'Background Verified',
    body: 'Every member passes an identity and background check before their first introduction.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'For the first time in years I felt seen, not sorted.',
    name: 'Margaret, 58',
    city: 'New York',
  },
  {
    quote: 'The commitment model is genius — both parties show up.',
    name: 'Richard, 64',
    city: 'London',
  },
  {
    quote: 'No games, no small talk over apps. Just a wonderful evening.',
    name: 'Diane, 71',
    city: 'Los Angeles',
  },
];

export default function WebLandingScreen({ onBegin }: Props) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const ctaScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const onIn  = () => Animated.spring(ctaScale, { toValue: 0.96, useNativeDriver: true, tension: 260, friction: 10 }).start();
  const onOut = () => Animated.spring(ctaScale, { toValue: 1,    useNativeDriver: true, tension: 260, friction: 10 }).start();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Header bar ── */}
      <Animated.View style={[s.header, { opacity: fadeAnim }]}>
        <Text style={[Fonts.displaySmall, { color: T42.textPrimary, letterSpacing: -0.3 }]}>
          Table <Text style={{ color: T42.gold }}>for Two</Text>
        </Text>
        <View style={s.memberBadge}>
          <Text style={[Fonts.label, { color: T42.gold, letterSpacing: 1.2 }]}>PRIVATE MEMBERS</Text>
        </View>
      </Animated.View>

      {/* ── Hero ── */}
      <Animated.View style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['transparent', T42.gold + '14', 'transparent']}
          style={s.heroBg}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />

        <Label text="Curated introductions for discerning adults" color={T42.gold} />

        <Text style={[Fonts.displayLarge, s.heroHeadline]}>
          Meet someone worth{'\n'}your time.
        </Text>

        <Text style={[Fonts.body, s.heroSub]}>
          Table for Two is an invitation-only matchmaking service for adults 21–100.
          No swiping. No open messaging. Just beautifully arranged evenings.
        </Text>

        {/* Trust row */}
        <View style={s.trustRow}>
          <TrustBadge label="Background Verified"  icon="finger-print-outline" />
          <TrustBadge label="Identity Confirmed"   icon="shield-checkmark-outline" />
          <TrustBadge label="LGBTQ+ Inclusive"     icon="heart-outline" />
        </View>

        {/* Primary CTA */}
        <Pressable onPress={onBegin} onPressIn={onIn} onPressOut={onOut} style={{ alignSelf: IS_WIDE ? 'flex-start' : 'stretch' }}>
          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <LinearGradient
              colors={[T42.goldLight, T42.gold, T42.goldDeep]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.heroCta}
            >
              <Text style={[Fonts.label, { color: T42.onGold, letterSpacing: 2 }]}>
                REQUEST MEMBERSHIP
              </Text>
              <Ionicons name="arrow-forward" size={16} color={T42.onGold} style={{ marginLeft: 12 }} />
            </LinearGradient>
          </Animated.View>
        </Pressable>

        <Text style={[Fonts.caption, { color: T42.textTertiary, marginTop: 12 }]}>
          Complimentary first introduction · No credit card to join
        </Text>
      </Animated.View>

      {/* ── Pillars ── */}
      <View style={s.pillarsSection}>
        <Label text="The Table for Two difference" color={T42.textSecondary} />
        <Text style={[Fonts.displaySmall, { color: T42.textPrimary, marginTop: 8, marginBottom: 24 }]}>
          Dating, redesigned for{'\n'}those who value their time.
        </Text>

        <View style={[s.pillarsGrid, IS_WIDE && s.pillarsGridWide]}>
          {PILLARS.map((p, i) => (
            <PillarCard key={i} icon={p.icon} heading={p.heading} body={p.body} index={i} />
          ))}
        </View>
      </View>

      {/* ── How it works ── */}
      <View style={s.howSection}>
        <Label text="The experience" color={T42.textSecondary} />
        <Text style={[Fonts.displaySmall, { color: T42.textPrimary, marginTop: 8, marginBottom: 24 }]}>
          From intention to arrival — we arrange it all.
        </Text>

        {[
          { n: '01', title: 'State your intention',     detail: 'Tell us your preferred evening, zip code, and what experience you seek.' },
          { n: '02', title: 'Receive your introduction', detail: 'Within 24 hours, our AI presents 2–3 curated member profiles matched to your lifestyle.' },
          { n: '03', title: 'Mutual commitment',         detail: 'Both parties place a $50 hold. This ensures both arrive — or the forfeiture is theirs.' },
          { n: '04', title: 'Your evening begins',       detail: 'Your table, your transport, even floristry — arranged. You simply arrive.' },
        ].map(step => (
          <View key={step.n} style={s.howStep}>
            <View style={s.howNum}>
              <Text style={[Fonts.label, { color: T42.gold, letterSpacing: 0.5 }]}>{step.n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Fonts.headline, { color: T42.textPrimary }]}>{step.title}</Text>
              <Text style={[Fonts.body, { color: T42.textSecondary, marginTop: 4, lineHeight: 21 }]}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Testimonials ── */}
      <View style={s.testimonialsSection}>
        <Label text="Member stories" color={T42.textSecondary} />
        <View style={[s.testimonialsGrid, IS_WIDE && s.testimonialsGridWide]}>
          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={s.testimonialCard}>
              <LinearGradient
                colors={[T42.gold + '10', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <Ionicons name="chatbubble-outline" size={18} color={T42.gold + '60'} />
              <Text style={[Fonts.body, { color: T42.textPrimary, marginTop: 10, fontStyle: 'italic', lineHeight: 22 }]}>
                "{t.quote}"
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                <View style={s.testimonialDot} />
                <Text style={[Fonts.caption, { color: T42.textSecondary }]}>
                  {t.name} · {t.city}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Final CTA ── */}
      <View style={s.finalCtaSection}>
        <Text style={[Fonts.displayMedium, { color: T42.textPrimary, textAlign: 'center' }]}>
          Ready for your first{'\n'}introduction?
        </Text>
        <Text style={[Fonts.body, { color: T42.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 22 }]}>
          Join a private community of adults who believe{'\n'}a great evening is worth committing to.
        </Text>

        <Pressable onPress={onBegin} onPressIn={onIn} onPressOut={onOut}>
          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <LinearGradient
              colors={[T42.goldLight, T42.gold, T42.goldDeep]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.finalCta}
            >
              <Text style={[Fonts.label, { color: T42.onGold, letterSpacing: 2 }]}>
                BEGIN YOUR MEMBERSHIP
              </Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>

        <Text style={[Fonts.caption, { color: T42.textTertiary, textAlign: 'center', marginTop: 8 }]}>
          By joining, you agree to our member code of conduct.
        </Text>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <Text style={[Fonts.label, { color: T42.textTertiary, letterSpacing: 1 }]}>
          © 2024 TABLE FOR TWO  ·  PRIVATE MEMBERS ONLY
        </Text>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
          {['Privacy', 'Terms', 'Safety', 'Contact'].map(link => (
            <Text key={link} style={[Fonts.caption, { color: T42.textTertiary }]}>{link}</Text>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

function PillarCard({ icon, heading, body, index }: {
  icon: keyof typeof Ionicons.glyphMap;
  heading: string; body: string; index: number;
}) {
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
      Animated.spring(slideIn, { toValue: 0, tension: 100, friction: 14, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.pillarCard, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
      <View style={s.pillarIcon}>
        <Ionicons name={icon} size={22} color={T42.gold} />
      </View>
      <Text style={[Fonts.headline, { color: T42.textPrimary, marginTop: 14 }]}>{heading}</Text>
      <Text style={[Fonts.body, { color: T42.textSecondary, marginTop: 6, lineHeight: 21 }]}>{body}</Text>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const MAX_W = 960;

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T42.background },
  content: { alignItems: 'stretch', paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: IS_WIDE ? 48 : 24,
    paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: T42.stroke,
  },
  memberBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4,
    backgroundColor: T42.goldMuted,
    borderWidth: 0.5, borderColor: T42.gold + '40',
  },

  hero: {
    paddingHorizontal: IS_WIDE ? 80 : 24,
    paddingTop: IS_WIDE ? 80 : 48,
    paddingBottom: IS_WIDE ? 80 : 48,
    maxWidth: MAX_W, alignSelf: 'center', width: '100%',
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFill,
  },
  heroHeadline: {
    color: T42.textPrimary,
    marginTop: 16,
    ...(IS_WIDE ? { fontSize: 52, letterSpacing: -1.2 } : {}),
  },
  heroSub: {
    color: T42.textSecondary,
    marginTop: 16, marginBottom: 24,
    lineHeight: 24,
    maxWidth: 520,
  },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17, paddingHorizontal: 32,
    borderRadius: 8,
  },

  pillarsSection: {
    paddingHorizontal: IS_WIDE ? 80 : 24,
    paddingVertical: 64,
    borderTopWidth: 0.5, borderTopColor: T42.stroke,
    maxWidth: MAX_W, alignSelf: 'center', width: '100%',
  },
  pillarsGrid:     { gap: 16 },
  pillarsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },

  pillarCard: {
    padding: 24, borderRadius: 16,
    backgroundColor: T42.surface,
    borderWidth: 0.5, borderColor: T42.strokeLight,
    flex: IS_WIDE ? undefined : 1,
    width: IS_WIDE ? '48%' : '100%',
    ...Shadow.card,
  },
  pillarIcon: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: T42.goldMuted,
    borderWidth: 0.5, borderColor: T42.gold + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  howSection: {
    paddingHorizontal: IS_WIDE ? 80 : 24,
    paddingVertical: 64,
    borderTopWidth: 0.5, borderTopColor: T42.stroke,
    maxWidth: MAX_W, alignSelf: 'center', width: '100%',
    gap: 0,
  },
  howStep: {
    flexDirection: 'row', gap: 20,
    paddingVertical: 20,
    borderBottomWidth: 0.5, borderBottomColor: T42.stroke,
  },
  howNum: {
    width: 40, paddingTop: 2,
  },

  testimonialsSection: {
    paddingHorizontal: IS_WIDE ? 80 : 24,
    paddingVertical: 64,
    borderTopWidth: 0.5, borderTopColor: T42.stroke,
    maxWidth: MAX_W, alignSelf: 'center', width: '100%',
    gap: 24,
  },
  testimonialsGrid:     { gap: 16 },
  testimonialsGridWide: { flexDirection: 'row' },

  testimonialCard: {
    flex: 1, padding: 24, borderRadius: 16,
    backgroundColor: T42.surface,
    borderWidth: 0.5, borderColor: T42.strokeLight,
    overflow: 'hidden',
  },
  testimonialDot: {
    width: 20, height: 1,
    backgroundColor: T42.gold + '80',
  },

  finalCtaSection: {
    alignItems: 'center',
    paddingHorizontal: IS_WIDE ? 80 : 24,
    paddingVertical: 80,
    borderTopWidth: 0.5, borderTopColor: T42.stroke,
    gap: 0,
  },
  finalCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17, paddingHorizontal: 48,
    borderRadius: 8, marginTop: 32,
  },

  footer: {
    alignItems: 'center', paddingVertical: 32,
    borderTopWidth: 0.5, borderTopColor: T42.stroke,
    gap: 4,
  },
});
