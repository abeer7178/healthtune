import React, { useRef, useState, useEffect } from "react";
import { Audio } from "expo-av";
import { Dimensions } from "react-native";
import { MotiView } from "moti";
import {
  View,
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  Easing,
  Modal,
  StyleSheet,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { sendSessionData } from "~/src/api/api";
import { useSessionStore } from "~/src/store/store";
import { toast } from "sonner-native";
import Dropdown from "~/src/components/ui/form";
import { createSession } from "~/src/api/api";
import { useNavigation } from "@react-navigation/native";
import { Button } from "~/src/components/ui/button";
import { MaterialIcons } from "@expo/vector-icons";
import { ActivityIndicator, Clipboard } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TranscriptionStatus {
  status: string;
  text: string;
  loading: boolean;
}

const FormScreen: React.FC = () => {
  const { user } = useSessionStore();
  const [patientFirstName, setPatientFirstName] = useState<string>("");
  const [patientLastName, setPatientLastName] = useState<string>("");
  const [isSessionCreated, setIsSessionCreated] = useState<boolean>(false);
  const [recordingEnabled, setRecordingEnabled] = useState<boolean>(false);
  const [sex, setSex] = useState<string>("Male");
  const [sessionType, setSessionType] = useState<string>("Telehealth");
  const [noteFormat, setNoteFormat] = useState<string>("Soap");
  const [language, setLanguage] = useState<string>("English");
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const pulseAnimation = useRef<Animated.Value>(new Animated.Value(1)).current;
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>({
    status: "pending",
    text: "",
    loading: false,
  });

  const navigation = useNavigation();

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async (): Promise<void> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow microphone access.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording", error);
    }
  };

  const stopRecording = async (): Promise<void> => {
    if (!recording) return;
    setIsRecording(false);
    setRecordingTime(0);

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordingUri(uri);
    setRecording(null);

    Alert.alert("Recording Saved", "Your audio recording has been saved.");

    if (uri) {
      await uploadToAssemblyAI(uri);
    }
  };

  const uploadToAssemblyAI = async (audioUri: string): Promise<void> => {
    try {
      if (!audioUri) {
        Alert.alert("Error", "Invalid audio file URI.");
        return;
      }

      console.log("Audio URI:", audioUri);

      const response = await fetch(audioUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      const audioBlob = await response.blob();

      console.log("Blob created:", audioBlob);

      console.log("Uploading to AssemblyAI...");
      const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
        method: "POST",
        headers: {
          authorization: "e610f8c7a07c46669ed449a0add0de2e",
          "Content-Type": "audio/m4a",
        },
        body: audioBlob,
      });

      const uploadData = await uploadResponse.json();
      console.log("Upload Response:", uploadData);

      if (uploadData.error) {
        Alert.alert("Upload Failed", uploadData.error);
        return;
      }

      let languageCode = "en";
      if (language === "Arabic") {
        languageCode = "ar";
      } else if (language === "Urdu") {
        languageCode = "ur";
      }

      console.log("Requesting Transcription...");
      const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          authorization: "e610f8c7a07c46669ed449a0add0de2e",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: uploadData.upload_url,
          language_code: languageCode,
          // Removed speech_model: "nano" to support multiple languages
        }),
      });

      const transcriptData = await transcriptResponse.json();
      console.log("Transcript Response:", transcriptData);

      if (transcriptData.error) {
        Alert.alert("Transcription Failed", transcriptData.error);
        return;
      }

      Alert.alert("Transcription Started", "Your transcription is being processed.");
      console.log("Transcription ID:", transcriptData.id);

      checkTranscriptionStatus(transcriptData.id);
    } catch (error) {
      console.error("Error uploading to AssemblyAI:", error);
      Alert.alert("Upload Failed", "An error occurred while uploading the audio.");
    }
  };

  const checkTranscriptionStatus = async (transcriptionId: string): Promise<void> => {
    setTranscriptionStatus((prev) => ({ ...prev, loading: true }));

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
          headers: { authorization: "e610f8c7a07c46669ed449a0add0de2e" },
        });
        const data = await response.json();

        setTranscriptionStatus((prev) => ({
          ...prev,
          status: data.status,
          text: data.text || prev.text,
        }));

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          setTranscriptionStatus((prev) => ({ ...prev, loading: false }));

          if (data.status === "completed") {
            Alert.alert("Transcription Completed", data.text);
            useSessionStore.getState().setTranscription(data.text);
            try {
              const response = await sendSessionData();
              console.log("Session data sent successfully:", response);
              // Reset states after successful session completion
              setRecordingEnabled(false);
              setIsSessionCreated(false);
              setRecordingUri(null);
              setTranscriptionStatus({ status: "pending", text: "", loading: false });
            } catch (error) {
              console.error("Error sending session data:", error);
              Alert.alert("Error", "Failed to send session data.");
            }
          }
        }
      } catch (error) {
        clearInterval(interval);
        setTranscriptionStatus((prev) => ({ ...prev, loading: false }));
        console.error("Error checking status:", error);
      }
    }, 5000);
  };

  const handleSubmit = async (): Promise<void> => {
    console.log("Submitting session");
    const requestData = { patientFirstName, patientLastName, sex, sessionType, noteFormat, language };
    console.log("Session Data:", requestData);

    try {
      const session = await createSession(requestData);
      console.log("Session Created Successfully:", session);

      setModalVisible(false);
      setRecordingEnabled(true);
      setIsSessionCreated(true);

      try {
        toast("Session created successfully!");
      } catch (toastError: any) {
        console.warn("Toast failed:", toastError.message);
        Alert.alert("Notification", "Session created, but toast failed: " + toastError.message);
      }
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      try {
        toast("Failed to create session: " + errorMessage);
      } catch (toastError: any) {
        console.warn("Toast failed:", toastError.message);
      }
      Alert.alert("Error", "Failed to create session: " + errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#2D796C", "#235F55"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {user?.firstName || user?.lastName
              ? `Dr ${user.firstName || ""} ${user.lastName || ""}`.trim()
              : "Create Session"}
          </Text>
        </View>
      </LinearGradient>
      <View style={styles.content}>
        <View style={styles.recordingInfo}>
          <Animated.View
            style={[
              styles.recordingIndicator,
              { transform: [{ scale: pulseAnimation }], backgroundColor: isRecording ? "#FF4444" : "#666" },
            ]}
          />
          <Text style={styles.recordingText}>{isRecording ? "Recording..." : "Press to Record"}</Text>
          <Text style={styles.timeText}>{formatTime(recordingTime)}</Text>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, { opacity: recordingEnabled ? 1 : 0.5 }]}
            onPress={recordingEnabled ? (isRecording ? stopRecording : startRecording) : () => {}}
            disabled={!recordingEnabled}
          >
            <MaterialIcons name={isRecording ? "stop" : "mic"} size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#F8FAFC" }}>
        {transcriptionStatus.loading && (
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 800 }}
            style={{
              width: "90%",
              backgroundColor: "rgba(45, 121, 108, 0.15)",
              padding: 20,
              borderRadius: 20,
              alignItems: "center",
              shadowColor: "#2D796C",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <ActivityIndicator size="large" color="#2D796C" />
            <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "600", color: "#2D796C" }}>
              Transcribing... ({transcriptionStatus.status})
            </Text>
          </MotiView>
        )}

        {transcriptionStatus.status === "completed" && transcriptionStatus.text && (
          <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 600 }}
            style={{
              width: "90%",
              borderRadius: 20,
              overflow: "hidden",
              marginTop: 20,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 15,
              elevation: 6,
            }}
          >
            <LinearGradient
              colors={["#E3F2F2", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, borderRadius: 20 }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#2D796C", marginBottom: 10 }}>
                Transcription:
              </Text>
              <ScrollView style={{ maxHeight: 150 }}>
                <Text style={{ fontSize: 16, color: "#333", lineHeight: 22 }}>
                  {transcriptionStatus.text}
                </Text>
              </ScrollView>

              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(transcriptionStatus.text);
                  Alert.alert("Copied!", "Transcription copied to clipboard.");
                }}
                style={{
                  marginTop: 15,
                  backgroundColor: "#2D796C",
                  paddingVertical: 12,
                  borderRadius: 15,
                  alignItems: "center",
                  shadowColor: "#2D796C",
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Copy to Clipboard</Text>
              </TouchableOpacity>
            </LinearGradient>
          </MotiView>
        )}
      </View>

      <TouchableOpacity style={styles.createSessionButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.createSessionButtonText}>Create Session</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Text style={styles.cardheader}>Patient Form</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Patient First Name</Text>
                <TextInput
                  style={styles.input}
                  value={patientFirstName}
                  onChangeText={setPatientFirstName}
                  placeholder="Enter patient first name"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Patient Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={patientLastName}
                  onChangeText={setPatientLastName}
                  placeholder="Enter patient last name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Sex</Text>
                <Dropdown label="Sex" options={["Male", "Female"]} selectedValue={sex} onValueChange={setSex} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Session Type</Text>
                <TextInput
                  style={styles.input}
                  value={sessionType}
                  onChangeText={setSessionType}
                  placeholder="Enter session type"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Note Format</Text>
                <TextInput
                  style={styles.input}
                  value={noteFormat}
                  onChangeText={setNoteFormat}
                  placeholder="Enter note format"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Language</Text>
                <Dropdown label="Language" options={["English", "Arabic"]} selectedValue={language} onValueChange={setLanguage} />
              </View>

              <Button style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Submit</Text>
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: "center",
  } as ViewStyle,
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
  } as ViewStyle,
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#666",
  } as ViewStyle,
  recordingText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  } as TextStyle,
  timeText: {
    fontSize: 16,
    color: "#2D796C",
    fontWeight: "600",
  } as TextStyle,
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 40,
  } as ViewStyle,
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2D796C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  } as ViewStyle,
  uploadButton: {
    marginTop: 20,
    backgroundColor: "#2D796C",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  } as ViewStyle,
  uploadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "white",
  } as ViewStyle,
  headerContent: {
    marginTop: 10,
  } as ViewStyle,
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
  } as TextStyle,
  createSessionButton: {
    backgroundColor: "#2D796C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 20,
  } as ViewStyle,
  createSessionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  } as TextStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  } as ViewStyle,
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  } as ViewStyle,
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: SCREEN_WIDTH * 0.9,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  } as ViewStyle,
  cardheader: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  } as TextStyle,
  cardheaderContent: {
    marginTop: 10,
    alignItems: "center",
  } as ViewStyle,
  formGroup: {
    marginBottom: 16,
  } as ViewStyle,
  label: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
  } as TextStyle,
  input: {
    height: 44,
    backgroundColor: "#f9f9f9",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
  } as TextStyle,
  submitButton: {
    backgroundColor: "#2D796C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  } as ViewStyle,
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  } as TextStyle,
});

export default FormScreen;