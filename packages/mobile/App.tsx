import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import FooterNav, { TabKey } from './src/components/FooterNav';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import FeaturedScreen from './src/screens/FeaturedScreen';
import EventsScreen from './src/screens/EventsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'search' && <SearchScreen />}
        {activeTab === 'featured' && <FeaturedScreen />}
        {activeTab === 'events' && <EventsScreen />}
      </View>
      <FooterNav active={activeTab} onChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 }
});
