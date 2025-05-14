import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import moment from 'moment';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { fetchAppointmentsByPatient } from '../../src/api/api';
import HeartbeatAnimation from '../components/ui/LoaderAnimation';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  mreNumber: string;
}

interface Appointment {
  id: number;
  patientId: number;
  patient: Patient;
  appointmentDate: string;
  duration: number;
  appointmentType?: string;
  consultationFee?: number;
  location?: string;
  isTelemedicine: boolean;
  roomNumber?: string;
  notes?: string;
  color: string;
  status?: string;
  doctor?: {
    firstName: string;
    lastName: string;
  };
  reasonForVisit?: string;
  createdAt: string;
  updatedAt: string;
}

const AppointmentDetailsScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = Number(params.patientId);
  const patientName = params.patientName as string;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPatientAppointments = async () => {
      if (!patientId || isNaN(patientId)) {
        Alert.alert('Error', 'Invalid Patient ID');
        return;
      }

      try {
        setLoading(true);
        const data = await fetchAppointmentsByPatient(patientId);
        setAppointments(data.data || []);
      } catch (error) {
        Alert.alert('Error', `Failed to fetch appointments for ${patientName}`);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientAppointments();
  }, [patientId, patientName]);

  if (loading) {
    return (
       <View style={styles.loadingContainer}>
        <HeartbeatAnimation />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
        <View style={styles.headerContent}>
         
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <Text style={styles.headerSubtitle}>Details for {patientName}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {appointments.length === 0 ? (
          <Text style={styles.noDataText}>No appointments found for {patientName}</Text>
        ) : (
          <>
            <View style={styles.patientHeader}>
              <Text style={styles.patientTitle}>{patientName}</Text>
              <View style={styles.infoRow}>
                <Feather name="user" size={18} color="#6B7280" />
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>MRN: </Text>
                  {appointments[0]?.patient.mreNumber || 'N/A'}
                </Text>
              </View>
            </View>
            {appointments.map((appointment, index) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <Text style={styles.appointmentDate}>
                  {moment(appointment.appointmentDate).format('MMM DD, YYYY')}
                </Text>
                <View style={styles.infoRow}>
                  <Feather name="calendar" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Time: </Text>
                    {moment(appointment.appointmentDate).format('HH:mm')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Duration: </Text>
                    {appointment.duration} minutes
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="check-circle" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Status: </Text>
                    {appointment.status || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="user-check" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Doctor: </Text>
                    {appointment.doctor?.firstName || 'Unknown'} {appointment.doctor?.lastName || ''}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="tag" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Type: </Text>
                    {appointment.appointmentType || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="dollar-sign" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Consultation Fee: </Text>
                    {appointment.consultationFee ? `$${appointment.consultationFee}` : 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="map-pin" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Location: </Text>
                    {appointment.location || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="video" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Mode: </Text>
                    {appointment.isTelemedicine ? 'Telemedicine' : 'In-Person'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="home" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Room Number: </Text>
                    {appointment.roomNumber || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="file-text" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Notes: </Text>
                    {appointment.notes || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="alert-circle" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Reason for Visit: </Text>
                    {appointment.reasonForVisit || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Created At: </Text>
                    {moment(appointment.createdAt).format('MMM DD, YYYY HH:mm')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={18} color="#6B7280" />
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Updated At: </Text>
                    {moment(appointment.updatedAt).format('MMM DD, YYYY HH:mm')}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginTop: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  patientHeader: {
    marginBottom: 20,
  },
  patientTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  appointmentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appointmentDate: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    fontWeight: '500',
    marginLeft: 12,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#2D796C',
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 32,
    fontWeight: '500',
  },
});

export default AppointmentDetailsScreen;