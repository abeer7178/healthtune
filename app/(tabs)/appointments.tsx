import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import moment from 'moment';
import { useSessionStore } from '../../src/store/store';
import PatientDropdown from '../../src/components/ui/PatientDropdown';
import { router } from 'expo-router';
import { createAppointment, fetchAppointments, fetchPatients } from '../../src/api/api';
import Toast from 'react-native-toast-message';
import HeartbeatAnimation from '../../src/components/ui/LoaderAnimation';

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
}

interface PatientWithAppointments {
  patient: Patient;
  appointments: Appointment[];
}

const AppointmentScreen: React.FC = () => {
  const { user } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [expandedPatients, setExpandedPatients] = useState<{ [key: number]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Create Appointment States
  const [patients, setPatients] = useState<Patient[]>([]);
  const [formData, setFormData] = useState({
    patientId: '',
    color: '#111111',
    duration: '45',
    appointmentDate: moment().toISOString(),
    appointmentType: '',
    consultationFee: '',
    location: '',
    isTelemedicine: false,
    roomNumber: '',
    notes: '',
  });

  // View Appointment States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [displayedPatients, setDisplayedPatients] = useState<PatientWithAppointments[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Fetch data with timeout
  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

  const groupAppointmentsByPatient = (appointments: Appointment[]): PatientWithAppointments[] => {
    const patientMap: { [key: number]: PatientWithAppointments } = {};

    appointments.forEach((appointment) => {
      if (!appointment.patient || !appointment.patient.id || !appointment.patientId) {
        console.warn('Skipping invalid appointment:', appointment);
        return;
      }
      const patientId = appointment.patientId;
      if (!patientMap[patientId]) {
        patientMap[patientId] = {
          patient: appointment.patient,
          appointments: [],
        };
      }
      patientMap[patientId].appointments.push(appointment);
    });

    return Object.values(patientMap).sort((a, b) =>
      `${a.patient.firstName} ${a.patient.lastName}`.localeCompare(`${b.patient.firstName} ${b.patient.lastName}`)
    );
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [patientsData, appointmentsData] = await Promise.all([
          Promise.race([fetchPatients(), timeout(5000)]),
          Promise.race([fetchAppointments(), timeout(5000)]),
        ]);
        if (isMounted) {
          console.log('Patients fetched:', patientsData.data?.length);
          console.log('Appointments fetched:', appointmentsData.data?.length);
          setPatients(patientsData.data || []);
          const appointments = appointmentsData.data || [];
          const enrichedAppointments = await Promise.all(
            appointments.map(async (appt: Appointment) => {
              if (!appt.patient || !appt.patient.id) {
                try {
                  const patient = patientsData.data.find((p: Patient) => p.id === appt.patientId);
                  return { ...appt, patient: patient || { id: appt.patientId, firstName: 'Unknown', lastName: '', mreNumber: 'N/A' } };
                } catch (error) {
                  console.error('Error enriching patient:', appt.patientId, error);
                  return { ...appt, patient: { id: appt.patientId, firstName: 'Unknown', lastName: '', mreNumber: 'N/A' } };
                }
              }
              return appt;
            })
          );
          const sortedAppointments = enrichedAppointments.sort(
            (a: Appointment, b: Appointment) =>
              new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
          );
          setAppointments(sortedAppointments);
          const groupedPatients = groupAppointmentsByPatient(sortedAppointments.slice(0, ITEMS_PER_PAGE));
          setDisplayedPatients(groupedPatients);
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch data. Please try again.',
        });
        console.error('Fetch error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchAppointmentsList = async () => {
    try {
      setLoading(true);
      const data = await Promise.race([fetchAppointments(), timeout(5000)]);
      const appointments = data.data || [];
      const enrichedAppointments = await Promise.all(
        appointments.map(async (appt: Appointment) => {
          if (!appt.patient || !appt.patient.id) {
            try {
              const patientData = await fetchPatients();
              const patient = patientData.data.find((p: Patient) => p.id === appt.patientId);
              return { ...appt, patient: patient || { id: appt.patientId, firstName: 'Unknown', lastName: '', mreNumber: 'N/A' } };
            } catch (error) {
              console.error('Error fetching patient for appointment:', appt.patientId, error);
              return { ...appt, patient: { id: appt.patientId, firstName: 'Unknown', lastName: '', mreNumber: 'N/A' } };
            }
          }
          return appt;
        })
      );
      const sortedAppointments = enrichedAppointments.sort(
        (a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
      );
      console.log('Appointments refreshed:', sortedAppointments.length);
      setAppointments(sortedAppointments);
      const groupedPatients = groupAppointmentsByPatient(sortedAppointments.slice(0, ITEMS_PER_PAGE * page));
      setDisplayedPatients(groupedPatients);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch appointments',
      });
      console.error('Fetch appointments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAppointmentsList();
      const data = await Promise.race([fetchPatients(), timeout(5000)]);
      setPatients(data.data || []);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Appointments refreshed successfully',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh appointments',
      });
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [page]);

  const loadMoreAppointments = () => {
    const nextPage = page + 1;
    const newDisplayed = appointments.slice(0, ITEMS_PER_PAGE * nextPage);
    const groupedPatients = groupAppointmentsByPatient(newDisplayed);
    setDisplayedPatients(groupedPatients);
    setPage(nextPage);
  };

  const handleCreateAppointment = async () => {
    if (!formData.patientId || !formData.appointmentDate) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Patient and appointment date are required',
      });
      return;
    }

    try {
      setLoading(true);
      const appointmentData = {
        patientId: parseInt(formData.patientId),
        color: formData.color,
        duration: parseInt(formData.duration) || 45,
        appointmentDate: formData.appointmentDate,
        ...(formData.appointmentType && { appointmentType: formData.appointmentType }),
        ...(formData.consultationFee && { consultationFee: parseFloat(formData.consultationFee) }),
        ...(formData.location && { location: formData.location }),
        isTelemedicine: formData.isTelemedicine,
        ...(formData.roomNumber && { roomNumber: formData.roomNumber }),
        ...(formData.notes && { notes: formData.notes }),
      };

      await createAppointment(appointmentData);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Appointment created successfully',
      });
      setFormData({
        patientId: '',
        color: '#111111',
        duration: '45',
        appointmentDate: moment().toISOString(),
        appointmentType: '',
        consultationFee: '',
        location: '',
        isTelemedicine: false,
        roomNumber: '',
        notes: '',
      });
      setModalVisible(false);
      await fetchAppointmentsList();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create appointment',
      });
      console.error('Create appointment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentPress = (patientId: number, patientName: string) => {
    if (!patientId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Patient ID is missing for this appointment',
      });
      return;
    }

    router.push({
      pathname: '/appointmentDetails',
      params: { patientId, patientName: patientName || 'Unknown' },
    });
  };

  const getStatusColor = (appointmentDate: string) => {
    const now = moment();
    const date = moment(appointmentDate);
    return date.isAfter(now) ? '#2D796C' : '#6B7280';
  };

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const togglePatientExpansion = useCallback(
    debounce((patientId: number) => {
      console.log('Toggling patient:', patientId, 'Current state:', expandedPatients[patientId]);
      setExpandedPatients((prev) => {
        const newState = {
          ...prev,
          [patientId]: !prev[patientId],
        };
        console.log('New expanded state:', newState);
        return newState;
      });
    }, 200),
    [expandedPatients]
  );

  const groupAppointmentsByDate = (appointments: Appointment[]) => {
    const dateMap: { [key: string]: Appointment[] } = {};
    appointments.forEach((appt) => {
      const date = moment(appt.appointmentDate).format('MMM DD, YYYY');
      if (!dateMap[date]) {
        dateMap[date] = [];
      }
      dateMap[date].push(appt);
    });
    return Object.entries(dateMap).sort((a, b) =>
      moment(a[0], 'MMM DD, YYYY').diff(moment(b[0], 'MMM DD, YYYY'))
    );
  };

  const handleOpenModal = debounce(() => {
    console.log('Button pressed: Attempting to open modal');
    setButtonDisabled(true);
    setTimeout(() => {
      setModalVisible(true);
      console.log('Modal state set to true');
      setButtonDisabled(false);
    }, 200);
  }, 300);

  const filteredPatients = useMemo(() => {
    console.log('Filtering patients with query:', searchQuery);
    if (!searchQuery.trim()) return displayedPatients;

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = displayedPatients.filter((item) => {
      const fullName = `${item.patient.firstName} ${item.patient.lastName}`.toLowerCase();
      const mreNumber = item.patient.mreNumber?.toLowerCase() || '';
      return fullName.includes(lowerQuery) || mreNumber.includes(lowerQuery);
    });
    console.log('Filtered patients count:', filtered.length);
    return filtered;
  }, [displayedPatients, searchQuery]);

  const renderAppointment = ({ item: [date, appts] }: { item: [string, Appointment[]] }) => (
    <View>
      <Text style={styles.dateHeader}>{date}</Text>
      {appts.map((appointment) => (
        <TouchableOpacity
          key={appointment.id}
          style={styles.appointmentCard}
          onPress={() =>
            handleAppointmentPress(
              appointment.patientId,
              `${appointment.patient.firstName} ${appointment.patient.lastName}`
            )
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={`Appointment at ${moment(appointment.appointmentDate).format('HH:mm')}`}
        >
          <View style={styles.appointmentContent}>
            <View style={styles.titleRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(appointment.appointmentDate) }]} />
              <Text style={styles.appointmentTime}>
                {moment(appointment.appointmentDate).format('HH:mm')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Feather name="clock" size={18} color="#2D796C" />
              </View>
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Duration: </Text>
                {appointment.duration} minutes
              </Text>
            </View>
            {appointment.status && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather name="check-circle" size={18} color="#2D796C" />
                </View>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Status: </Text>
                  {appointment.status}
                </Text>
              </View>
            )}
            {appointment.doctor && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather name="user-check" size={18} color="#2D796C" />
                </View>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Doctor: </Text>
                  {appointment.doctor.firstName} {appointment.doctor.lastName}
                </Text>
              </View>
            )}
            {appointment.appointmentType && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather name="tag" size={18} color="#2D796C" />
                </View>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Type: </Text>
                  {appointment.appointmentType}
                </Text>
              </View>
            )}
            {appointment.isTelemedicine && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather name="video" size={18} color="#2D796C" />
                </View>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Mode: </Text>
                  Telemedicine
                </Text>
              </View>
            )}
            {appointment.reasonForVisit && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather name="alert-circle" size={18} color="#2D796C" />
                </View>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Reason: </Text>
                  {appointment.reasonForVisit}
                </Text>
              </View>
            )}
            {appointment.notes && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Feather name="file-text" size={18} color="#2D796C" />
                </View>
                <Text style={styles.infoText}>
                  <Text style={styles.infoLabel}>Notes: </Text>
                  {appointment.notes}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPatient = ({ item }: { item: PatientWithAppointments }) => {
    const isExpanded = expandedPatients[item.patient.id] ?? true;
    const appointmentsByDate = groupAppointmentsByDate(item.appointments);

    return (
      <View style={styles.patientCard}>
        <TouchableOpacity
          style={styles.patientHeader}
          onPress={() => togglePatientExpansion(item.patient.id)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
        >
          <View style={styles.titleRow}>
            <Text style={styles.patientTitle}>
              {item.patient.firstName} {item.patient.lastName}
            </Text>
            <Feather
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#999"
              style={styles.toggleIcon}
            />
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="user" size={18} color="#2D796C" />
            </View>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>MRN: </Text>
              {item.patient.mreNumber || 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <FlatList
            style={styles.appointmentList}
            contentContainerStyle={styles.appointmentListContent}
            data={appointmentsByDate}
            renderItem={renderAppointment}
            keyExtractor={(item, index) => `date-${item[0]}-${index}`}
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={<Text style={styles.noAppointmentsText}>No appointments for this patient</Text>}
            onContentSizeChange={(width, height) => console.log(`Appointment FlatList content size: ${width}x${height}`)}
            overScrollMode="always"
          />
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <HeartbeatAnimation />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSubtitle}>Manage your appointments</Text>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by patient name or MRN"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={(text) => {
            console.log('Search input:', text);
            setSearchQuery(text);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search patients"
          accessibilityHint="Enter a patient name or MRN to filter the appointment list"
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => {
              console.log('Clearing search query');
              setSearchQuery('');
            }}
            style={styles.clearIcon}
          >
            <Feather name="x" size={20} color="#6B7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredPatients}
        renderItem={renderPatient}
        keyExtractor={(item, index) =>
          item.patient && item.patient.id ? item.patient.id.toString() : `fallback-${item.patient.id}-${index}`
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D796C']} />}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Your Appointments</Text>}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="calendar" size={48} color="#6B7280" />
            <Text style={styles.noDataText}>
              {searchQuery ? 'No patients match your search' : 'No appointments found'}
            </Text>
          </View>
        }
        ListFooterComponent={
          filteredPatients.length * ITEMS_PER_PAGE < appointments.length ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreAppointments}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <SafeAreaView style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={[styles.floatingButton, buttonDisabled && styles.buttonDisabled]}
          onPress={handleOpenModal}
          disabled={buttonDisabled}
          accessibilityLabel="Create new appointment"
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ justifyContent: 'flex-end' }}
          >
            <View style={styles.bottomSheet}>
              <View style={styles.handle} />
              <ScrollView
                contentContainerStyle={styles.modalScrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                <View style={styles.card}>
                  <View style={styles.headerRow}>
                    <Text style={styles.cardHeader}>Create Appointment</Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Patient</Text>
                    <PatientDropdown
                      patients={patients.filter((p) => p.firstName !== 'Unknown')}
                      selectedPatientId={formData.patientId}
                      onSelectPatient={(value) => setFormData({ ...formData, patientId: value })}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Appointment Date</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="calendar" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={moment(formData.appointmentDate).format('YYYY-MM-DD HH:mm')}
                        onChangeText={(text) => {
                          const parsedDate = moment(text, 'YYYY-MM-DD HH:mm');
                          if (parsedDate.isValid()) {
                            setFormData({ ...formData, appointmentDate: parsedDate.toISOString() });
                          }
                        }}
                        placeholder="YYYY-MM-DD HH:mm"
                        placeholderTextColor="#999"
                        accessibilityLabel="Appointment date and time"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Duration (minutes)</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="clock" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.duration}
                        onChangeText={(text) => setFormData({ ...formData, duration: text })}
                        placeholder="Duration (minutes)"
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                        accessibilityLabel="Appointment duration"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Telemedicine</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="video" size={20} color="#666" style={styles.inputIcon} />
                      <Text style={styles.switchLabel}>Enable Telemedicine</Text>
                      <Switch
                        value={formData.isTelemedicine}
                        onValueChange={(value) => setFormData({ ...formData, isTelemedicine: value })}
                        trackColor={{ false: '#D1D5DB', true: '#2D796C' }}
                        thumbColor="#FFFFFF"
                        accessibilityLabel="Enable telemedicine"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Appointment Type</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="tag" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.appointmentType}
                        onChangeText={(text) => setFormData({ ...formData, appointmentType: text })}
                        placeholder="Appointment Type (Optional)"
                        placeholderTextColor="#999"
                        accessibilityLabel="Appointment type"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Consultation Fee</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="dollar-sign" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.consultationFee}
                        onChangeText={(text) => setFormData({ ...formData, consultationFee: text })}
                        placeholder="Consultation Fee (Optional)"
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                        accessibilityLabel="Consultation fee"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="map-pin" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.location}
                        onChangeText={(text) => setFormData({ ...formData, location: text })}
                        placeholder="Location (Optional)"
                        placeholderTextColor="#999"
                        accessibilityLabel="Location"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Room Number</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="home" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.roomNumber}
                        onChangeText={(text) => setFormData({ ...formData, roomNumber: text })}
                        placeholder="Room Number (Optional)"
                        placeholderTextColor="#999"
                        accessibilityLabel="Room number"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Notes</Text>
                    <View style={styles.inputGroup}>
                      <Feather name="file-text" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { minHeight: 60, textAlignVertical: 'top', paddingTop: 14 }]}
                        value={formData.notes}
                        onChangeText={(text) => setFormData({ ...formData, notes: text })}
                        placeholder="Notes (Optional)"
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#999"
                        accessibilityLabel="Notes"
                      />
                    </View>
                  </View>

                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setModalVisible(false)}
                      accessibilityLabel="Cancel appointment creation"
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, loading && styles.buttonDisabled]}
                      onPress={handleCreateAppointment}
                      disabled={loading}
                      accessibilityLabel="Create appointment"
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Create</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom:20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginTop: 10,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7F9',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  clearIcon: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'white',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D796C',
    marginBottom: 16,
  },
  patientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
  },
  patientHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  patientTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginBottom: 4,
  },
  toggleIcon: {
    marginLeft: 8,
  },
  appointmentList: {
    marginTop: 8,
  },
  appointmentListContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D796C',
    marginVertical: 8,
    paddingLeft: 4,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  appointmentContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  noAppointmentsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginVertical: 24,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  loadMoreButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    alignItems: 'center',
    marginVertical: 16,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D796C',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 1000,
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2D796C',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    width: '100%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalScrollContainer: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D796C',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#2D796C',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#D3D3D3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default AppointmentScreen;