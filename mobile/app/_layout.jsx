import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Home */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      {/* Authentication */}
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
        }}
      />

      {/* Farmer */}
      <Stack.Screen
        name="farmer/dashboard"
        options={{
          title: "Farmer Dashboard",
        }}
      />

      <Stack.Screen
        name="farmer/crops"
        options={{
          title: "My Crops",
        }}
      />

      <Stack.Screen
        name="farmer/create-field"
        options={{
          title: "Create Field",
        }}
      />

      <Stack.Screen
        name="farmer/create-crop"
        options={{
          title: "Create Crop",
        }}
      />

      <Stack.Screen
        name="farmer/crop-details/[id]"
        options={{
          title: "Crop Details",
        }}
      />

      <Stack.Screen
        name="farmer/crop-details/[id]/lifecycle"
        options={{
          title: "Crop Lifecycle",
        }}
      />

      {/* Breeder */}
      <Stack.Screen
        name="breeder/dashboard"
        options={{
          title: "Breeder Dashboard",
        }}
      />
      <Stack.Screen
  name="farmer/crop-details/[id]/measurements/[recordId]"
  options={{
    title: "Measurements",
  }}
/>
<Stack.Screen
  name="farmer/crop-details/[id]/photos/[recordId]"
  options={{
    title: "Crop Photos",
  }}
/>

<Stack.Screen
  name="farmer/crop-details/[id]/irrigation/[recordId]"
  options={{
    title: "Irrigation",
  }}
/>
<Stack.Screen
  name="farmer/crop-details/[id]/treatments/[recordId]"
  options={{
    title: "Treatments",
  }}
/>

<Stack.Screen
  name="farmer/crop-details/[id]/disease-pest/[recordId]"
  options={{
    title: "Disease & Pest",
  }}
/>
    </Stack>
    
  );
}