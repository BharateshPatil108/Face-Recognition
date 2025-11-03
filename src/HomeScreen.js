import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, PermissionsAndroid, StyleSheet, Platform } from 'react-native';

const HomeScreen = ({ navigation }) => {
  useEffect(() => {
    requestPermissions();
  }, []);

  // Request Camera and Location Permissions
  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        // Request CAMERA permission
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app requires access to your camera.',
            buttonPositive: 'OK',
          }
        );

        // Request ACCESS_FINE_LOCATION permission
        const locationPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app requires location access for tracking.',
            buttonPositive: 'OK',
          }
        );

        // Request ACCESS_BACKGROUND_LOCATION permission (Android 10+)
        let backgroundLocationPermission = PermissionsAndroid.RESULTS.GRANTED;
        if (Platform.Version >= 29) {
          backgroundLocationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location Permission',
              message: 'We need access to your location while the app is in the background.',
              buttonPositive: 'OK',
            }
          );
        }

        if (
          cameraPermission !== PermissionsAndroid.RESULTS.GRANTED ||
          locationPermission !== PermissionsAndroid.RESULTS.GRANTED ||
          (Platform.Version >= 29 && backgroundLocationPermission !== PermissionsAndroid.RESULTS.GRANTED)
        ) {
          Alert.alert('Permissions Required', 'Camera and Location permissions are required.');
        }
      }
    } catch (err) {
      console.warn('Permission Error:', err);
      Alert.alert('Error', 'Failed to request permissions.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('RegisterFace')} style={styles.button}>
        <Text style={styles.buttonText}>Face Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('FaceRecognition')} style={styles.button}>
        <Text style={styles.buttonText}>Face Recognition</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  button: { margin: 10, padding: 15, backgroundColor: '#3498db', borderRadius: 8 },
  buttonText: { color: 'white', fontSize: 18 },
});

export default HomeScreen;
