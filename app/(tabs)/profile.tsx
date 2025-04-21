// src/screens/ProfileScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
 // Removed as it is unused
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl, 
 
} from 'react-native';
import { useSessionStore } from '~/src/store/store';
import { fetchUser, updateUser } from '~/src/api/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen: React.FC = () => {
  const { user, setUser } = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    imageUrl: '',
  });

  // Fetch user profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userData = await fetchUser();
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        username: userData.username || '',
        email: userData.email || '',
        imageUrl: userData.imageUrl || '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };
  const pickImage = async (useCamera: boolean) => {
    if (!isEditing) return;

    // Request permissions
    const permission = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert('Permission required', 'We need permission to access your photos/camera');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        })
      : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setFormData({ ...formData, imageUrl: result.assets[0].uri });
    }
  };
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProfile();
    } finally {
      setRefreshing(false);
    }
  }, []);
  const showImagePickerOptions = () => {
    if (!isEditing) return;

    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => pickImage(true),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickImage(false),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };
  const updateProfile = async () => {
    try {
      setLoading(true);
      let updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
      };

      // If imageUrl is a local file URI, we'll handle it in the API function
      if (formData.imageUrl && formData.imageUrl.startsWith('file://')) {
        updateData.imageUrl = formData.imageUrl;
      }

      const updatedData = await updateUser(updateData);
      setUser(updatedData);
      setFormData({ ...formData, imageUrl: updatedData.imageUrl });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

    

  return (
    <LinearGradient colors={['#FFFF', '#FFFF']} style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>View your profile</Text>
        </View>
      </LinearGradient>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2D796C']} // Matches header color
          />
        }
      >
        <View style={styles.headerimage}>
          <TouchableOpacity onPress={showImagePickerOptions}>
            <Image
              source={
                !!formData?.imageUrl && formData.imageUrl.trim() !== ''
                  ? { uri: formData.imageUrl }
                  : require('~/assets/images/healthtune.png')
              }
              style={styles.profileImage}
            />
            {isEditing && (
              <View style={styles.editOverlay}>
                <Feather name="camera" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.username}>@{user?.username}</Text>
        </View>
        {/* Profile Details */}
        <View style={styles.formContainer}>
          {/* Editable Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Feather name="user" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                placeholder="First Name"
                editable={isEditing}
              />
            </View>

            <View style={styles.inputGroup}>
              <Feather name="user" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                placeholder="Last Name"
                editable={isEditing}
              />
            </View>

            <View style={styles.inputGroup}>
              <Feather name="at-sign" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Username"
                editable={isEditing}
              />
            </View>

            <View style={styles.inputGroup}>
              <Feather name="mail" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.email}
                editable={false}
                placeholder="Email"
              />
            </View>
          </View>

          {/* Read-only Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            
            <View style={styles.infoRow}>
              <Feather name="hash" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{user?.id}</Text>
            </View>

            {/* <View style={styles.infoRow}>
              <Feather name="key" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Clerk User ID:</Text>
              <Text style={styles.infoValue}>{user?.clerkUserId}</Text>
            </View> */}

            <View style={styles.infoRow}>
              <Feather name="lock" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Password Enabled:</Text>
              <Text style={styles.infoValue}>{user?.passwordEnabled ? 'Yes' : 'No'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="shield" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>2FA Enabled:</Text>
              <Text style={styles.infoValue}>{user?.twoFactorEnabled ? 'Yes' : 'No'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="slash" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Banned:</Text>
              <Text style={styles.infoValue}>{user?.banned ? 'Yes' : 'No'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="calendar" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>
                {new Date(user?.createdAt || '').toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="refresh-ccw" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Updated:</Text>
              <Text style={styles.infoValue}>
                {new Date(user?.updatedAt || '').toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Subscription Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            
            <View style={styles.infoRow}>
              <Feather name="credit-card" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Card Added:</Text>
              <Text style={styles.infoValue}>{user?.cardAdded ? 'Yes' : 'No'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="tag" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Plan ID:</Text>
              <Text style={styles.infoValue}>{user?.userPlanId || 'None'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="dollar-sign" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Stripe Customer ID:</Text>
              <Text style={styles.infoValue}>{user?.stripeCustomerId || 'None'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="repeat" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Subscription ID:</Text>
              <Text style={styles.infoValue}>{user?.stripeSubscriptiontId || 'None'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={updateProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
  
  },
  header: {
    padding: 20,
    paddingTop: 60,
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  headerimage: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#2D796C',
    marginBottom: 15,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    color: '#999',
    backgroundColor: '#f5f5f5',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    width: 150,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2D796C',
  },
  saveButton: {
    backgroundColor: '#2D796C',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;