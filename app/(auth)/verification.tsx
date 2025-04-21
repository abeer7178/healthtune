import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignUp } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { toast } from 'sonner-native';
import { Image } from 'expo-image';

const OtpVerificationScreen = () => {
  const { signUp, isLoaded } = useSignUp();
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [timer, setTimer] = useState(30);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    startTimer();
  }, []);

  const startTimer = () => {
    setIsResendDisabled(true);
    setTimer(30);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (text: any, index: any) => {
    if (!/^[0-9]*$/.test(text)) return;
    const updatedOtp = [...otp];
    updatedOtp[index] = text;
    setOtp(updatedOtp);
    if (text && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    const otpCode = otp.join('');
    if (otpCode.length === 6 && isLoaded ) {
      setIsLoading(true);
      try {
        await signUp.attemptEmailAddressVerification({ code: otpCode });
        //toast.success('Email Verified Successfully!');
        router.push('/(tabs)');
      } catch (error: any) {
        toast.error(error?.errors?.[0]?.message || error?.message || 'Invalid OTP');
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Please enter a valid 6-digit OTP');
    }
  };

  const handleResendOtp = async () => {
    if (signUp?.prepareEmailAddressVerification) {
      try {
        await signUp.prepareEmailAddressVerification();
        toast.success('OTP Resent to your email');
        startTimer();
      } catch (error) {
        toast.error((error as any)?.errors?.[0]?.message || (error as any)?.message || 'Failed to resend OTP');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.gradient}>
        <View style={styles.headerContainer}>
          <Image source={require('~/assets/images/otp.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>We have sent an OTP to your email</Text>
          
         

          <View style={styles.otpInputContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInputField}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                keyboardType="numeric"
                maxLength={1}
                autoFocus={index === 0}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.signInButton} onPress={handleOtpSubmit} disabled={isLoading}>
            <Text style={styles.signInButtonText}>{isLoading ? 'Verifying...' : 'Verify OTP'}</Text>
          </TouchableOpacity>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>Resend in {timer}s</Text>
            <Image 
  source={require('~/assets/images/clock.gif')} 
  style={styles.clock} 
/>
          </View>
         {/* Countdown Timer with GIF Clock */}


        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '700', color: 'Black', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 20, textAlign: 'center' },
  clock: { 
    width: 30, 
    height: 30, 
    marginRight: 8 
  },
  
  card: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 30,
    paddingHorizontal: 30,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  logo: { width: 200, height: 200, marginBottom: 16 },
  otpInputContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  otpInputField: {
    width: 40,
    height: 50,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  signInButton: {
    backgroundColor: '#2D796C',
    paddingVertical: 14,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: 'Black', fontSize: 14, textAlign: 'center', marginTop: 16 },
  disabledText: { color: '#888' },
  timerContainer: { alignItems: 'center', marginBottom: 10 , flexDirection: 'row', justifyContent: 'center', gap: 8 },
  timerText: { fontSize: 16, color: '#888' },
});

export default OtpVerificationScreen;
