import { Stack } from 'expo-router';

export default function AuthStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
      <Stack.Screen name="verification" options={{ title: 'Verification' }} />
    </Stack>
  );
}