import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import InputField from '../../src/components/ui/InputField';
import { useAuth } from '../../src/hooks/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message'; // Use react-native-toast-message
import FontAwesome from '@expo/vector-icons/FontAwesome';

const handleSignUpPress = () => {
  router.push('/(auth)/signup');
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { handleLogin, handleGoogleLogin, loading } = useAuth();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const onLoginPress = async () => {
    const result = await handleLogin(email, password);
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: 'Welcome back!',
      });
      router.replace('/(tabs)');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: result.error,
      });
    }
  };

  const onGoogleLoginPress = async () => {
    const result = await handleGoogleLogin();
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Google Login Successful',
        text2: 'Welcome back!',
      });
      router.replace('/(tabs)');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Google Login Failed',
        text2: result.error,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <Image
            source={require('../../assets/images/healthtune.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
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
            style={[styles.signInButton, loading && { opacity: 0.7 }]}
            onPress={onLoginPress}
            disabled={loading}
          >
            <Text style={styles.signInButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onGoogleLoginPress}
            style={styles.googleIconButton}
            disabled={loading}
          >
            <FontAwesome name="google" size={24} color="Black" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignUpPress}>
            <Text style={styles.link}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  signInButton: {
    backgroundColor: '#2D796C',
    paddingVertical: 14,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerContainer: { alignItems: 'center', marginBottom: 10 },
  logo: { width: 200, height: 200, marginBottom: 16 },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
    overflow: 'hidden',
    transform: [{ translateY: 0 }],
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
  link: { color: 'Black', fontSize: 14, textAlign: 'center', marginTop: 16 },
  passwordContainer: { position: 'relative' },
  eyeIcon: { position: 'absolute', right: 10, top: 22 },
});

export default LoginScreen;