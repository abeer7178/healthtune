import { create } from "zustand";
import { fetchSessions, fetchPlans, fetchNoteFormats, fetchUserStats, fetchStatsGraph, fetchPatients } from "../../src/api/api";

interface Session {
  summary: any;
  duration: any;
  date: any;
  patientId: string;
  id: string;
 
  patientName: string;
  sex: string;
  sessionType: string;
  status: string;
  note?: {
    content: {
      note: string;
    };
  };
}

interface ProfileImage {
  id: number;
  fileName: string;
}

interface PlanFeature {
  id: number;
  displayName: string;
  description: string | null;
  featureId: number;
  properties: {
    limit?: number | null;
    limitType?: string | null;
    isUnlimited?: boolean;
  };
  feature: {
    id: number;
    name: string;
    module: string;
    defaultProperties: {
      limit?: number;
      limitType?: string;
      isUnlimited?: boolean;
    };
  };
}

interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  planType: string;
  stripePriceId: string;
  stripeProductId: string;
  features: PlanFeature[];
}

interface Usage {
  featureName: string;
  left: number;
  total: number;
}

interface UserPlan {
  id: number;
  userId: number;
  planId: number;
  startDate: string;
  endDate: string;
  lastSubscriptionDate: string | null;
  resetDate: string;
  isSubscriptionActive: boolean;
  plan: Plan;
  usage: Usage[];
}

interface User {
  id: number;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  imageUrl: string;
  profileImage: ProfileImage;
  banned: boolean;
  passwordEnabled: boolean;
  twoFactorEnabled: boolean;
  primaryEmailAddressId: string;
  publicMetadata: Record<string, any>;
  privateMetadata: Record<string, any>;
  unsafeMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  userPlanId: number;
  cardAdded: boolean;
  stripeCustomerId: string;
  stripeSubscriptiontId: string | null;
  userPlan: UserPlan;
}

interface NoteFormat {
  id: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  prompt: string;
  language: string;
}

interface Patient {
  id: number;
  createdAt: string;
  updatedAt: string;
  mreNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string;
  maritalStatus: string | null;
  nationality: string | null;
  occupation: string | null;
  profileImage: string | null;
  doctorId: number;
  address: {
    streetAddress: string | null;
    city: string | null;
    area: string | null;
    postalCode: string | null;
    country: string | null;
  };
  contactDetails: {
    phoneNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactRelationship: string | null;
    emergencyContactPhone: string | null;
  };
  medicalDetails: {
    bloodType: string | null;
    medicalHistory: string | null;
    allergies: string | null;
    currentMedications: string | null;
    chronicDiseases: string | null;
    surgicalHistory: string | null;
    isSmoker: boolean;
    isAlcoholic: boolean;
  };
  insuranceDetails: {
    isInsured: boolean;
    insuranceProvider: string | null;
    insurancePolicyNumber: string | null;
    insuranceExpiryDate: string | null;
  };
  admissionDetails: {
    isDischarged: boolean | null;
    admissionReason: string | null;
    roomNumber: string | null;
    admissionDate: string | null;
    dischargeDate: string | null;
  };
}

interface StoreState {
  session: any | null;
  transcription: string | null;
  sessions: Session[];
  user: User | null;
  plans: Plan[];
  noteFormats: NoteFormat[];
  noteFormat: any | null;
  stats: any;
  graphData: any[];
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  error: string | null;

  setSession: (sessionData: any) => void;
  setTranscription: (text: string) => void;
  setUser: (userData: User) => void;
  setNoteFormats: (noteFormats: NoteFormat[]) => void;
  setStats: (stats: any) => void;
  setGraphData: (graphData: any[]) => void;
  setPatients: (patients: Patient[]) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  clearSession: () => void;
  fetchAllSessions: (token: string) => Promise<void>;
  fetchAllPlans: () => Promise<void>;
  fetchNoteFormats: () => Promise<void>;
  fetchPatients: (page?: number, limit?: number) => Promise<void>;
  fetchDashboardData: (startDate: string, endDate: string) => Promise<void>;
}

export const useSessionStore = create<StoreState>((set) => ({
  session: null,
  transcription: null,
  sessions: [],
  user: null,
  plans: [],
  noteFormats: [],
  noteFormat: null,
  stats: null,
  graphData: [],
  patients: [],
  selectedPatient: null,
  loading: false,
  error: null,

  setSession: (sessionData) => set({ session: sessionData }),
  setTranscription: (text) => set({ transcription: text }),
  setUser: (userData) => set({ user: userData }),
  setNoteFormats: (noteFormats) => set({ noteFormats }),
  setStats: (stats) => set({ stats }),
  setGraphData: (graphData) => set({ graphData }),
  setPatients: (patients) => set({ patients }),
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),
  clearSession: () => set({ session: null, transcription: null }),

  fetchAllSessions: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const [sessionsData, noteFormatsData] = await Promise.all([
        fetchSessions(token),
        fetchNoteFormats(),
      ]);
      set({
        sessions: sessionsData.data,
        noteFormats: noteFormatsData,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchAllPlans: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchPlans();
      set({ plans: data.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchNoteFormats: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchNoteFormats();
      set({ noteFormats: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchPatients: async (page = 1, limit = 10) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchPatients(page, limit);
      set({ patients: data.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchDashboardData: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });
    try {
      const [statsData, graphData] = await Promise.all([
        fetchUserStats(),
        fetchStatsGraph(startDate, endDate),
      ]);
      set({
        stats: statsData.data,
        graphData: graphData.data,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));