import React, {useContext, useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, TextInput,
  ActivityIndicator, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import Context from '@ctx/Contexto';

interface Region { reg_id: number; reg_name: string }
interface Commune { cmu_id: number; cmu_name: string }
interface CommunityResult {
  id: number;
  name: string;
  comune: string;
  identifier: number;
  admin_name: string;
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  items: {id: number; label: string}[];
  onSelect: (item: {id: number; label: string}) => void;
  onClose: () => void;
  loading?: boolean;
}

function PickerModal({visible, title, items, onSelect, onClose, loading}: PickerModalProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  useEffect(() => { if (!visible) setQuery(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pickerStyles.safe} edges={['top', 'bottom']}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
            <Feather name="x" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.searchRow}>
          <Feather name="search" size={16} color="#94A3B8" style={pickerStyles.searchIcon} />
          <TextInput
            style={pickerStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={`Buscar ${title.toLowerCase()}...`}
            placeholderTextColor="#94A3B8"
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>

        {loading ? (
          <View style={pickerStyles.center}>
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={pickerStyles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={pickerStyles.center}>
                <Text style={pickerStyles.emptyText}>Sin resultados</Text>
              </View>
            }
            renderItem={({item}) => (
              <TouchableOpacity style={pickerStyles.item} onPress={() => onSelect(item)}>
                <Text style={pickerStyles.itemText}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

export default function JoinCommunity({navigation}: any) {
  const app = useContext(Context);

  const [step, setStep] = useState<'search' | 'code'>('search');

  /* Geo */
  const [regions, setRegions] = useState<Region[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<Commune | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [communePickerOpen, setCommunePickerOpen] = useState(false);

  /* Search */
  const [name, setName] = useState('');
  const [results, setResults] = useState<CommunityResult[]>([]);
  const [selected, setSelected] = useState<CommunityResult | null>(null);
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setLoadingRegions(true);
    app.api.getRegions()
      .then(d => setRegions(d.regions || []))
      .catch(() => {})
      .finally(() => setLoadingRegions(false));
  }, []);

  const handleRegionSelect = useCallback(async (item: {id: number; label: string}) => {
    setSelectedRegion({reg_id: item.id, reg_name: item.label});
    setSelectedCommune(null);
    setResults([]);
    setSearched(false);
    setRegionPickerOpen(false);
    setLoadingCommunes(true);
    try {
      const d = await app.api.getCommunes(item.id);
      setCommunes(d.communes || []);
    } catch {}
    finally { setLoadingCommunes(false); }
  }, []);

  const handleCommuneSelect = useCallback((item: {id: number; label: string}) => {
    setSelectedCommune({cmu_id: item.id, cmu_name: item.label});
    setResults([]);
    setSearched(false);
    setCommunePickerOpen(false);
  }, []);

  const handleSearch = async () => {
    if (!selectedCommune) {
      Alert.alert('Campo requerido', 'Selecciona una comuna para buscar');
      return;
    }
    setSearching(true);
    setSearched(false);
    try {
      const data = await app.api.searchCommunities(
        selectedCommune.cmu_id,
        name.trim() || undefined,
      );
      setResults(data.communities || []);
      setSearched(true);
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
      Alert.alert('Código inválido', 'El código debe tener 6 caracteres');
      return;
    }
    setJoining(true);
    try {
      await app.api.joinCommunity(selected.identifier, cleanCode);
      Alert.alert(
        'Bienvenido',
        `Te uniste a ${selected.name} exitosamente.`,
        [{text: 'Ver comunidad', onPress: () => navigation.goBack()}],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Código inválido o vencido');
    } finally {
      setJoining(false);
    }
  };

  const regionItems = regions.map(r => ({id: r.reg_id, label: r.reg_name}));
  const communeItems = communes.map(c => ({id: c.cmu_id, label: c.cmu_name}));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step === 'code' ? setStep('search') : navigation.goBack()}
          style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'search' ? 'Buscar condominio' : 'Código de acceso'}
        </Text>
        <View style={{width: 44}} />
      </View>

      {step === 'search' ? (
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionSub}>Selecciona región y comuna, luego busca por nombre del condominio</Text>

            {/* Selector región */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Región</Text>
              <TouchableOpacity
                style={[styles.selector, loadingRegions && styles.selectorDisabled]}
                onPress={() => !loadingRegions && setRegionPickerOpen(true)}
                disabled={loadingRegions}>
                {loadingRegions ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text style={[styles.selectorText, !selectedRegion && styles.selectorPlaceholder]}>
                    {selectedRegion ? selectedRegion.reg_name : 'Selecciona una región'}
                  </Text>
                )}
                <Feather name="chevron-down" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Selector comuna */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Comuna</Text>
              <TouchableOpacity
                style={[styles.selector, (!selectedRegion || loadingCommunes) && styles.selectorDisabled]}
                onPress={() => selectedRegion && !loadingCommunes && setCommunePickerOpen(true)}
                disabled={!selectedRegion || loadingCommunes}>
                {loadingCommunes ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text style={[styles.selectorText, !selectedCommune && styles.selectorPlaceholder]}>
                    {!selectedRegion
                      ? 'Primero selecciona una región'
                      : selectedCommune ? selectedCommune.cmu_name : 'Selecciona una comuna'}
                  </Text>
                )}
                <Feather name="chevron-down" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Nombre opcional */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre del condominio (opcional)</Text>
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
              style={[styles.primaryBtn, !selectedCommune && styles.primaryBtnDisabled]}
              onPress={handleSearch}
              disabled={searching || !selectedCommune}>
              {searching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Buscar</Text>
              )}
            </TouchableOpacity>

            {searched && results.length > 0 && (
              <View style={styles.results}>
                <Text style={styles.resultsLabel}>{results.length} resultado{results.length !== 1 ? 's' : ''}</Text>
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
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultBadgeText}>#{c.identifier}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {searched && results.length === 0 && (
              <View style={styles.noResults}>
                <Feather name="search" size={24} color="#CBD5E1" />
                <Text style={styles.noResultsTitle}>Sin resultados</Text>
                <Text style={styles.noResultsSub}>Verifica la comuna o intenta con otro nombre</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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

          <Text style={styles.sectionSub}>
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
            style={[styles.primaryBtn, code.length < 6 && styles.primaryBtnDisabled]}
            onPress={handleJoin}
            disabled={joining || code.length < 6}>
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Unirme a la comunidad</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modales de selección */}
      <PickerModal
        visible={regionPickerOpen}
        title="Región"
        items={regionItems}
        onSelect={handleRegionSelect}
        onClose={() => setRegionPickerOpen(false)}
      />
      <PickerModal
        visible={communePickerOpen}
        title="Comuna"
        items={communeItems}
        onSelect={handleCommuneSelect}
        onClose={() => setCommunePickerOpen(false)}
        loading={loadingCommunes}
      />
    </SafeAreaView>
  );
}

const pickerStyles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: {fontFamily: 'Inter', fontSize: 17, fontWeight: '600', color: '#0F172A'},
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  searchIcon: {marginRight: 8},
  searchInput: {
    flex: 1, fontFamily: 'Inter', fontSize: 15,
    color: '#0F172A', paddingVertical: 0,
  },
  list: {paddingHorizontal: 16, paddingBottom: 20},
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  itemText: {fontFamily: 'Inter', fontSize: 15, color: '#0F172A'},
  center: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontFamily: 'Inter', fontSize: 14, color: '#94A3B8'},
});

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
  scroll: {flex: 1},
  scrollContent: {padding: 20},

  sectionSub: {fontFamily: 'Inter', fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 24},

  field: {marginBottom: 16},
  fieldLabel: {fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: '#64748B', marginBottom: 8},

  selector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectorDisabled: {opacity: 0.5},
  selectorText: {fontFamily: 'Inter', fontSize: 15, color: '#0F172A', flex: 1},
  selectorPlaceholder: {color: '#94A3B8'},

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter', fontSize: 15, color: '#0F172A',
  },

  primaryBtn: {
    backgroundColor: '#2563EB', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: 8,
  },
  primaryBtnDisabled: {opacity: 0.4},
  primaryBtnText: {fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: '#fff'},

  results: {marginTop: 24},
  resultsLabel: {fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: '#94A3B8', marginBottom: 10},
  resultCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    flexDirection: 'row', alignItems: 'center',
    ...cardShadow,
  },
  resultInfo: {flex: 1},
  resultName: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#0F172A'},
  resultComune: {fontFamily: 'Inter', fontSize: 13, color: '#64748B', marginTop: 2},
  resultAdmin: {fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 2},
  resultBadge: {
    backgroundColor: 'rgba(37,99,235,0.07)',
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.15)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 12,
  },
  resultBadgeText: {fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: '#2563EB'},

  noResults: {alignItems: 'center', paddingVertical: 40, gap: 8},
  noResultsTitle: {fontFamily: 'Inter', fontSize: 16, fontWeight: '600', color: '#0F172A'},
  noResultsSub: {fontFamily: 'Inter', fontSize: 14, color: '#64748B', textAlign: 'center'},

  selectedCard: {
    backgroundColor: 'rgba(37,99,235,0.05)',
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.18)',
    borderRadius: 16, padding: 16, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  selectedBadge: {
    backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginRight: 14,
  },
  selectedBadgeText: {fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#fff'},
  selectedInfo: {flex: 1},
  selectedName: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#0F172A'},
  selectedComune: {fontFamily: 'Inter', fontSize: 13, color: '#2563EB', marginTop: 2},
  selectedAdmin: {fontFamily: 'Inter', fontSize: 12, color: '#64748B', marginTop: 2},

  codeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: '#2563EB',
    borderRadius: 18, paddingVertical: 22, marginVertical: 20,
    fontFamily: 'Inter', fontSize: 34, fontWeight: '800', color: '#0F172A',
    letterSpacing: 14,
    shadowColor: '#2563EB', shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  codeHint: {fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 8, marginTop: -8},
});
