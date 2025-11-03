import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Accelerometer } from "react-native-sensors";
import { RNCamera } from "react-native-camera";

const MovementCapture = () => {
  const cameraRef = useRef(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const subscription = new Accelerometer({
      updateInterval: 500, // Update every 500ms
    }).subscribe(({ x, y, z }) => {
      const threshold = 1.5; // Set a threshold for movement
      const movement = Math.sqrt(x * x + y * y + z * z);
      
      if (movement > threshold) {
        console.log("Movement detected:", movement);
        if (!isMoving) {
          setIsMoving(true);
          captureImage();
        }
      } else {
        setIsMoving(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const captureImage = async () => {
    if (cameraRef.current) {
      try {
        const options = { quality: 0.5, base64: true };
        const data = await cameraRef.current.takePictureAsync(options);
        console.log("Captured Image:", data.uri);

        sendToAPI(data.uri);
      } catch (error) {
        console.error("Error capturing image:", error);
      }
    }
  };

  const sendToAPI = async (imageUri) => {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "movement.jpg",
    });

    try {
      const response = await fetch("https://your-api.com/upload", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const result = await response.json();
      console.log("API Response:", result);
      Alert.alert("Success", "Image uploaded successfully!");
    } catch (error) {
      console.error("API Upload Error:", error);
      Alert.alert("Error", "Failed to upload image.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isMoving ? "Movement detected! Capturing..." : "Waiting for movement..."}
      </Text>
      <RNCamera
        ref={cameraRef}
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        captureAudio={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  camera: { width: 300, height: 400 },
});

export default MovementCapture;
