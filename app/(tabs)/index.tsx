import React, { useRef, useState, useEffect } from "react";
import { Audio } from "expo-av";
import {
  Dimensions,
  Animated,
  StyleSheet,
  Alert,
  ViewStyle,
  TextStyle,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Easing,
  Modal,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from "expo-linear-gradient";
import { sendSessionData, createSession, fetchUser, fetchPatients, fetchUserStats, fetchStatsGraph } from "../../src/api/api";
import { useSessionStore } from "../../src/store/store";
import { toast } from "sonner-native";
import PatientDropdown from '../../src/components/ui/PatientDropdown';
import Dropdown from "../../src/components/ui/form";
import { useNavigation } from "@react-navigation/native";

import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { LineChart } from "react-native-chart-kit";

export enum PlanFeatureNameEnum {
  SESSION_CREATION = 'Session Creation',
  DOCTOR_ONBOARDING = 'Doctor Onboarding',
  TEMPLATE_CUSTOMIZATION = 'Template Customization',
  DOCUMENT_GENERATION = 'Document Generation',
  MACRO_REPLACEMENT = 'Macros & Replace',
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
}
const FormScreen: React.FC = () => {
  const { user, fetchAllSessions, fetchAllPlans, fetchNoteFormats, noteFormats } = useSessionStore();
  const [isSessionCreated, setIsSessionCreated] = useState<boolean>(false);
  const [recordingEnabled, setRecordingEnabled] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [isProcessingTranscription, setIsProcessingTranscription] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [recordingModalVisible, setRecordingModalVisible] = useState<boolean>(false);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const pulseAnimation = useRef<Animated.Value>(new Animated.Value(1)).current;
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
  const [stats, setStats] = useState({
    sessionCount: 0,
    sessionCompletedCount: 0,
    sessionTotalDuration: 0,
    sessionDurationAvg: "0.00",
    todayAppointments: 0,
  });
  interface GraphDataItem {
    name: string;
    sessionCreationCount: number;
  }
  
  const [graphData, setGraphData] = useState<GraphDataItem[]>([]);
  const [dateRange, setDateRange] = useState({ startDate: "2025-04-21", endDate: "2025-04-25" });
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);

  const [step, setStep] = useState<number>(1);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patientFirstName, setPatientFirstName] = useState<string>("");
  const [patientLastName, setPatientLastName] = useState<string>("");
  const [showNewPatientForm, setShowNewPatientForm] = useState<boolean>(false);
  const [sex, setSex] = useState<string>("Male");
  const [sessionType, setSessionType] = useState<string>("Telehealth");
  const [noteFormat, setNoteFormat] = useState<any>(null);
  const [language, setLanguage] = useState<string>("English");

  const navigation = useNavigation();

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("");

      const statsResponse = await fetchUserStats();
      setStats(statsResponse.data);
      useSessionStore.getState().setStats(statsResponse.data);

      const graphResponse = await fetchStatsGraph(dateRange.startDate, dateRange.endDate);
      setGraphData(graphResponse.data);
      useSessionStore.getState().setGraphData(graphResponse.data);
    } catch (error: any) {
     // console.error("Error fetching dashboard data:", error);
    }
  };

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
        setPatients(patientsData.data || []);
      } catch (error) {
       // Alert.alert('Error', 'Failed to fetch patients.');
      }
      await fetchDashboardData();
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (noteFormats && noteFormats.length > 0) {
      const defaultNoteFormat = noteFormats.find(format => format.title === "SOAP Notes") || noteFormats[0];
      setNoteFormat(defaultNoteFormat);
    }
  }, [noteFormats]);

  const DatePickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectDateRange: (startDate: string, endDate: string) => void;
}> = ({ visible, onClose, onSelectDateRange }) => {
  const [tempStartDate, setTempStartDate] = useState<string | null>(null);
  const [tempEndDate, setTempEndDate] = useState<string | null>(null);
  const [selectingStartDate, setSelectingStartDate] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      setTempStartDate(dateRange.startDate);
      setTempEndDate(dateRange.endDate);
      setSelectingStartDate(true);
    } else {
      setTempStartDate(null);
      setTempEndDate(null);
      setSelectingStartDate(true);
    }
  }, [visible, dateRange.startDate, dateRange.endDate]);

  const quickSelectOptions = [
    "Today",
    "Yesterday",
    "This Week",
    "Last Week",
    "This Month",
    "Last Month",
  ];
  const quickSelectListOptions = [
    "Last 7 days",
    "Last 30 days",
    "Last 90 days",
    "Last 6 months",
    "Last 1 year",
  ];

  const calculateDateRange = (option: string) => {
    const today = new Date();
    let endDate = new Date(today);
    let startDate = new Date(today);

    switch (option) {
      case "Today":
        startDate = endDate;
        break;
      case "Yesterday":
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() - 1);
        break;
      case "This Week":
        startDate.setDate(today.getDate() - today.getDay());
        break;
      case "Last Week":
        startDate.setDate(today.getDate() - today.getDay() - 7);
        endDate.setDate(today.getDate() - today.getDay() - 1);
        break;
      case "This Month":
        startDate.setDate(1);
        break;
      case "Last Month":
        startDate.setMonth(today.getMonth() - 1);
        startDate.setDate(1);
        endDate.setMonth(today.getMonth() - 1);
        endDate.setDate(new Date(today.getFullYear(), today.getMonth(), 0).getDate());
        break;
      case "Last 7 days":
        startDate.setDate(today.getDate() - 7);
        break;
      case "Last 30 days":
        startDate.setDate(today.getDate() - 30);
        break;
      case "Last 90 days":
        startDate.setDate(today.getDate() - 90);
        break;
      case "Last 6 months":
        startDate.setMonth(today.getMonth() - 6);
        break;
      case "Last 1 year":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }

    const result = {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
    console.log("Calculated range:", { option, startDate: result.startDate, endDate: result.endDate });
    return result;
  };

  const handleDayPress = (day: { dateString: string }) => {
    console.log("Day pressed:", day.dateString);
    const selectedDate = new Date(day.dateString);
    if (isNaN(selectedDate.getTime())) {
      console.warn("Invalid date selected:", day.dateString);
      return;
    }

    if (selectingStartDate) {
      setTempStartDate(day.dateString);
      setTempEndDate(null);
      setSelectingStartDate(false);
    } else {
      if (tempStartDate && new Date(day.dateString) < new Date(tempStartDate)) {
        toast("Invalid Range: End date cannot be before start date.");
        return;
      }
      setTempEndDate(day.dateString);
      setSelectingStartDate(true);
    }
  };

  const handleApply = () => {
    console.log("Applying dates:", { tempStartDate, tempEndDate });
    if (!tempStartDate || !tempEndDate) {
      toast("Incomplete Range: Please select both start and end dates.");
      return;
    }
    if (new Date(tempStartDate) > new Date(tempEndDate)) {
      toast("Invalid Range: Start date cannot be after end date.");
      return;
    }
    onSelectDateRange(tempStartDate, tempEndDate);
    onClose();
  };

  const handleQuickSelect = (option: string) => {
    const { startDate, endDate } = calculateDateRange(option);
    console.log("Quick select:", { option, startDate, endDate });
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  };

  const markedDates: { [key: string]: any } = {};
  if (tempStartDate && !isNaN(new Date(tempStartDate).getTime())) {
    markedDates[tempStartDate] = {
      startingDay: true,
      color: "#2D796C",
      textColor: "#fff",
    };
  }
  if (tempEndDate && !isNaN(new Date(tempEndDate).getTime())) {
    markedDates[tempEndDate] = {
      endingDay: true,
      color: "#2D796C",
      textColor: "#fff",
    };
  }
  if (tempStartDate && tempEndDate && !isNaN(new Date(tempStartDate).getTime()) && !isNaN(new Date(tempEndDate).getTime())) {
    const start = new Date(tempStartDate);
    const end = new Date(tempEndDate);
    const current = new Date(start);
    while (current <= end) {
      const dateString = current.toISOString().split("T")[0];
      if (dateString !== tempStartDate && dateString !== tempEndDate) {
        markedDates[dateString] = {
          color: "#2D796C",
          textColor: "#fff",
          opacity: 0.3,
        };
      }
      current.setDate(current.getDate() + 1);
    }
    console.log("Marked dates range:", { start: tempStartDate, end: tempEndDate, markedDates });
  }

  const handleContentPress = (e: any) => {
    e.stopPropagation();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback onPress={handleContentPress}>
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <View style={styles.scrollContent}>
                <View style={styles.modalHeader}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#1f2937"
                    style={styles.modalHeaderIcon}
                  />
                  <Text style={styles.modalTitle}>Select Date Range</Text>
                </View>

                <View style={styles.calendarContainer}>
                  <Text style={styles.modalLabel}>
                    {selectingStartDate ? "Select Start Date" : "Select End Date"}
                  </Text>
                  <Calendar
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    markingType={"period"}
                    theme={{
                      selectedDayBackgroundColor: "#2D796C",
                      todayTextColor: "#2D796C",
                      arrowColor: "#2D796C",
                      monthTextColor: "#1f2937",
                      textDayFontWeight: "500",
                      textMonthFontWeight: "600",
                    }}
                    maxDate={new Date().toISOString().split("T")[0]}
                    style={styles.calendar}
                  />
                </View>

                <View style={styles.dateRangeInput}>
                  <Text style={styles.modalLabel}>Selected Range</Text>
                  <View style={styles.dateInput}>
                    <Text style={styles.modalDateRangeText}>
                      {tempStartDate
                        ? new Date(tempStartDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Select Start Date"}{" "}
                      -{" "}
                      {tempEndDate
                        ? new Date(tempEndDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Select End Date"}
                    </Text>
                  </View>
                </View>

                <View style={styles.quickSelectGrid}>
                  {quickSelectOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.quickSelectGridButton}
                      onPress={() => handleQuickSelect(option)}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#6b7280"
                        style={styles.quickSelectIcon}
                      />
                      <Text style={styles.quickSelectGridText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.quickSelectHeader}>Quick Select</Text>
                <View style={styles.quickSelectList}>
                  {quickSelectListOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.quickSelectListItem}
                      onPress={() => handleQuickSelect(option)}
                    >
                      <Ionicons
                        name="refresh-circle-outline"
                        size={20}
                        color="#6b7280"
                        style={styles.quickSelectListIcon}
                      />
                      <Text style={styles.quickSelectListText}>{option}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#6b7280"
                        style={styles.quickSelectListArrow}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color="#fff"
                    style={styles.applyButtonIcon}
                  />
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};
 useEffect(() => {
   const initialize = async () => {
    
     try {
       await refreshToken();
       await fetchProfile();
       await fetchPatients();
        await fetchAllSessions(refreshToken()); // Uncomment and provide token if needed
       await fetchAllPlans();
       await fetchUser();
       await fetchUserStats();
      
       await fetchNoteFormats();
       await fetchDashboardData();
     } catch (error) {
       // Handle error if needed
     }
   };
   initialize();
 }, []);
  

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No token available");
      }

      await Promise.all([

        refreshToken(),
        fetchProfile(),
        fetchPatients(),
        fetchAllSessions(token),
        fetchAllPlans(),
        fetchUser(),
        fetchUserStats(),
        fetchNoteFormats(),
        fetchDashboardData(),
      ]);

      if (noteFormats && noteFormats.length > 0) {
        const defaultNoteFormat = noteFormats.find(format => format.title === "SOAP Notes") || noteFormats[0];
        setNoteFormat(defaultNoteFormat);
      }

      toast("Data refreshed successfully!");
    } catch (error: any) {
      console.log("Error refreshing data:", error);
      toast("Failed to refresh data: " + error.message);
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
    } else {
      pulseAnimation.setValue(1);
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

  const graphChartData = {
    labels: graphData.length > 0 ? graphData.map((item, index) => {
      const date = new Date(item.name);
      return !isNaN(date.getTime()) && index % 3 === 0 ? date.getDate().toString() : "";
    }) : ["1", "2", "3", "4", "5"],
    datasets: [
      {
        data: graphData.length > 0 ? graphData.map(item => {
          const count = Number(item.sessionCreationCount);
          return isFinite(count) ? count : 0;
        }) : [0, 0, 0, 0, 0],
        color: () => "#2D796C",
        strokeWidth: 2,
      },
    ],
  };

  useEffect(() => {
    console.log("graphData:", graphData);
  }, [graphData]);

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
    } catch (error) {
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

    if (uri) {
      // Start background processing without showing modal
      await uploadToAssemblyAI(uri);
    }
  };

  const uploadToAssemblyAI = async (audioUri: string): Promise<void> => {
  try {
    if (!audioUri) {
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
      setIsProcessingTranscription(false);
      toast("Failed to upload audio.");
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
      setIsProcessingTranscription(false);
      toast("Failed to initiate transcription.");
      return;
    }

    console.log("Transcription ID:", transcriptData.id);

    checkTranscriptionStatus(transcriptData.id);
  } catch (error) {
    console.error("Error uploading to AssemblyAI:", error);
    setIsProcessingTranscription(false);
    toast("An error occurred during audio upload.");
  }
};
  const checkTranscriptionStatus = async (transcriptionId: string): Promise<void> => {
  setTranscriptionStatus((prev) => ({ ...prev, loading: true }));
  setCurrentStep(2);

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

            router.push({
              pathname: '/NotesScreen',
              params: { notes: JSON.stringify(response), transcription: data.text },
            });
            setRecordingEnabled(false);
            setIsSessionCreated(false);
            setRecordingUri(null);
            setTranscriptionStatus({ status: "pending", text: "", loading: false });
            setModalVisible(false);
          } catch (error) {
            console.error("Error sending session data:", error);
            toast("Failed to send session data.");
          }
        } else {
          toast("Transcription failed.");
        }
      }
    } catch (error) {
      clearInterval(interval);
      setTranscriptionStatus((prev) => ({ ...prev, loading: false }));
      setIsProcessingTranscription(false);
      console.error("Error checking status:", error);
      toast("An error occurred while checking transcription status.");
    }
  }, 5000);
};


  const handleSubmit = async (): Promise<void> => {
    console.log("Submitting session");
    const requestData = {
      patientFirstName: showNewPatientForm ? patientFirstName : patients.find(p => p.id.toString() === selectedPatientId)?.firstName || "",
      patientLastName: showNewPatientForm ? patientLastName : patients.find(p => p.id.toString() === selectedPatientId)?.lastName || "",
      sex,
      sessionType,
      noteFormat: noteFormat?.title || "SOAP Notes",
      language,
    };
    console.log("Session Data:", requestData);

    try {
      const session = await createSession(requestData);
      console.log("Session Created Successfully:", session);

      setModalVisible(false);
      setRecordingEnabled(true);
      setIsSessionCreated(true);
      setStep(1);
      setSelectedPatientId("");
      setPatientFirstName("");
      setPatientLastName("");
      setShowNewPatientForm(false);
      setSex("Male");
      setSessionType("Telehealth");
      setLanguage("English");

      try {
        toast("Session created successfully!");
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
        toast("Failed to create session: " + errorMessage);
      } catch (toastError: any) {
        console.warn("Toast failed:", toastError.message);
        Alert.alert("Notification", "Failed to create session: " + errorMessage);
      }
    }
  };

 const checkSessionCreationUsage = () => {
  if (!user || !user.userPlan || !user.userPlan.usage) {
    toast("User plan data is missing. Please upgrade your plan.");
    router.push({ pathname: '/UpgradePlan' });
    return false;
  }

  const sessionCreationUsage = user.userPlan.usage.find(
    (usage) => usage.featureName === PlanFeatureNameEnum.SESSION_CREATION
  );

  if (!sessionCreationUsage) {
    toast("Session creation feature not available. Please upgrade your plan.");
    router.push({ pathname: '/UpgradePlan' });
    return false;
  }

  if (sessionCreationUsage.left === null || sessionCreationUsage.left <= 0) {
    toast("Session creation limit reached. Please upgrade your plan.");
    router.push({ pathname: '/UpgradePlan' });
    return false;
  }

  return true;
};


  const handleNextStep = () => {
  if (step === 1) {
    if (!selectedPatientId && !showNewPatientForm) {
      toast("Please select a patient or create a new one.");
      return;
    }
    if (showNewPatientForm && (!patientFirstName || !patientLastName)) {
      toast("First name and last name are required for a new patient.");
      return;
    }
  }
  if (step < 5) {
    setStep(step + 1);
  } else {
    handleSubmit();
  }
};

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStepIndicator = () => {
    const steps = ["Patient", "Sex", "Session Type", "Note Format", "Language"];
    return (
      <View style={styles.stepIndicatorContainer}>
        {steps.map((label, index) => (
          <View key={index} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                step === index + 1 ? styles.activeStepCircle : step > index + 1 ? styles.completedStepCircle : {},
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  step === index + 1 ? styles.activeStepNumber : step > index + 1 ? styles.completedStepNumber : {},
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <View style={styles.stepLabelContainer}>
              <Text
                style={[
                  styles.stepLabel,
                  step === index + 1 ? styles.activeStepLabel : step > index + 1 ? styles.completedStepLabel : {},
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  step > index + 1 ? styles.activeStepConnector : {},
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text style={styles.label}>Select Patient</Text>
            <PatientDropdown
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={(value) => {
                setSelectedPatientId(value);
                setShowNewPatientForm(value === 'new');
              }}
            />
            {showNewPatientForm && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={styles.inputGroup}>
                    <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={patientFirstName}
                      onChangeText={setPatientFirstName}
                      placeholder="First Name"
                      placeholderTextColor="#999"
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
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        );
      case 2:
        return (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Sex</Text>
            <View style={styles.dropdownWrapper}>
              <MaterialIcons name="wc" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                label="Sex"
                options={["Male", "Female"]}
                selectedValue={sex}
                onValueChange={setSex}
              />
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Session Type</Text>
            <View style={styles.dropdownWrapper}>
              <MaterialIcons name="event" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                label="Session Type"
                options={["Telehealth", "Phone", "In Person"]}
                selectedValue={sessionType}
                onValueChange={setSessionType}
              />
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Note Format</Text>
            <View style={styles.dropdownWrapper}>
              <MaterialIcons name="description" size={20} color="#666" style={styles.inputIcon} />
              {noteFormats.length > 0 ? (
                <Picker
                  style={{ height: 50, width: "100%" }}
                  selectedValue={noteFormat ? noteFormat.title : ""}
                  onValueChange={(title) => {
                    const selectedFormat = noteFormats.find(format => format.title === title);
                    setNoteFormat(selectedFormat || null);
                  }}
                >
                  {noteFormats.map((format, index) => (
                    <Picker.Item key={index} label={format.title} value={format.title} />
                  ))}
                </Picker>
              ) : (
                <Text style={{ color: "red", marginLeft: 12 }}>No note formats available</Text>
              )}
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.dropdownWrapper}>
              <MaterialIcons name="language" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                label="Language"
                options={["English", "Arabic"]}
                selectedValue={language}
                onValueChange={setLanguage}
              />
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
            style={[
              styles.loadingStep,
              {
                opacity: stepAnimations[index],
                transform: [
                  {
                    translateY: stepAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.loadingCircle,
                index < currentStep ? styles.completedLoadingCircle : index === currentStep ? styles.activeLoadingCircle : {},
              ]}
            >
              {index < currentStep && (
                <MaterialIcons name="check" size={16} color="#fff" />
              )}
              {index === currentStep && (
                <MaterialIcons name="hourglass-empty" size={16} color="#fff" />
              )}
            </View>
            <Text
              style={[
                styles.loadingStepText,
                index <= currentStep ? styles.activeLoadingStepText : {},
              ]}
            >
              {step}
            </Text>
          </Animated.View>
        ))}
      </View>
    );
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const renderRecordingModal = () => {
    console.log("Rendering recording modal, visible:", recordingModalVisible);
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={recordingModalVisible}
        onRequestClose={() => {
          if (!isRecording) {
            console.log("Closing recording modal via onRequestClose");
            setRecordingModalVisible(false);
          }
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlayy}
          activeOpacity={1}
          onPress={() => {
            if (!isRecording) {
              console.log("Closing recording modal via overlay press");
              setRecordingModalVisible(false);
            }
          }}
        >
          <TouchableWithoutFeedback>
            <View style={styles.bottomSheet}>
              <View style={styles.handle} />
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.cardheader}>Recording Session</Text>
                </View>
                <View style={styles.analyzerContainer}>
                  {barAnimations.map((anim, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.analyzerBar,
                        {
                          transform: [
                            {
                              scaleY: anim.interpolate({
                                inputRange: [0.2, 1],
                                outputRange: [0.2, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.recordingTime}>
                  {formatTime(recordingTime)}
                </Text>
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={async () => {
                    console.log("Stop button pressed");
                    try {
                      await stopRecording();
                      setRecordingModalVisible(false);
                    } catch (error) {
                      console.error("Error stopping recording:", error);
                      Alert.alert("Error", "Failed to stop recording.");
                    }
                  }}
                >
                  <Text style={styles.stopButtonText}>Stop Recording</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    );
  };

 const handleFloatingButtonPress = async () => {
  console.log("handleFloatingButtonPress called, isSessionCreated:", isSessionCreated, "isRecording:", isRecording);
  if (isSessionCreated && !isRecording) {
    try {
      console.log("Setting recordingModalVisible to true");
      setRecordingModalVisible(true);
      await startRecording();
    } catch (error) {
      console.error("Failed to start recording:", error);
      console.log("Setting recordingModalVisible to false due to error");
      setRecordingModalVisible(false);
      Alert.alert("Error", "Failed to start recording. Please check microphone permissions.");
    }
  } else if (isRecording) {
    try {
      console.log("Stopping recording");
      await stopRecording();
      console.log("Setting recordingModalVisible to false after stopping");
      setRecordingModalVisible(false);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording.");
    }
  } else {
    console.log("Checking session creation usage");
    if (checkSessionCreationUsage()) {
      console.log("Navigating to CreateSessionScreen");
      router.push({ pathname: '/CreateSession' });
    }
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
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.dashboardContainer}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="event" size={24} color="#2D796C" />
            <Text style={styles.statValue}>{stats.sessionCount}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="check-circle" size={24} color="#2D796C" />
            <Text style={styles.statValue}>{stats.sessionCompletedCount}</Text>
            <Text style={styles.statLabel}>Completed Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="timer" size={24} color="#2D796C" />
            <Text style={styles.statValue}>{stats.sessionTotalDuration}</Text>
            <Text style={styles.statLabel}>Total Duration (mins)</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="schedule" size={24} color="#2D796C" />
            <Text style={styles.statValue}>{stats.sessionDurationAvg} mins</Text>
            <Text style={styles.statLabel}>Average Duration</Text>
          </View>
        </View>

        <View style={styles.dateRangeContainer}>
          <TouchableOpacity
            style={styles.dateRangeButton}
            onPress={() => setShowDatePickerModal(true)}
          >
            <MaterialIcons name="calendar-today" size={16} color="#666" />
            <Text style={styles.dateRangeText}>
              {new Date(dateRange.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })} - {new Date(dateRange.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </TouchableOpacity>
        </View>

        <LineChart
          data={graphChartData}
          width={SCREEN_WIDTH - 40}
          height={220}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: () => "#2D796C",
            labelColor: () => "#666",
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#2D796C",
            },
            fillShadowGradient: "#2D796C",
            fillShadowGradientOpacity: 0.2,
            propsForLabels: {
              fontSize: 10,
              rotation: 0,
              translateY: 10,
              translateX: 10,
            },
          }}
          style={styles.chart}
          bezier
          formatXLabel={(value: string) => (value.trim() !== "" ? value : "")}
        />
        <DatePickerModal
          visible={showDatePickerModal}
          onClose={() => setShowDatePickerModal(false)}
          onSelectDateRange={(startDate, endDate) => {
            setDateRange({ startDate, endDate });
            setShowDatePickerModal(false);
          }}
        />
      </ScrollView>
      {!isSessionCreated ? (
        <TouchableOpacity style={styles.floatingButton} onPress={handleFloatingButtonPress}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleFloatingButtonPress}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
            <MaterialIcons name={isRecording ? "stop" : "mic"} size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlayy}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 0 }}
          >
            <View style={styles.bottomSheet}>
              <View style={styles.handle} />
              <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                contentInset={{ bottom: 20 }}
                bounces={false}
              >
                <View style={{ flexGrow: 1 }}>
                  <View style={styles.card}>
                    <View style={styles.headerRow}>
                      <Text style={styles.cardheader}>Create Session</Text>
                    </View>

                    {renderStepIndicator()}
                    {renderStepContent()}

                    <View style={styles.stepperButtonContainer}>
                      {step > 1 && (
                        <TouchableOpacity style={styles.prevButton} onPress={handlePrevStep}>
                          <Text style={styles.prevButtonText}>Previous</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
                        <Text style={styles.nextButtonText}>{step === 5 ? "Submit" : "Next"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal> */}

      <Modal
        animationType="fade"
        transparent={true}
        visible={upgradeModalVisible}
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.upgradeModalOverlay}>
          <View style={styles.upgradeModalContent}>
            <Text style={styles.upgradeModalTitle}>Upgrade Required</Text>
            <Text style={styles.upgradeModalText}>
              You have reached the limit for {PlanFeatureNameEnum.SESSION_CREATION}.
              Please upgrade your plan to create more sessions.
            </Text>
            <View style={styles.upgradeModalButtons}>
              <TouchableOpacity
                style={[styles.upgradeModalButton, styles.cancelButton]}
                onPress={() => setUpgradeModalVisible(false)}
              >
                <Text style={styles.upgradeModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.upgradeModalButton, styles.upgradeButton]}
                onPress={() => {
                  setUpgradeModalVisible(false);
                  router.push({
                    pathname: '/UpgradePlan',
                  });
                }}
              >
                <Text style={styles.upgradeModalButtonText}>Upgrade Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

     
      {renderRecordingModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "white",
    flex: 1,
    justifyContent: "center",
  } as ViewStyle,
  analyzerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 100,
    marginVertical: 20,
  },
  analyzerBar: {
    width: 10,
    height: "100%",
    backgroundColor: "#2D796C",
    marginHorizontal: 5,
    borderRadius: 5,
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: "#2D796C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom:20,
    backgroundColor: "white",
  } as ViewStyle,
  headerContent: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
  } as TextStyle,
  refreshButton: {
    padding: 8,
  } as ViewStyle,
  dashboardContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
  } as ViewStyle,
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  } as ViewStyle,
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D796C",
    marginTop: 5,
  } as TextStyle,
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  } as TextStyle,
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  } as ViewStyle,
  dateRangeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  dateRangeText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  } as TextStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "90%",
    maxHeight: "95%",
    minHeight: 400,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  } as ViewStyle,
  scrollContent: {
    pointerEvents: "auto",
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  } as ViewStyle,
  modalHeaderIcon: {
    marginRight: 8,
  } as TextStyle,
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  } as TextStyle,
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  } as TextStyle,
  calendarContainer: {
    marginBottom: 12,
  } as ViewStyle,
  calendar: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  } as ViewStyle,
  dateRangeInput: {
    marginBottom: 12,
  } as ViewStyle,
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  } as ViewStyle,
  modalDateRangeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  } as TextStyle,
  quickSelectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  } as ViewStyle,
  quickSelectGridButton: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  } as ViewStyle,
  quickSelectIcon: {
    marginRight: 6,
  } as TextStyle,
  quickSelectGridText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1f2937",
  } as TextStyle,
  quickSelectHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  } as TextStyle,
  quickSelectList: {
    marginBottom: 12,
  } as ViewStyle,
  quickSelectListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  } as ViewStyle,
  quickSelectListIcon: {
    marginRight: 8,
  } as TextStyle,
  quickSelectListText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#1f2937",
  } as TextStyle,
  quickSelectListArrow: {
    marginLeft: 8,
  } as TextStyle,
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D796C",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  } as ViewStyle,
  applyButtonIcon: {
    marginRight: 4,
  } as TextStyle,
  applyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  } as TextStyle,
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  } as ViewStyle,
  floatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2D796C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  } as ViewStyle,
  modalOverlayy: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 1000,
  } as ViewStyle,
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get("window").height * 0.8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1001,
  } as ViewStyle,
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  } as ViewStyle,
  // scrollContainer: {
  //   flexGrow: 1,
  //   paddingHorizontal: 16,
  //   paddingVertical: 20,
  // } as ViewStyle,
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    padding: 20,
    width: "100%",
  } as ViewStyle,
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  } as ViewStyle,
  cardheader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D796C",
  } as TextStyle,
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
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
  formGroup: {
    marginBottom: 16,
  } as ViewStyle,
  label: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
  } as TextStyle,
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  } as ViewStyle,
  inputIcon: {
    marginRight: 12,
  } as TextStyle,
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  } as TextStyle,
  picker: {
    flex: 1,
    height: 50,
    color: "#1F2937",
    fontSize: 16,
  } as TextStyle,
  dropdownWrapper: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  stepperButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  } as ViewStyle,
  prevButton: {
    flex: 1,
    backgroundColor: "#D3D3D3",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  } as ViewStyle,
  prevButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  nextButton: {
    flex: 1,
    backgroundColor: "#2D796C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 8,
  } as ViewStyle,
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  upgradeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  upgradeModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    alignItems: "center",
  } as ViewStyle,
  upgradeModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D796C",
    marginBottom: 12,
  } as TextStyle,
  upgradeModalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  } as TextStyle,
  upgradeModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  } as ViewStyle,
  upgradeModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  } as ViewStyle,
  cancelButton: {
    backgroundColor: "#E5E7EB",
  } as ViewStyle,
  upgradeButton: {
    backgroundColor: "#2D796C",
  } as ViewStyle,
  upgradeModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  loadingModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    alignItems: "center",
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
    color: "#000",
  } as TextStyle,
});

export default FormScreen;

function refreshToken(): any {
  throw new Error("Function not implemented.");
}
function fetchProfile(): any {
  throw new Error("Function not implemented.");
}

