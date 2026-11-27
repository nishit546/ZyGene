import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../constants/theme";
import { getDeviceContacts } from "../services/shareService";

export default function ContactPickerModal({
  visible,
  onClose,
  onSelectContact,
  title = "Select Contact to Share With",
}) {
  const [contacts, setContacts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      loadContacts();
    } else {
      setSearch("");
      setError(null);
    }
  }, [visible]);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    const result = await getDeviceContacts();
    setLoading(false);

    if (result.success) {
      setContacts(result.contacts);
      setFiltered(result.contacts);
    } else {
      setError(result.error);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(contacts);
      return;
    }
    const query = text.toLowerCase();
    const matches = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
    setFiltered(matches);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subTitle}>Select a person from your contacts</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone or email..."
              value={search}
              onChangeText={handleSearch}
              placeholderTextColor="#64748B"
              cursorColor="#1B5E20"
              selectionColor="rgba(27, 94, 32, 0.25)"
            />
            {search ? (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* CONTACT LIST OR STATE */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.stateText}>Accessing contacts...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle-outline" size={36} color={COLORS.danger || "#EF4444"} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadContacts}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="people-outline" size={36} color={COLORS.textTertiary} />
              <Text style={styles.stateText}>
                {search ? "No matching contacts found." : "No contacts available on this device."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id || item.name}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => {
                    onSelectContact(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name ? item.name.charAt(0).toUpperCase() : "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    {item.phone ? (
                      <Text style={styles.contactDetail}>📞 {item.phone}</Text>
                    ) : null}
                    {item.email ? (
                      <Text style={styles.contactDetail}>✉️ {item.email}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            />
          )}

          {/* PRIVACY FOOTER NOTE */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
            <Text style={styles.footerText}>
              ZyGene reads contacts only locally. No address book data is uploaded.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: "85%",
    minHeight: "50%",
    padding: 16,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  subTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    paddingVertical: 6,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#EF4444",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  contactDetail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
    color: "#6B7280",
    flex: 1,
  },
});
