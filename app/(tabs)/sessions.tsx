import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../src/store/store';
import { useAuth } from '../../src/hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { fetchPatients } from '../../src/api/api';
import MarkdownIt from 'markdown-it';
import WebView from 'react-native-webview';
import Toast from 'react-native-toast-message';
import HeartbeatAnimation from 'src/components/ui/LoaderAnimation';

interface Session {
  [x: string]: any;
  id: string;
  patientName: string;
  date: string;
  duration: string | null;
  sessionType?: string;
  sex?: string;
  status?: string;
  summary?: any;
  note?: { content: { note: string } };
  doctorNotes?: { content: { note: string } };
}

const md = new MarkdownIt();

const SessionsScreen = () => {
  const { token } = useAuth();
  const { sessions, patients, loading, error, fetchAllSessions, fetchPatients } = useSessionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const navigation = useNavigation();

  // Fetch sessions when component mounts or token changes
  const onRefresh = useCallback(async () => {
    if (token) {
      setRefreshing(true);
      try {
        await Promise.all([fetchAllSessions(token), fetchPatients()]);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Sessions refreshed successfully',
        });
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to refresh sessions',
        });
        console.error('Refresh error:', err);
      } finally {
        setRefreshing(false);
      }
    }
  }, [token, fetchAllSessions, fetchPatients]);

  useEffect(() => {
    if (token) {
      (async () => {
        try {
          await Promise.all([fetchAllSessions(token), fetchPatients()]);
        } catch (err) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to fetch sessions or patients',
          });
          console.error('Fetch error:', err);
        } finally {
          // Mark initial load as complete, regardless of success or failure
          setInitialLoadComplete(true);
        }
      })();
    }
  }, [token, fetchAllSessions, fetchPatients]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Completed':
        return '#4CAF50';
      case 'Process':
        return '#FFA000';
      case 'in-review':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status?: string) => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ') : 'Unknown';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(parseInt(duration) / 60);
    const seconds = parseInt(duration) % 60;
    return `${minutes}m ${seconds}s`;
  };

  const filtered: Session[] = sessions.filter((session) => {
    const patient = patients.find((p) => p.id === Number(session.patientId));
    const mreNumber = patient ? patient.mreNumber : '';

    const matchesSearch =
      session.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mreNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.date?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.duration?.toString().includes(searchQuery) ||
      (typeof session.summary === 'string' &&
        session.summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = selectedFilter === 'all' || session.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const renderSessionCard = (session: Session) => {
    const aiNote = session.note?.content?.note || 'No AI-generated note available';
    const doctorNote = session.doctorNotes?.content?.note || 'No doctor note available';
    const patient = patients.find((p) => p.id === Number(session.patientId));
    const mreNumber = patient ? patient.mreNumber : 'N/A';
    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-size: 14px;
              color: #333;
              line-height: 20px;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${md.render(aiNote)}
        </body>
      </html>
    `;

    return (
      <TouchableOpacity
        key={session.id.toString()}
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/SessionDetailsScreen',
            params: { sessionId: session.id, aiNote, doctorNote },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{session.patientName || 'Unknown Patient'}</Text>
            <Text style={styles.mreNumber}>MRN: {mreNumber}</Text>
            <View style={styles.statusContainer}>
              <View
                style={[styles.statusDot, { backgroundColor: getStatusColor(session.status) }]}
              />
              <Text style={styles.statusText}>{getStatusText(session.status)}</Text>
            </View>
          </View>
          <View style={styles.sessionInfo}></View>
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>AI-View</Text>
          <View style={{ height: 48 }}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              style={{ flex: 1 }}
              scrollEnabled={false}
            />
          </View>
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Doctor Note</Text>
          <Text style={styles.noteText} numberOfLines={2}>
            {doctorNote}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Show the heartbeat animation only during initial load
  if (!initialLoadComplete && loading) {
    return (
      <View style={styles.loadingContainer}>
        <HeartbeatAnimation />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2D796C', '#235F55']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Session Records</Text>
        <Text style={styles.headerSubtitle}>AI-Powered Consultation Summaries</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {['all', 'Completed', 'Process', 'in-review'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === filter && styles.filterButtonTextActive,
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.sessionList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2D796C']}
          />
        }
      >
        {filtered.length > 0 ? (
          filtered.map(renderSessionCard)
        ) : (
          <Text style={styles.noDataText}>No sessions found</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    marginTop: -25,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  mreNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'white',
  },
  filterButtonActive: {
    backgroundColor: '#2D796C',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  sessionList: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D796C',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#666',
  },
  sessionInfo: {
    alignItems: 'flex-end',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  noteContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 8,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SessionsScreen;