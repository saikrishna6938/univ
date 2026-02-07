import { Image, StyleSheet, View } from 'react-native';

export default function LogoHeader() {
  return (
    <View style={styles.wrap}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingTop: 6,
    paddingBottom: 10
  },
  logo: { width: 160, height: 48 }
});
