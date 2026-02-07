import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import LogoHeader from '../components/LogoHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6942';

type EventRow = { title: string; date: string };
type UniEvent = { program: string; university: string; events: EventRow[] };

export default function EventsScreen() {
  const [events, setEvents] = useState<UniEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/events`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setEvents)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((item) =>
      item.program.toLowerCase().includes(q) || item.university.toLowerCase().includes(q)
    );
  }, [events, search]);

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item, idx) => `${item.program}-${idx}`}
      renderItem={({ item }) => (
        <View style={[styles.card, { marginHorizontal: 16 }]}>
          <Text style={styles.programTitle}>{item.program}</Text>
          <Text style={styles.programSub}>{item.university}</Text>
          {item.events.map((ev, idx, arr) => (
            <View key={idx} style={styles.flowRow}>
              <View style={styles.flowIconWrap}>
                <Text style={styles.flowIndex}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItem}>{ev.title}</Text>
                <Text style={styles.listMeta}>{new Date(ev.date).toLocaleDateString()}</Text>
                {idx < arr.length - 1 && <View style={styles.flowConnector} />}
              </View>
            </View>
          ))}
        </View>
      )}
      ListHeaderComponent={
        <View style={{ padding: 16, gap: 8, backgroundColor: '#f8fafc' }}>
          <LogoHeader />
          <Text style={styles.sectionTitle}>Events & Deadlines</Text>
          <TextInput
            style={styles.input}
            placeholder="Filter by title or university"
            value={search}
            onChangeText={setSearch}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      }
      ListHeaderComponentStyle={{ zIndex: 5 }}
      ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 16 }}>No events available.</Text>}
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
    marginBottom: 10
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
  listItem: { color: '#0f172a', fontWeight: '700' },
  listMeta: { color: '#475569', marginTop: 2 },
  flowRow: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'flex-start' },
  flowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  flowIndex: { color: '#fff', fontWeight: '800' },
  flowConnector: {
    marginLeft: 4,
    marginTop: 4,
    height: 18,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0'
  },
  error: { color: '#dc2626', fontWeight: '700', marginTop: 6 }
});
