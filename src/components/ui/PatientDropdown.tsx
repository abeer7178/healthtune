import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  mreNumber: string;
}

interface PatientDropdownProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (value: string) => void;
}

const PatientDropdown: React.FC<PatientDropdownProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mreNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id.toString() === selectedPatientId);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(!isOpen)}
      >
        <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
        <Text style={styles.dropdownText}>
          {selectedPatientId === 'new'
            ? 'Create New Patient'
            : selectedPatient
            ? `${selectedPatient.firstName} ${selectedPatient.lastName} (MRN: ${selectedPatient.mreNumber})`
            : 'Select Patient'}
        </Text>
        <MaterialIcons
          name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          <ScrollView style={styles.patientList} nestedScrollEnabled>
            {filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientItem}
                onPress={() => {
                  onSelectPatient(patient.id.toString());
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.patientText}>
                  {patient.firstName} {patient.lastName} (MRN: {patient.mreNumber})
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.patientItem}
              onPress={() => {
                onSelectPatient('new');
                setIsOpen(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.patientText}>Create New Patient</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    maxHeight: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  patientList: {
    maxHeight: 150,
  },
  patientItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  patientText: {
    fontSize: 16,
    color: '#1F2937',
  },
});

export default PatientDropdown;