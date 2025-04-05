import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useColorScheme } from 'react-native';

// Color Scheme
const lightColors = {
  background: '#ffffff',
  card: '#f5f5f5',
  text: '#212121',
  secondary: '#757575',
  accent: '#0288d1',
  border: '#e0e0e0',
  danger: '#d32f2f',
  success: '#388e3c',
};
const darkColors = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#e0e0e0',
  secondary: '#9e9e9e',
  accent: '#29b6f6',
  border: '#424242',
  danger: '#f44336',
  success: '#4caf50',
};

// Configuration
const GEMINI_API_KEY = 'AIzaSyDRZmDyvpJ77R-BHHt9bypHRzUuVrFFWU4';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = [
  { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
  { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
];
const DEFAULT_MODEL = MODELS[0].value;
const STORAGE_KEYS = {
  MESSAGES: '@campusAIChatMessages_v9',
  MODEL: '@campusAISelectedModel_v9',
};
const WELCOME_MESSAGE = "Hello! I’m Campus AI, created by Amara Mehdi to support your university journey. Ask me anything!";

// Interfaces
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  pinned?: boolean;
  isError?: boolean;
  fileInfo?: { name: string; size: number; type: string; uri?: string };
  imageUri?: string;
}

type AiInteractionMode = 'normal' | 'deepSearch';

// Utility Functions
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
const formatTimestamp = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Components
const MessageBubble: React.FC<{
  item: ChatMessage;
  colors: any;
  onSpeak: (text: string) => void;
  onCopy: (text: string) => void;
  onShare: (text: string) => void;
  onPin: (id: string) => void;
}> = React.memo(({ item, colors, onSpeak, onCopy, onShare, onPin }) => {
  const isUser = item.sender === 'user';
  return (
    <Animated.View
      entering={FadeInUp.delay(50)}
      style={[
        styles.messageContainer,
        {
          backgroundColor: isUser ? colors.accent : colors.card,
          borderColor: item.pinned ? colors.accent : colors.border,
          borderWidth: item.pinned ? 2 : 1,
        },
        isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <Text style={[styles.messageText, { color: isUser ? '#ffffff' : colors.text }]}>
        {item.text}
      </Text>
      {item.fileInfo && (
        <View style={styles.fileBadge}>
          <Ionicons name="document-outline" size={14} color={colors.secondary} />
          <Text style={[styles.fileText, { color: colors.secondary }]}>{item.fileInfo.name}</Text>
        </View>
      )}
      {item.imageUri && <Animated.Image source={{ uri: item.imageUri }} style={styles.messageImage} entering={FadeIn} />}
      <View style={styles.messageFooter}>
        <Text style={[styles.timestamp, { color: colors.secondary }]}>{formatTimestamp(item.timestamp)}</Text>
        <View style={styles.actionsRow}>
          {!isUser && (
            <TouchableOpacity onPress={() => onSpeak(item.text)}>
              <Ionicons name="volume-high-outline" size={16} color={colors.secondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onCopy(item.text)}>
            <Ionicons name="copy-outline" size={16} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onShare(item.text)}>
            <Ionicons name="share-outline" size={16} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPin(item.id)}>
            <Ionicons name={item.pinned ? 'pin' : 'pin-outline'} size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

const TypingIndicator: React.FC<{ colors: any }> = React.memo(({ colors }) => (
  <Animated.View entering={FadeIn} style={styles.typingContainer}>
    <ActivityIndicator size="small" color={colors.accent} />
    <Text style={[styles.typingText, { color: colors.secondary }]}>Campus AI is thinking...</Text>
  </Animated.View>
));

const InputBar: React.FC<{
  value: string;
  colors: any;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onGenerateImage: () => void;
  interactionMode: AiInteractionMode;
  onToggleDeepSearch: () => void;
  isApiLoading: boolean;
}> = React.memo(({
  value,
  colors,
  onChangeText,
  onSend,
  onAttach,
  onGenerateImage,
  interactionMode,
  onToggleDeepSearch,
  isApiLoading,
}) => {
  const canSend = value.trim().length > 0 && !isApiLoading;
  return (
    <Animated.View entering={FadeIn} style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onAttach} disabled={isApiLoading}>
        <Ionicons name="attach-outline" size={20} color={isApiLoading ? colors.secondary : colors.accent} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onGenerateImage} disabled={isApiLoading}>
        <Ionicons name="image-outline" size={20} color={isApiLoading ? colors.secondary : colors.accent} />
      </TouchableOpacity>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Type your question..."
        placeholderTextColor={colors.secondary}
        multiline
        editable={!isApiLoading}
      />
      <TouchableOpacity onPress={onToggleDeepSearch}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={interactionMode === 'deepSearch' ? colors.success : colors.secondary}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onSend} disabled={!canSend}>
        <Ionicons name="send-outline" size={20} color={canSend ? colors.accent : colors.secondary} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const WelcomeScreen: React.FC<{ colors: any }> = ({ colors }) => (
  <Animated.View entering={FadeIn} style={[styles.welcomeContainer, { backgroundColor: colors.background }]}>
    <Ionicons name="school-outline" size={64} color={colors.accent} />
    <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to Campus AI</Text>
    <Text style={[styles.welcomeText, { color: colors.secondary }]}>
      Created by Amara Mehdi to assist you on your university journey. Ask me anything to get started!
    </Text>
  </Animated.View>
);

const SettingsModal: React.FC<{
  visible: boolean;
  colors: any;
  onClose: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onClearChat: () => void;
  onCopyAllChat: () => void;
}> = React.memo(({ visible, colors, onClose, selectedModel, setSelectedModel, onClearChat, onCopyAllChat }) => (
  <Modal transparent visible={visible} animationType="slide">
    <View style={styles.modalOverlay}>
      <Animated.View entering={FadeIn} style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.settingsHeader}>
          <Text style={[styles.settingsTitle, { color: colors.text }]}>Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-outline" size={24} color={colors.secondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.settingsLabel, { color: colors.secondary }]}>Select AI Model</Text>
        {MODELS.map(model => (
          <TouchableOpacity
            key={model.value}
            style={[styles.optionButton, { backgroundColor: selectedModel === model.value ? colors.accent : colors.card }]}
            onPress={() => setSelectedModel(model.value)}
          >
            <Text style={[styles.optionText, { color: selectedModel === model.value ? '#ffffff' : colors.text }]}>
              {model.name}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.settingsActions}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.danger }]} onPress={onClearChat}>
            <Text style={styles.actionText}>Clear Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} onPress={onCopyAllChat}>
            <Text style={styles.actionText}>Copy All</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  </Modal>
));

// Main Screen
export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [interactionMode, setInteractionMode] = useState<AiInteractionMode>('normal');
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [msgs, model] = await AsyncStorage.multiGet([STORAGE_KEYS.MESSAGES, STORAGE_KEYS.MODEL]);
        const loadedMessages = msgs[1] ? JSON.parse(msgs[1]) : [
          { id: generateId(), text: WELCOME_MESSAGE, sender: 'ai', timestamp: Date.now() }
        ];
        setMessages(loadedMessages);
        setSelectedModel(model[1] || DEFAULT_MODEL);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.MESSAGES, JSON.stringify(messages.filter(m => !m.isLoading))],
          [STORAGE_KEYS.MODEL, selectedModel],
        ]);
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };
    if (!isApiLoading) saveData();
  }, [messages, selectedModel, isApiLoading]);

  const callGeminiAPI = useCallback(async (prompt: string, fileInfo?: ChatMessage['fileInfo'], generateImage: boolean = false) => {
    const systemPrompt = "You are Campus AI, developed by Amara Mehdi to assist with university-related queries. Respond in French unless specified otherwise.";
    const history = messages.slice(-5).map(m => ({ parts: [{ text: m.text }], role: m.sender === 'user' ? 'user' : 'model' }));
    const contents = [
      { parts: [{ text: systemPrompt }], role: 'user' },
      ...history,
      { parts: [{ text: prompt }], role: 'user' },
    ];

    if (fileInfo?.uri) {
      const data = await FileSystem.readAsStringAsync(fileInfo.uri, { encoding: FileSystem.EncodingType.Base64 });
      contents.push({ parts: [{ inlineData: { mimeType: fileInfo.type, data } }], role: 'user' });
    }

    const url = `${GEMINI_API_URL}/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API Error');
    const text = data.candidates?.[0]?.content?.parts[0]?.text || 'No response';
    return { text, imageUri: generateImage ? 'https://via.placeholder.com/200' : undefined };
  }, [messages, selectedModel]);

  const handleSend = useCallback(async (fileInfo?: ChatMessage['fileInfo']) => {
    if (!inputText.trim() && !fileInfo) return;
    const userMsg: ChatMessage = { id: generateId(), text: inputText, sender: 'user', timestamp: Date.now(), fileInfo };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsApiLoading(true);

    try {
      const prompt = interactionMode === 'deepSearch' && fileInfo ? `Résume ce document: ${inputText}` : inputText;
      const { text, imageUri } = await callGeminiAPI(prompt, fileInfo);
      setMessages(prev => [...prev, { id: generateId(), text, sender: 'ai', timestamp: Date.now(), imageUri }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: generateId(),
        text: `Erreur: ${(error as Error).message}`,
        sender: 'ai',
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsApiLoading(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [inputText, interactionMode, callGeminiAPI]);

  const handleGenerateImage = useCallback(async () => {
    const prompt = inputText.trim() || 'Génère une image aléatoire';
    const userMsg: ChatMessage = { id: generateId(), text: prompt, sender: 'user', timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsApiLoading(true);
    try {
      const { text, imageUri } = await callGeminiAPI(prompt, undefined, true);
      setMessages(prev => [...prev, { id: generateId(), text, sender: 'ai', timestamp: Date.now(), imageUri }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: generateId(),
        text: `Erreur: ${(error as Error).message}`,
        sender: 'ai',
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsApiLoading(false);
    }
  }, [inputText, callGeminiAPI]);

  const handleAttach = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const fileInfo: ChatMessage['fileInfo'] = {
          name: asset.name,
          size: asset.size ?? 0,
          type: asset.mimeType ?? 'unknown',
          uri: asset.uri,
        };
        Alert.alert('Attach File', `Attach "${asset.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Attach', onPress: () => handleSend(fileInfo) },
        ]);
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'attacher le fichier.");
    }
  }, [handleSend]);

  const toggleDeepSearch = useCallback(() => setInteractionMode(prev => (prev === 'deepSearch' ? 'normal' : 'deepSearch')), []);

  const speakText = useCallback((text: string) => Speech.speak(text, { language: 'fr-FR' }), []);
  const copyText = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied to clipboard!');
  }, []);
  const shareText = useCallback(async (text: string) => await Share.share({ message: text }), []);
  const pinMessage = useCallback((id: string) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, pinned: !m.pinned } : m)));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([{ id: generateId(), text: WELCOME_MESSAGE, sender: 'ai', timestamp: Date.now() }]);
    setIsSettingsVisible(false);
  }, []);

  const copyAllChat = useCallback(async () => {
    const chatText = messages.map(m => `${m.sender === 'user' ? 'You' : 'AI'}: ${m.text}`).join('\n');
    await Clipboard.setStringAsync(chatText);
    Alert.alert('Entire chat copied!');
    setIsSettingsVisible(false);
  }, [messages]);

  const isChatEmpty = useMemo(() => {
    return messages.length === 1 && messages[0].text === WELCOME_MESSAGE && messages[0].sender === 'ai';
  }, [messages]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: 'Campus AI',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
          headerTintColor: colors.accent,
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsSettingsVisible(true)}>
              <Ionicons name="settings-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={insets.top + 64}
      >
        {isChatEmpty ? (
          <WelcomeScreen colors={colors} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => (
              <MessageBubble
                item={item}
                colors={colors}
                onSpeak={speakText}
                onCopy={copyText}
                onShare={shareText}
                onPin={pinMessage}
              />
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatContent}
          />
        )}
        {isApiLoading && <TypingIndicator colors={colors} />}
        <InputBar
          value={inputText}
          colors={colors}
          onChangeText={setInputText}
          onSend={handleSend}
          onAttach={handleAttach}
          onGenerateImage={handleGenerateImage}
          interactionMode={interactionMode}
          onToggleDeepSearch={toggleDeepSearch}
          isApiLoading={isApiLoading}
        />
      </KeyboardAvoidingView>
      <SettingsModal
        visible={isSettingsVisible}
        colors={colors}
        onClose={() => setIsSettingsVisible(false)}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        onClearChat={clearChat}
        onCopyAllChat={copyAllChat}
      />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  chatContent: { paddingHorizontal: 12, paddingVertical: 16 },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userMessage: { alignSelf: 'flex-end' },
  aiMessage: { alignSelf: 'flex-start' },
  messageText: { fontSize: 16, lineHeight: 20, fontWeight: '400' },
  fileBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  fileText: { marginLeft: 4, fontSize: 12, fontStyle: 'italic' },
  messageImage: { width: 140, height: 140, borderRadius: 8, marginTop: 8 },
  messageFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  timestamp: { fontSize: 11, fontWeight: '300' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  typingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  typingText: { marginLeft: 6, fontSize: 12, fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  input: { flex: 1, fontSize: 16, maxHeight: 100, paddingVertical: 2 },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeTitle: { fontSize: 26, fontWeight: 'bold', marginTop: 16 },
  welcomeText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  settingsContainer: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  settingsTitle: { fontSize: 18, fontWeight: '600' },
  settingsLabel: { fontSize: 12, marginBottom: 8, fontWeight: '500' },
  optionButton: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 0,
  },
  optionText: { fontSize: 14, fontWeight: '500' },
  settingsActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionButton: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
});