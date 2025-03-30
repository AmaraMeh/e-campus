// components/ExamCountdown.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors'; // Adjust path
import { useColorScheme } from '../hooks/useColorScheme'; // Adjust path
import { Ionicons } from '@expo/vector-icons';

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; }

const ExamCountdown = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = getCountdownStyles(colorScheme, colors);
  const targetDate = new Date("2025-04-05T08:00:00"); // April 5th, 2025, 8:00 AM

  const calculateTimeLeft = (): TimeLeft | null => { /* ... (keep calculation logic) ... */ const d = +targetDate - +new Date(); if(d<=0) return null; return { days:Math.floor(d/(1e3*60*60*24)), hours:Math.floor((d/(1e3*60*60))%24), minutes:Math.floor((d/1e3/60)%60), seconds:Math.floor((d/1e3)%60)}; };
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft());

  useEffect(() => { const timer = setInterval(() => { setTimeLeft(calculateTimeLeft()); }, 1000); return () => clearInterval(timer); }, []);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <View style={styles.card}>
       <View style={styles.header}>
          <Ionicons name="alarm-outline" size={20} color={colors.tint} />
         <Text style={styles.title}>Examens de Rattrapage</Text>
       </View>
       {!timeLeft ? (
           <Text style={styles.expiredText}>Les examens ont commencé ! Bonne chance !</Text>
       ) : (
           <>
               <Text style={styles.dateText}>Début: 5 Avril 2025 - 08:00</Text>
               <View style={styles.timerContainer}>
                 <View style={styles.timeBlock}><Text style={styles.timeValue}>{formatTime(timeLeft.days)}</Text><Text style={styles.timeLabel}>Jours</Text></View>
                 <Text style={styles.separator}>:</Text>
                 <View style={styles.timeBlock}><Text style={styles.timeValue}>{formatTime(timeLeft.hours)}</Text><Text style={styles.timeLabel}>Heures</Text></View>
                 <Text style={styles.separator}>:</Text>
                 <View style={styles.timeBlock}><Text style={styles.timeValue}>{formatTime(timeLeft.minutes)}</Text><Text style={styles.timeLabel}>Min</Text></View>
                 <Text style={styles.separator}>:</Text>
                 <View style={styles.timeBlock}><Text style={styles.timeValue}>{formatTime(timeLeft.seconds)}</Text><Text style={styles.timeLabel}>Sec</Text></View>
               </View>
           </>
       )}
    </View>
  );
};

const getCountdownStyles = (colorScheme: 'light' | 'dark', colors: typeof Colors.light | typeof Colors.dark) => StyleSheet.create({
  card: { backgroundColor: colors.cardBackground, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 18, marginBottom: 18, alignItems: 'center', borderWidth: 1, borderColor: colors.border, },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, },
  title: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginLeft: 8, },
  dateText: { fontSize: 13, color: colors.textSecondary, marginBottom: 15, },
  timerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, }, // Use gap for spacing
  timeBlock: { alignItems: 'center', minWidth: 45 }, // Ensure blocks have width
  timeValue: { fontSize: 30, fontWeight: 'bold', color: colors.tint, letterSpacing: 1, },
  timeLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 0, textTransform: 'uppercase', letterSpacing: 0.5, },
  separator: { fontSize: 24, color: colors.tint, fontWeight: 'bold', marginHorizontal: 2, }, // Style separators
  expiredText: { fontSize: 16, fontWeight: '600', color: colors.success ?? '#16a34a', textAlign: 'center', paddingVertical: 10, }
});

export default ExamCountdown;