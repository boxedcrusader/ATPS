// app/login.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { styles } from "./styles";
import { API_BASE } from "./config";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    if (!email || !password)
      return Alert.alert("Validation", "Please enter email and password");
    try {
      const res = await axios.post(
        `${API_BASE}/auth/log-in`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      const data = res.data;
      await AsyncStorage.setItem("token", data.token);
      Alert.alert("Success", "Logged in");
      router.back();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Login failed", err.response?.data?.message || "Try again");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Welcome back to danfoo!</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.btnText}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text
            style={{ color: "#f1c40f", textAlign: "center", marginTop: 10 }}
          >
            Your first ride? Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
