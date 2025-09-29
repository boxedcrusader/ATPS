// app/config.ts
import { Platform } from "react-native";

/*
  IMPORTANT:
  - If you run the app on a *physical device* (via Expo Go), set LOCAL_IP to your PC's LAN IP, e.g. 192.168.1.42
  - If using Android emulator (classic AVD), use 10.0.2.2:3000
  - If iOS Simulator, "localhost" usually works.
*/

export const LOCAL_IP = "192.168.1.100"; // <-- REPLACE with your machine IP
export const API_BASE = Platform.OS === "android"
  ? `http://192.168.198.242:3000/api`            // Android emulator
  : `http://${LOCAL_IP}:3000/api`;        // iOS Simulator or physical device (change LOCAL_IP)

export const COLORS = {
  primary: "#f1c40f",
  primaryDark: "#f39c12", 
  success: "#2ecc71",
  danger: "#e74c3c",
  warning: "#f39c12",
  gray: "#95a5a6",
};

export default {
  LOCAL_IP,
  API_BASE,
  COLORS,
};