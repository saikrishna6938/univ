import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TabKey = 'home' | 'search' | 'featured' | 'events';

type Props = { active: TabKey; onChange: (k: TabKey) => void };

export default function FooterNav({ active, onChange }: Props) {
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'search', label: 'Search', icon: '🔍' },
    { key: 'featured', label: 'Featured', icon: '⭐️' },
    { key: 'events', label: 'Events', icon: '📅' }
  ];
  return (
    <View style={styles.footer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.footerItem, active === tab.key && styles.footerItemActive]}
          onPress={() => onChange(tab.key)}
        >
          <Text style={[styles.footerIcon, active === tab.key && styles.footerLabelActive]}>{tab.icon}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff'
  },
  footerItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  footerItemActive: { borderTopWidth: 2, borderTopColor: '#2563eb' },
  footerIcon: { fontSize: 18, color: '#475569' },
  footerLabelActive: { color: '#2563eb' }
});
