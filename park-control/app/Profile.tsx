import React, {useContext, useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import Context from '@ctx/Contexto';
import Input from '@ui/Input';
import Feather from 'react-native-vector-icons/Feather';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

interface Community {
  id: number;
  name: string;
  comune: string;
  is_home: boolean;
}

export default function Profile({navigation}: Props) {
  const app = useContext(Context);

  const [section, setSection] = useState<'main' | 'editName' | 'changePassword'>('main');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [leavingId, setLeavingId] = useState<number | null>(null);

  const [newName, setNewName] = useState(app.user?.name || '');
  const [savingName, setSavingName] = useState(false);

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
      await app.api.updateProfile(newName.trim());
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

  const loadCommunities = useCallback(async () => {
    try {
      const data = await app.api.getMyCommunities();
      setCommunities(data.communities || []);
    } catch {}
  }, []);

  useEffect(() => { loadCommunities(); }, [loadCommunities]);

  const handleLeaveCommunity = (community: Community) => {
    Alert.alert(
      'Salir de la comunidad',
      `¿Seguro que deseas salir de "${community.name}"? Necesitarás un código nuevo para volver.`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            setLeavingId(community.id);
            try {
              await app.api.leaveCommunity(community.id);
              await loadCommunities();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo salir de la comunidad');
            } finally {
              setLeavingId(null);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Cerrar sesión', style: 'destructive', onPress: () => app.logout()},
    ]);
  };

  const initial = (app.user?.name || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => section !== 'main' ? setSection('main') : navigation.goBack()}
          style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {section === 'editName' ? 'Editar nombre' : section === 'changePassword' ? 'Contraseña' : 'Mi perfil'}
        </Text>
        <View style={{width: 44}} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {section === 'main' && (
          <>
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <Text style={styles.userName}>{app.user?.name}</Text>
              <Text style={styles.userEmail}>{app.user?.email}</Text>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Cuenta</Text>

              <TouchableOpacity style={styles.row} onPress={() => { setNewName(app.user?.name || ''); setSection('editName'); }}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: 'rgba(37,99,235,0.08)'}]}>
                    <Feather name="edit-2" size={15} color="#2563EB" />
                  </View>
                  <Text style={styles.rowText}>Editar nombre</Text>
                </View>
                <Feather name="chevron-right" size={17} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.row} onPress={() => setSection('changePassword')}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: 'rgba(5,150,105,0.08)'}]}>
                    <Feather name="lock" size={15} color="#059669" />
                  </View>
                  <Text style={styles.rowText}>Cambiar contraseña</Text>
                </View>
                <Feather name="chevron-right" size={17} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Comunidades</Text>

              {communities.map(c => (
                <View key={c.id} style={styles.communityRow}>
                  <View style={styles.communityLeft}>
                    <View style={[styles.rowIcon, {backgroundColor: 'rgba(37,99,235,0.08)'}]}>
                      <Feather name="home" size={15} color="#2563EB" />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.communityName} numberOfLines={1}>{c.name}</Text>
                      <Text style={styles.communityComune}>
                        {c.comune}{c.is_home ? ' · Principal' : ''}
                      </Text>
                    </View>
                  </View>
                  {leavingId === c.id
                    ? <ActivityIndicator size="small" color="#DC2626" style={{padding: 8}} />
                    : (
                      <TouchableOpacity style={styles.leaveBtn} onPress={() => handleLeaveCommunity(c)}>
                        <Feather name="log-out" size={13} color="#DC2626" />
                        <Text style={styles.leaveBtnText}>Salir</Text>
                      </TouchableOpacity>
                    )
                  }
                </View>
              ))}

              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('JoinCommunity', {})}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: 'rgba(37,99,235,0.08)'}]}>
                    <Feather name="plus" size={15} color="#2563EB" />
                  </View>
                  <Text style={styles.rowText}>Unirme a otra comunidad</Text>
                </View>
                <Feather name="chevron-right" size={17} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <View style={styles.group}>
              <TouchableOpacity style={[styles.row, styles.logoutRow]} onPress={handleLogout}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, {backgroundColor: 'rgba(239,68,68,0.1)'}]}>
                    <Feather name="log-out" size={15} color="#DC2626" />
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
              label="Confirmar contraseña"
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

const cardShadow = {
  shadowColor: '#64748B',
  shadowOffset: {width: 0, height: 1},
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 1,
} as const;

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
  scroll: {flexGrow: 1, paddingBottom: 40},

  avatarSection: {alignItems: 'center', paddingVertical: 28},
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: {fontFamily: 'Inter', fontSize: 28, fontWeight: '800', color: '#fff'},
  userName: {fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#0F172A'},
  userEmail: {fontFamily: 'Inter', fontSize: 14, color: '#64748B', marginTop: 4},

  group: {paddingHorizontal: 20, marginBottom: 8},
  groupLabel: {
    fontFamily: 'Inter', fontSize: 12, fontWeight: '500', color: '#94A3B8',
    marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#F1F5F9',
    ...cardShadow,
  },
  logoutRow: {borderColor: 'rgba(220,38,38,0.12)'},
  rowLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rowIcon: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  rowText: {fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: '#0F172A'},
  logoutText: {color: '#DC2626'},

  communityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#F1F5F9',
    ...cardShadow,
  },
  communityLeft: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8},
  communityName: {fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#0F172A'},
  communityComune: {fontFamily: 'Inter', fontSize: 12, color: '#64748B', marginTop: 2},
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)',
  },
  leaveBtnText: {fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#DC2626'},

  version: {fontFamily: 'Inter', fontSize: 12, color: '#CBD5E1', textAlign: 'center', marginTop: 20},

  formSection: {padding: 20},
  saveBtn: {
    backgroundColor: '#2563EB', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnText: {fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: '#fff'},
});
