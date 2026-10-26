import "../global.css";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "../constants/theme";

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

// Modal presentation options for create / action sheets
const modalScreenOptions = {
  presentation: Platform.OS === "ios" ? "modal" : "card",
  animation: "slide_from_bottom",
  animationDuration: 280,
  gestureDirection: "vertical",
  gestureEnabled: true,
};

// Sibling bottom tab / workspace navigation options (clean, instant switch without sliding)
const tabScreenOptions = {
  animation: "none",
};

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
    <SafeAreaProvider style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          // Prevent screen transition flickering or white flash by unifying background
          contentStyle: { backgroundColor: COLORS.background },
          // Native platform stack transitions: iOS native or Android crisp slide_from_right
          animation: Platform.OS === "ios" ? "default" : "slide_from_right",
          animationDuration: 250,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animationTypeForReplace: "push",
        }}
      >
        {/* Root & Auth */}
        <Stack.Screen
          name="index"
          options={{
            animation: "fade",
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            animation: Platform.OS === "ios" ? "default" : "slide_from_right",
            animationDuration: 250,
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            animation: Platform.OS === "ios" ? "default" : "slide_from_right",
            animationDuration: 250,
          }}
        />

        {/* Farmer Main Workspace Tabs */}
        <Stack.Screen name="farmer/dashboard" options={tabScreenOptions} />
        <Stack.Screen name="farmer/crops" options={tabScreenOptions} />
        <Stack.Screen name="farmer/fields" options={tabScreenOptions} />
        <Stack.Screen name="farmer/more" options={tabScreenOptions} />

        {/* Farmer Modal Creation Sheets */}
        <Stack.Screen name="farmer/create-field" options={modalScreenOptions} />
        <Stack.Screen name="farmer/create-crop" options={modalScreenOptions} />
        <Stack.Screen name="farmer/create-task" options={modalScreenOptions} />

        {/* Farmer Detail & Action Screens */}
        <Stack.Screen name="farmer/tasks" />
        <Stack.Screen name="farmer/crop-details/[id]" />
        <Stack.Screen name="farmer/crop-details/[id]/lifecycle" />
        <Stack.Screen name="farmer/crop-details/[id]/history" />
        <Stack.Screen name="farmer/crop-details/[id]/measurements/[recordId]" />
        <Stack.Screen name="farmer/crop-details/[id]/photos/[recordId]" />
        <Stack.Screen name="farmer/crop-details/[id]/irrigation/[recordId]" />
        <Stack.Screen name="farmer/crop-details/[id]/treatments/[recordId]" />
        <Stack.Screen name="farmer/crop-details/[id]/disease-pest/[recordId]" />
        <Stack.Screen name="farmer/crop-details/[id]/harvest/[recordId]" />
        <Stack.Screen name="farmer/field-details/[id]" />
        <Stack.Screen name="farmer/field-work" />
        <Stack.Screen name="farmer/notifications" />
        <Stack.Screen name="farmer/settings" />
        <Stack.Screen name="farmer/about" />
        <Stack.Screen name="farmer/profile" />

        {/* Breeder Main Workspace Tabs */}
        <Stack.Screen name="breeder/dashboard" options={tabScreenOptions} />
        <Stack.Screen name="breeder/programs" options={tabScreenOptions} />
        <Stack.Screen name="breeder/crosses" options={tabScreenOptions} />
        <Stack.Screen name="breeder/trials" options={tabScreenOptions} />
        <Stack.Screen name="breeder/analytics" options={tabScreenOptions} />
        <Stack.Screen name="breeder/profile" options={tabScreenOptions} />

        {/* Breeder Modal Creation Sheets */}
        <Stack.Screen name="breeder/create-program" options={modalScreenOptions} />
        <Stack.Screen name="breeder/create-cross" options={modalScreenOptions} />
        <Stack.Screen name="breeder/create-trial" options={modalScreenOptions} />
        <Stack.Screen name="breeder/trial/[id]/observation/create" options={modalScreenOptions} />

        {/* Breeder Detail & Sub-Screens */}
        <Stack.Screen name="breeder/program-details/[id]" />
        <Stack.Screen name="breeder/cross/[id]" />
        <Stack.Screen name="breeder/trial/[id]" />
        <Stack.Screen name="breeder/trial/[id]/observation/[observationId]" />
      </Stack>
    </SafeAreaProvider>
  );
}