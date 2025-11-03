import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FaceRegister from './src/FaceRegister';
import FaceAttendance from './src/FaceAttendance';
import { enableScreens } from 'react-native-screens';
import HomeScreen from './src/HomeScreen';
import 'react-native-gesture-handler';
 
 
// Enable screens for better performance
enableScreens();
 
const Stack = createNativeStackNavigator();
 
const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen}/>
        <Stack.Screen name="RegisterFace" component={FaceRegister} />
        <Stack.Screen name="FaceRecognition" component={FaceAttendance} />
       
      </Stack.Navigator>
    </NavigationContainer>
  );
};
 
export default App;
 