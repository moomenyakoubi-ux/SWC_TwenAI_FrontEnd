import React from "react";
import { View, Text } from "react-native";
import { PostsProvider } from "./app/context/PostsContext";

export default function App() {
  return (
    <PostsProvider>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20 }}>POSTS OK ✅</Text>
      </View>
    </PostsProvider>
  );
}
