import React, {useContext, useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, Platform, ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../App';
import Context from '@ctx/Contexto';
import Button from '@ui/Button';
import Input from '@ui/Input';
import Feather from 'react-native-vector-icons/Feather';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {appleAuth, appleAuthAndroid} from '@invertase/react-native-apple-authentication';

// Apple Developer Services ID and redirect URI (set these after completing AUTH.md setup)
const APPLE_SERVICE_ID = 'cl.stdin.parkcontrol.signin';
const APPLE_REDIRECT_URI = 'https://parkcontrol.stdin.cl/auth/apple/callback';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function Login({navigation}: Props) {
  const app = useContext(Context);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await app.login(email, password);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Campos requeridos', 'Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await app.api.register(name, email, password, password);
      await app.login(email, password);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      await app.loginWithGoogle(tokens.idToken);
    } catch (e: any) {
      // Code 12501 = cancelled on Android, SIGN_IN_CANCELLED on iOS
      if (e.code !== 'SIGN_IN_CANCELLED' && e.code !== '12501') {
        Alert.alert('Error con Google', e.message || 'No se pudo iniciar sesión con Google');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      if (Platform.OS === 'ios') {
        // Native iOS Sign In with Apple
        const response = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        });
        const credState = await appleAuth.getCredentialStateForUser(response.user);
        if (credState === appleAuth.State.AUTHORIZED) {
          const fullName = response.fullName
            ? `${response.fullName.givenName ?? ''} ${response.fullName.familyName ?? ''}`.trim()
            : undefined;
          await app.loginWithApple(
            response.identityToken!,
            fullName || undefined,
            response.email || undefined,
          );
        } else {
          Alert.alert('Error', 'No se pudo verificar tu cuenta de Apple');
        }
      } else {
        // Android: web OAuth flow via Apple Services ID
        const rawNonce = Math.random().toString(36).substring(2, 15);
        const state = Math.random().toString(36).substring(2, 15);

        appleAuthAndroid.configure({
          clientId: APPLE_SERVICE_ID,
          redirectUri: APPLE_REDIRECT_URI,
          responseType: appleAuthAndroid.ResponseType.ALL,
          scope: appleAuthAndroid.Scope.ALL,
          nonce: rawNonce,
          state,
        });

        const response = await appleAuthAndroid.signIn();
        if (response?.id_token) {
          await app.loginWithApple(
            response.id_token,
            response.user?.name
              ? `${response.user.name.firstName ?? ''} ${response.user.name.lastName ?? ''}`.trim()
              : undefined,
            response.user?.email || undefined,
          );
        }
      }
    } catch (e: any) {
      // 1001 = iOS cancelled, E_SIGNIN_CANCELLED = Android cancelled
      if (e.code !== '1001' && e.code !== appleAuthAndroid?.Error?.SIGNIN_CANCELLED) {
        Alert.alert('Apple ID', e.message || 'No se pudo iniciar sesión con Apple ID');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoP}>P</Text>
          </View>
          <Text style={styles.logoText}>ParkControl</Text>
          <Text style={styles.logoSub}>Control de estacionamientos</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => setMode('login')}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => setMode('register')}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Registrarse</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <Input label="Nombre completo" value={name} onChangeText={setName} placeholder="Juan García" autoCapitalize="words" />
          )}
          <Input label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="tu@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry secureToggle />

          {mode === 'login' && (
            <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          )}

          <Button
            label={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            onPress={mode === 'login' ? handleLogin : handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        {/* Social login divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o continúa con</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialRow}>
          {/* Google — both platforms */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogleSignIn}
            disabled={socialLoading !== null}>
            {socialLoading === 'google' ? (
              <ActivityIndicator size="small" color="#1E293B" />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.socialBtnText}>Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple — both iOS and Android */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.appleSocialBtn]}
            onPress={handleAppleSignIn}
            disabled={socialLoading !== null}>
            {socialLoading === 'apple' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="smartphone" size={18} color="#fff" />
                <Text style={[styles.socialBtnText, styles.appleSocialBtnText]}>Apple ID</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {mode === 'login' && (
          <Text style={styles.hint}>
            Esta app es para propietarios del condominio.{'\n'}
            Administradores y recepción usan el panel web.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleG}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F8FAFC'},
  scroll: {flexGrow: 1, padding: 24, justifyContent: 'center'},
  logoSection: {alignItems: 'center', marginBottom: 40},
  logoIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoP: {fontFamily: 'Inter', fontSize: 32, fontWeight: '800', color: '#fff'},
  logoText: {fontFamily: 'Inter', fontSize: 28, fontWeight: '800', color: '#1E293B'},
  logoSub: {fontFamily: 'Inter', fontSize: 14, color: '#64748B', marginTop: 4},
  tabs: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10},
  tabActive: {backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2},
  tabText: {fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#64748B'},
  tabTextActive: {color: '#1E293B', fontWeight: '600'},
  form: {gap: 0},
  forgotBtn: {alignSelf: 'flex-end', marginBottom: 16},
  forgotText: {fontFamily: 'Inter', fontSize: 13, color: '#2563EB', fontWeight: '500'},
  submitBtn: {marginTop: 8},
  dividerRow: {flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12},
  dividerLine: {flex: 1, height: 1, backgroundColor: '#E2E8F0'},
  dividerText: {fontFamily: 'Inter', fontSize: 13, color: '#94A3B8'},
  socialRow: {flexDirection: 'row', gap: 12},
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  appleSocialBtn: {backgroundColor: '#000', borderColor: '#000'},
  socialBtnText: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#1E293B'},
  appleSocialBtnText: {color: '#fff'},
  googleIcon: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EA4335', alignItems: 'center', justifyContent: 'center',
  },
  googleG: {fontFamily: 'Inter', fontSize: 11, fontWeight: '800', color: '#fff'},
  hint: {
    fontFamily: 'Inter', fontSize: 12, color: '#94A3B8',
    textAlign: 'center', marginTop: 24, lineHeight: 18,
  },
});
