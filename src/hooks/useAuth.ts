import { useSignIn, useSignUp, useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSessionStore } from '../../src/store/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUser } from '../api/api';

export function useAuth() {
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const { isSignedIn, user } = useUser();
  const clerk = useClerk();
  const { signOut } = clerk;
  const { getToken } = useClerkAuth();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { fetchAllSessions } = useSessionStore();

  useEffect(() => {
    console.log('isSignedIn changed:', isSignedIn);
  }, [isSignedIn]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const refreshToken = async () => {
      try {
        if (isSignedIn && clerk.session) {
          const freshToken = await clerk.session.getToken({ template: 'Standard' });
          if (freshToken) {
            setToken(freshToken);
            await AsyncStorage.setItem('userToken', freshToken);
            console.log('Token refreshed:', freshToken);
          }
        }
      } catch (error) {
        console.error('Token refresh error:', error);
      }
    };

    if (isSignedIn) {
      refreshToken();
      interval = setInterval(refreshToken, 5 * 60 * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSignedIn, clerk.session]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      if (!signIn) throw new Error('SignIn instance is undefined');

      const result = await signIn.create({ identifier: email, password });
      if (!setActive) throw new Error('setActive function is undefined');

      await setActive({ session: result.createdSessionId });

      const userToken = await clerk.session?.getToken({ template: 'Standard' });
      if (!userToken) throw new Error('Token is undefined');

      const userName = user?.firstName || user?.fullName || '';
      await AsyncStorage.setItem('userToken', userToken);
      await AsyncStorage.setItem('userName', userName);

      setToken(userToken);
      console.log('Login successful, user token:', userToken);

      if (userToken) {
        await fetchUser();
        await fetchAllSessions(userToken);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login Error:', error?.message || error);
      return { success: false, error: error?.errors?.[0]?.message || error?.message || 'Invalid email or password' };
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string) => {
    try {
      setLoading(true);
      if (!signUp) throw new Error('SignUp instance is undefined');

      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification();
      return { success: true };
    } catch (error: any) {
      console.error('Signup Error:', error?.message || error);
      return { success: false, error: error?.errors?.[0]?.message || error?.message || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      if (!signIn) throw new Error('SignIn instance is undefined');

      const { createdSessionId } = await signIn.create({
        strategy: 'oauth_google',
        redirectUrl: 'https://HealthTune.com/auth/callback',
      });

      if (!setActive) throw new Error('setActive function is undefined');

      await setActive({ session: createdSessionId });
      const userToken = await clerk.session?.getToken({ template: 'Standard' });
      setToken(userToken ?? null);
      console.log('Google Login Token:', userToken);

      if (userToken) {
        await fetchUser();
        await fetchAllSessions(userToken);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Google Login Error:', error?.message || error);
      return { success: false, error: error?.errors?.[0]?.message || error?.message || 'Google login failed' };
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      if (!signUp) throw new Error('SignUp instance is undefined');

      const { createdSessionId } = await signUp.create({
        strategy: 'oauth_google',
        redirectUrl: 'https://HealthTune.com/auth/callback',
      });

      if (!setActive) throw new Error('setActive function is undefined');

      await setActive({ session: createdSessionId });
      const userToken = await clerk.session?.getToken({ template: 'Standard' });
      setToken(userToken ?? null);
      console.log('Google Signup Token:', userToken);

      return { success: true };
    } catch (error: any) {
      console.error('Google Signup Error:', error?.message || error);
      return { success: false, error: error?.errors?.[0]?.message || error?.message || 'Google signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut();
      setToken(null);
      await AsyncStorage.clear();
      await AsyncStorage.removeItem('userToken');
      console.log('Logged out successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Logout Error:', error?.message || error);
      return { success: false, error: error?.message || 'Logout failed' };
    } finally {
      setLoading(false);
    }
  };

  return { handleLogin, handleSignup, handleGoogleLogin, handleGoogleSignup, handleLogout, isSignedIn, token, loading };
}