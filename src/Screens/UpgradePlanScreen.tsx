import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
  Linking,
} from "react-native";
import { useSessionStore } from "../../src/store/store";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { updatePlan, cancelSubscription, fetchUser } from "../../src/api/api";
import Toast from "react-native-toast-message";
import HeartbeatAnimation from "../components/ui/LoaderAnimation";

const UpgradePlanScreen: React.FC = () => {
  const { plans, fetchAllPlans, user, loading, error, setUser } = useSessionStore();
  const navigation = useNavigation();

  useEffect(() => {
    fetchAllPlans();
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to fetch plans: ${error}`,
      });
    }
  }, [fetchAllPlans, error]);

  const handleChoosePlan = async (plan: any) => {
    try {
      const response = await updatePlan(plan.id);
      const stripeUrl = response.data.url;
      if (stripeUrl) {
        await Linking.openURL(stripeUrl);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Redirecting to payment for ${plan.name}`,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No payment URL received from the server',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to update plan: ${error.message}`,
      });
    }
  };

  const handleCancelPlan = async () => {
    try {
      await cancelSubscription();
      const updatedUser = await fetchUser();
      setUser(updatedUser);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Your subscription has been cancelled',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to cancel subscription: ${error.message}`,
      });
    }
  };

  if (loading) {
    return (
        <View style={styles.loadingContainer}>
        <HeartbeatAnimation />
      </View>
    );
  }

  const currentPlanId = user?.userPlan?.plan?.id;
  const isSubscribed = currentPlanId && plans.some((plan: any) => plan.id === currentPlanId && plan.name !== "Free Plan");

  // Sort plans to place the current plan at the top
  const sortedPlans = [...plans].sort((a, b) => {
    if (a.id === currentPlanId) return -1; // Current plan comes first
    if (b.id === currentPlanId) return 1;
    return 0; // Maintain original order for other plans
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#2D796C", "#235F55"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Manage Your Plan</Text>
          <Text style={styles.headerSubtitle}>
            Choose or cancel your subscription plan.
          </Text>
        </View>
      </LinearGradient>

      {/* Vertical ScrollView for Plans */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.planContainer}
      >
        {sortedPlans.length === 0 ? (
          <Text style={styles.noDataText}>No plans available at the moment.</Text>
        ) : (
          sortedPlans.map((plan: any) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                currentPlanId === plan.id && styles.currentPlanCard, // Highlight current plan
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {currentPlanId === plan.id && (
                  <Text style={styles.currentPlanLabel}>Current Plan</Text>
                )}
              </View>
              <Text style={styles.planPrice}>${plan.price} /mo</Text>
              <Text style={styles.planDescription}>{plan.description}</Text>
              <Text style={styles.featuresTitle}>Features</Text>
              {plan.features.map((feature: any) => (
                <View key={feature.id} style={styles.featureItem}>
                  <MaterialIcons name="check" size={16} color="#2D796C" />
                  <Text style={styles.featureText}>{feature.feature.name}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[
                  styles.choosePlanButton,
                  currentPlanId === plan.id && styles.disabledButton, // Disable button for current plan
                ]}
                onPress={() => handleChoosePlan(plan)}
                disabled={currentPlanId === plan.id} // Disable if it's the current plan
              >
                <Text style={styles.choosePlanButtonText}>
                  {currentPlanId === plan.id ? "Selected" : "Choose Plan"}
                </Text>
              </TouchableOpacity>
              {currentPlanId === plan.id && isSubscribed && (
                <TouchableOpacity
                  style={styles.cancelPlanButton}
                  onPress={handleCancelPlan}
                >
                  <Text style={styles.cancelPlanButtonText}>Cancel Plan</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  } as ViewStyle,
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  } as ViewStyle,
  headerContent: {
    marginTop: 10,
  } as ViewStyle,
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
  } as TextStyle,
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
    marginBottom: 8,
  } as TextStyle,
  planContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    flexGrow: 1,
    alignItems: "center",
  } as ViewStyle,
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  currentPlanCard: {
    borderWidth: 2,
    borderColor: "#2D796C",
    backgroundColor: "#E6F0EA",
  } as ViewStyle,
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as ViewStyle,
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "left",
  } as TextStyle,
  currentPlanLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D796C",
    backgroundColor: "#D1E8E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  } as TextStyle,
  planPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D796C",
    marginBottom: 12,
    textAlign: "center",
  } as TextStyle,
  planDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 20,
  } as TextStyle,
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "left",
  } as TextStyle,
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  } as ViewStyle,
  featureText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  } as TextStyle,
  choosePlanButton: {
    backgroundColor: "#2D796C",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  } as ViewStyle,
  disabledButton: {
    backgroundColor: "#A3BFFA",
    opacity: 0.7,
  } as ViewStyle,
  choosePlanButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  cancelPlanButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  } as ViewStyle,
  cancelPlanButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  } as ViewStyle,
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  } as TextStyle,
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  } as ViewStyle,
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  } as TextStyle,
  noDataText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginVertical: 32,
    fontWeight: "500",
  } as TextStyle,
});

export default UpgradePlanScreen;