// Powered by OnSpace.AI — Login Screen with Google OAuth + Email/Password
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Button, Input } from '@/components';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

type Mode = 'login' | 'register' | 'otp';

export default function LoginScreen() {
  const { user, isLoading, loginWithGoogle, loginWithPassword, signUp, sendOTP, verifyOTP } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isLoading && user) return <Redirect href="/(tabs)" />;
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>PhotoVault</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
      </View>
    );
  }

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      showAlert('Erreur Google', e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }
    setSubmitting(true);
    try {
      await loginWithPassword(email.trim(), password);
    } catch (e: any) {
      showAlert('Erreur de connexion', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      showAlert('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Mots de passe différents', 'Les deux mots de passe doivent correspondre.');
      return;
    }
    if (password.length < 6) {
      showAlert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password);
      if (needsConfirmation) {
        setOtpEmail(email.trim());
        setMode('otp');
        showAlert('Vérification', `Un code de confirmation a été envoyé à ${email.trim()}`);
      }
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      showAlert('Email requis', 'Veuillez saisir votre adresse email.');
      return;
    }
    setSubmitting(true);
    try {
      await sendOTP(email.trim());
      setOtpEmail(email.trim());
      setMode('otp');
      showAlert('Code envoyé', `Un code de connexion a été envoyé à ${email.trim()}`);
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      showAlert('Code requis', 'Veuillez saisir le code reçu par email.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyOTP(otpEmail, otp.trim());
    } catch (e: any) {
      showAlert('Code incorrect', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <Image
          source={require('@/assets/images/hero-gallery.png')}
          style={styles.hero}
          contentFit="cover"
          transition={300}
        />

        <View style={styles.card}>
          <Text style={styles.title}>PhotoVault</Text>
          <Text style={styles.subtitle}>Organisez vos souvenirs en groupes et albums</Text>

          {mode === 'otp' ? (
            /* ── OTP verification ── */
            <View style={styles.form}>
              <Text style={styles.otpHint}>Code envoyé à {otpEmail}</Text>
              <Input
                label="Code de vérification"
                value={otp}
                onChangeText={setOtp}
                placeholder="4 chiffres"
                keyboardType="number-pad"
                accessibilityLabel="Code OTP"
              />
              <Button label="Vérifier le code" onPress={handleVerifyOTP} loading={submitting} />
              <Pressable onPress={() => setMode('login')} style={styles.switchRow}>
                <Text style={styles.switchText}>Retour à la connexion</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* ── Google Sign-In ── */}
              <Pressable
                style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]}
                onPress={handleGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="login" size={20} color={Colors.textInverse} />
                    <Text style={styles.googleText}>Continuer avec Google</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou par email</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Email / Password form ── */}
              <View style={styles.form}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="votre@email.com"
                  accessibilityLabel="Email"
                />

                {mode !== 'login' || true ? (
                  <Input
                    label="Mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="••••••"
                    accessibilityLabel="Mot de passe"
                  />
                ) : null}

                {mode === 'register' ? (
                  <Input
                    label="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="••••••"
                    accessibilityLabel="Confirmer le mot de passe"
                  />
                ) : null}

                {mode === 'login' ? (
                  <>
                    <Button label="Se connecter" onPress={handleLogin} loading={submitting} />
                    <Pressable onPress={handleSendOTP} style={styles.otpBtn} disabled={submitting}>
                      <MaterialIcons name="mail" size={16} color={Colors.primary} />
                      <Text style={styles.otpBtnText}>Connexion par code email</Text>
                    </Pressable>
                  </>
                ) : (
                  <Button label="Créer mon compte" onPress={handleRegister} loading={submitting} />
                )}

                {/* Toggle login / register */}
                <Pressable
                  onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
                  style={styles.switchRow}
                >
                  <Text style={styles.switchText}>
                    {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
                    <Text style={styles.switchLink}>
                      {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
                    </Text>
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  splashText: { color: Colors.primary, fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.bold },
  root: { flex: 1, backgroundColor: Colors.background },
  content: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  hero: { width: 200, height: 270, borderRadius: Radius.xl, marginBottom: Spacing.xl },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    includeFontPadding: false,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  googleText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  form: { gap: Spacing.md },
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  otpBtnText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    includeFontPadding: false,
  },
  switchRow: { alignItems: 'center', paddingVertical: Spacing.xs },
  switchText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    includeFontPadding: false,
  },
  switchLink: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  otpHint: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
