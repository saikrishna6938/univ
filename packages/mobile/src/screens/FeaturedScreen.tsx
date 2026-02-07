import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import CountryPicker, { type Country } from '../components/CountryPicker';
import LogoHeader from '../components/LogoHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6942';

type Featured = {
  id: number;
  universityName: string;
  programName: string;
  discount?: number | null;
  applicationFee?: number | null;
};

export default function FeaturedScreen() {
  const [items, setItems] = useState<Featured[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<Country | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_URL}/api/featured`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchText = !q || item.universityName.toLowerCase().includes(q) || item.programName.toLowerCase().includes(q);
      const matchCountry =
        !country || item.countryId === country.id || item.countryIso?.toLowerCase() === country.isoCode.toLowerCase();
      return matchText && matchCountry;
    });
  }, [items, search, country]);

  const renderHeader = () => (
    <View style={{ padding: 16, gap: 8, backgroundColor: '#f8fafc' }}>
      <LogoHeader />
      <Text style={styles.sectionTitle}>Featured Universities</Text>
      <CountryPicker selectedId={(country?.id ?? country?._id)?.toString()} onSelect={(c) => setCountry(c)} />
      <TextInput
        style={styles.input}
        placeholder="Search university or program"
        value={search}
        onChangeText={setSearch}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View style={[styles.card, { marginHorizontal: 16 }]}>
          <Text style={styles.programTitle}>{item.universityName}</Text>
          <Text style={styles.programSub}>{item.programName}</Text>
          <View style={styles.metaRow}>
            {item.applicationFee != null && <Text style={styles.metaChip}>App Fee: ${item.applicationFee}</Text>}
            {item.discount != null && <Text style={styles.metaChip}>Discount: {item.discount}%</Text>}
          </View>
        </View>
      )}
      ListHeaderComponent={renderHeader}
      ListHeaderComponentStyle={{ zIndex: 5 }}
      ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 16 }}>No featured items.</Text>}
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
    backgroundColor: '#fff',
    marginVertical: 8
  },
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
  error: { color: '#dc2626', fontWeight: '700', marginTop: 6 }
});
