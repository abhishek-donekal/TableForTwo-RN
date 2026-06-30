import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { T42 } from '../theme/theme';
import { useApp } from '../context/AppContext';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import ExperienceHubScreen from '../screens/home/ExperienceHubScreen';
import DateIntentScreen from '../screens/intent/DateIntentScreen';
import CuratedMatchScreen from '../screens/matches/CuratedMatchScreen';
import CommitmentScreen from '../screens/commitment/CommitmentScreen';
import ReviewConfirmScreen from '../screens/booking/ReviewConfirmScreen';
import LiveDateSafetyScreen from '../screens/safety/LiveDateSafetyScreen';
import FeedbackScreen from '../screens/feedback/FeedbackScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import WebLandingScreen from '../screens/landing/WebLandingScreen';

import type { CuratedMatchBatch, DateCommitment, DateBooking } from '../models/types';

export type MainStackParams = {
  HomeTabs: undefined;
  DateIntent: undefined;
  CuratedMatch: { batch: CuratedMatchBatch };
  Commitment: { commitment: DateCommitment };
  ReviewConfirm: { commitment: DateCommitment };
  LiveDateSafety: { booking: DateBooking };
  Feedback: { booking: DateBooking };
};

const Stack = createNativeStackNavigator<MainStackParams>();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home:     { active: 'home',             inactive: 'home-outline' },
  Discover: { active: 'heart',            inactive: 'heart-outline' },
  Bookings: { active: 'calendar',         inactive: 'calendar-outline' },
  Profile:  { active: 'person',           inactive: 'person-outline' },
};

function ActiveTabDot() {
  return (
    <View style={{
      position: 'absolute',
      bottom: -4,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: T42.gold,
    }} />
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: T42.background,
          borderBottomWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: T42.textPrimary,
        headerTitleStyle: {
          fontFamily: 'serif',
          fontWeight: '600' as const,
          fontSize: 18,
          color: T42.textPrimary,
        },
        tabBarStyle: {
          backgroundColor: T42.surface,
          borderTopColor: T42.stroke,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: T42.gold,
        tabBarInactiveTintColor: T42.textSecondary + 'AA',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />
              {focused && <ActiveTabDot />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={ExperienceHubScreen}
        options={{ headerTitle: 'Table for 2' }} />
      <Tab.Screen name="Discover" component={DateIntentScreen}
        options={{ headerTitle: 'Plan a Date' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen}
        options={{ headerTitle: 'My Dates' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ headerTitle: 'My Profile' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { state } = useApp();
  const [webLandingDone, setWebLandingDone] = useState(false);

  // On web, show marketing landing before onboarding
  if (Platform.OS === 'web' && !state.hasCompletedOnboarding && !webLandingDone) {
    return <WebLandingScreen onBegin={() => setWebLandingDone(true)} />;
  }

  if (!state.hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: T42.background,
        },
        headerTintColor: T42.gold,
        headerTitleStyle: {
          fontFamily: 'serif',
          fontWeight: '600' as const,
          color: T42.textPrimary,
          fontSize: 17,
        },
        contentStyle: { backgroundColor: T42.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="DateIntent" component={DateIntentScreen}
        options={{ title: 'Plan a Date' }} />
      <Stack.Screen name="CuratedMatch" component={CuratedMatchScreen}
        options={{ title: 'Your Matches' }} />
      <Stack.Screen name="Commitment" component={CommitmentScreen}
        options={({ route }) => ({ title: route.params.commitment.candidate.firstName })} />
      <Stack.Screen name="ReviewConfirm" component={ReviewConfirmScreen}
        options={{ title: 'Confirm Date' }} />
      <Stack.Screen name="LiveDateSafety" component={LiveDateSafetyScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen}
        options={{ title: 'Feedback', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
