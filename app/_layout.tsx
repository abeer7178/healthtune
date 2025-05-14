import '../global.css';
import { Theme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform, ActivityIndicator } from 'react-native';
import { NAV_THEME } from '../lib/constants';
import { useColorScheme } from '../lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { setAndroidNavigationBar } from '../lib/android-navigation-bar';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '../cache';
import Toast, { BaseToast, BaseToastProps } from 'react-native-toast-message'; // Add react-native-toast-message

export { ErrorBoundary } from 'expo-router';

// Toast configuration to match app theme
const toastConfig = {
  success: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#235F55', backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: 'bold', color: '#235F55' }}
      text2Style={{ fontSize: 13, color: '#333' }} // Changed to dark gray for visibility
    />
  ),
  error: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#ff3333', backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: 'bold', color: '#ff3333' }} // Changed to red for error
      text2Style={{ fontSize: 13, color: '#333' }} // Changed to dark gray for visibility
    />
  ),
};

export default function RootLayout() {
  const EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_YWN0aXZlLWxhZHlidWctMTAuY2xlcmsuYWNjb3VudHMuZGV2JA";

  if (!EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ClerkLoaded>
        <RootNavigation />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function RootNavigation() {
  const hasMounted = React.useRef(false);
  const router = useRouter();
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    console.log('Auth State - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
    if (isLoaded && isMounted) {
      if (isSignedIn) {
        console.log('Navigating to (tabs)');
        router.replace('/(tabs)');
      } else {
        console.log('Navigating to (auth)/login');
        router.replace('/(auth)/login');
      }
    }
  }, [isLoaded, isSignedIn, isMounted, router]);

  const useIsomorphicLayoutEffect =
    Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }
    if (Platform.OS === 'web') {
      document.documentElement.classList.add('bg-background');
    }
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  console.log('Rendering navigation - isSignedIn:', isSignedIn);

  return (
    <>
      <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        )}
      </Stack>
      <Toast
      config={toastConfig}
        visibilityTime={1500} // Reduced for faster dismissal
        autoHide={true}
        topOffset={50} // Faster animation
      />{/* Add Toast with custom config */}
      <PortalHost />
    </>
  );
}