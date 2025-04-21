import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import InputField from '~/src/components/ui/InputField';

import { useAuth } from '~/src/hooks/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Import both eye and google icons


const handleSignUpPress = () => {
  router.push('/(auth)/signup'); // Navigate to the signup screen
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // State for password visibility
  const { handleLogin} = useAuth();

  // Fade-in animation for the card
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev); // Toggle visibility
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient 
        colors={['#2D796C', '#235F55']} 
        style={styles.gradient}
      >
        <View style={styles.headerContainer}>
          <Image 
            source={require('~/assets/images/healthtune.png')} 
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

          {/* Password input with eye icon */}
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
  style={styles.signInButton} 
  onPress={() => handleLogin(email, password)}
>
  <Text style={styles.signInButtonText}>Sign In</Text>
</TouchableOpacity>

          {/* Updated Google Button with Icon */}
          {/* <TouchableOpacity onPress={handleGoogleLogin} style={styles.googleIconButton}>
            <FontAwesome 
              name="google" 
              size={24} 
              color="Black" 
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity> */}

          <TouchableOpacity onPress={handleSignUpPress}>
            <Text style={styles.link}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  gradient: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
  },
  signInButton: {
    backgroundColor: '#2D796C',  // Green color (adjust as needed)
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
  headerContainer: { 
    alignItems: 'center', 
    marginBottom: 10, 
  },
  logo: { 
    width: 200, 
    height: 200, 
    marginBottom: 16, 
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 24,
    borderRadius: 16, // Slightly smaller for a more refined look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 20,  // Larger shadow radius for more soft, diffuse shadows
    elevation: 8, // Slightly higher elevation for more pronounced shadow
    borderWidth: 1, // Light border
    borderColor: '#e0e0e0', // Light gray border to give a subtle outline
    marginBottom: 20, // Space below the card
    //backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slight opacity for a softer effect
    overflow: 'hidden', // To prevent any content from overflowing outside the rounded corners
    transform: [{ translateY: 0 }], // Slight vertical lift to make the card appear "floating"
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
    marginLeft: 10, // Space between the icon and text
  },
  link: { 
    color: 'Black', 
    fontSize: 14, 
    textAlign: 'center', 
    marginTop: 16, 
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 22,
  },
});

export default LoginScreen;
