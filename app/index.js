// This file is a minimal route for expo-router to detect
// We're still using React Navigation for actual navigation in our app

import React from 'react';
import { View } from 'react-native';
import App from '../App';

export default function Root() {
  // Just redirect to our main app component
  return <App />;
}