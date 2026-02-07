import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CountryPicker, { type Country } from '../components/CountryPicker';
import LogoHeader from '../components/LogoHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6942';

type Program = {
  _id?: string;
  id?: string | number;
  programName: string;
  universityName: string;
  levelOfStudy?: string;
  languageOfStudy?: string;
  tuitionFeePerYear?: number;
};

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<Country | undefined>(undefined);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_URL}/api/programs/paginated`);
      url.searchParams.set('limit', '10');
      if (query.trim()) url.searchParams.set('search', query.trim());
      if (country?.id ?? country?._id) url.searchParams.set('countryId', (country.id ?? country._id)!.toString());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Program[];
      setPrograms(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // No initial search; wait for user input

  const renderHeader = () => (
    <View style={{ padding: 16, gap: 8, backgroundColor: '#f8fafc' }}>
      <LogoHeader />
      <Text style={styles.sectionTitle}>Search Programs</Text>
      <CountryPicker selectedId={(country?.id ?? country?._id)?.toString()} onSelect={(c) => setCountry(c)} />
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Search course or university"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={load}
        />
        <TouchableOpacity style={styles.button} onPress={load}>
          <Text style={styles.buttonText}>Go</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <FlatList
      data={programs}
      keyExtractor={(item, idx) => (item._id || item.id || idx).toString()}
      renderItem={({ item }) => (
        <View style={[styles.card, { marginHorizontal: 16 }]}>
          <Text style={styles.programTitle}>{item.programName}</Text>
          <Text style={styles.programSub}>{item.universityName}</Text>
          <View style={styles.metaRow}>
            {item.levelOfStudy && <Text style={styles.metaChip}>{item.levelOfStudy}</Text>}
            {item.languageOfStudy && <Text style={styles.metaChip}>{item.languageOfStudy}</Text>}
            {item.tuitionFeePerYear && <Text style={styles.metaChip}>${item.tuitionFeePerYear}</Text>}
          </View>
        </View>
      )}
      ListHeaderComponent={renderHeader}
      ListHeaderComponentStyle={{ zIndex: 5 }}
      ListEmptyComponent={
        loading ? (
          <Text style={{ textAlign: 'center', padding: 16 }}>Loading…</Text>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Search to see results</Text>
          </View>
        )
      }
      contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
      stickyHeaderIndices={[0]}
    />
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  inputRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2
  },
  programTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  programSub: { color: '#475569', marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaChip: {
    backgroundColor: '#e0f2fe',
    color: '#0ea5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12
  },
  error: { color: '#dc2626', fontWeight: '700', marginTop: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#475569', fontWeight: '700' }
});
