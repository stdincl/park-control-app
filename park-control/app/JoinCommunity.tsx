import React, {useContext, useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, TextInput,
  ActivityIndicator, FlatList,
} from 'react-native';
import Context from '@ctx/Contexto';

interface CommunityResult {
  id: number;
  name: string;
  comune: string;
  identifier: number;
  admin_name: string;
}

export default function JoinCommunity({navigation}: any) {
  const app = useContext(Context);

  const [step, setStep] = useState<'search' | 'code'>('search');
  const [comune, setComune] = useState('');
  const [name, setName] = useState('');
  const [results, setResults] = useState<CommunityResult[]>([]);
  const [selected, setSelected] = useState<CommunityResult | null>(null);
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleSearch = async () => {
    if (!comune.trim()) {
      Alert.alert('Campo requerido', 'Ingresa la comuna para buscar');
      return;
    }
    setSearching(true);
    try {
      const data = await app.api.searchCommunities(comune.trim(), name.trim() || undefined);
      setResults(data.communities || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al buscar');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCommunity = (community: CommunityResult) => {
    setSelected(community);
    setCode('');
    setStep('code');
  };

  const handleJoin = async () => {
    if (!selected) return;
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (cleanCode.length !== 6) {
      Alert.alert('Código inválido', 'El código debe tener 6 caracteres (letras y números)');
      return;
    }
    setJoining(true);
    try {
      await app.api.joinCommunity(selected.identifier, cleanCode);
      Alert.alert(
        '¡Bienvenido!',
        `Te uniste a ${selected.name} exitosamente.`,
        [{text: 'Ver comunidad', onPress: () => navigation.goBack()}],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Código inválido o vencido');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'code' ? setStep('search') : navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {step === 'code' ? 'Resultados' : 'Cancelar'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unirme a comunidad</Text>
        <View style={{width: 80}} />
      </View>

      {step === 'search' ? (
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>Buscar condominio</Text>
            <Text style={styles.sectionSubtitle}>Busca por comuna y opcionalmente por nombre</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Comuna *</Text>
              <TextInput
                style={styles.input}
                value={comune}
                onChangeText={setComune}
                placeholder="Ej: Providencia, Las Condes..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre del condominio (opcional)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Las Palmas, Edificio Central..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={searching}>
              {searching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchBtnText}>Buscar</Text>
              )}
            </TouchableOpacity>
          </View>

          {results.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>{results.length} resultado(s)</Text>
              {results.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.resultCard}
                  onPress={() => handleSelectCommunity(c)}>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{c.name}</Text>
                    <Text style={styles.resultComune}>{c.comune}</Text>
                    <Text style={styles.resultAdmin}>Admin: {c.admin_name}</Text>
                  </View>
                  <View style={styles.resultId}>
                    <Text style={styles.resultIdText}>#{c.identifier}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!searching && results.length === 0 && comune.length > 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No se encontraron comunidades</Text>
              <Text style={styles.noResultsSub}>Verifica la comuna e intenta con otro nombre</Text>
            </View>
          )}

          <View style={{height: 40}} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {selected && (
            <View style={styles.selectedCard}>
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>#{selected.identifier}</Text>
              </View>
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedName}>{selected.name}</Text>
                <Text style={styles.selectedComune}>{selected.comune}</Text>
                <Text style={styles.selectedAdmin}>Admin: {selected.admin_name}</Text>
              </View>
            </View>
          )}

          <View style={styles.codeSection}>
            <Text style={styles.sectionTitle}>Ingresa el código de acceso</Text>
            <Text style={styles.sectionSubtitle}>
              El administrador de la comunidad debe proporcionarte un código de 6 caracteres
            </Text>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={t => setCode(t.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              placeholderTextColor="#CBD5E1"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              textAlign="center"
            />

            <Text style={styles.codeHint}>Solo letras mayúsculas y números</Text>

            <TouchableOpacity
              style={[styles.joinBtn, code.length < 6 && styles.joinBtnDisabled]}
              onPress={handleJoin}
              disabled={joining || code.length < 6}>
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinBtnText}>Unirme a la comunidad</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{height: 40}} />
        </ScrollView>
      )}
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
  scroll: {flex: 1},
  searchSection: {padding: 24},
  codeSection: {padding: 24},
  sectionTitle: {fontFamily: 'Inter-SemiBold', fontSize: 18, color: '#1E293B', marginBottom: 4},
  sectionSubtitle: {fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20},
  field: {marginBottom: 16},
  label: {fontFamily: 'Inter-Medium', fontSize: 13, color: '#475569', marginBottom: 6},
  input: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontFamily: 'Inter-Regular', fontSize: 15, color: '#1E293B',
    backgroundColor: '#fff',
  },
  searchBtn: {
    backgroundColor: '#2563EB', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  searchBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff'},
  resultsSection: {paddingHorizontal: 24, paddingBottom: 16},
  resultCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    flexDirection: 'row', alignItems: 'center',
  },
  resultInfo: {flex: 1},
  resultName: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#1E293B'},
  resultComune: {fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748B', marginTop: 2},
  resultAdmin: {fontFamily: 'Inter-Regular', fontSize: 12, color: '#94A3B8', marginTop: 2},
  resultId: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, marginLeft: 12,
  },
  resultIdText: {fontFamily: 'Inter-Bold', fontSize: 12, color: '#2563EB'},
  noResults: {padding: 40, alignItems: 'center'},
  noResultsText: {fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#1E293B', marginBottom: 4},
  noResultsSub: {fontFamily: 'Inter-Regular', fontSize: 14, color: '#94A3B8', textAlign: 'center'},
  selectedCard: {
    margin: 24, marginBottom: 0, padding: 16, backgroundColor: '#EFF6FF',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#BFDBFE',
    flexDirection: 'row', alignItems: 'center',
  },
  selectedBadge: {
    backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginRight: 14,
  },
  selectedBadgeText: {fontFamily: 'Inter-Bold', fontSize: 14, color: '#fff'},
  selectedInfo: {flex: 1},
  selectedName: {fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#1E293B'},
  selectedComune: {fontFamily: 'Inter-Regular', fontSize: 13, color: '#3B82F6', marginTop: 2},
  selectedAdmin: {fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748B', marginTop: 2},
  codeInput: {
    borderWidth: 2.5, borderColor: '#2563EB', borderRadius: 18,
    paddingVertical: 20, marginVertical: 24,
    fontFamily: 'Inter-ExtraBold', fontSize: 32, color: '#1E293B',
    letterSpacing: 12, backgroundColor: '#fff',
  },
  codeHint: {fontFamily: 'Inter-Regular', fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: -16},
  joinBtn: {
    backgroundColor: '#2563EB', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 24,
  },
  joinBtnDisabled: {backgroundColor: '#93C5FD'},
  joinBtnText: {fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff'},
});
