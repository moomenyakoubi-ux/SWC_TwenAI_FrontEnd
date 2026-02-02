import React from "react";
import { View, Text } from "react-native";
import { LanguageProvider } from "./app/context/LanguageContext";

export default function App() {
  return (
    <LanguageProvider>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20 }}>LANG OK ✅</Text>
      </View>
    </LanguageProvider>
  );
}
