import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSessionStore } from "../../src/store/store";
import { Alert } from "react-native";


const BASE_URL = "https://dev-api.healthtune.io/api/";

const getFreshToken = async () => {
  let token = await AsyncStorage.getItem('userToken');
  if (!token) {
    // Since useClerk can't be used here, rely on AsyncStorage
    throw new Error('Authentication failed! Please log in.');
  }
  return token;
};
export const sendAIGeneratedNotes = async (notes: string) => {
  try {
    const token = await getFreshToken();
    const { session } = useSessionStore.getState();
    if (!session || !session.id) throw new Error("Session ID is missing.");

    const sessionId = session.id;
    const url = `${BASE_URL}session/${sessionId}/note`;
    const requestData = {
      content: {
        note: notes,
      },
    };

    console.log("Sending AI Generated Notes Request:", { url, requestData });
    const response = await axios.put(url, requestData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("AI Generated Notes Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending AI generated notes:", error);
    throw error;
  }
};

export const sendDoctorNotes = async (notes: string) => {
  try {
    const token = await getFreshToken();
    const { session } = useSessionStore.getState();
    if (!session || !session.id) throw new Error("Session ID is missing.");

    const sessionId = session.id;
    const url = `${BASE_URL}session/${sessionId}/doctor-note`;
    const requestData = {
      content: {
        note: notes,
      },
    };

    console.log("Sending Doctor Notes Request:", { url, requestData });
    const response = await axios.put(url, requestData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("Doctor Notes Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending doctor notes:", error);
    throw error;
  }
}
export const createAppointment = async (appointmentData: {
  patientId: number;
  color: string;
  duration: number;
  appointmentDate: string;
  appointmentType?: string;
  consultationFee?: number;
  location?: string;
  isTelemedicine?: boolean;
  roomNumber?: string;
  notes?: string;
}) => {
  try {
    const token = await getFreshToken();
    const response = await axios.post(`${BASE_URL}appointment/`, appointmentData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const fetchAppointments = async (page: number = 1, limit: number = 10) => {
  try {
    const token = await getFreshToken();
    const response = await axios.get(`${BASE_URL}appointment/?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

export const fetchPlans = async (page: number = 1, limit: number = 10) => {
  try {
    const token = await getFreshToken();
    const response = await axios.get(`${BASE_URL}plan/?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
};
export const updatePlan = async (planId: number) => {
  try {
    console.log(`updatePlan: Initiating plan update for planId=${planId}`);
    const token = await getFreshToken();
    console.log(`updatePlan: Retrieved token=${token}`);
    const url = `${BASE_URL}user/plan/${planId}`;
    console.log(`updatePlan: Sending POST request to ${url}`);
    const response = await axios.put(url, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`updatePlan: Received response:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
};

export const cancelSubscription = async () => {
  try {
    console.log(`cancelSubscription: Initiating subscription cancellation`);
    const token = await getFreshToken();
    console.log(`cancelSubscription: Retrieved token=${token}`);
    const url = `${BASE_URL}user/plan/cancel-subscription`;
    console.log(`cancelSubscription: Sending POST request to ${url}`);
    const response = await axios.put(url, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`cancelSubscription: Received response:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

export const fetchAppointmentsByPatient = async (patientId: number, page: number = 1, limit: number = 10) => {
  try {
    const token = await getFreshToken();
    const response = await axios.get(
      `${BASE_URL}appointment/?patientId=${patientId}&page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log(`Fetch appointments by patient ${patientId} response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching appointments for patient ${patientId}:`, error);
    throw error;
  }
};

export const fetchNoteFormats = async (page: number = 1, limit: number = 10) => {
  try {
    const token = await getFreshToken();
    const url = `${BASE_URL}template/`;
    const headers = { Authorization: `Bearer ${token}`, 'Accept-Language': 'en' };
    const response = await axios.get(url, { 
      headers, 
      params: { page, limit }
    });
    return response.data.data; // Return only the array of note formats
  } catch (error: any) {
    throw error;
  }
};
export const fetchPatients = async (page: number = 1, limit: number = 10) => {
  try {
    const token = await getFreshToken();
    const response = await axios.get(`${BASE_URL}patient/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    //console.error('Error fetching patients:', error);
    throw error;
  }
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

export const fetchUserStats = async () => {
  try {
    // Retrieve authentication token
    const token = await getFreshToken();
    // Construct the API URL
    const url = `${BASE_URL}user/stats`;
    // Log the request for debugging
    console.log("Fetching user stats from:", url);
    // Make the GET request with authorization header
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Log the response for debugging
    console.log("User Stats Response:", response.data);
    // Return the response data
    return response.data;
  } catch (error: any) {
    console.error(Response);
    // Log and rethrow the error
    console.error("Error fetching user stats:", error);
    throw error;
  }
};

// Fetch stats graph data from /user/stats-graph endpoint
export const fetchStatsGraph = async (startDate: string, endDate: string) => {
  try {
    // Retrieve authentication token
    const token = await getFreshToken();
    // Construct the API URL with query parameters
    const url = `${BASE_URL}user/stats-graph?startDate=${startDate}&endDate=${endDate}`;
    // Log the request for debugging
    console.log("Fetching stats graph from:", url);
    // Make the GET request with authorization header
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Log the response for debugging
    console.log("Stats Graph Response:", response.data);
    // Return the response data
    return response.data;
  } catch (error: any) {
    // Log and rethrow the error
    console.error("Error fetching stats graph:", error);
    throw error;
  }
};
export const fetchSessions = async (token: string) => {
  try {
    if (!token) throw new Error("No token available");

    const response = await axios.get(`${BASE_URL}session/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }
};

export const sendSessionData = async (text?: any, p0?: null, p1?: null
 
) => {
  try {
    const token = await getFreshToken();
    const { transcription, session: storeSession, noteFormats } = useSessionStore.getState();
    if (!storeSession) throw new Error("Session data is missing.");

    const transcriptionArray = (transcription || "No transcription available")
      .split(". ")
      .filter(line => line.trim() !== "")
      .map(line => ({ "null": line.trim() + (line.endsWith(".") ? "" : ".") }));

    // Look up the prompt from noteFormats based on the title stored in session.noteFormat
    const selectedNoteFormat = noteFormats?.find(format => format.title === storeSession.noteFormat);
    const selectedPrompt = selectedNoteFormat?.prompt || "SOAP";

    const promptData = {
      transcript: JSON.stringify({ transcription: transcriptionArray }),
      patient: storeSession.patientName || "Unknown",
      sex: storeSession.sex || "Unknown",
      noteFormat: selectedPrompt, // Use the prompt corresponding to the selected title
      sessionType: storeSession.sessionType || "General",
      notes: selectedPrompt, // Use the same prompt for notes
      language: storeSession.language || "English"
    };

    const requestData = { prompt: JSON.stringify(promptData) };

    console.log("Sending Request:", requestData);
    console.log("Sending Request:", token);

    const response = await axios.post(
      `https://dev-app.healthtune.io/api/session-notes`,
      requestData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data; // Return the response data directly
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
    console.log(Response);
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const uploadProfileImage = async (formData: FormData) => {
  try {
    const token = await getFreshToken();
    formData.append('type', 'User');

    // Log request details
    const url = `${BASE_URL}upload`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    };
    const formDataEntries: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
      formDataEntries[key] = value;
    }
    console.log('Upload Profile Image Request:', {
      url,
      method: 'POST',
      headers,
      formData: formDataEntries,
    });

    const response = await axios.post(url, formData, { headers });

    // Log response details
    console.log('Upload Profile Image Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    });

    return response.data.data;
  } catch (error: any) {
    console.error('Error uploading profile image:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data,
        backendMessages: error.response.data?.message || 'No additional messages provided',
      } : null,
    });
    throw error;
  }
};

export const updateProfileImage = async (imageId: string, formData: FormData) => {
  try {
    const token = await getFreshToken();
    formData.append('type', 'User');

    // Log request details
    const url = `${BASE_URL}upload/${imageId}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    };
    const formDataEntries: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
      formDataEntries[key] = value;
    }
    console.log('Update Profile Image Request:', {
      url,
      method: 'PUT',
      headers,
      formData: formDataEntries,
    });

    const response = await axios.put(url, formData, { headers });

    // Log response details
    console.log('Update Profile Image Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    });

    return response.data.data;
  } catch (error: any) {
    console.error('Error updating profile image:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data,
        backendMessages: error.response.data?.message || 'No additional messages provided',
      } : null,
    });
    throw error;
  }
};

export const updateUser = async (userData: {
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImageId?: string;
}) => {
  try {
    const token = await getFreshToken();

    const payload: any = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
    };

    if (userData.profileImageId) {
      payload.profileImageId = userData.profileImageId;
    }

    const response = await axios.put(`${BASE_URL}user/`, JSON.stringify(payload), {
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
    console.error('Error updating user:', error);
    throw error;
  }
  
};