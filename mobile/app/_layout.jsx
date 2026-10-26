import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Universal browser style injection for web to completely eradicate browser outline boxes
if (Platform.OS === "web" && typeof document !== "undefined") {
  const styleId = "zygene-web-input-focus-reset";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      *, *::before, *::after {
        box-sizing: border-box;
      }
      /* Remove browser focus rectangles universally across all inputs and textareas */
      input, textarea, select, [contenteditable="true"], [role="textbox"], .css-textinput-11aywtz {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        outline-color: transparent !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus, [role="textbox"]:focus, .css-textinput-11aywtz:focus {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        outline-color: transparent !important;
        box-shadow: none !important;
      }
      input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
      }
      /* Custom sleek scrollbar for web */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #f8fafc;
      }
      ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Re-verify in useEffect for hot-reload persistence
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const styleId = "zygene-web-input-focus-reset";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          input, textarea, select, [contenteditable="true"], [role="textbox"] {
            outline: none !important;
            outline-style: none !important;
            outline-width: 0 !important;
            box-shadow: none !important;
          }
          input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus {
            outline: none !important;
            outline-style: none !important;
            outline-width: 0 !important;
            box-shadow: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Root & Auth */}
        <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />

      {/* Farmer Module */}
      <Stack.Screen name="farmer/dashboard" />
      <Stack.Screen name="farmer/crops" />
      <Stack.Screen name="farmer/fields" />
      <Stack.Screen name="farmer/more" />
      <Stack.Screen name="farmer/create-field" />
      <Stack.Screen name="farmer/create-crop" />
      <Stack.Screen name="farmer/crop-details/[id]" />
      <Stack.Screen name="farmer/crop-details/[id]/lifecycle" />
      <Stack.Screen name="farmer/crop-details/[id]/measurements/[recordId]" />
      <Stack.Screen name="farmer/crop-details/[id]/photos/[recordId]" />
      <Stack.Screen name="farmer/crop-details/[id]/irrigation/[recordId]" />
      <Stack.Screen name="farmer/crop-details/[id]/treatments/[recordId]" />
      <Stack.Screen name="farmer/crop-details/[id]/disease-pest/[recordId]" />
      <Stack.Screen name="farmer/crop-details/[id]/harvest/[recordId]" />

      {/* Breeder Module */}
      <Stack.Screen name="breeder/dashboard" />
      <Stack.Screen name="breeder/profile" />
      <Stack.Screen name="breeder/programs" />
      <Stack.Screen name="breeder/create-program" />
      <Stack.Screen name="breeder/program-details/[id]" />
      <Stack.Screen name="breeder/crosses" />
      <Stack.Screen name="breeder/create-cross" />
      <Stack.Screen name="breeder/cross/[id]" />
      <Stack.Screen name="breeder/trials" />
      <Stack.Screen name="breeder/create-trial" />
      <Stack.Screen name="breeder/trial/[id]" />
      <Stack.Screen name="breeder/trial/[id]/observation/create" />
      <Stack.Screen name="breeder/trial/[id]/observation/[observationId]" />
      <Stack.Screen name="breeder/analytics" />
    </Stack>
    </SafeAreaProvider>
  );
}