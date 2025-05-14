import React, { useRef, useState, useEffect } from "react";
import { Audio } from "expo-av";
import {
  Dimensions,
  Animated,
  StyleSheet,
  Alert,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Easing,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { sendSessionData, createSession, fetchUser, fetchPatients, fetchUserStats, fetchStatsGraph } from "../../src/api/api";
import { useSessionStore } from "../../src/store/store";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

export enum PlanFeatureNameEnum {
  SESSION_CREATION = 'Session Creation',
  DOCTOR_ONBOARDING = 'Doctor Onboarding',
  TEMPLATE_CUSTOMIZATION = 'Template Customization',
  DOCUMENT_GENERATION = 'Document Generation',
  MACRO_REPLACEMENT = 'Macros & Replace',
  SESSION_ARTIFACT_CREATION = "SESSION_ARTIFACT_CREATION",
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TranscriptionStatus {
  status: string;
  text: string;
  loading: boolean;
}

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  mreNumber: string;
  gender?: string;
  age?: number;
  lastVisit?: string;
  condition?: string;
  imageUrl?: string;
}

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const steps = ["Select Patient", "Select Gender", "Session Type", "Note Format"];
  
  return (
    <View style={styles.stepIndicatorContainer}>
      {/* Connector lines background layer */}
      <View style={styles.connectorsContainer}>
        {steps.map((_, index) => (
          index < steps.length - 1 && (
            <View 
              key={`connector-${index}`}
              style={[
                styles.connectorLine,
                index < currentStep ? styles.activeConnectorLine : {}
              ]} 
            />
          )
        ))}
      </View>
      
      {/* Steps circles and labels */}
      {steps.map((label, index) => (
        <View key={index} style={styles.stepItem}>
          {/* Step circle */}
          <View 
            style={[
              styles.stepCircle,
              index === currentStep ? styles.activeStepCircle : {},
              index < currentStep ? styles.completedStepCircle : {}
            ]}
          >
            {index < currentStep ? (
              <Text style={[styles.stepNumber, styles.completedStepNumber]}>✓</Text>
            ) : (
              <Text 
                style={[
                  styles.stepNumber,
                  index === currentStep ? styles.activeStepNumber : {}
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          
          {/* Step label */}
          <View style={styles.stepLabelContainer}>
            <Text 
              style={[
                styles.stepLabel,
                index === currentStep ? styles.activeStepLabel : {},
                index < currentStep ? styles.completedStepLabel : {}
              ]}
            >
              {label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const PatientCard: React.FC<{
  patient: Patient;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ patient, isSelected, onSelect }) => {
  return (
    <TouchableOpacity 
      style={[styles.card, isSelected && styles.selectedCard]} 
      onPress={() => {
        onSelect();
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Patient ${patient.firstName} ${patient.lastName} selected`,
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: patient.imageUrl || 'https://via.placeholder.com/50' }} 
          />
          <View style={styles.imageFallback}>
            <Ionicons name="person" size={30} color="#CBD5E0" />
          </View>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.name}>{`${patient.firstName} ${patient.lastName}`}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              {patient.gender || 'Unknown'}, {patient.age || 'N/A'}
            </Text>
            <View style={styles.idContainer}>
              <Text style={styles.idText}>{patient.mreNumber}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <View style={styles.detail}>
            <Ionicons name="calendar" size={16} color="#2D796C" />
            <Text style={styles.detailLabel}>Last Visit:</Text>
            <Text style={styles.detailText}>{patient.lastVisit || 'N/A'}</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="medical" size={16} color="#E57373" />
            <Text style={styles.detailLabel}>Condition:</Text>
            <Text style={styles.detailText}>{patient.condition || 'N/A'}</Text>
          </View>
        </View>
      </View>
      
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color="#2D796C" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const CreateSessionScreen: React.FC = () => {
  const { user, fetchAllSessions, fetchAllPlans, fetchNoteFormats, noteFormats } = useSessionStore();
  const [isSessionCreated, setIsSessionCreated] = useState<boolean>(false);
  const [recordingEnabled, setRecordingEnabled] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingModalVisible, setLoadingModalVisible] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const pulseAnimation = useRef<Animated.Value>(new Animated.Value(1)).current;
  const buttonPulseAnimation = useRef<Animated.Value>(new Animated.Value(1)).current;
  const stepAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const barAnimations = useRef([
    new Animated.Value(0.2),
    new Animated.Value(0.2),
    new Animated.Value(0.2),
    new Animated.Value(0.2),
    new Animated.Value(0.2),
  ]).current;
  const steps = [
    "Preparing The Audio",
    "Processing The Audio",
    "Detecting The Speakers",
    "Transcribing Speech",
    "Receiving Notes",
  ];
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>({
    status: "pending",
    text: "",
    loading: false,
  });
  const [step, setStep] = useState<number>(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isProcessingTranscription, setIsProcessingTranscription] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [patientFirstName, setPatientFirstName] = useState<string>("");
  const [patientLastName, setPatientLastName] = useState<string>("");
  const [showNewPatientForm, setShowNewPatientForm] = useState<boolean>(false);
  const [sex, setSex] = useState<string>("Male");
  const [sessionType, setSessionType] = useState<string>("Telehealth");
  const [noteFormat, setNoteFormat] = useState<any>(null);
  const [newPatientModalVisible, setNewPatientModalVisible] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>("English");
  const sexCardAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const sessionTypeCardAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const navigation = useNavigation();

  useEffect(() => {
    stepAnimations.forEach((anim, index) => {
      if (index <= currentStep) {
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: index * 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      } else {
        anim.setValue(0);
      }
    });
  }, [currentStep]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchNoteFormats();
      try {
        const patientsData = await fetchPatients();
        const enrichedPatients = patientsData.data.map((p: Patient) => ({
          ...p,
          gender: p.gender || 'Unknown',
          age: p.age || Math.floor(Math.random() * 50) + 20,
          lastVisit: p.lastVisit || '2025-04-01',
          condition: p.condition || 'General Checkup',
          imageUrl: p.imageUrl || 'https://via.placeholder.com/50',
        }));
        setPatients(enrichedPatients);
        setFilteredPatients(enrichedPatients);
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch patients',
        });
      }
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (noteFormats && noteFormats.length > 0) {
      const defaultNoteFormat = noteFormats.find(format => format.title === "SOAP Notes") || noteFormats[0];
      setNoteFormat(defaultNoteFormat);
    }
  }, [noteFormats]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredPatients(patients);
      return;
    }
    
    const filtered = patients.filter(patient => 
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(text.toLowerCase()) ||
      patient.mreNumber.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredPatients(filtered);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No token available");
      }

      await Promise.all([
        refreshToken(),
        fetchPatients().then(data => {
          const enrichedPatients = data.data.map((p: Patient) => ({
            ...p,
            gender: p.gender || 'Unknown',
            age: p.age || Math.floor(Math.random() * 50) + 20,
            lastVisit: p.lastVisit || '2025-04-01',
            condition: p.condition || 'General Checkup',
            imageUrl: p.imageUrl || 'https://via.placeholder.com/50',
          }));
          setPatients(enrichedPatients);
          setFilteredPatients(enrichedPatients);
        }),
        fetchAllSessions(token),
        fetchAllPlans(),
        fetchUser(),
        fetchNoteFormats(),
      ]);

      if (noteFormats && noteFormats.length > 0) {
        const defaultNoteFormat = noteFormats.find(format => format.title === "SOAP Notes") || noteFormats[0];
        setNoteFormat(defaultNoteFormat);
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Data refreshed successfully',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to refresh data: ${error.message}`,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

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
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulseAnimation, {
            toValue: 1.1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulseAnimation, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
      buttonPulseAnimation.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      barAnimations.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: Math.random() * 0.8 + 0.2,
              duration: 300 + index * 50,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: 300 + index * 50,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else {
      barAnimations.forEach((anim) => anim.setValue(0.2));
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
        throw new Error("Microphone permission denied");
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Recording started',
      });
    } catch (error: any) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      setRecording(null);
      throw error;
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

    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Recording stopped',
    });

    if (uri) {
      setLoadingModalVisible(true);
      await uploadToAssemblyAI(uri);
    }
  };

  const uploadToAssemblyAI = async (audioUri: string): Promise<void> => {
    try {
      if (!audioUri) {
        setLoadingModalVisible(false);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No audio file available',
        });
        return;
      }

      console.log("Audio URI:", audioUri);

      const response = await fetch(audioUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      const audioBlob = await response.blob();

      console.log("Blob created:", audioBlob);
      setCurrentStep(0);
      setIsProcessingTranscription(true);

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
        setLoadingModalVisible(false);
        setIsProcessingTranscription(false);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to upload audio',
        });
        return;
      }

      setCurrentStep(1);

      let languageCode = "en";
      if (language === "Arabic") {
        languageCode = "ar";
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
        }),
      });

      const transcriptData = await transcriptResponse.json();
      console.log("Transcript Response:", transcriptData);

      if (transcriptData.error) {
        setLoadingModalVisible(false);
        setIsProcessingTranscription(false);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to initiate transcription',
        });
        return;
      }

      console.log("Transcription ID:", transcriptData.id);

      checkTranscriptionStatus(transcriptData.id);
    } catch (error: any) {
      console.error("Error uploading to AssemblyAI:", error);
      setLoadingModalVisible(false);
      setIsProcessingTranscription(false);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred during audio upload',
      });
    }
  };

  const checkTranscriptionStatus = async (transcriptionId: string): Promise<void> => {
    setTranscriptionStatus((prev) => ({ ...prev, loading: true }));
    setCurrentStep(2);

    const maxAttempts = 60; // 5 minutes (60 * 5s)
    let attempt = 0;

    const interval = setInterval(async () => {
      try {
        if (attempt >= maxAttempts) {
          clearInterval(interval);
          setTranscriptionStatus((prev) => ({ ...prev, loading: false }));
          setIsProcessingTranscription(false);
          setLoadingModalVisible(false);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Transcription took too long. Please try again',
          });
          return;
        }

        attempt++;

        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
          headers: { authorization: "e610f8c7a07c46669ed449a0add0de2e" },
        });
        const data = await response.json();

        setTranscriptionStatus((prev) => ({
          ...prev,
          status: data.status,
          text: data.text || prev.text,
        }));

        if (data.status === "processing") {
          setCurrentStep(3);
        }

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          setTranscriptionStatus((prev) => ({ ...prev, loading: false }));
          setIsProcessingTranscription(false);

          if (data.status === "completed") {
            useSessionStore.getState().setTranscription(data.text);
            try {
              setCurrentStep(4);
              const response = await sendSessionData(data.text, null, null);
              console.log("Session data sent successfully:", response);

              setLoadingModalVisible(false);
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Transcription completed and notes generated',
              });
              router.push({
                pathname: '/NotesScreen',
                params: { notes: JSON.stringify(response), transcription: data.text },
              });
              setRecordingEnabled(false);
              setIsSessionCreated(false);
              setRecordingUri(null);
              setTranscriptionStatus({ status: "pending", text: "", loading: false });
            } catch (error: any) {
              console.error("Error sending session data:", error);
              setLoadingModalVisible(false);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to send session data',
              });
            }
          } else {
            setLoadingModalVisible(false);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Transcription failed',
              });
            }
          }
        } catch (error: any) {
          clearInterval(interval);
          setTranscriptionStatus((prev) => ({ ...prev, loading: false }));
          setIsProcessingTranscription(false);
          setLoadingModalVisible(false);
          console.error("Error checking status:", error);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'An error occurred while checking transcription status',
          });
        }
      }, 5000);
    };

    const checkSessionCreationUsage = () => {
      if (!user || !user.userPlan || !user.userPlan.usage) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User plan data is missing. Please upgrade your plan',
          onPress: () => router.push({ pathname: '/UpgradePlan' }),
        });
        return false;
      }

      const sessionCreationUsage = user.userPlan.usage.find(
        (usage) => usage.featureName === PlanFeatureNameEnum.SESSION_CREATION
      );

      if (!sessionCreationUsage) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Session creation feature not available. Please upgrade your plan',
          onPress: () => router.push({ pathname: '/UpgradePlan' }),
        });
        return false;
      }

      if (sessionCreationUsage.left === null || sessionCreationUsage.left <= 0) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Session creation limit reached. Please upgrade your plan',
          onPress: () => router.push({ pathname: '/UpgradePlan' }),
        });
        return false;
      }

      return true;
    };

    const handleSubmit = async (): Promise<void> => {
      console.log("Submitting session");
      if (!checkSessionCreationUsage()) return;

      const requestData = {
        patientFirstName: showNewPatientForm ? patientFirstName : patients.find(p => p.id.toString() === selectedPatientId)?.firstName || "",
        patientLastName: showNewPatientForm ? patientLastName : patients.find(p => p.id.toString() === selectedPatientId)?.lastName || "",
        sex,
        sessionType,
        noteFormat: noteFormat?.title || "SOAP Notes",
        language: "English",
      };
      console.log("Session Data:", requestData);

      try {
        const session = await createSession(requestData);
        console.log("Session Created Successfully:", session);

        setRecordingEnabled(true);
        setIsSessionCreated(true);
        setStep(1);
        setSelectedPatientId("");
        setPatientFirstName("");
        setPatientLastName("");
        setShowNewPatientForm(false);
        setSex("Male");
        setSessionType("Telehealth");

        try {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Session created successfully',
          });
        } catch (toastError: any) {
          console.warn("Toast failed:", toastError.message);
          Alert.alert("Notification", "Session created");
        }
      } catch (error: any) {
        console.error("Error in handleSubmit:", error);

        let errorMessage = "Unknown error";

        if (error.response && error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        try {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: `Failed to create session: ${errorMessage}`,
          });
        } catch (toastError: any) {
          console.warn("Toast failed:", toastError.message);
          Alert.alert("Notification", "Failed to create session: " + errorMessage);
        }
      }
    };

    const handleNextStep = () => {
      if (step === 1) {
        if (!selectedPatientId && !showNewPatientForm) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Please select a patient or create a new one',
          });
          return;
        }
        if (showNewPatientForm && (!patientFirstName || !patientLastName)) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'First name and last name are required for a new patient',
          });
          return;
        }
      }
      if (step < 4) {
        setStep(step + 1);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Proceeding to step ${step + 1}`,
        });
      } else {
        handleSubmit();
      }
    };

    const handlePrevStep = () => {
      if (step > 1) {
        setStep(step - 1);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Returned to step ${step - 1}`,
        });
      }
    };

    const handleToggleRecording = async () => {
      if (!isRecording) {
        try {
          console.log("Starting recording");
          await startRecording();
        } catch (error: any) {
          console.error("Failed to start recording:", error);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to start recording. Please check microphone permissions',
          });
        }
      } else {
        try {
          console.log("Stopping recording");
          await stopRecording();
        } catch (error: any) {
          console.error("Failed to stop recording:", error);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to stop recording',
          });
        }
      }
    };

    const closeNewPatientModal = () => {
      setNewPatientModalVisible(false);
      setPatientFirstName('');
      setPatientLastName('');
      setShowNewPatientForm(false);
      setSelectedPatientId('');
    };

    const renderStepContent = () => {
      switch (step) {
        case 1:
          return (
            <View>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search patients by name or MRN"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholderTextColor="#666"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => handleSearch('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredPatients}
                renderItem={({ item }) => (
                  <PatientCard 
                    patient={item} 
                    isSelected={selectedPatientId === item.id.toString()}
                    onSelect={() => {
                      setSelectedPatientId(item.id.toString());
                      setShowNewPatientForm(false);
                    }}
                  />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.patientList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No patients found</Text>
                  </View>
                }
              />
            </View>
          );
        case 2:
          return (
            <View style={styles.contentContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Sex</Text>
                <View style={styles.patientList}>
                  {["Male", "Female"].map((option, index) => {
                    const isSelected = sex === option;

                    const handlePressIn = () => {
                      Animated.spring(sexCardAnimations[index], {
                        toValue: 0.95,
                        useNativeDriver: true,
                      }).start();
                    };

                    const handlePressOut = () => {
                      Animated.spring(sexCardAnimations[index], {
                        toValue: 1,
                        useNativeDriver: true,
                      }).start();
                    };

                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.card, isSelected && styles.selectedCard]}
                        onPress={() => setSex(option)}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={0.7}
                      >
                        <Animated.View style={{ transform: [{ scale: sexCardAnimations[index] }] }}>
                          <View style={styles.profileSection}>
                            <View style={styles.profileImageContainer}>
                              <MaterialIcons 
                                name="wc" 
                                size={30} 
                                color="#2D796C" 
                              />
                            </View>
                            <View style={styles.patientInfo}>
                              <Text style={styles.name}>{option}</Text>
                              <View style={styles.infoRow}>
                                <Text style={styles.infoText}>Sex Selection</Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.detailsSection}>
                            <View style={styles.detailRow}>
                              <View style={styles.detail}>
                                <Ionicons name="information-circle" size={16} color="#2D796C" />
                                <Text style={styles.detailLabel}>Description:</Text>
                                <Text style={styles.detailText}>
                                  {option === "Male" ? "Male patient" : "Female patient"}
                                </Text>
                              </View>
                            </View>
                          </View>
                          {isSelected && (
                            <View style={styles.selectedIndicator}>
                              <Ionicons name="checkmark-circle" size={24} color="#2D796C" />
                            </View>
                          )}
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        case 3:
          return (
            <View style={styles.contentContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Session Type</Text>
                <View style={styles.patientList}>
                  {["Telehealth", "Phone", "In Person"].map((option, index) => {
                    const isSelected = sessionType === option;

                    const handlePressIn = () => {
                      Animated.spring(sessionTypeCardAnimations[index], {
                        toValue: 0.95,
                        useNativeDriver: true,
                      }).start();
                    };

                    const handlePressOut = () => {
                      Animated.spring(sessionTypeCardAnimations[index], {
                        toValue: 1,
                        useNativeDriver: true,
                      }).start();
                    };

                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.card, isSelected && styles.selectedCard]}
                        onPress={() => setSessionType(option)}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={0.7}
                      >
                        <Animated.View style={{ transform: [{ scale: sessionTypeCardAnimations[index] }] }}>
                          <View style={styles.profileSection}>
                            <View style={styles.profileImageContainer}>
                              <MaterialIcons 
                                name={option === "Telehealth" ? "videocam" : option === "Phone" ? "phone" : "person"} 
                                size={30} 
                                color="#2D796C" 
                              />
                            </View>
                            <View style={styles.patientInfo}>
                              <Text style={styles.name}>{option}</Text>
                              <View style={styles.infoRow}>
                                <Text style={styles.infoText}>Session Type</Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.detailsSection}>
                            <View style={styles.detailRow}>
                              <View style={styles.detail}>
                                <Ionicons name="information-circle" size={16} color="#2D796C" />
                                <Text style={styles.detailLabel}>Description:</Text>
                                <Text style={styles.detailText}>
                                  {option === "Telehealth" 
                                    ? "Virtual consultation via video" 
                                    : option === "Phone" 
                                    ? "Consultation via phone call" 
                                    : "Face-to-face consultation"}
                                </Text>
                              </View>
                            </View>
                          </View>
                          {isSelected && (
                            <View style={styles.selectedIndicator}>
                              <Ionicons name="checkmark-circle" size={24} color="#2D796C" />
                            </View>
                          )}
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        case 4:
          return (
            <View style={styles.contentContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Note Format</Text>
                <View style={styles.cardContainer}>
                  {noteFormats.length > 0 ? (
                    noteFormats.map((format, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionCard,
                          noteFormat?.title === format.title && styles.selectedCard,
                        ]}
                        onPress={() => setNoteFormat(format)}
                      >
                        <MaterialIcons name="description" size={24} color="#2D796C" style={styles.cardIcon} />
                        <View>
                          <Text style={styles.cardTitle}>{format.title}</Text>
                          <Text style={styles.cardPrompt} numberOfLines={2} ellipsizeMode="tail">
                            {format.prompt}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{ color: "#E57373", marginLeft: 12 }}>No note formats available</Text>
                  )}
                </View>
              </View>
            </View>
          );
        default:
          return null;
      }
    };

    const renderLoadingSteps = () => {
      return (
        <View style={styles.loadingStepsContainer}>
          {steps.map((step, index) => (
            <Animated.View
              key={index}
              style={[{
                ...styles.loadingStep,
                opacity: stepAnimations[index],
                transform: [
                  {
                    translateY: stepAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }]}
            >
              <View
                style={[{
                  ...styles.loadingCircle,
                  ...(index < currentStep ? styles.completedLoadingCircle : index === currentStep ? styles.activeLoadingCircle : {}),
                }]}
              >
                {index < currentStep && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
                {index === currentStep && (
                  <MaterialIcons name="hourglass-empty" size={16} color="#fff" />
                )}
              </View>
              <Text
                style={[{
                  ...styles.loadingStepText,
                  ...(index <= currentStep ? styles.activeLoadingStepText : {}),
                }]}
              >
                {step}
              </Text>
            </Animated.View>
          ))}
          {isProcessingTranscription && currentStep === 3 && (
            <Text style={styles.loadingStatusText}>
              Processing is taking longer than usual. Please wait...
            </Text>
          )}
        </View>
      );
    };

    const renderRecordingSection = () => {
      if (!isSessionCreated) return null;

      return (
        <View style={styles.recordingSection}>
          <View style={styles.recordingCard}>
            <Text style={styles.recordingCardHeader}>Recording Session</Text>
            <View style={styles.analyzerContainer}>
              {barAnimations.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[{
                    ...styles.analyzerBar,
                    transform: [
                      {
                        scaleY: anim.interpolate({
                          inputRange: [0.2, 1],
                          outputRange: [0.2, 1],
                        }),
                      },
                    ],
                  }]}
                />
              ))}
            </View>
            <View style={[styles.recordingTimeContainer, { backgroundColor: isRecording ? "rgba(255, 85, 85, 0.1)" : "rgba(45, 121, 108, 0.1)" }]}>
              <Text style={[styles.recordingTime, { color: isRecording ? "#FF5555" : "#2D796C" }]}>
                {formatTime(recordingTime)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording ? styles.stopRecordButton : styles.startRecordButton,
              ]}
              onPress={handleToggleRecording}
            >
              <Animated.View style={{ transform: [{ scale: buttonPulseAnimation }] }}>
                <MaterialIcons
                  name={isRecording ? "stop" : "mic"}
                  size={32}
                  color="#fff"
                />
              </Animated.View>
            </TouchableOpacity>
            <Text style={styles.recordingButtonText}>
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Text>
          </View>
        </View>
      );
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, styles.headerTitleLeft]}>New Session</Text>
            {step === 1 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setNewPatientModalVisible(true);
                  setShowNewPatientForm(true);
                }}
              >
                <MaterialIcons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

          <StepIndicator currentStep={step - 1} totalSteps={4} />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2D796C']} />
              }
            >
              {!isSessionCreated && (
                <>
                  {renderStepContent()}
                  <View style={styles.footer}>
                    <View style={styles.footerButtonContainer}>
                      {step > 1 && (
                        <TouchableOpacity
                          style={styles.prevButton}
                          onPress={handlePrevStep}
                        >
                          <Ionicons name="arrow-back" size={20} color="white" />
                          <Text style={styles.prevButtonText}>Previous</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.nextButton,
                          step === 1 && !selectedPatientId && !showNewPatientForm && styles.disabledButton,
                          step === 1 && showNewPatientForm && (!patientFirstName || !patientLastName) && styles.disabledButton,
                        ]}
                        onPress={handleNextStep}
                        disabled={
                          (step === 1 && !selectedPatientId && !showNewPatientForm) ||
                          (step === 1 && showNewPatientForm && (!patientFirstName || !patientLastName))
                        }
                      >
                        <Text style={styles.nextButtonText}>{step === 4 ? "Submit" : "Continue"}</Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {renderRecordingSection()}
            </ScrollView>
          </KeyboardAvoidingView>

          <Modal
            animationType="slide"
            transparent={true}
            visible={newPatientModalVisible}
            onRequestClose={closeNewPatientModal}
          >
            <View style={styles.bottomModalOverlay}>
              <View style={styles.bottomModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Patient</Text>
                  <TouchableOpacity onPress={closeNewPatientModal}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={styles.inputGroup}>
                    <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={patientFirstName}
                      onChangeText={setPatientFirstName}
                      placeholder="First Name"
                      placeholderTextColor="#666"
                    />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={styles.inputGroup}>
                    <MaterialIcons
                      name="person-outline"
                      size={20}
                      color="#666"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={patientLastName}
                      onChangeText={setPatientLastName}
                      placeholder="Last Name"
                      placeholderTextColor="#666"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!patientFirstName || !patientLastName) && styles.disabledButton,
                  ]}
                  onPress={() => {
                    if (patientFirstName && patientLastName) {
                      setSelectedPatientId('new');
                      closeNewPatientModal();
                      Toast.show({
                        type: 'success',
                        text1: 'Success',
                        text2: `New patient ${patientFirstName} ${patientLastName} added`,
                      });
                    }
                  }}
                  disabled={!patientFirstName || !patientLastName}
                >
                  <Text style={styles.submitButtonText}>Add Patient</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            transparent={true}
            visible={loadingModalVisible}
            onRequestClose={() => {}}
          >
            <View style={styles.loadingModalOverlay}>
              <View style={styles.loadingModalContent}>
                {renderLoadingSteps()}
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      );
    };

    const styles = StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
      } as ViewStyle,
      header: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        paddingTop: 60,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      } as ViewStyle,
      headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
      } as ViewStyle,
      headerTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "white",
      } as TextStyle,
      headerTitleLeft: {
        textAlign: 'left',
      } as TextStyle,
      addButton: {
        padding: 8,
      } as ViewStyle,
      stepIndicatorContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        paddingHorizontal: 10,
        position: "relative",
        paddingTop:20,
      } as ViewStyle,
      connectorsContainer: {
        position: "absolute",
        top: 15,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 45,
        zIndex: -1,
      } as ViewStyle,
      connectorLine: {
        height: 2,
        backgroundColor: "black",
        flex: 1,
        marginHorizontal: 5,
      } as ViewStyle,
      activeConnectorLine: {
        backgroundColor: "#2D796C",
      } as ViewStyle,
      stepItem: {
        alignItems: "center",
        flex: 1,
        position: "relative",
        minWidth: 60,
      } as ViewStyle,
      stepCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        zIndex: 1,
      } as ViewStyle,
      activeStepCircle: {
        backgroundColor: "#2D796C",
      } as ViewStyle,
      completedStepCircle: {
        backgroundColor: "#2D796C",
      } as ViewStyle,
      stepNumber: {
        fontSize: 16,
        color: "#666",
        fontWeight: "600",
      } as TextStyle,
      activeStepNumber: {
        color: "#FFFFFF",
      } as TextStyle,
      completedStepNumber: {
        color: "#FFFFFF",
      } as TextStyle,
      stepLabelContainer: {
        width: 60,
        alignItems: "center",
      } as ViewStyle,
      stepLabel: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
      } as TextStyle,
      activeStepLabel: {
        color: "#2D796C",
        fontWeight: "600",
      } as TextStyle,
      completedStepLabel: {
        color: "#2D796C",
      } as TextStyle,
      stepConnector: {
        position: "absolute",
        top: 15,
        left: "50%",
        width: "100%",
        height: 2,
        backgroundColor: "#E5E7EB",
        zIndex: -1,
      } as ViewStyle,
      activeStepConnector: {
        backgroundColor: "#2D796C",
      } as ViewStyle,
      scrollContainer: {
        flexGrow: 1,
        paddingBottom: 20,
      } as ViewStyle,
      contentContainer: {
        paddingHorizontal: 16,
      } as ViewStyle,
      searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        margin: 16,
        padding: 5,
        borderRadius: 16,
        height: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      } as ViewStyle,
      searchIcon: {
        marginRight: 8,
      } as TextStyle,
      searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#333",
      } as TextStyle,
      clearButton: {
        padding: 4,
      } as ViewStyle,
      patientList: {
        padding: 16,
        paddingTop: 0,
      } as ViewStyle,
      emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      } as ViewStyle,
      emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
        textAlign: "center",
      } as TextStyle,
      card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: "relative",
        overflow: "hidden",
      } as ViewStyle,
      selectedCard: {
        borderWidth: 2,
        borderColor: "#2D796C",
        backgroundColor: "#F8FAFF",
      } as ViewStyle,
      profileSection: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
      } as ViewStyle,
      profileImageContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#F0F4F8",
        justifyContent: "center",
        alignItems: "center",
      } as ViewStyle,
      profileImage: {
        width: "100%",
        height: "100%",
        borderRadius: 25,
        position: "absolute",
      } as ViewStyle,
      imageFallback: {
        position: "absolute",
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        zIndex: -1,
      } as ViewStyle,
      patientInfo: {
        flex: 1,
      } as ViewStyle,
      name: {
        fontSize: 18,
        fontWeight: "600",
        color: "#2D796C",
        marginBottom: 4,
      } as TextStyle,
      infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      } as ViewStyle,
      infoText: {
        fontSize: 14,
        color: "#666",
      } as TextStyle,
      idContainer: {
        backgroundColor: "#F0F0F0",
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
      } as ViewStyle,
      idText: {
        fontSize: 12,
        color: "#666",
      } as TextStyle,
      detailsSection: {
        backgroundColor: "#F7FAFC",
        margin: -16,
        marginTop: 0,
        padding: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      } as ViewStyle,
      detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
      } as ViewStyle,
      detail: {
        flexDirection: "row",
        alignItems: "center",
      } as ViewStyle,
      detailLabel: {
        fontSize: 12,
        color: "#666",
        marginLeft: 4,
        marginRight: 4,
      } as TextStyle,
      detailText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#333",
      } as TextStyle,
      selectedIndicator: {
        position: "absolute",
        top: 12,
        right: 12,
      } as ViewStyle,
      formGroup: {
        marginBottom: 24,
      } as ViewStyle,
      label: {
        fontSize: 18,
        color: "#333",
        marginBottom: 12,
        fontWeight: "700",
      } as TextStyle,
      inputGroup: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#F0F0F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      } as ViewStyle,
      inputIcon: {
        marginRight: 12,
      } as TextStyle,
      input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: "#333",
      } as TextStyle,
      cardContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: 4,
      } as ViewStyle,
      optionCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F0F0F0",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: "100%",
      } as ViewStyle,
      cardIcon: {
        marginRight: 12,
      } as TextStyle,
      cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2D796C",
      } as TextStyle,
      cardPrompt: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
        lineHeight: 16,
      } as TextStyle,
      footer: {
        padding: 16,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#F0F0F0",
      } as ViewStyle,
      footerButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
      } as ViewStyle,
      prevButton: {
        flex: 1,
        backgroundColor: "#90A4AE",
        borderRadius: 16,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginRight: 8,
      } as ViewStyle,
      prevButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
      } as TextStyle,
      nextButton: {
        flex: 1,
        backgroundColor: "#2D796C",
        borderRadius: 16,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginLeft: 8,
      } as ViewStyle,
      nextButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
        marginRight: 8,
      } as TextStyle,
      disabledButton: {
        backgroundColor: "#90A4AE",
        opacity: 0.8,
      } as ViewStyle,
      loadingModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
      } as ViewStyle,
      loadingModalContent: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        width: "80%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      } as ViewStyle,
      loadingStepsContainer: {
        width: "100%",
      } as ViewStyle,
      loadingStep: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 10,
      } as ViewStyle,
      loadingCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#ccc",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
      } as ViewStyle,
      activeLoadingCircle: {
        backgroundColor: "#2D796C",
      } as ViewStyle,
      completedLoadingCircle: {
        backgroundColor: "#2D796C",
      } as ViewStyle,
      loadingStepText: {
        fontSize: 16,
        color: "#ccc",
      } as TextStyle,
      activeLoadingStepText: {
        color: "#333",
      } as TextStyle,
      recordingSection: {
        width: "100%",
        alignItems: "center",
        paddingHorizontal: 16,
      } as ViewStyle,
      recordingCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        width: "100%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      } as ViewStyle,
      recordingCardHeader: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2D796C",
        marginBottom: 20,
      } as TextStyle,
      analyzerContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        height: 80,
        marginVertical: 10,
      } as ViewStyle,
      analyzerBar: {
        width: 8,
        height: "100%",
        backgroundColor: "#2D796C",
        marginHorizontal: 4,
        borderRadius: 4,
      } as ViewStyle,
      recordingTimeContainer: {
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
      } as ViewStyle,
      recordingTime: {
        fontSize: 28,
        fontWeight: "700",
        textAlign: "center",
      } as TextStyle,
      recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      } as ViewStyle,
      startRecordButton: {
        backgroundColor: "#2D796C",
      } as ViewStyle,
      stopRecordButton: {
        backgroundColor: "#FF5555",
      } as ViewStyle,
      recordingButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginTop: 10,
      } as TextStyle,
      bottomModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      } as ViewStyle,
      bottomModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
      } as ViewStyle,
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      } as ViewStyle,
      modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2D796C',
      } as TextStyle,
      submitButton: {
        backgroundColor: '#2D796C',
        borderRadius: 16,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
      } as ViewStyle,
      loadingStatusText: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginTop: 10,
      } as TextStyle,
      submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
      } as TextStyle,
    });

    export default CreateSessionScreen;

    function refreshToken(): any {
      throw new Error("Function not implemented.");
    }