import React, { useEffect, useState, useCallback } from 'react';
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
import { useSessionStore } from '../../src/store/store';
import { fetchUser, updateUser, uploadProfileImage, updateProfileImage } from '../../src/api/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MotiView } from 'moti';
import Toast from 'react-native-toast-message';
// Import your HeartbeatAnimation component
import HeartbeatAnimation from 'src/components/ui/LoaderAnimation'; // Adjust the path as needed

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
    profileImageId: '',
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
        profileImageId: userData.profileImage?.id?.toString() || '',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeAndName = (uri: string) => {
    const extension = uri.split('.').pop()?.toLowerCase();
    const fileName = uri.split('/').pop() || 'profile';
    let mimeType = 'application/octet-stream';

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      default:
        return null;
    }

    console.log('Detected File Type:', { uri, extension, mimeType, fileName });
    return { mimeType, fileName };
  };

  const pickImage = async (useCamera: boolean) => {
    if (!isEditing) return;

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'We need permission to access your photos/camera',
      });
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
      const fileInfo = getFileTypeAndName(result.assets[0].uri);
      if (!fileInfo) {
        Toast.show({
          type: 'error',
          text1: 'Unsupported File Type',
          text2: 'Please select a JPEG or PNG image',
        });
        return;
      }
      setFormData({ ...formData, imageUrl: result.assets[0].uri });
      Toast.show({
        type: 'success',
        text1: 'Image Selected',
        text2: 'Profile picture updated locally',
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProfile();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile refreshed successfully',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh profile',
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const showImagePickerOptions = () => {
    if (!isEditing) return;

    Toast.show({
      type: 'success',
      text1: 'Change Profile Picture',
      text2: 'Select an option to update your photo',
    });

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
      let profileImageId = formData.profileImageId;

      if (formData.imageUrl && formData.imageUrl.startsWith('file://')) {
        const fileInfo = getFileTypeAndName(formData.imageUrl);
        if (!fileInfo) {
          Toast.show({
            type: 'error',
            text1: 'Unsupported File Type',
            text2: 'Please select a JPEG or PNG image',
          });
          setLoading(false);
          return;
        }

        const { fileName } = fileInfo;
        const imageFormData = new FormData();
        imageFormData.append('file', {
          uri: formData.imageUrl,
          type: fileInfo.mimeType,
          name: fileName,
        } as any);

        if (!formData.profileImageId) {
          const uploadResponse = await uploadProfileImage(imageFormData);
          profileImageId = uploadResponse.profileImageId;
        } else {
          const updateResponse = await updateProfileImage(formData.profileImageId, imageFormData);
          profileImageId = updateResponse.profileImageId;
        }
      }

      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        profileImageId: profileImageId || undefined,
      };

      const updatedData = await updateUser(updateData);
      setUser(updatedData);
      setFormData({
        ...formData,
        imageUrl: updatedData.imageUrl,
        profileImageId: updatedData.profileImageId?.toString() || '',
      });
      setIsEditing(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = (enable: boolean) => {
    setIsEditing(enable);
    Toast.show({
      type: 'success',
      text1: enable ? 'Edit Mode Enabled' : 'Edit Mode Disabled',
      text2: enable ? 'You can now modify your profile' : 'Changes discarded',
    });
  };

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <HeartbeatAnimation />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#F8FAFC', '#F8FAFC']} style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your account details</Text>
        </View>
      </LinearGradient>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2D796C']}
          />
        }
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.profileHeader}
        >
          <TouchableOpacity onPress={showImagePickerOptions} disabled={!isEditing}>
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: isEditing ? 1.05 : 1 }}
              transition={{ type: 'spring', duration: 300 }}
            >
              <Image
                source={
                  formData?.imageUrl && formData.imageUrl.trim() !== ''
                    ? { uri: formData.imageUrl }
                    : require('../../assets/images/healthtune.png')
                }
                style={styles.profileImage}
              />
              {isEditing && (
                <View style={styles.editOverlay}>
                  <Feather name="camera" size={20} color="#fff" />
                </View>
              )}
            </MotiView>
          </TouchableOpacity>
          <Text style={styles.name}>
            {formData.firstName} {formData.lastName}
          </Text>
          <Text style={styles.username}>@{formData.username}</Text>
        </MotiView>

        <View style={styles.formContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputGroup}>
                <Feather name="user" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  placeholder="First Name"
                  placeholderTextColor="#999"
                  editable={isEditing}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputGroup}>
                <Feather name="user" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  placeholder="Last Name"
                  placeholderTextColor="#999"
                  editable={isEditing}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputGroup}>
                <Feather name="at-sign" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, !isEditing && styles.disabledInput]}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  editable={isEditing}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputGroup}>
                <Feather name="mail" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formData.email}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <View style={styles.infoRow}>
              <Feather name="lock" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Password Enabled</Text>
              <Text style={styles.infoValue}>{user?.passwordEnabled ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="shield" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>2FA Enabled</Text>
              <Text style={styles.infoValue}>{user?.twoFactorEnabled ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.infoRow}>
              <Feather name="credit-card" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Card Added</Text>
              <Text style={styles.infoValue}>{user?.cardAdded ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Start Date</Text>
              <Text style={styles.infoValue}>
                {new Date(user?.userPlan?.startDate || '').toLocaleDateString() || 'None'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>End Date</Text>
              <Text style={styles.infoValue}>
                {new Date(user?.userPlan?.endDate || '').toLocaleDateString() || 'None'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Reset Date</Text>
              <Text style={styles.infoValue}>
                {new Date(user?.userPlan?.resetDate || '').toLocaleDateString() || 'None'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="check-circle" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Subscription Active</Text>
              <Text style={styles.infoValue}>
                {user?.userPlan?.isSubscriptionActive ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan Details</Text>
            <View style={styles.infoRow}>
              <Feather name="info" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Plan Name</Text>
              <Text style={styles.infoValue}>{user?.userPlan?.plan?.name || 'None'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="file-text" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoValue}>{user?.userPlan?.plan?.description || 'None'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="dollar-sign" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Price</Text>
              <Text style={styles.infoValue}>{user?.userPlan?.plan?.price || '0'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="clock" size={20} color="#666" style={styles.inputIcon} />
              <Text style={styles.infoLabel}>Plan Type</Text>
              <Text style={styles.infoValue}>{user?.userPlan?.plan?.planType || 'None'}</Text>
            </View>
            {user?.userPlan?.usage?.map((usage, index) => (
              <View key={index} style={styles.infoRow}>
                <Feather name="activity" size={20} color="#666" style={styles.inputIcon} />
                <Text style={styles.infoLabel}>{usage.featureName} Usage</Text>
                <Text style={styles.infoValue}>
                  {usage.left}/{usage.total}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            {isEditing ? (
              <>
                <MotiView
                  from={{ scale: 1 }}
                  animate={{ scale: loading ? 0.95 : 1 }}
                  transition={{ type: 'spring', duration: 200 }}
                >
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
                </MotiView>
                <MotiView
                  from={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 200 }}
                >
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => handleEditToggle(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </MotiView>
              </>
            ) : (
              <MotiView
                from={{ scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 200 }}
              >
                <TouchableOpacity
                  style={[styles.button, styles.editButton]}
                  onPress={() => handleEditToggle(true)}
                >
                  <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity>
              </MotiView>
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
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
    backgroundColor: 'white',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#2D796C',
    marginBottom: 15,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(45, 121, 108, 0.8)',
    borderRadius: 12,
    padding: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 16,
    overflow: 'hidden',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D796C',
    marginBottom: 16,
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
  disabledInput: {
    backgroundColor: '#F5F7F9',
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 20,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#2D796C',
  },
  saveButton: {
    backgroundColor: '#2D796C',
  },
  cancelButton: {
    backgroundColor: '#D3D3D3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;