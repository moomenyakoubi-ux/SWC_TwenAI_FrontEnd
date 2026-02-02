import React from "react";
import { View, Text } from "react-native";
import { LanguageProvider } from "./app/context/LanguageContext";
import { ContactsProvider } from "./app/context/ContactsContext";
import { PostsProvider } from "./app/context/PostsContext";

function AppContent() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20 }}>PROVIDERS OK ✅</Text>
    </View>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ContactsProvider>
        <PostsProvider>
          <AppContent />
        </PostsProvider>
      </ContactsProvider>
    </LanguageProvider>
  );
}
