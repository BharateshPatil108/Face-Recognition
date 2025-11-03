import React, { useState } from "react";
import { View, Text, TextInput, Button, Image, StyleSheet, Alert } from "react-native";
import { launchCamera } from "react-native-image-picker";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

const Register = () => {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState(null);
  const navigation = useNavigation();

  const captureAndSave = async () => {
    if (!userId) {
      setMessage("Please enter a User ID.");
      return;
    }

    launchCamera(
      { mediaType: "photo", quality: 0.8, includeBase64: true },
      async (response) => {
        console.log("Camera Response:", response);
        if (response.didCancel) {
          Alert.alert("Cancelled", "Camera capture cancelled.");
          return;
        }

        if (response.errorCode) {
          Alert.alert("Error", `Error launching camera: ${response.errorMessage}`);
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const imageSrc = response.assets[0].base64;
        //   console.log('imageSrc',typeof(imageSrc))
          setPhoto(response.assets[0].uri);

          try {
            console.log("Sending data: ", userId, typeof(imageSrc));
            const res = await axios.post(
              "http://192.168.101.240:3000/api/save",
              {
                userId,
                base64Image: imageSrc,
              },
              {
                headers: { "Content-Type": "application/json" },
              }
            );

            if (res.status === 200) {
                setMessage("✅ Face registered successfully");
                Alert.alert("Success", "Face registered successfully.", [
                  { text: "OK", onPress: () => navigation.replace("HomeScreen") },
                ]);
              }
          } catch (error) {
            console.error("Error saving face:", error);
            setMessage("Error saving face. Please try again.");
            Alert.alert("Error", error.response?.data?.message || "Failed to save face.");
          }
        } else {
          Alert.alert("Error", "No image captured.");
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Face</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter User ID"
          value={userId}
          onChangeText={(e) => {
            setUserId(e);
            setMessage("");
          }}
        />
        <Button title="Save Face" onPress={captureAndSave} color="#24a0ed" />
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {photo && <Image source={{ uri: photo }} style={styles.image} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  input: {
    borderWidth: 2,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: 300,
  },
  message: {
    textAlign: "center",
  marginVertical: 20,
  color: "green",
  fontWeight: "bold",
  fontSize: 18,
  },
  image: {
    width: 200,
    height: 200,
    alignSelf: "center",
    marginTop: 20,
  },
});

export default Register;
