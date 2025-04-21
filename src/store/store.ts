import { create } from "zustand";
import { fetchSessions } from "~/src/api/api";

interface Session {
  summary: any;
  duration: any;
  date: any;
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

interface User {
  id: number;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  profileImage: string | null;
  banned: boolean;
  passwordEnabled: boolean;
  twoFactorEnabled: boolean;
  primaryEmailAddressId: string;
  publicMetadata: Record<string, any>;
  privateMetadata: Record<string, any>;
  unsafeMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  userPlanId: number | null;
  cardAdded: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptiontId: string | null;
  userPlan: {
    usage: any[];
  };
}

interface StoreState {
  session: any | null;
  transcription: string | null;
  sessions: Session[];
  user: User | null;
  loading: boolean;
  error: string | null;

  setSession: (sessionData: any) => void;
  setTranscription: (text: string) => void;
  setUser: (userData: User) => void;
  clearSession: () => void;
  fetchAllSessions: (token: string) => Promise<void>;
}

export const useSessionStore = create<StoreState>((set) => ({
  session: null,
  transcription: null,
  sessions: [],
  user: null,
  loading: false,
  error: null,

  setSession: (sessionData) => set({ session: sessionData }),
  setTranscription: (text) => set({ transcription: text }),
  setUser: (userData) => set({ user: userData }),
  clearSession: () => set({ session: null, transcription: null }),

  fetchAllSessions: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchSessions(token);
      set({ sessions: data.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));