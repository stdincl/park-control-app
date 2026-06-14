import React, {useContext, useState, useEffect, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform, ActivityIndicator,
  KeyboardAvoidingView, StatusBar, Animated, Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../App';
import Context from '@ctx/Contexto';
import Button from '@ui/Button';
import Input from '@ui/Input';
import Feather from 'react-native-vector-icons/Feather';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {appleAuth, appleAuthAndroid} from '@invertase/react-native-apple-authentication';

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

  const logoAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const formFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, {toValue: 1, tension: 55, friction: 7, useNativeDriver: true}),
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(textAnim, {toValue: 1, duration: 360, useNativeDriver: true, easing: Easing.out(Easing.cubic)}),
      ]),
    ]).start();
  }, []);

  const switchMode = (newMode: 'login' | 'register') => {
    Animated.timing(formFade, {toValue: 0, duration: 90, useNativeDriver: true}).start(() => {
      setMode(newMode);
      Animated.timing(formFade, {toValue: 1, duration: 180, useNativeDriver: true}).start();
    });
  };

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
      const cancelled = ['SIGN_IN_CANCELLED', '12501', 'SIGN_IN_REQUIRED'].includes(e.code);
      if (!cancelled) {
        Alert.alert('Error con Google', 'No se pudo iniciar sesión con Google. Por favor inténtalo nuevamente.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      if (Platform.OS === 'ios') {
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
      const cancelCodes = ['1001', 'ERR_CANCELED', appleAuthAndroid?.Error?.SIGNIN_CANCELLED];
      if (!cancelCodes.includes(e.code)) {
        Alert.alert('Apple ID', 'No se pudo iniciar sesión con Apple ID. Por favor inténtalo nuevamente.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Brand mark */}
            <View style={styles.brand}>
              <Animated.View style={[
                styles.logoWrap,
                {
                  opacity: logoAnim,
                  transform: [{scale: logoAnim.interpolate({inputRange: [0, 1], outputRange: [0.6, 1]})}],
                },
              ]}>
                <Feather name="shield" size={28} color="#2563EB" />
              </Animated.View>
              <Animated.View style={{opacity: textAnim, alignItems: 'center'}}>
                <Text style={styles.appName}>ParkControl</Text>
                <Text style={styles.appSub}>Control de estacionamientos de visita</Text>
              </Animated.View>
            </View>

            {/* Mode tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => switchMode('login')}>
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Iniciar sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && styles.tabActive]}
                onPress={() => switchMode('register')}>
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Registrarse</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <Animated.View style={[styles.form, {opacity: formFade}]}>
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
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn} disabled={socialLoading !== null}>
                {socialLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <>
                    <GoogleLogo size={18} />
                    <Text style={styles.socialBtnText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, styles.appleSocialBtn]} onPress={handleAppleSignIn} disabled={socialLoading !== null}>
                {socialLoading === 'apple' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <AppleLogo size={18} />
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function GoogleLogo({size = 18}: {size?: number}) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: '#EA4335',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{fontSize: size * 0.6, fontWeight: '700', lineHeight: size, color: '#4285F4'}}>G</Text>
    </View>
  );
}

function AppleLogo({size = 18}: {size?: number}) {
  return (
    <Text style={{fontFamily: 'System', fontSize: size, color: '#fff', lineHeight: size + 2}}>
      {''}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F8FAFC'},
  safe: {flex: 1},
  keyboardView: {flex: 1},
  scroll: {flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32},

  brand: {alignItems: 'center', paddingTop: 52, paddingBottom: 36},
  logoWrap: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 4},
  appSub: {fontFamily: 'Inter', fontSize: 14, color: '#94A3B8', textAlign: 'center'},

  tabs: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10},
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#64748B', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  tabText: {fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#94A3B8'},
  tabTextActive: {color: '#0F172A', fontWeight: '600'},

  form: {gap: 0},
  forgotBtn: {alignSelf: 'flex-end', marginTop: -4, marginBottom: 16},
  forgotText: {fontFamily: 'Inter', fontSize: 13, color: '#2563EB', fontWeight: '500'},
  submitBtn: {marginTop: 8},

  dividerRow: {flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12},
  dividerLine: {flex: 1, height: 1, backgroundColor: '#E2E8F0'},
  dividerText: {fontFamily: 'Inter', fontSize: 13, color: '#94A3B8'},

  socialRow: {flexDirection: 'row', gap: 12},
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
    shadowColor: '#64748B', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  appleSocialBtn: {backgroundColor: '#000', borderColor: '#000'},
  socialBtnText: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#0F172A'},
  appleSocialBtnText: {color: '#fff'},

  hint: {
    fontFamily: 'Inter', fontSize: 12, color: '#94A3B8',
    textAlign: 'center', marginTop: 24, lineHeight: 18,
  },
});
