import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { cleanerAPI } from '../../services/api';

export default function CleanerSetup() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!area || area.length < 3) {
      Alert.alert('Error', 'Please enter your area');
      return;
    }

    if (!photoBase64) {
      Alert.alert('Error', 'Please upload your photo');
      return;
    }

    setLoading(true);
    try {
      // Mock location
      const mockLat = 12.9716 + (Math.random() - 0.5) * 0.1;
      const mockLon = 77.5946 + (Math.random() - 0.5) * 0.1;

      await cleanerAPI.createCleaner({
        user_id: user?.user_id,
        name: user?.name,
        phone: user?.phone,
        photo_base64: photoBase64,
        area: area,
        latitude: mockLat,
        longitude: mockLon,
      });

      Alert.alert(
        'Success',
        'Your cleaner profile has been created!',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/cleaner/dashboard')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Help customers know you better</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Upload */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Your Photo *</Text>
          <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
            {photoBase64 ? (
              <Image source={{ uri: photoBase64 }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={48} color="#999" />
                <Text style={styles.photoText}>Upload Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Area Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Your Area *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Koramangala, Bangalore"
            value={area}
            onChangeText={setArea}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#FF6B35" />
          <Text style={styles.infoText}>
            You'll receive booking requests from customers near your area.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating Profile...' : 'Complete Setup'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  photoButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  inputSection: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
