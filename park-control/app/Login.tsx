import React, {useContext, useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../App';
import Context from '@ctx/Contexto';
import Button from '@ui/Button';
import Input from '@ui/Input';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function Login({navigation}: Props) {
  const app = useContext(Context);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
  hint: {
    fontFamily: 'Inter', fontSize: 12, color: '#94A3B8',
    textAlign: 'center', marginTop: 24, lineHeight: 18,
  },
});
