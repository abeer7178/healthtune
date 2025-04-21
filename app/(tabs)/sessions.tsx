import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '~/src/store/store';
import { useAuth } from '~/src/hooks/useAuth';

interface Session {
  id: string;
  patientName: string;
  date: string;
  duration: string;
  sessionType?: string;
  sex?: string;
  status?: string;
  summary?: any;
  note?: { content: { note: string } } | string;
}

const SessionsScreen = () => {
  const { token } = useAuth();
  const { sessions, loading, error, fetchAllSessions } = useSessionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  // Fetch sessions when component mounts or token changes
  const onRefresh = useCallback(async () => {
    if (token) {
      setRefreshing(true);
      try {
        await fetchAllSessions(token);
      } finally {
        setRefreshing(false);
      }
    }
  }, [token, fetchAllSessions]);

  // Existing useEffect remains unchanged
  useEffect(() => {
    if (token) {
      fetchAllSessions(token);
    }
  }, [token, fetchAllSessions]);

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

  const filtered: any = sessions.filter(session => {
    const matchesSearch = 
      (session.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (session.date?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (session.duration?.includes(searchQuery) || false) ||
      (typeof session.summary === 'string' && session.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      false;

    const matchesFilter = selectedFilter === 'all' || session.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const renderSessionCard = (session: Session) => (
    <TouchableOpacity
      key={session.id.toString()}
      style={styles.card}
      onPress={() => console.log('Session pressed:', session.id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{session.patientName || 'Unknown Patient'}</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(session.status) }
              ]}
            />
            <Text style={styles.statusText}>
              {getStatusText(session.status)}
            </Text>
          </View>
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.timeInfo}>
            <MaterialIcons name="access-time" size={14} color="#666" />
      
          </View>
          <View style={styles.dateInfo}>
            <MaterialIcons name="event" size={14} color="#666" />
          
          </View>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryLabel}>AI Summary</Text>
        <Text style={styles.summaryText} numberOfLines={3}>
          {typeof session.summary === "string"
            ? session.summary
            : session.summary?.content?.summary 
           
            || "No summary available"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />;
  if (error) return <Text style={styles.error}>{error}</Text>;

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
            colors={['#2D796C']} // Matches your header color
          />
        }
      >
        {filtered.map(renderSessionCard)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F9',
  },
  header: {
    padding: 20,
    paddingTop: 60,
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
    padding: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 60,
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
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  summaryContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  summaryText: {
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
});

export default SessionsScreen;