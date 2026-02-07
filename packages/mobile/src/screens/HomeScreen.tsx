import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import ShortlistModal from "../components/ShortlistModal";
import LogoHeader from "../components/LogoHeader";

export default function HomeScreen() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        stickyHeaderIndices={[0]}
      >
        <LogoHeader />
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Find Study Abroad Universities</Text>
          <Text style={styles.heroTitle}>Find Study Abroad Universities</Text>
          <Text style={styles.heroSub}>
            Expert counselling with 50% off on student visa fees. Choose from
            extensive colleges and course options.
          </Text>
          <View style={styles.buttonRow}>
            <Text style={styles.ctaButtonPrimary} onPress={() => setOpen(true)}>
              Shortlist College
            </Text>
            <Text
              style={styles.ctaButtonSecondary}
              onPress={() => setOpen(true)}
            >
              Apply Now
            </Text>
          </View>
          <View style={styles.perksWrap}>
            {[
              "Free Profile Evaluation",
              "150+ Experienced Counsellor",
              "95% Visa Success Rate",
              "Best SOP Writers",
            ].map((perk) => (
              <View style={styles.perkChip} key={perk}>
                <Text style={styles.perkIcon}>✦</Text>
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How We Work</Text>
          {[
            "Register Yourself",
            "Career Counselling",
            "Entrance Test",
            "University Shortlist",
            "Application Prep",
            "Scholarships & Aid",
            "Visa & Interview",
            "Pre-Departure",
          ].map((step, idx, arr) => (
            <View key={step} style={styles.flowRow}>
              <View style={styles.flowIconWrap}>
                <Text style={styles.flowIndex}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItem}>{step}</Text>
                {idx < arr.length - 1 && <View style={styles.flowConnector} />}
              </View>
            </View>
          ))}
          <View style={styles.howActions}>
            <Text style={styles.howButtonPrimary} onPress={() => setOpen(true)}>
              Get Information
            </Text>
            <Text
              style={styles.howButtonSecondary}
              onPress={() => setOpen(true)}
            >
              Book Appointment
            </Text>
          </View>
        </View>
      </ScrollView>
      <ShortlistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  heroEyebrow: {
    color: "#a5f3fc",
    fontWeight: "800",
    letterSpacing: 0.5,
    fontSize: 13,
  },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 16, color: "#e2e8f0", marginTop: 2 },
  logoWrap: {
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    paddingTop: 6,
    paddingBottom: 10,
  },
  logo: { width: 160, height: 48 },
  buttonRow: { flexDirection: "row", gap: 10 },
  ctaButtonPrimary: {
    flex: 1,
    backgroundColor: "#2563eb",
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  ctaButtonSecondary: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontWeight: "800",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  perksWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  perkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  perkIcon: { color: "#38bdf8" },
  perkText: { color: "#e2e8f0", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  listItem: { color: "#0f172a", fontWeight: "700" },
  flowRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  flowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  flowIndex: { color: "#fff", fontWeight: "800" },
  flowConnector: {
    marginLeft: 4,
    marginTop: 4,
    height: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#e2e8f0",
  },
  howActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  howButtonPrimary: {
    flex: 1,
    backgroundColor: "#2563eb",
    color: "#fff",
    paddingVertical: 10,
    borderRadius: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  howButtonSecondary: {
    flex: 1,
    backgroundColor: "#fff",
    color: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
    fontWeight: "800",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
});
