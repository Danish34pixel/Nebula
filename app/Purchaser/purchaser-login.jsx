import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postJson } from '../../config/api';

const PurchaserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Purchasers have a dedicated login endpoint separate from medical-owner login
      const res = await postJson("/purchaser/login", { email, password });

      if (res && res.data && res.data.token) {
        await AsyncStorage.setItem("token", res.data.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.data.purchaser));
        await AsyncStorage.setItem("role", "purchaser");
        await AsyncStorage.setItem("purchaserId", res.data.purchaser?.id || res.data.purchaser?._id || "");

        // Redirect to the main home dashboard (same as medical owner / stockist home)
        router.replace("/Home");
      } else {
        setError("Invalid response from server. Please try again.");
      }
    } catch (err) {
      if (err && err.body && err.body.message) {
        setError(err.body.message);
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#eff6ff', '#ffffff', '#dbeafe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={require("../../assets/images/main-logo.png")} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your purchaser account</Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={20} color="#ef4444" style={styles.errorIcon} />
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>Error</Text>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            </View>
          ) : null}

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Feather name="mail" size={16} color="#3b82f6" />
                <Text style={styles.label}>Email Address</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="#9ca3af" style={styles.inputIconLeft} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Feather name="lock" size={16} color="#3b82f6" />
                <Text style={styles.label}>Password</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#9ca3af" style={styles.inputIconLeft} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.inputIconRight}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.rowBetween}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Feather name="check" size={12} color="#fff" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButtonContainer} 
              onPress={handleSubmit} 
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22d3ee', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/Purchaser/purchaser-signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 150,
    height: 100,
    marginBottom: 16,
  },
  logoText: {
    color: '#3b82f6',
    fontWeight: '800',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  errorIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: 12,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIconLeft: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  inputIconRight: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 44,
    fontSize: 16,
    color: '#1f2937',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  rememberText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 6,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  submitButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#4b5563',
  },
  signupLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default PurchaserLogin;
