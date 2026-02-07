import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6942';

export type Country = { id?: number; _id?: string; name: string; isoCode: string };

type Props = {
  selectedId?: string;
  onSelect: (country?: Country) => void;
};

export default function CountryPicker({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/countries`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setCountries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = countries.find((c) => (c.id ?? c._id)?.toString() === selectedId);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>{selected ? selected.name : 'Select country'}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Select Country</Text>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={countries}
              keyExtractor={(item) => (item.id ?? item._id ?? item.name).toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.countryText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8
  },
  triggerText: { color: '#0f172a', fontWeight: '700' },
  modal: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  countryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  countryText: { fontSize: 16 },
  closeBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb'
  },
  closeText: { color: '#fff', fontWeight: '700' }
});
