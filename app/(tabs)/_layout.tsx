// File: app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons'; // Import icon sets
import { useColorScheme } from '@/hooks/useColorScheme'; // Assuming you have this hook from the template
import { Colors } from '../../constants/Colors'; // Assuming you have this constants file

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light'; // Handle potential null value

  // Define colors based on the scheme (adjust as needed to match your website)
  const activeColor = Colors[colorScheme].tint;
  const inactiveColor = Colors[colorScheme].tabIconDefault;
  const tabBarBgColor = Colors[colorScheme].background; // Or a specific tab bar color

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: tabBarBgColor,
          // Add other tab bar styles here if needed (e.g., borderTopColor)
          // Mimic website's bottom nav style
        },
        headerShown: false, // We might add custom headers per screen later
      }}>
      <Tabs.Screen
        name="index" // Matches app/(tabs)/index.tsx
        options={{
          title: 'Accueil', // French for Home
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name={focused ? 'home' : 'home'} // Use same or different icon based on focus
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calculator" // Matches app/(tabs)/calculator.tsx
        options={{
          title: 'Moyenne', // French for Average (Calculator)
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name={focused ? 'calculator' : 'calculator'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="courses" // Matches app/(tabs)/courses.tsx
        options={{
          title: 'Cours', // French for Courses
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites" // Matches app/(tabs)/favorites.tsx
        options={{
          title: 'Favoris', // French for Favorites
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'favorite' : 'favorite-border'}
              size={28}
              color={color}
              // Or use a download icon: <FontAwesome name="download" size={24} color={color} />
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile" // Matches app/(tabs)/profile.tsx
        options={{
          title: 'Profil', // French for Profile
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name={focused ? 'user' : 'user-o'}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}