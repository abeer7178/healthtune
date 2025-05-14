import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import InputField from '../../src/components/ui/InputField';
import { useAuth } from '../../src/hooks/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message'; // Use react-native-toast-message
import FontAwesome from '@expo/vector-icons/FontAwesome';

const handleSignInPress = () => {
  router.push('/(auth)/login');
};

const SignupScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { handleSignup, handleGoogleSignup, loading } = useAuth();

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const onSignupPress = async () => {
    const result = await handleSignup(email, password);
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Signup Successful',
        text2: 'Please verify your email.',
      });
      router.push('/(auth)/verification');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: result.error,
      });
    }
  };

  const onGoogleSignupPress = async () => {
    const result = await handleGoogleSignup();
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Google Signup Successful',
        text2: 'Welcome to HealthTune!',
      });
      router.push('/(tabs)');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Google Signup Failed',
        text2: result.error,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.form}>
            <Text style={styles.title}>Sign Up</Text>
            <InputField
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.passwordContainer}>
              <InputField
                icon="lock-closed-outline"
                placeholder="Password"
                secureTextEntry={!isPasswordVisible}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                <Ionicons
                  name={isPasswordVisible ? 'eye' : 'eye-off'}
                  size={24}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, loading && { opacity: 0.7 }]}
              onPress={onSignupPress}
              disabled={loading}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? 'Signing Up...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onGoogleSignupPress}
              style={styles.googleIconButton}
              disabled={loading}
            >
              <FontAwesome name="google" size={24} color="Black" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignInPress}>
              <Text style={styles.link}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  signUpButton: {
    backgroundColor: '#2D796C',
    paddingVertical: 14,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordContainer: { position: 'relative' },
  eyeIcon: { position: 'absolute', right: 10, top: 22 },
  signUpButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  form: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: 20,
  },
  link: {
    color: 'Black',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  googleIconButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 0,
  },
  googleButtonText: {
    color: 'Black',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default SignupScreen;