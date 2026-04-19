import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function PhoneAuth() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const { setUser } = useAuthStore();
  
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [loading, setLoading] = useState(false);

  const getRoleLabel = () => {
    if (role === 'customer') return 'Book car cleaning services';
    if (role === 'cleaner') return 'Start earning as a CleanPro';
    if (role === 'centre') return 'Register your washing centre';
    return '';
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.getUserByPhone(phone);
      if (response.data) {
        Alert.alert('OTP Sent', 'OTP sent to your phone (Use 123456 for testing)');
        setStep('otp');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setStep('register');
      } else {
        Alert.alert('Error', 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp !== '123456') {
      Alert.alert('Error', 'Invalid OTP. Use 123456 for testing');
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.getUserByPhone(phone);
      const userData = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      navigateByRole(userData.role);
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || name.length < 2) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const firebase_uid = `fb_${phone}_${Date.now()}`;
      const response = await authAPI.loginOrRegister({
        phone, name, role: role as string, firebase_uid,
      });
      const userData = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      if (role === 'cleaner') router.push('/cleaner/setup');
      else if (role === 'centre') router.push('/centre/setup');
      else navigateByRole(userData.role);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const navigateByRole = (r: string) => {
    if (r === 'customer') router.replace('/customer/home');
    else if (r === 'cleaner') router.replace('/cleaner/dashboard');
    else if (r === 'centre') router.replace('/centre/dashboard');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Welcome to Washingo</Text>
        <Text style={styles.subtitle}>{getRoleLabel()}</Text>
      </View>

      <View style={styles.form}>
        {step === 'phone' && (
          <>
            <Text style={styles.label}>Enter your phone number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                testID="phone-input"
                style={styles.phoneInput}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <TouchableOpacity
              testID="continue-btn"
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Please wait...' : 'Continue'}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.label}>Enter OTP sent to +91 {phone}</Text>
            <Text style={styles.hint}>Test OTP: 123456</Text>
            <TextInput
              testID="otp-input"
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              testID="verify-btn"
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.link}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'register' && (
          <>
            <Text style={styles.label}>Complete your registration</Text>
            <TextInput
              testID="name-input"
              style={styles.input}
              placeholder="Your Name"
              value={name}
              onChangeText={setName}
            />
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput style={styles.phoneInput} value={phone} editable={false} />
            </View>
            <TouchableOpacity
              testID="register-btn"
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Register'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.link}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingTop: 50, paddingHorizontal: 24, paddingBottom: 32,
    backgroundColor: '#1565C0', borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#BBDEFB' },
  form: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  label: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  hint: { fontSize: 14, color: '#F9A825', marginBottom: 12, fontWeight: '600' },
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, marginBottom: 24,
  },
  countryCode: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginRight: 8 },
  phoneInput: { flex: 1, height: 56, fontSize: 16 },
  input: {
    borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, height: 56, fontSize: 16, marginBottom: 24,
  },
  button: {
    backgroundColor: '#1565C0', borderRadius: 12, height: 56,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  link: { color: '#1565C0', fontSize: 16, textAlign: 'center', marginTop: 8 },
});
