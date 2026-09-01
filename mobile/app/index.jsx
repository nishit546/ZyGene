import { useEffect } from "react";
import { View, Text } from "react-native";
import API from "../services/api";

export default function Index() {
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await API.get("/health");

        console.log("SUCCESS:", response.data);
      } catch (error) {
        console.log(
          "API ERROR:",
          error.message
        );
      }
    };

    testConnection();
  }, []);

  return (
    <View>
      <Text>ZyGene</Text>
      <Text>Testing API connection...</Text>
    </View>
  );
}