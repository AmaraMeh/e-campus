// components/ExamCountdown.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors'; // Adjust path
import { useColorScheme } from '@/hooks/useColorScheme'; // Adjust path

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ExamCountdown = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const styles = getCountdownStyles(colorScheme);
  const targetDate = new Date("2025-04-05T08:00:00"); // April 5th, 2025, 8:00 AM

  const calculateTimeLeft = (): TimeLeft | null => {
    const difference = +targetDate - +new Date();
    if (difference <= 0) {
      return null; // Exam time has passed or is now
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Clear interval on component unmount
    return () => clearInterval(timer);
  }, []);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  if (!timeLeft) {
    return (
      <View style={styles.card}>
        <Text style={styles.expiredText}>Les examens de rattrapage ont commencé !</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Prochains Rattrapages</Text>
      <Text style={styles.dateText}>Le 5 Avril 2025</Text>
      <View style={styles.timerContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{formatTime(timeLeft.days)}</Text>
          <Text style={styles.timeLabel}>Jours</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{formatTime(timeLeft.hours)}</Text>
          <Text style={styles.timeLabel}>Heures</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{formatTime(timeLeft.minutes)}</Text>
          <Text style={styles.timeLabel}>Min</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{formatTime(timeLeft.seconds)}</Text>
          <Text style={styles.timeLabel}>Sec</Text>
        </View>
      </View>
    </View>
  );
};

const getCountdownStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  card: {
    backgroundColor: Colors[colorScheme].cardBackground,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors[colorScheme].textSecondary,
    marginBottom: 4,
  },
   dateText: {
     fontSize: 13,
     color: Colors[colorScheme].textSecondary,
     marginBottom: 15,
   },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 28, // Larger numbers
    fontWeight: 'bold',
    color: Colors[colorScheme].tint, // Use tint color
    minWidth: 40, // Ensure consistent width
    textAlign: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: Colors[colorScheme].textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.danger ?? '#dc2626', // Use danger color
    textAlign: 'center',
  }
});

export default ExamCountdown;