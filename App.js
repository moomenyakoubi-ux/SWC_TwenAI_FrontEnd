import React from "react";
import { View, Text } from "react-native";
import { ContactsProvider } from "./app/context/ContactsContext";

export default function App() {
  return (
    <ContactsProvider>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20 }}>CONTACTS OK ✅</Text>
      </View>
    </ContactsProvider>
  );
}
