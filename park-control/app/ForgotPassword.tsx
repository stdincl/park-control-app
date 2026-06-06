import React, {useContext, useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recuperar contraseña</Text>
        <View style={{width: 80}} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {sent ? (
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Feather name="check" size={32} color="#16A34A" />
            </View>
            <Text style={styles.successTitle}>Correo enviado</Text>
            <Text style={styles.successText}>
              Si existe una cuenta asociada a <Text style={styles.emailHighlight}>{email}</Text>, recibirás un enlace para restablecer tu contraseña.
            </Text>
            <Text style={styles.successHint}>
              El enlace te llevará a la página web donde podrás ingresar tu nueva contraseña.
            </Text>
            <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.goBack()}>
              <Text style={styles.backToLoginText}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.subtitle}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
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
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  backBtn: {width: 80},
  backText: {fontFamily: 'Inter-Medium', fontSize: 14, color: '#2563EB'},
  headerTitle: {fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#1E293B'},
  scroll: {flexGrow: 1, padding: 24},
  form: {marginTop: 8},
  title: {fontFamily: 'Inter-Bold', fontSize: 22, color: '#1E293B', marginBottom: 8},
  subtitle: {fontFamily: 'Inter-Regular', fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 28},
  submitBtn: {
    backgroundColor: '#2563EB', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: {backgroundColor: '#93C5FD'},
  submitBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff'},
  successBox: {flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 8},
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successTitle: {fontFamily: 'Inter-Bold', fontSize: 22, color: '#1E293B', marginBottom: 12},
  successText: {fontFamily: 'Inter-Regular', fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 12},
  emailHighlight: {fontFamily: 'Inter-SemiBold', color: '#2563EB'},
  successHint: {fontFamily: 'Inter-Regular', fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19, marginBottom: 32},
  backToLogin: {
    backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14,
  },
  backToLoginText: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff'},
});
