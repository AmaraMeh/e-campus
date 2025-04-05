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
  Modal,
  Pressable,
  Share,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// --- Configuration ---
interface Theme {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textContrast: string;
  tint: string;
  border: string;
  inputBackground: string;
  inputBorder: string;
  placeholderText: string;
  iconPrimary: string;
  iconSecondary: string;
  success: string;
  danger: string;
  shadowColor: string;
  gradientStart: string;
  gradientEnd: string;
  statusBar: 'light-content' | 'dark-content';
}

const THEMES: { [key: string]: Theme } = {
  dark: {
    background: '#0F1419',
    cardBackground: '#1C2526',
    text: '#E6ECEF',
    textSecondary: '#A3B1B8',
    textContrast: '#FFFFFF',
    tint: '#1DA1F2',
    border: '#2A3439',
    inputBackground: '#252F34',
    inputBorder: '#3E4A50',
    placeholderText: '#6B7A83',
    iconPrimary: '#E6ECEF',
    iconSecondary: '#A3B1B8',
    success: '#2ECC71',
    danger: '#E74C3C',
    shadowColor: '#000000',
    gradientStart: '#1DA1F2',
    gradientEnd: '#3498DB',
    statusBar: 'light-content',
  },
  light: {
    background: '#F5F7FA',
    cardBackground: '#FFFFFF',
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
    textContrast: '#FFFFFF',
    tint: '#3498DB',
    border: '#DDE4E9',
    inputBackground: '#ECF0F1',
    inputBorder: '#BDC3C7',
    placeholderText: '#95A5A6',
    iconPrimary: '#2C3E50',
    iconSecondary: '#7F8C8D',
    success: '#27AE60',
    danger: '#C0392B',
    shadowColor: '#000000',
    gradientStart: '#3498DB',
    gradientEnd: '#5DADE2',
    statusBar: 'dark-content',
  },
};

const AIML_API_KEY = Constants.expoConfig?.extra?.aimlApiKey || process.env.AIML_API_KEY;
const AIML_API_URL = 'https://api.aimlapi.com/v1/chat/completions';
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your actual Gemini API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODELS = [
  { name: 'Mistral 7B', value: 'mistralai/Mistral-7B-Instruct-v0.2', api: 'aiml' },
  { name: 'Mixtral 8x7B', value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', api: 'aiml' },
  { name: 'GPT-4o Mini', value: 'openai/gpt-4o-mini', api: 'aiml' },
  { name: 'Llama 3 8B', value: 'meta-llama/Meta-Llama-3-8B-Instruct', api: 'aiml' },
  { name: 'Llama 3 70B', value: 'meta-llama/Meta-Llama-3-70B-Instruct', api: 'aiml' },
  { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', api: 'gemini' },
  { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', api: 'gemini' },
];
const DEFAULT_MODEL = MODELS[1].value;

const STORAGE_KEYS = {
  MESSAGES: '@campusAIChatMessages_v6',
  MODEL: '@campusAISelectedModel_v6',
  THEME: '@campusAITheme_v6',
  INSTRUCTIONS: '@campusAIInstructions_v6',
  FONT_SIZE: '@campusAIFontSize_v6',
};
const WELCOME_MESSAGE = "Salut ! Je suis Campus AI, ton assistant universitaire. Comment puis-je t'aider ?";

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  pinned?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  fileInfo?: { name: string; size: number; type: string; uri?: string };
  imageUri?: string;
}

type InputMode = 'text' | 'voice';
type AiInteractionMode = 'normal' | 'deepSearch' | 'think';

// --- Utility Functions ---
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
const formatTimestamp = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// --- Components ---
const MessageBubble: React.FC<{
  item: ChatMessage;
  styles: any;
  colors: Theme;
  onSpeak: (text: string) => void;
  onCopy: (text: string) => void;
  onShare: (text: string) => void;
  onPin: (id: string) => void;
  fontSize: number;
}> = React.memo(({ item, styles, colors, onSpeak, onCopy, onShare, onPin, fontSize }) => {
  const isUser = item.sender === 'user';
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(100)}
      style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage, item.pinned && styles.pinnedMessage, animatedStyle]}
      onTouchStart={() => (scale.value = 0.98)}
      onTouchEnd={() => (scale.value = 1)}
    >
      <Text style={[styles.messageText, { fontSize }, isUser ? styles.userText : styles.aiText]}>
        {item.text}
      </Text>
      {item.fileInfo && (
        <View style={styles.fileBadge}>
          <Ionicons name="document" size={16} color={colors.iconSecondary} />
          <Text style={[styles.fileText, { fontSize: fontSize * 0.8 }]}>{item.fileInfo.name}</Text>
        </View>
      )}
      {item.imageUri && (
        <Animated.Image source={{ uri: item.imageUri }} style={styles.messageImage} entering={FadeIn} />
      )}
      <View style={styles.actionsRow}>
        {!isUser && (
          <TouchableOpacity onPress={() => onSpeak(item.text)}>
            <Ionicons name="volume-high" size={20} color={colors.iconSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onCopy(item.text)}>
          <Ionicons name="copy" size={20} color={colors.iconSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onShare(item.text)}>
          <Ionicons name="share" size={20} color={colors.iconSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPin(item.id)}>
          <Ionicons name={item.pinned ? 'pin' : 'pin-outline'} size={20} color={colors.tint} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const TypingIndicator: React.FC<{ styles: any; colors: Theme }> = React.memo(({ styles, colors }) => {
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withSpring(opacity.value),
  }));

  useEffect(() => {
    opacity.value = 1;
  }, [opacity]);

  return (
    <Animated.View style={[styles.typingContainer, animatedStyle]}>
      <ActivityIndicator size="small" color={colors.tint} />
      <Text style={styles.typingText}>Campus AI réfléchit...</Text>
    </Animated.View>
  );
});

const InputBar: React.FC<{
  value: string;
  styles: any;
  colors: Theme;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onGenerateImage: () => void;
  interactionMode: AiInteractionMode;
  onToggleDeepSearch: () => void;
  onToggleThink: () => void;
  inputMode: InputMode;
  onToggleInputMode: () => void;
  isApiLoading: boolean;
  inputRef: React.RefObject<TextInput>;
}> = React.memo(({
  value,
  styles,
  colors,
  onChangeText,
  onSend,
  onAttach,
  onGenerateImage,
  interactionMode,
  onToggleDeepSearch,
  onToggleThink,
  inputMode,
  onToggleInputMode,
  isApiLoading,
  inputRef,
}) => {
  const canSend = value.trim().length > 0 && !isApiLoading;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  return (
    <Animated.View style={[styles.inputContainer, animatedStyle]} entering={FadeIn}>
      <TouchableOpacity onPress={onAttach} disabled={isApiLoading}>
        <Ionicons name="attach" size={24} color={colors.iconSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onGenerateImage} disabled={isApiLoading}>
        <Ionicons name="image" size={24} color={colors.iconSecondary} />
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Pose une question..."
        placeholderTextColor={colors.placeholderText}
        multiline
        editable={!isApiLoading}
      />
      <TouchableOpacity
        onPress={canSend ? onSend : onToggleInputMode}
        onPressIn={() => (scale.value = 0.95)}
        onPressOut={() => (scale.value = 1)}
      >
        <Ionicons
          name={canSend ? 'send' : inputMode === 'text' ? 'mic' : 'keyboard'}
          size={24}
          color={canSend ? colors.tint : colors.iconSecondary}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggleDeepSearch}
        style={[styles.modeBtn, interactionMode === 'deepSearch' && styles.modeBtnActive]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={interactionMode === 'deepSearch' ? colors.textContrast : colors.success}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggleThink}
        style={[styles.modeBtn, interactionMode === 'think' && styles.modeBtnActive]}
      >
        <MaterialCommunityIcons
          name="lightbulb"
          size={20}
          color={interactionMode === 'think' ? colors.textContrast : colors.success}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

const SettingsModal: React.FC<{
  isVisible: boolean;
  styles: any;
  colors: Theme;
  onClose: () => void;
  onClearChat: () => void;
  onShareChat: () => void;
  onExportPDF: () => void;
  onExportMarkdown: () => void;
  onSelectModel: (modelValue: string) => void;
  currentModel: string;
  onSelectTheme: (themeName: string) => void;
  currentTheme: string;
  customInstructions: string;
  setCustomInstructions: (text: string) => void;
  liveSpeechEnabled: boolean;
  setLiveSpeechEnabled: (enabled: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
}> = React.memo(({
  isVisible,
  styles,
  colors,
  onClose,
  onClearChat,
  onShareChat,
  onExportPDF,
  onExportMarkdown,
  onSelectModel,
  currentModel,
  onSelectTheme,
  currentTheme,
  customInstructions,
  setCustomInstructions,
  liveSpeechEnabled,
  setLiveSpeechEnabled,
  fontSize,
  setFontSize,
}) => {
  const translateY = useSharedValue(300);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value) }],
  }));

  useEffect(() => {
    translateY.value = isVisible ? 0 : 300;
  }, [isVisible, translateY]);

  return (
    <Modal transparent visible={isVisible} animationType="none">
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <Animated.View style={[styles.settingsModal, animatedStyle]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Paramètres</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.iconSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Modèle IA</Text>
        {MODELS.map((model) => (
          <TouchableOpacity
            key={model.value}
            style={[styles.optionBtn, currentModel === model.value && styles.optionBtnSelected]}
            onPress={() => onSelectModel(model.value)}
          >
            <Text style={[styles.optionText, currentModel === model.value && { color: colors.tint }]}>
              {model.name}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.sectionTitle}>Thème</Text>
        <View style={styles.themeRow}>
          {Object.keys(THEMES).map((themeName) => (
            <TouchableOpacity
              key={themeName}
              style={[styles.themeBtn, { backgroundColor: THEMES[themeName].tint }, currentTheme === themeName && styles.themeBtnSelected]}
              onPress={() => onSelectTheme(themeName)}
            >
              <Text style={styles.themeText}>{themeName.charAt(0).toUpperCase() + themeName.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="Instructions personnalisées..."
          placeholderTextColor={colors.placeholderText}
          value={customInstructions}
          onChangeText={setCustomInstructions}
          multiline
        />
        <Text style={styles.sectionTitle}>Options</Text>
        <TouchableOpacity style={styles.optionBtn} onPress={() => setLiveSpeechEnabled(!liveSpeechEnabled)}>
          <Text style={styles.optionText}>Lecture en direct: {liveSpeechEnabled ? 'Oui' : 'Non'}</Text>
        </TouchableOpacity>
        <Slider
          style={styles.slider}
          minimumValue={12}
          maximumValue={20}
          step={1}
          value={fontSize}
          onValueChange={setFontSize}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.tint}
        />
        <Text style={styles.sliderLabel}>Taille de police: {fontSize}px</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger }]} onPress={onClearChat}>
            <Text style={styles.actionText}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.tint }]} onPress={onShareChat}>
            <Text style={styles.actionText}>Partager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.tint }]} onPress={onExportPDF}>
            <Text style={styles.actionText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.tint }]} onPress={onExportMarkdown}>
            <Text style={styles.actionText}>MD</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
});

// --- Main Screen ---
export default function AIScreen() {
  const [theme, setTheme] = useState<string>('dark');
  const colors = useMemo(() => THEMES[theme], [theme]);
  const styles = useMemo(() => getAIStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [interactionMode, setInteractionMode] = useState<AiInteractionMode>('normal');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [liveSpeechEnabled, setLiveSpeechEnabled] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(16);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [msgs, model, thm, instr, fnt] = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
        setMessages(msgs[1] ? JSON.parse(msgs[1]) : [{ id: generateId(), text: WELCOME_MESSAGE, sender: 'ai', timestamp: Date.now() }]);
        setSelectedModel(model[1] || DEFAULT_MODEL);
        setTheme(thm[1] || 'dark');
        setCustomInstructions(instr[1] || '');
        setFontSize(fnt[1] ? parseInt(fnt[1], 10) : 16);
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
          [STORAGE_KEYS.MESSAGES, JSON.stringify(messages.filter((m) => !m.isLoading))],
          [STORAGE_KEYS.MODEL, selectedModel],
          [STORAGE_KEYS.THEME, theme],
          [STORAGE_KEYS.INSTRUCTIONS, customInstructions],
          [STORAGE_KEYS.FONT_SIZE, fontSize.toString()],
        ]);
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };
    if (!isApiLoading) saveData();
  }, [messages, selectedModel, theme, customInstructions, fontSize, isApiLoading]);

  const callAPI = useCallback(
    async (prompt: string, fileInfo?: ChatMessage['fileInfo'], generateImage: boolean = false): Promise<{ text: string; imageUri?: string }> => {
      const modelObj = MODELS.find((m) => m.value === selectedModel);
      const isGemini = modelObj?.api === 'gemini';
      const systemPrompt = `Langue: Français. Tu es Campus AI. Instructions: ${customInstructions || 'Standard.'}`;
      const history = messages.slice(-8).map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.text }));

      if (isGemini) {
        const contents = [
          { parts: [{ text: systemPrompt }], role: 'user' },
          ...history.map((m) => ({ parts: [{ text: m.content }], role: m.role })),
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
            generationConfig: { maxOutputTokens: 65536, temperature: 0.7 },
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini Error');
        const text = data.candidates?.[0]?.content?.parts[0]?.text || '';
        return { text, imageUri: generateImage ? 'https://via.placeholder.com/200' : undefined };
      } else {
        const response = await fetch(AIML_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AIML_API_KEY}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: prompt }],
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'AIML Error');
        return { text: data.choices[0].message.content.trim() };
      }
    },
    [messages, selectedModel, customInstructions]
  );

  const handleSend = useCallback(
    async (fileInfo?: ChatMessage['fileInfo']) => {
      if (!inputText.trim() && !fileInfo) return;
      const userMsg: ChatMessage = { id: generateId(), text: inputText, sender: 'user', timestamp: Date.now(), fileInfo };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsApiLoading(true);

      try {
        const prompt =
          interactionMode === 'deepSearch' && fileInfo
            ? `Résume ce document: ${inputText}`
            : interactionMode === 'think'
            ? `Réfléchis: ${inputText}`
            : inputText;
        const { text, imageUri } = await callAPI(prompt, fileInfo);
        const aiMsg: ChatMessage = { id: generateId(), text, sender: 'ai', timestamp: Date.now(), imageUri };
        setMessages((prev) => [...prev, aiMsg]);
        if (liveSpeechEnabled) Speech.speak(text, { language: 'fr-FR' });
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: generateId(),
          text: `Erreur: ${(error as Error).message}`,
          sender: 'ai',
          timestamp: Date.now(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsApiLoading(false);
      }
    },
    [inputText, interactionMode, callAPI, liveSpeechEnabled]
  );

  const handleGenerateImage = useCallback(async () => {
    const prompt = inputText.trim() || 'Image aléatoire';
    const userMsg: ChatMessage = { id: generateId(), text: prompt, sender: 'user', timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsApiLoading(true);
    try {
      const { text, imageUri } = await callAPI(prompt, undefined, true);
      const aiMsg: ChatMessage = { id: generateId(), text: text || 'Image générée', sender: 'ai', timestamp: Date.now(), imageUri };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        text: `Erreur: ${(error as Error).message}`,
        sender: 'ai',
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsApiLoading(false);
    }
  }, [inputText, callAPI]);

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
        handleSend(fileInfo);
      }
    } catch (error) {
      console.error('Error attaching file:', error);
      Alert.alert('Erreur', "Impossible d'attacher le fichier.");
    }
  }, [handleSend]);

  const toggleInteractionMode = useCallback((mode: AiInteractionMode) => {
    setInteractionMode((current) => (current === mode ? 'normal' : mode));
  }, []);

  const toggleInputMode = useCallback(() => {
    setInputMode((current) => {
      const newMode = current === 'text' ? 'voice' : 'text';
      if (newMode === 'voice') Alert.alert('Info', 'Entrée vocale bientôt disponible.');
      return newMode;
    });
  }, []);

  const speakText = useCallback((text: string) => {
    Speech.speak(text, { language: 'fr-FR' });
  }, []);

  const copyText = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copié !');
  }, []);

  const shareText = useCallback(async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (error) {
      Alert.alert('Erreur', "Impossible de partager le message.");
    }
  }, []);

  const pinMessage = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([{ id: generateId(), text: WELCOME_MESSAGE, sender: 'ai', timestamp: Date.now() }]);
    setIsSettingsVisible(false);
  }, []);

  const shareChat = useCallback(async () => {
    try {
      await Share.share({ message: messages.map((m) => `${m.sender}: ${m.text}`).join('\n') });
      setIsSettingsVisible(false);
    } catch (error) {
      Alert.alert('Erreur', "Impossible de partager la discussion.");
    }
  }, [messages]);

  const exportPDF = useCallback(async () => {
    try {
      const html = `<html><body><h1>Chat</h1>${messages.map((m) => `<p><b>${m.sender}:</b> ${m.text}</p>`).join('')}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
      setIsSettingsVisible(false);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'exporter en PDF.");
    }
  }, [messages]);

  const exportMarkdown = useCallback(async () => {
    try {
      const md = messages.map((m) => `**${m.sender}**: ${m.text}`).join('\n\n');
      const uri = `${FileSystem.documentDirectory}chat_${generateId()}.md`;
      await FileSystem.writeAsStringAsync(uri, md);
      await Sharing.shareAsync(uri);
      setIsSettingsVisible(false);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'exporter en Markdown.");
    }
  }, [messages]);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned), [messages]);
  const chatMessages = useMemo(() => messages.filter((m) => !m.pinned && !m.isLoading), [messages]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Campus AI',
          headerStyle: { backgroundColor: colors.gradientStart },
          headerTitleStyle: { color: colors.textContrast, fontWeight: 'bold' },
          headerTintColor: colors.textContrast,
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsSettingsVisible(true)}>
              <Ionicons name="settings" size={24} color={colors.textContrast} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={insets.top + 60}
      >
        {pinnedMessages.length > 0 && (
          <Animated.View style={styles.pinnedContainer} entering={FadeIn}>
            <Text style={styles.pinnedTitle}>Épinglés</Text>
            <FlatList
              data={pinnedMessages}
              renderItem={({ item }) => (
                <MessageBubble
                  item={item}
                  styles={styles}
                  colors={colors}
                  onSpeak={speakText}
                  onCopy={copyText}
                  onShare={shareText}
                  onPin={pinMessage}
                  fontSize={fontSize}
                />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </Animated.View>
        )}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={({ item }) => (
            <MessageBubble
              item={item}
              styles={styles}
              colors={colors}
              onSpeak={speakText}
              onCopy={copyText}
              onShare={shareText}
              onPin={pinMessage}
              fontSize={fontSize}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Commence à discuter !</Text>}
        />
        {isApiLoading && <TypingIndicator styles={styles} colors={colors} />}
        <InputBar
          value={inputText}
          styles={styles}
          colors={colors}
          onChangeText={setInputText}
          onSend={handleSend}
          onAttach={handleAttach}
          onGenerateImage={handleGenerateImage}
          interactionMode={interactionMode}
          onToggleDeepSearch={() => toggleInteractionMode('deepSearch')}
          onToggleThink={() => toggleInteractionMode('think')}
          inputMode={inputMode}
          onToggleInputMode={toggleInputMode}
          isApiLoading={isApiLoading}
          inputRef={inputRef}
        />
      </KeyboardAvoidingView>
      <SettingsModal
        isVisible={isSettingsVisible}
        styles={styles}
        colors={colors}
        onClose={() => setIsSettingsVisible(false)}
        onClearChat={clearChat}
        onShareChat={shareChat}
        onExportPDF={exportPDF}
        onExportMarkdown={exportMarkdown}
        onSelectModel={setSelectedModel}
        currentModel={selectedModel}
        onSelectTheme={setTheme}
        currentTheme={theme}
        customInstructions={customInstructions}
        setCustomInstructions={setCustomInstructions}
        liveSpeechEnabled={liveSpeechEnabled}
        setLiveSpeechEnabled={setLiveSpeechEnabled}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />
    </SafeAreaView>
  );
}

// --- Styles ---
const getAIStyles = (colors: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 15 },
    pinnedContainer: { marginBottom: 10 },
    pinnedTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 5 },
    chatContent: { paddingBottom: 20 },
    emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: 16, marginTop: 50 },
    messageContainer: {
      maxWidth: '80%',
      marginVertical: 5,
      padding: 12,
      borderRadius: 15,
      backgroundColor: colors.cardBackground,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    userMessage: { alignSelf: 'flex-end', backgroundColor: colors.tint },
    aiMessage: { alignSelf: 'flex-start' },
    pinnedMessage: { borderWidth: 1, borderColor: colors.tint },
    messageText: { color: colors.text },
    userText: { color: colors.textContrast },
    aiText: { color: colors.text },
    fileBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    fileText: { color: colors.textSecondary, marginLeft: 5 },
    messageImage: { width: 150, height: 150, borderRadius: 10, marginTop: 10 },
    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5, gap: 10 },
    typingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
    typingText: { color: colors.textSecondary, marginLeft: 10, fontStyle: 'italic' },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 25,
      padding: 10,
      marginBottom: 10,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 3,
    },
    input: { flex: 1, color: colors.text, paddingHorizontal: 10, maxHeight: 100 },
    modeBtn: { padding: 5, borderRadius: 15, backgroundColor: colors.cardBackground, marginLeft: 5 },
    modeBtnActive: { backgroundColor: colors.success },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    settingsModal: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginVertical: 10 },
    optionBtn: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      marginVertical: 5,
    },
    optionBtnSelected: { borderWidth: 1, borderColor: colors.tint },
    optionText: { color: colors.text },
    themeRow: { flexDirection: 'row', gap: 10 },
    themeBtn: { padding: 10, borderRadius: 10 },
    themeBtnSelected: { borderWidth: 2, borderColor: colors.textContrast },
    themeText: { color: colors.textContrast, fontWeight: 'bold' },
    instructionsInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      padding: 10,
      color: colors.text,
      height: 80,
      marginBottom: 10,
    },
    slider: { width: '100%', marginVertical: 10 },
    sliderLabel: { textAlign: 'center', color: colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
    actionBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
    actionText: { color: colors.textContrast, fontWeight: 'bold' },
  });