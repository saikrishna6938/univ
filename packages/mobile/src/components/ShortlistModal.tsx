import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6942';

type Props = { open: boolean; onClose: () => void };

export default function ShortlistModal({ open, onClose }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    course: '',
    start: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    setError(null);
    if (!form.email && !form.phone) {
      setError('Email or phone is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || form.email || form.phone,
          email: form.email || undefined,
          phone: form.phone || undefined,
          city: form.city || undefined,
          course: form.course || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage('Submitted! We will reach out shortly.');
      setForm({ name: '', email: '', phone: '', city: '', course: '', start: '' });
      setTimeout(onClose, 800);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Shortlist Colleges</Text>
          <View style={styles.form}>
            {['name', 'email', 'phone', 'city', 'course'].map((key) => (
              <TextInput
                key={key}
                style={styles.input}
                placeholder={key === 'course' ? 'Course interested in' : key.charAt(0).toUpperCase() + key.slice(1)}
                keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                autoCapitalize="none"
                value={(form as any)[key]}
                onChangeText={(text) => setForm((f) => ({ ...f, [key]: text }))}
              />
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          {message && <Text style={styles.success}>{message}</Text>}
          <TouchableOpacity style={styles.submit} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  submit: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#475569', fontWeight: '700' },
  error: { color: '#dc2626', fontWeight: '700' },
  success: { color: '#16a34a', fontWeight: '700' },
});
