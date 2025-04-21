import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSessionStore } from "~/src/store/store";
import { Alert } from "react-native";

const BASE_URL = "https://dev-api.healthtune.io/api/";

const getFreshToken = async () => {
  const token = await AsyncStorage.getItem("userToken");
  if (!token) throw new Error("Authentication failed! Please log in.");
  return token;
};

export const createSession = async (sessionData: any) => {
  try {
    const token = await getFreshToken();
    const response = await axios.post(`${BASE_URL}session/`, sessionData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Created Session Response:", response.data);
    const sessionDataFormatted = response.data.data;
    useSessionStore.getState().setSession(sessionDataFormatted);
    return sessionDataFormatted;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const fetchSessions = async (token: string, page = 1, limit = 10) => {
  try {
    if (!token) throw new Error("No token available");

    const response = await axios.get(`${BASE_URL}session/?page=${page}&limit=${limit}&sort=DESC`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }
};

export const sendSessionData = async () => {
  try {
    const token = await getFreshToken();
    const { transcription, session } = useSessionStore.getState();
    if (!session) throw new Error("Session data is missing.");

    const transcriptionArray = (transcription || "No transcription available")
      .split(". ")
      .filter(line => line.trim() !== "")
      .map(line => ({ "null": line.trim() + (line.endsWith(".") ? "" : ".") }));

    const promptData = {
      transcript: JSON.stringify({ transcription: transcriptionArray }),
      patient: session.patientName || "Unknown",
      sex: session.sex || "Unknown",
      noteFormat: "Generate a Pediatric Progress Note with the following structure:\n\nChief Complaint:\nSummarize the reason for the visit in the caregiver’s and/or child’s own words.\n\nHistory of Present Illness:\nDetail symptom onset, duration, severity, and any interventions attempted at home.\n\nDevelopmental and Behavioral Observations:\nRecord the child’s motor skills, cognitive function, speech, and behavioral responses.\n\nAssessment:\nProvide diagnostic impressions and relevant test findings.\n\nPlan:\nOutline treatment steps, medication recommendations, and follow-up schedules.",
      sessionType: session.sessionType || "General",
      notes: "[]",
      language: session.language || "English"
    };

    const requestData = { prompt: JSON.stringify(promptData) };

    console.log("Sending Request:", requestData);
    console.log("Sending Request:", token);

    const response = await axios.post(
      `https://dev-app.healthytune.com/api/session-notes`,
      requestData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    Alert.alert("Pediatric Progress Note", response.data);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const fetchUser = async () => {
  try {
    const token = await getFreshToken();
    const response = await axios.get(`${BASE_URL}user/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("User Data Response:", response.data);
    const userData = response.data.data;
    useSessionStore.getState().setUser(userData);
    return userData;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const updateUser = async (userData: {
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
}) => {
  try {
    const token = await getFreshToken();

    const payload: any = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
    };

    if (userData.imageUrl) {
      payload.imageUrl = userData.imageUrl;
    }

    const response = await axios.put(`${BASE_URL}user/`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Update User Response:', response.data);
    const updatedUserData = response.data.data;
    useSessionStore.getState().setUser(updatedUserData);
    return updatedUserData;
  } catch (error) {
    console.log(userData.imageUrl);
    console.error('Error updating user:', error);
    throw error;
  }


};