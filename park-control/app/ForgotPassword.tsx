import React, {useContext, useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../App';
import Context from '@ctx/Contexto';
import Input from '@ui/Input';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPassword({navigation}: Props) {
  const app = useContext(Context);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu correo electrónico');
      return;
    }
    setLoading(true);
    try {
      await app.api.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recuperar contraseña</Text>
        <View style={{width: 44}} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {sent ? (
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Feather name="check" size={28} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Correo enviado</Text>
            <Text style={styles.successText}>
              Si existe una cuenta asociada a{' '}
              <Text style={styles.emailHighlight}>{email}</Text>
              , recibirás un enlace para restablecer tu contraseña.
            </Text>
            <Text style={styles.successHint}>
              El enlace te llevará a la página web donde podrás ingresar tu nueva contraseña.
            </Text>
            <TouchableOpacity style={styles.backBtn2} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtn2Text}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.subtitle}>
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </Text>

            <Input
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.submitBtn, (!email.trim() || loading) && styles.submitBtnDisabled]}
              onPress={handleSend}
              disabled={!email.trim() || loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Enviar enlace</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F8FAFC'},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {width: 44, height: 44, justifyContent: 'center'},
  headerTitle: {fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: '#0F172A'},
  scroll: {flexGrow: 1, padding: 20},

  form: {paddingTop: 8},
  title: {fontFamily: 'Inter', fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8},
  subtitle: {fontFamily: 'Inter', fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 28},

  submitBtn: {
    backgroundColor: '#2563EB', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: {opacity: 0.4},
  submitBtnText: {fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: '#fff'},

  successBox: {flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 8},
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderWidth: 1, borderColor: 'rgba(5,150,105,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successTitle: {fontFamily: 'Inter', fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 12},
  successText: {fontFamily: 'Inter', fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 12},
  emailHighlight: {fontFamily: 'Inter', fontWeight: '600', color: '#2563EB'},
  successHint: {fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19, marginBottom: 32},
  backBtn2: {
    backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 14,
  },
  backBtn2Text: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#fff'},
});
