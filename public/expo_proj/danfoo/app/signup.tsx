// app/signup.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { styles } from "./styles";
import { API_BASE } from "./config";

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup() {
    if (!fullName || !email || !password)
      return Alert.alert("Validation", "Please fill in all fields");
    try {
      const res = await axios.post(
        `${API_BASE}/auth/signup`,
        {
          email,
          password,
          full_name: fullName,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      const data = res.data;
      await AsyncStorage.setItem("token", data.token);
      Alert.alert("Success", "Account created");
      router.back();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Signup failed", err.response?.data?.message || "Try again");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Welcome to danfoo!</Text>
        <TextInput
          placeholder="Full name"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
        />
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
        <TouchableOpacity style={styles.btn} onPress={handleSignup}>
          <Text style={styles.btnText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text
            style={{ color: "#f1c40f", textAlign: "center", marginTop: 10 }}
          >
            Already have an account? Log in
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
