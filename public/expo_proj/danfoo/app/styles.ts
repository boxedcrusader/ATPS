// app/styles.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // page wrapper
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 16,
  },

  // header
  headerWrap: {
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 18,
    elevation: 6,
  },
  headerInner: {
    paddingVertical: 28,
    marginTop: 6,
    alignItems: "center",
  },
  title: {
    color: "#000",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#333",
    fontSize: 14,
    marginTop: 6,
  },

  // sections
  section: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 2,
    borderColor: "#f1c40f",
    borderRadius: 15,
    padding: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    color: "#f1c40f",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  // form
  formGrid: {
    // will stack vertically in mobile; keep spacing
    gap: 12 as any,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    marginBottom: 10,
  },

  // buttons
  btn: {
    backgroundColor: "#f1c40f",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "#000", fontWeight: "700", textTransform: "uppercase" },

  btnDisabled: {
    backgroundColor: "#666",
    opacity: 0.6,
  },
  btnSecondary: {
    backgroundColor: "#333",
    borderWidth: 2,
    borderColor: "#f1c40f",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnDanger: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  // trip card
  tripCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  route: { color: "#f1c40f", fontWeight: "700", fontSize: 16 },
  price: { color: "#2ecc71", fontWeight: "700", fontSize: 15 },

  tripDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4, // Negative margin to offset child margins
  },
  tripDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8 as any,
  },
  detailItem: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 8,
    minWidth: 120,
  },
  detailItemCompat: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 8,
    minWidth: 120,
    margin: 4, // Replace gap with margin
  },
  detailLabel: { color: "#bbb", fontSize: 12 },
  detailValue: { color: "#fff", fontWeight: "700" },

  // booking form
  bookingForm: {
    backgroundColor: "rgba(241,196,15,0.08)",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#f1c40f",
  },

  // booking card
  bookingCard: {
    backgroundColor: "rgba(46,204,113,0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2ecc71",
    marginBottom: 12,
  },
  bookingActionsRow: {
    flexDirection: "row",
    marginHorizontal: -4,
    marginTop: 12,
  },

  bookingActionItem: {
    margin: 4,
    flex: 1,
    minWidth: 100,
  },

  loadingText: { textAlign: "center", color: "#f1c40f", marginVertical: 12 },

  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 2,
    borderColor: "#f1c40f",
    borderRadius: 16,
    padding: 22,
  },
  modalTitle: {
    color: "#f1c40f",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },

  // small
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  centered: { alignItems: "center" },
});

export default styles;