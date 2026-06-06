import React, {useContext, useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import Context from '@ctx/Contexto';
import Input from '@ui/Input';
import Feather from 'react-native-vector-icons/Feather';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function Profile({navigation}: Props) {
  const app = useContext(Context);

  const [section, setSection] = useState<'main' | 'editName' | 'changePassword'>('main');

  // Name edit
  const [newName, setNewName] = useState(app.user?.name || '');
  const [savingName, setSavingName] = useState(false);

  // Password change
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío');
      return;
    }
    setSavingName(true);
    try {
      const data = await app.api.updateProfile(newName.trim());
      Alert.alert('Listo', 'Nombre actualizado correctamente');
      setSection('main');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar el perfil');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Campos requeridos', 'Completa todos los campos');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Contraseñas no coinciden', 'La nueva contraseña y su confirmación deben ser iguales');
      return;
    }
    if (newPwd.length < 8) {
      Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSavingPwd(true);
    try {
      await app.api.changePassword(currentPwd, newPwd, confirmPwd);
      Alert.alert('Listo', 'Contraseña actualizada correctamente');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setSection('main');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Cerrar sesión', style: 'destructive', onPress: () => app.logout()},
    ]);
  };

  const initial = (app.user?.name || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => section !== 'main' ? setSection('main') : navigation.goBack()}
          style={styles.backBtn}>
          <Text style={styles.backText}>{section !== 'main' ? '← Atrás' : '← Cerrar'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={{width: 80}} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {section === 'main' && (
          <>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <Text style={styles.userName}>{app.user?.name}</Text>
              <Text style={styles.userEmail}>{app.user?.email}</Text>
            </View>

            {/* Options */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cuenta</Text>

              <TouchableOpacity style={styles.row} onPress={() => { setNewName(app.user?.name || ''); setSection('editName'); }}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: '#EFF6FF'}]}>
                    <Feather name="edit-2" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.rowText}>Editar nombre</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.row} onPress={() => setSection('changePassword')}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: '#F0FDF4'}]}>
                    <Feather name="lock" size={16} color="#16A34A" />
                  </View>
                  <Text style={styles.rowText}>Cambiar contraseña</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Comunidades</Text>
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('JoinCommunity', {})}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: '#F0F9FF'}]}>
                    <Feather name="plus" size={16} color="#0284C7" />
                  </View>
                  <Text style={styles.rowText}>Unirme a otra comunidad</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <TouchableOpacity style={[styles.row, styles.logoutRow]} onPress={handleLogout}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: '#FEF2F2'}]}>
                    <Feather name="log-out" size={16} color="#EF4444" />
                  </View>
                  <Text style={[styles.rowText, styles.logoutText]}>Cerrar sesión</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.version}>ParkControl · Propietario</Text>
          </>
        )}

        {section === 'editName' && (
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Editar nombre</Text>
            <Input
              label="Nombre completo"
              value={newName}
              onChangeText={setNewName}
              placeholder="Tu nombre"
              autoCapitalize="words"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveBtn, savingName && styles.saveBtnDisabled]}
              onPress={handleSaveName}
              disabled={savingName}>
              {savingName
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Guardar nombre</Text>}
            </TouchableOpacity>
          </View>
        )}

        {section === 'changePassword' && (
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Cambiar contraseña</Text>
            <Input
              label="Contraseña actual"
              value={currentPwd}
              onChangeText={setCurrentPwd}
              secureTextEntry
              secureToggle
              placeholder="Tu contraseña actual"
            />
            <Input
              label="Nueva contraseña"
              value={newPwd}
              onChangeText={setNewPwd}
              secureTextEntry
              secureToggle
              placeholder="Mínimo 8 caracteres"
            />
            <Input
              label="Confirmar nueva contraseña"
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              secureTextEntry
              secureToggle
              placeholder="Repite la nueva contraseña"
            />
            <TouchableOpacity
              style={[styles.saveBtn, savingPwd && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPwd}>
              {savingPwd
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Cambiar contraseña</Text>}
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
  scroll: {flexGrow: 1, paddingBottom: 40},
  avatarSection: {alignItems: 'center', paddingVertical: 28},
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: {fontFamily: 'Inter-ExtraBold', fontSize: 28, color: '#fff'},
  userName: {fontFamily: 'Inter-Bold', fontSize: 20, color: '#1E293B'},
  userEmail: {fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748B', marginTop: 4},
  section: {paddingHorizontal: 20, marginBottom: 8},
  sectionLabel: {fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#94A3B8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4},
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  logoutRow: {borderColor: '#FEE2E2'},
  rowLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rowIcon: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  rowText: {fontFamily: 'Inter-Medium', fontSize: 15, color: '#1E293B'},
  logoutText: {color: '#EF4444'},
  version: {fontFamily: 'Inter-Regular', fontSize: 12, color: '#CBD5E1', textAlign: 'center', marginTop: 20},
  formSection: {padding: 24},
  formTitle: {fontFamily: 'Inter-Bold', fontSize: 20, color: '#1E293B', marginBottom: 20},
  saveBtn: {backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 8},
  saveBtnDisabled: {backgroundColor: '#93C5FD'},
  saveBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff'},
});
