import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await adminAPI.login(email, password);
      if (response.data.token) {
        router.replace('/admin/dashboard');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Washingo Management</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput testID="admin-email" style={styles.input} placeholder="admin@washingo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Password</Text>
        <TextInput testID="admin-password" style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity testID="admin-login-btn" style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 50, paddingHorizontal: 24, paddingBottom: 32, backgroundColor: '#1a1a1a', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#999' },
  form: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  label: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  input: { borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 16, height: 56, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#1a1a1a', borderRadius: 12, height: 56, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
