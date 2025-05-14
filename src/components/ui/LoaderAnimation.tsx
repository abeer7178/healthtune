import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const HeartbeatAnimation = () => {
  const translateXValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const animationRef1 = useRef<LottieView>(null); // Ref for foreground Lottie
  const animationRef2 = useRef<LottieView>(null); // Ref for background Lottie

  useEffect(() => {
    // Play both Lottie animations on mount
    if (animationRef1.current) {
      animationRef1.current.play();
    }
    if (animationRef2.current) {
      animationRef2.current.play();
    }

    // Slow horizontal movement for foreground Lottie
    Animated.loop(
      Animated.timing(translateXValue, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing effect for foreground Lottie
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Cleanup on unmount
    return () => {
      translateXValue.stopAnimation();
      scaleValue.stopAnimation();
    };
  }, [translateXValue, scaleValue]);

  // Interpolate for horizontal movement
  const ecgTranslateX = translateXValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.5, width],
  });

  return (
    <View style={styles.container}>
      <LottieView
        ref={animationRef2}
        source={require('../../../assets/animation/heart.json')} // Replace with new Lottie file if needed
        style={styles.backgroundLottie}
        loop={true}
        autoPlay={false}
      />
      <View style={styles.ecgContainer}>
      
          <LottieView
            ref={animationRef1}
            source={require('../../../assets/animation/Animation - 1747250736853.json')}
            style={styles.foregroundLottie}
            loop={true}
            autoPlay={false}
          />
     
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  ecgContainer: {
    width: width,
    height: 450,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1, // Ensure foreground is above background
  },
  ecgWrapper: {
    width: width * 0.4,
  },
  foregroundLottie: {
    width: width * 0.4,
    height: 250,
  },
  backgroundLottie: {
    position: 'absolute',
    width: width,
    height: 200, // Cover full screen height
    opacity: 0.5, // Subtle background effect
  },
});

export default HeartbeatAnimation;