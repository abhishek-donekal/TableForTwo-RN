import React from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { T42, Fonts } from '../../theme/theme';
import { SectionHeader, Card, GoldButton, MatchAvatar } from '../../components/SharedComponents';
import { useApp } from '../../context/AppContext';
import { PAID_TIERS, TIER_INFO, BACKGROUND_CHECK_FEE, type SubscriptionTier } from '../../models/types';
import type { MainStackParams } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<MainStackParams>;

export default function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { state, setSubscription, setConsent } = useApp();
  const user = state.currentUser;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Profile card */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <MatchAvatar name={user.firstName} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={[Fonts.displaySmall, { color: T42.textPrimary }]}>
              {user.firstName}, {user.age}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Ionicons name="briefcase-outline" size={13} color={T42.textSecondary} />
              <Text style={[Fonts.caption, { color: T42.textSecondary }]}>
                {user.profession} · {user.city || `Zip ${user.zipcode}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="diamond-outline" size={13} color={T42.gold} />
              <Text style={[Fonts.caption, { color: T42.gold, fontWeight: '600' }]}>
                {state.subscription} Member
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Past dates */}
      {state.pastBookings.length > 0 && (
        <>
          <SectionHeader title="Past Dates" />
          {state.pastBookings.map(booking => (
            <Card key={booking.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MatchAvatar name={booking.companion.firstName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[Fonts.headline, { color: T42.textPrimary }]}>
                    {booking.companion.firstName}
                  </Text>
                  <Text style={[Fonts.caption, { color: T42.textSecondary }]}>
                    {booking.experience.venueName} · {booking.scheduledFor.toLocaleDateString()}
                  </Text>
                  {booking.paymentSplit === 'full' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="heart" size={12} color={T42.success} />
                      <Text style={[Fonts.caption, { color: T42.success }]}>Date went well</Text>
                    </View>
                  )}
                </View>
                {booking.paymentSplit === 'full' && (
                  <TouchableOpacity style={s.inviteAgainBtn}
                    onPress={() => nav.navigate('ExperienceSelection' as any)} activeOpacity={0.7}>
                    <Ionicons name="refresh" size={14} color={T42.gold} />
                    <Text style={[Fonts.caption2, { color: T42.gold }]}>Invite Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Details */}
      <SectionHeader title="Your Details" />
      <Card>
        <DetailRow icon="briefcase-outline" label="Job type" value={user.jobType} />
        <DetailRow icon="cash-outline" label="Income" value={user.income} />
        <DetailRow icon="shirt-outline" label="Dress style" value={user.dressStyle} />
        <DetailRow icon="location-outline" label="Zipcode" value={user.zipcode} />
        <DetailRow icon="navigate-outline" label="Max travel" value={`${user.lookingFor.maxDistance} miles`} />
      </Card>

      {/* Background check */}
      <SectionHeader title="Background Check" />
      <Card style={user.backgroundCheck === 'clear' ? { borderColor: T42.success + '66' } : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="shield-checkmark" size={24}
            color={user.backgroundCheck === 'clear' ? T42.success : T42.textSecondary} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[Fonts.subheadline, { color: T42.textPrimary, fontWeight: '600' }]}>
                Status:
              </Text>
              {user.backgroundCheck === 'clear' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color={T42.success} />
                  <Text style={[Fonts.subheadline, { color: T42.success, fontWeight: '600' }]}>Verified</Text>
                </View>
              )}
              {user.backgroundCheck === 'pending' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="time-outline" size={16} color={T42.gold} />
                  <Text style={[Fonts.subheadline, { color: T42.gold, fontWeight: '600' }]}>Pending</Text>
                </View>
              )}
              {user.backgroundCheck === 'not_started' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="close-circle-outline" size={16} color={T42.danger} />
                  <Text style={[Fonts.subheadline, { color: T42.danger, fontWeight: '600' }]}>Not started</Text>
                </View>
              )}
            </View>
            <Text style={[Fonts.caption, { color: T42.textSecondary }]}>
              {user.backgroundCheck === 'clear'
                ? 'Your background check is verified. Matches can see you\'re trusted.'
                : Platform.OS === 'ios'
                  ? 'Background check verification is required before your first date.'
                  : `One-time $${BACKGROUND_CHECK_FEE} fee required before your first date.`}
            </Text>
          </View>
        </View>
      </Card>

      {/* Membership tiers — hidden on iOS (no IAP in free release; guideline 3.1.1) */}
      {Platform.OS !== 'ios' && (
        <>
          <SectionHeader title="Membership" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {PAID_TIERS.map(tier => (
                <TierCard key={tier} tier={tier} isCurrent={state.subscription === tier}
                  onChoose={() => setSubscription(tier)} />
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Privacy */}
      <SectionHeader title="Privacy & Data" />
      <Card>
        <View style={s.toggleRow}>
          <Ionicons name="analytics-outline" size={18} color={T42.textSecondary} />
          <Text style={[Fonts.body, { color: T42.textPrimary, flex: 1, marginLeft: 10 }]}>Share anonymized usage data</Text>
          <Switch value={state.consent.shareAnonymizedUsage}
            onValueChange={v => setConsent({ ...state.consent, shareAnonymizedUsage: v })}
            trackColor={{ true: T42.purple, false: T42.surfaceRaised }} thumbColor="#fff" />
        </View>
        <View style={[s.toggleRow, { marginTop: 14 }]}>
          <Ionicons name="sparkles-outline" size={18} color={T42.textSecondary} />
          <Text style={[Fonts.body, { color: T42.textPrimary, flex: 1, marginLeft: 10 }]}>Personalized recommendations</Text>
          <Switch value={state.consent.personalizedRecommendations}
            onValueChange={v => setConsent({ ...state.consent, personalizedRecommendations: v })}
            trackColor={{ true: T42.purple, false: T42.surfaceRaised }} thumbColor="#fff" />
        </View>
        <Text style={[Fonts.caption, { color: T42.textSecondary, marginTop: 12 }]}>
          Data is anonymized, consent-based, and only used to improve match quality. Withdraw any time.
        </Text>
      </Card>

      {/* Safety */}
      <SectionHeader title="Safety" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="person-circle-outline" size={24} color={T42.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={[Fonts.subheadline, { color: T42.textPrimary, fontWeight: '600' }]}>
              Trusted contact
            </Text>
            <Text style={[Fonts.caption, { color: T42.textSecondary }]}>
              {user.trustedContact?.name ?? 'Not set — add one to enable Live Date Mode sharing'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T42.textSecondary} />
        </View>
      </Card>
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <Ionicons name={icon} size={16} color={T42.textSecondary} style={{ marginRight: 10 }} />
      <Text style={[Fonts.subheadline, { color: T42.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[Fonts.subheadline, { color: T42.textPrimary, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

function TierCard({
  tier, isCurrent, onChoose,
}: {
  tier: SubscriptionTier; isCurrent: boolean; onChoose: () => void;
}) {
  const info = TIER_INFO[tier];
  const tierIcon = tier === 'Silver' ? 'medal-outline' as const
    : tier === 'Gold' ? 'trophy-outline' as const
    : 'diamond-outline' as const;
  const tierColor = tier === 'Silver' ? '#C0C0C0'
    : tier === 'Gold' ? T42.gold
    : '#B9F2FF';

  return (
    <View style={[s.tierCard, isCurrent && { borderColor: tierColor, borderWidth: 1.5 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={tierIcon} size={22} color={tierColor} />
        <Text style={[Fonts.displaySmall, { color: T42.textPrimary, fontSize: 20 }]}>{tier}</Text>
      </View>
      <Text style={[Fonts.headline, { color: tierColor, marginTop: 8 }]}>${info.price}/mo</Text>
      <View style={{ gap: 6, marginTop: 10, flex: 1 }}>
        {info.perks.map(p => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark" size={14} color={tierColor} />
            <Text style={[Fonts.caption, { color: T42.textSecondary }]}>{p}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <GoldButton label={isCurrent ? 'Current Plan' : `Choose ${tier}`}
          onPress={onChoose} disabled={isCurrent} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T42.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  inviteAgainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50,
    backgroundColor: T42.gold + '1A',
  },
  tierCard: {
    width: 230, padding: 16, borderRadius: 20,
    backgroundColor: T42.surface, borderWidth: 1, borderColor: T42.stroke,
  },
});
