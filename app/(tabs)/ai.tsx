// File: app/(tabs)/ai.tsx
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
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider'; // Updated import
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Configuration ---
interface Theme {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textContrast: string;
  tint: string;
  tintSecondary: string;
  border: string;
  inputBackground: string;
  inputAreaBackground: string;
  inputBorder: string;
  placeholderText: string;
  iconPrimary: string;
  iconSecondary: string;
  iconTint: string;
  success: string;
  warning: string;
  danger: string;
  disabledBackground: string;
  disabledText: string;
  shadowColor: string;
  statusBar: 'light-content' | 'dark-content';
}

const THEMES: { [key: string]: Theme } = {
  dark: {
    background: '#1A2526',
    cardBackground: '#2A3435',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textContrast: '#000000',
    tint: '#00A3E0',
    tintSecondary: '#58C8FF',
    border: '#3E4A4B',
    inputBackground: '#2E3B3C',
    inputAreaBackground: '#252F30',
    inputBorder: '#4A5A5B',
    placeholderText: '#8A8A8A',
    iconPrimary: '#FFFFFF',
    iconSecondary: '#B0B0B0',
    iconTint: '#00A3E0',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    disabledBackground: '#3E4A4B',
    disabledText: '#8A8A8A',
    shadowColor: '#000000',
    statusBar: 'light-content',
  },
  light: {
    background: '#F7F8FA',
    cardBackground: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#6E6E73',
    textContrast: '#FFFFFF',
    tint: '#007AFF',
    tintSecondary: '#5AC8FA',
    border: '#E5E5EA',
    inputBackground: '#FFFFFF',
    inputAreaBackground: '#F7F8FA',
    inputBorder: '#D1D1D6',
    placeholderText: '#AEAEB2',
    iconPrimary: '#1C1C1E',
    iconSecondary: '#8A8A8E',
    iconTint: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    disabledBackground: '#E5E5EA',
    disabledText: '#AEAEB2',
    shadowColor: '#000000',
    statusBar: 'dark-content',
  },
};

const AIML_API_KEY = Constants.expoConfig?.extra?.aimlApiKey || process.env.AIML_API_KEY;
const AIML_API_URL = 'https://api.aimlapi.com/v1/chat/completions';
const GEMINI_API_KEY = 'AIzaSyCZQ2FDlOt7uaFmp65LRq_zjhMJt2OpIgs'; // Replace with your actual key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODELS = [
  { name: 'Mistral 7B (Fast)', value: 'mistralai/Mistral-7B-Instruct-v0.2', api: 'aiml' },
  { name: 'Mixtral 8x7B (Balanced)', value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', api: 'aiml' },
  { name: 'GPT-4o Mini (OpenAI)', value: 'openai/gpt-4o-mini', api: 'aiml' },
  { name: 'Llama 3 8B (Meta)', value: 'meta-llama/Meta-Llama-3-8B-Instruct', api: 'aiml' },
  { name: 'Llama 3 70B (Meta)', value: 'meta-llama/Meta-Llama-3-70B-Instruct', api: 'aiml' },
  { name: 'Gemini 2.5 Pro (Exp)', value: 'gemini-2.5-pro-exp-03-25', api: 'gemini' },
  { name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash', api: 'gemini' },
  { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', api: 'gemini' },
  { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', api: 'gemini' },
];
const DEFAULT_MODEL = MODELS[1].value;

const STORAGE_KEY_MESSAGES = '@campusAIChatMessages_v5';
const STORAGE_KEY_MODEL = '@campusAISelectedModel_v5';
const STORAGE_KEY_THEME = '@campusAITheme_v5';
const STORAGE_KEY_INSTRUCTIONS = '@campusAIInstructions_v5';
const STORAGE_KEY_FONT_SIZE = '@campusAIFontSize_v5';
const WELCOME_MESSAGE_TEXT = "Bonjour ! Je suis Campus AI, votre assistant universitaire dédié. Comment puis-je vous aider aujourd'hui ?";

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  reactions?: { [key: string]: number };
  pinned?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  fileInfo?: { name: string; size: number; type: string; uri?: string };
  imageUri?: string;
}

type InputMode = 'text' | 'voice';
type AiInteractionMode = 'normal' | 'deepSearch' | 'think';

// --- Utility Functions ---
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
const formatTimestamp = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// --- React Components ---
const IdleState: React.FC<{ styles: any; colors: Theme }> = React.memo(({ styles, colors }) => {
  return (
    <View style={styles.idleContainer}>
      <MaterialCommunityIcons name="brain" size={styles.idleIconSize} color={colors.tint} />
      <Text style={styles.idleText}>Campus AI</Text>
      <Text style={styles.idleSubText}>Prêt à discuter !</Text>
    </View>
  );
});

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

  return (
    <View style={[styles.messageRow, isUser ? styles.userMessageContainer : styles.aiMessageContainer, item.pinned && styles.pinnedMessage]}>
      {!isUser && <FontAwesome name="android" size={styles.aiAvatarSize} color={colors.tint} style={styles.aiAvatar} />}
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble, item.isError && styles.errorBubble]}>
        <Text style={[isUser ? styles.userMessageText : styles.aiMessageText, { fontSize }]}>{item.text}</Text>
        {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.messageImage} />}
        {item.fileInfo && (
          <View style={styles.fileInfoBadge}>
            <Ionicons name="document-outline" size={styles.fileInfoIconSize} color={colors.iconSecondary} />
            <Text style={[styles.fileInfoText, { fontSize: fontSize * 0.8 }]}>{item.fileInfo.name}</Text>
          </View>
        )}
        <View style={styles.messageActionsRow}>
          {!isUser && (
            <TouchableOpacity onPress={() => onSpeak(item.text)}>
              <Ionicons name="volume-medium-outline" size={styles.messageActionIconSize} color={colors.iconSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onCopy(item.text)}>
            <Ionicons name="copy-outline" size={styles.messageActionIconSize} color={colors.iconSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onShare(item.text)}>
            <Ionicons name="share-outline" size={styles.messageActionIconSize} color={colors.iconSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPin(item.id)}>
            <Ionicons name={item.pinned ? "pin" : "pin-outline"} size={styles.messageActionIconSize} color={colors.iconTint} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const TypingIndicator: React.FC<{ styles: any; colors: Theme }> = React.memo(({ styles, colors }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    animate(dot1);
    setTimeout(() => animate(dot2), 100);
    setTimeout(() => animate(dot3), 200);
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
      <Text style={styles.typingText}>Campus AI tape...</Text>
    </View>
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
  isRecording: boolean;
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
  isRecording,
}) => {
  const canSend = value.trim().length > 0 && !isApiLoading;
  const isDeepSearchActive = interactionMode === 'deepSearch';
  const isThinkActive = interactionMode === 'think';

  return (
    <View style={styles.inputAreaContainer}>
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={onAttach} disabled={isApiLoading}>
          <Ionicons name="attach-outline" size={styles.inputIconSize} color={colors.iconSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onGenerateImage} disabled={isApiLoading}>
          <Ionicons name="image-outline" size={styles.inputIconSize} color={colors.iconSecondary} />
        </TouchableOpacity>
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity onPress={onToggleDeepSearch} style={[styles.inputModeButton, isDeepSearchActive && styles.inputModeButtonActive]}>
            <MaterialCommunityIcons name="layers-search-outline" size={styles.modeIconSize} color={isDeepSearchActive ? colors.textContrast : colors.success} />
            <Text style={[styles.inputModeButtonText, isDeepSearchActive && styles.inputModeButtonTextActive]}>Deep</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggleThink} style={[styles.inputModeButton, isThinkActive && styles.inputModeButtonActive]}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={styles.modeIconSize} color={isThinkActive ? colors.textContrast : colors.success} />
            <Text style={[styles.inputModeButtonText, isThinkActive && styles.inputModeButtonTextActive]}>Think</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="Posez une question à Campus AI..."
          placeholderTextColor={colors.placeholderText}
          multiline
          editable={!isApiLoading && inputMode === 'text'}
          selectionColor={colors.tint}
          textAlignVertical="center"
        />
        {inputMode === 'text' ? (
          canSend ? (
            <TouchableOpacity onPress={onSend} style={styles.sendButtonContainer}>
              <Ionicons name="arrow-up-circle" size={styles.sendIconSize} color={colors.tint} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onToggleInputMode}>
              <Ionicons name={isRecording ? "mic-off-outline" : "mic-outline"} size={styles.inputIconSize} color={isRecording ? colors.danger : colors.iconSecondary} />
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity onPress={onToggleInputMode}>
            <MaterialCommunityIcons name="keyboard-outline" size={styles.inputIconSize} color={colors.iconSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  models: typeof MODELS;
  onSelectTheme: (themeName: string) => void;
  currentTheme: string;
  themes: typeof THEMES;
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
  models,
  onSelectTheme,
  currentTheme,
  themes,
  customInstructions,
  setCustomInstructions,
  liveSpeechEnabled,
  setLiveSpeechEnabled,
  fontSize,
  setFontSize,
}) => {
  return (
    <Modal transparent visible={isVisible} onRequestClose={onClose} animationType="slide">
      <Pressable style={styles.menuBackdrop} onPress={onClose} />
      <Animated.View style={styles.sideMenu}>
        <View style={styles.menuHeader}>
          <MaterialCommunityIcons name="cog-outline" size={styles.menuTitleIconSize} color={colors.tint} />
          <Text style={styles.menuTitle}>Paramètres AI</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={styles.menuCloseIconSize} color={colors.iconSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.menuScrollContent}>
          <Text style={styles.menuSectionTitle}>Modèle IA</Text>
          <View style={styles.modalOptionGrid}>
            {models.map((model) => (
              <TouchableOpacity
                key={model.value}
                style={[styles.modalOptionButton, currentModel === model.value && styles.modalOptionButtonSelected]}
                onPress={() => onSelectModel(model.value)}
              >
                <Ionicons
                  name={currentModel === model.value ? "checkmark-circle" : "ellipse-outline"}
                  size={styles.modalOptionIconSize}
                  color={currentModel === model.value ? colors.textContrast : colors.iconSecondary}
                />
                <Text style={[styles.modalOptionText, currentModel === model.value && styles.modalOptionTextSelected]}>
                  {model.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.menuSectionTitle}>Instructions Personnalisées</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="Ex: Explique simplement, sois formel..."
            placeholderTextColor={colors.placeholderText}
            value={customInstructions}
            onChangeText={setCustomInstructions}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.menuSectionTitle}>Thème Visuel</Text>
          <View style={styles.themeOptionGrid}>
            {Object.keys(themes).map((themeName) => (
              <TouchableOpacity
                key={themeName}
                style={[
                  styles.themeOptionButton,
                  currentTheme === themeName && styles.themeOptionButtonSelected,
                  { backgroundColor: THEMES[themeName].tint + '20', borderColor: THEMES[themeName].tint + '80' },
                ]}
                onPress={() => onSelectTheme(themeName)}
              >
                <View style={[styles.themeColorPreview, { backgroundColor: THEMES[themeName].tint }]} />
                <Text style={[styles.themeOptionText, currentTheme === themeName && styles.themeOptionTextSelected]}>
                  {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.menuSectionTitle}>Options Audio</Text>
          <TouchableOpacity
            style={styles.modalOptionButton}
            onPress={() => setLiveSpeechEnabled(!liveSpeechEnabled)}
          >
            <Ionicons
              name={liveSpeechEnabled ? "volume-high-outline" : "volume-mute-outline"}
              size={styles.modalOptionIconSize}
              color={liveSpeechEnabled ? colors.success : colors.iconSecondary}
            />
            <Text style={styles.modalOptionText}>Lecture en direct</Text>
          </TouchableOpacity>
          <Text style={styles.menuSectionTitle}>Taille de la police</Text>
          <Slider
            style={styles.fontSizeSlider}
            minimumValue={12}
            maximumValue={20}
            step={1}
            value={fontSize}
            onValueChange={setFontSize}
            minimumTrackTintColor={colors.tint}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.tint}
          />
          <Text style={styles.fontSizeLabel}>Taille: {fontSize}px</Text>
          <Text style={styles.menuSectionTitle}>Actions</Text>
          <View style={styles.menuActionGrid}>
            <TouchableOpacity style={styles.menuActionButton} onPress={onClearChat}>
              <Ionicons name="trash-outline" size={styles.menuActionIconSize} color={colors.danger} />
              <Text style={[styles.menuActionButtonText, { color: colors.danger }]}>Effacer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuActionButton} onPress={onShareChat}>
              <Ionicons name="share-outline" size={styles.menuActionIconSize} color={colors.iconSecondary} />
              <Text style={styles.menuActionButtonText}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuActionButton} onPress={onExportPDF}>
              <Ionicons name="document-text-outline" size={styles.menuActionIconSize} color={colors.iconSecondary} />
              <Text style={styles.menuActionButtonText}>Exporter PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuActionButton} onPress={onExportMarkdown}>
              <Ionicons name="code-slash-outline" size={styles.menuActionIconSize} color={colors.iconSecondary} />
              <Text style={styles.menuActionButtonText}>Exporter Markdown</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});

// --- Main Screen Component ---
export default function AIScreen() {
  const [theme, setTheme] = useState('dark');
  const colors = useMemo(() => THEMES[theme], [theme]);
  const screenWidth = Dimensions.get('window').width;
  const styles = useMemo(() => getAIStyles(colors, screenWidth), [colors, screenWidth]);
  const insets = useSafeAreaInsets();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interactionMode, setInteractionMode] = useState<AiInteractionMode>('normal');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [liveSpeechEnabled, setLiveSpeechEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // --- Effects ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedMessagesStr, savedInstructions, savedThemeStr, savedModelStr, savedFontSizeStr] = await AsyncStorage.multiGet([
          STORAGE_KEY_MESSAGES,
          STORAGE_KEY_INSTRUCTIONS,
          STORAGE_KEY_THEME,
          STORAGE_KEY_MODEL,
          STORAGE_KEY_FONT_SIZE,
        ]);
        const savedMessages = savedMessagesStr?.[1] ? JSON.parse(savedMessagesStr[1]) : [];
        setMessages(savedMessages.length > 0 ? savedMessages : [{ id: generateId(), text: WELCOME_MESSAGE_TEXT, sender: 'ai', timestamp: Date.now() }]);
        setCustomInstructions(savedInstructions?.[1] ?? '');
        setTheme(savedThemeStr?.[1] || 'dark');
        setSelectedModel(savedModelStr?.[1] || DEFAULT_MODEL);
        setFontSize(savedFontSizeStr?.[1] ? parseInt(savedFontSizeStr[1]) : 16);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        const messagesToSave = messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.timestamp,
          reactions: msg.reactions || {},
          pinned: msg.pinned || false,
          isLoading: msg.isLoading || false,
          isError: msg.isError || false,
          fileInfo: msg.fileInfo || undefined,
          imageUri: msg.imageUri || undefined,
        })).filter(msg => !msg.isLoading);
        await AsyncStorage.multiSet([
          [STORAGE_KEY_MESSAGES, JSON.stringify(messagesToSave)],
          [STORAGE_KEY_INSTRUCTIONS, customInstructions],
          [STORAGE_KEY_THEME, theme],
          [STORAGE_KEY_MODEL, selectedModel],
          [STORAGE_KEY_FONT_SIZE, fontSize.toString()],
        ]);
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };
    if (!isApiLoading) saveData();
  }, [messages, customInstructions, theme, selectedModel, fontSize, isApiLoading]);

  // --- API Interaction ---
  const callAPI = useCallback(async (prompt: string, fileInfo?: ChatMessage['fileInfo'], generateImage = false): Promise<{ text: string; imageUri?: string }> => {
    const selectedModelObj = MODELS.find((m) => m.value === selectedModel);
    const isGemini = selectedModelObj?.api === 'gemini';
    const systemPrompt = `Langue: Français. Tu es Campus AI, un assistant universitaire. Instructions: ${customInstructions || 'Standard.'}`;
    const history = messages.slice(-8).map((msg) => ({ role: msg.sender === 'user' ? 'user' : 'model', content: msg.text }));

    if (isGemini) {
      if (!GEMINI_API_KEY) throw new Error('Gemini API Key missing.');
      const contents = [
        { parts: [{ text: systemPrompt }], role: 'user' },
        ...history.map((msg) => ({ parts: [{ text: msg.content }], role: msg.role })),
        { parts: [{ text: prompt }], role: 'user' },
      ];

      if (fileInfo?.uri) {
        const fileData = await FileSystem.readAsStringAsync(fileInfo.uri, { encoding: FileSystem.EncodingType.Base64 });
        contents.push({
          parts: [{ inlineData: { mimeType: fileInfo.type, data: fileData } }],
          role: 'user',
        });
      }

      const url = `${GEMINI_API_URL}/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;
      const requestBody = {
        contents,
        generationConfig: {
          maxOutputTokens: 65536,
          temperature: 0.7,
          responseMimeType: 'text/plain',
        },
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

        const candidate = data.candidates?.[0]?.content;
        if (!candidate) throw new Error('No content returned from Gemini.');

        const text = candidate.parts[0]?.text?.trim() || '';
        let imageUri: string | undefined;
        if (generateImage) {
          // Simulate image generation with a placeholder since direct image generation isn't supported
          imageUri = 'https://via.placeholder.com/200?text=Image+Generated';
        }
        if (!text && !imageUri) throw new Error('Empty Gemini response.');
        return { text, imageUri };
      } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
      }
    } else {
      if (!AIML_API_KEY) throw new Error('AIML API Key missing.');
      const requestBody = {
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      };
      try {
        const response = await fetch(AIML_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AIML_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `AIML API Error (${response.status})`);
        const aiResponse = data.choices?.[0]?.message?.content?.trim();
        if (!aiResponse) throw new Error('Empty AIML response.');
        return { text: aiResponse };
      } catch (error) {
        console.error('AIML API Error:', error);
        throw error;
      }
    }
  }, [messages, selectedModel, customInstructions]);

  const handleSendMessage = useCallback(async (fileInfo?: ChatMessage['fileInfo']) => {
    const messageText = inputText.trim();
    if (!messageText && !fileInfo) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      text: messageText,
      sender: 'user',
      timestamp: Date.now(),
      fileInfo,
    };
    setInputText('');
    setIsApiLoading(true);
    setMessages((prev) => [...prev, userMessage]);

    try {
      let prompt = messageText;
      if (interactionMode === 'deepSearch' && fileInfo) {
        prompt = `Summarize this document: ${messageText}`;
      } else if (interactionMode === 'think') {
        prompt = `Réfléchis profondément et explique étape par étape: ${messageText}`;
      }

      const { text: aiResponseText, imageUri } = await callAPI(prompt, fileInfo);
      const aiResponseMessage: ChatMessage = {
        id: generateId(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: Date.now(),
        imageUri,
      };
      setMessages((prev) => [...prev, aiResponseMessage]);
      if (liveSpeechEnabled && aiResponseText) {
        Speech.speak(aiResponseText, { language: 'fr-FR' });
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        text: `Désolé, une erreur est survenue : ${error instanceof Error ? error.message : 'Inconnue'}`,
        sender: 'ai',
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsApiLoading(false);
    }
  }, [inputText, callAPI, interactionMode, liveSpeechEnabled]);

  const handleGenerateImage = useCallback(async () => {
    const prompt = inputText.trim() || "Génère une image aléatoire.";
    if (!prompt) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      text: prompt,
      sender: 'user',
      timestamp: Date.now(),
    };
    setInputText('');
    setIsApiLoading(true);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const { text, imageUri } = await callAPI(prompt, undefined, true);
      const aiResponseMessage: ChatMessage = {
        id: generateId(),
        text: text || 'Image générée !',
        sender: 'ai',
        timestamp: Date.now(),
        imageUri,
      };
      setMessages((prev) => [...prev, aiResponseMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        text: `Erreur lors de la génération d'image : ${error instanceof Error ? error.message : 'Inconnue'}`,
        sender: 'ai',
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsApiLoading(false);
    }
  }, [inputText, callAPI]);

  const handleAttachFile = useCallback(async () => {
    if (isApiLoading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const fileInfo: ChatMessage['fileInfo'] = {
        name: asset.name,
        size: asset.size ?? 0,
        type: asset.mimeType ?? 'unknown',
        uri: asset.uri,
      };
      handleSendMessage(fileInfo);
    } catch (error) {
      Alert.alert('Erreur lors de la pièce jointe');
      console.error(error);
    }
  }, [isApiLoading, handleSendMessage]);

  const handleToggleInteractionMode = useCallback((mode: AiInteractionMode) => {
    if (!isApiLoading) setInteractionMode((current) => (current === mode ? 'normal' : mode));
  }, [isApiLoading]);

  const handleToggleInputMode = useCallback(() => {
    if (isApiLoading) return;
    setInputMode((prev) => {
      const newMode = prev === 'text' ? 'voice' : 'text';
      if (newMode === 'text') inputRef.current?.focus();
      else {
        inputRef.current?.blur();
        setIsRecording((prev) => !prev);
        Alert.alert('Entrée vocale', 'Bientôt disponible !');
      }
      return newMode;
    });
  }, [isApiLoading]);

  const speakText = useCallback((text: string) => {
    if (text) Speech.speak(text, { language: 'fr-FR' });
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copié !');
  }, []);

  const shareMessageText = useCallback(async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (e) {
      Alert.alert('Erreur de partage', e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }, []);

  const handlePinMessage = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
      )
    );
  }, []);

  const handleClearChat = useCallback(() => {
    setIsSettingsModalVisible(false);
    setTimeout(() => {
      Alert.alert("Effacer la discussion", "Supprimer tous les messages ?", [
        { text: "Annuler" },
        {
          text: "Effacer",
          style: "destructive",
          onPress: () =>
            setMessages([{ id: generateId(), text: WELCOME_MESSAGE_TEXT, sender: 'ai', timestamp: Date.now() }]),
        },
      ]);
    }, 100);
  }, []);

  const handleShareChat = useCallback(async () => {
    setIsSettingsModalVisible(false);
    const content = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');
    await Share.share({ message: content });
  }, [messages]);

  const handleExportPDF = useCallback(async () => {
    setIsSettingsModalVisible(false);
    const html = `<html><body><h1>Historique Campus AI</h1><div>${messages.map((m) => `<p><strong>${m.sender}:</strong> ${m.text}</p>`).join('')}</div></body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Erreur d’exportation PDF');
    }
  }, [messages]);

  const handleExportMarkdown = useCallback(async () => {
    setIsSettingsModalVisible(false);
    const markdown = messages.map((m) => `**${m.sender}**: ${m.text}`).join('\n\n');
    const uri = `${FileSystem.documentDirectory}chat_export_${generateId()}.md`;
    await FileSystem.writeAsStringAsync(uri, markdown);
    await Sharing.shareAsync(uri);
  }, [messages]);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned), [messages]);
  const displayMessages = useMemo(() => messages.filter((m) => !m.isLoading && !m.pinned), [messages]);
  const showIdleState = displayMessages.length <= 1 && !isApiLoading && inputText.trim() === '' && pinnedMessages.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Campus AI',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: '600', fontSize: 18 },
          headerTintColor: colors.tint,
          headerLeft: () => (
            <TouchableOpacity onPress={() => setIsSettingsModalVisible(true)} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={24} color={colors.tint} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => Alert.alert("Recherche", "Bientôt disponible !")} style={styles.headerButton}>
              <Ionicons name="search-outline" size={22} color={colors.tint} />
            </TouchableOpacity>
          ),
          headerShadowVisible: true,
          headerTitleAlign: 'center',
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={insets.top + 44}
      >
        {showIdleState ? (
          <IdleState styles={styles} colors={colors} />
        ) : (
          <>
            {pinnedMessages.length > 0 && (
              <View style={styles.pinnedMessagesContainer}>
                <Text style={styles.pinnedMessagesTitle}>Messages épinglés</Text>
                <FlatList
                  data={pinnedMessages}
                  renderItem={({ item }) => (
                    <MessageBubble
                      item={item}
                      styles={styles}
                      colors={colors}
                      onSpeak={speakText}
                      onCopy={copyToClipboard}
                      onShare={shareMessageText}
                      onPin={handlePinMessage}
                      fontSize={fontSize}
                    />
                  )}
                  keyExtractor={(item) => item.id}
                  style={styles.pinnedMessagesList}
                  contentContainerStyle={styles.pinnedMessagesContent}
                />
              </View>
            )}
            <FlatList
              ref={flatListRef}
              data={displayMessages}
              renderItem={({ item }) => (
                <MessageBubble
                  item={item}
                  styles={styles}
                  colors={colors}
                  onSpeak={speakText}
                  onCopy={copyToClipboard}
                  onShare={shareMessageText}
                  onPin={handlePinMessage}
                  fontSize={fontSize}
                />
              )}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
        {isApiLoading && <TypingIndicator styles={styles} colors={colors} />}
        <InputBar
          value={inputText}
          styles={styles}
          colors={colors}
          onChangeText={setInputText}
          onSend={handleSendMessage}
          onAttach={handleAttachFile}
          onGenerateImage={handleGenerateImage}
          interactionMode={interactionMode}
          onToggleDeepSearch={() => handleToggleInteractionMode('deepSearch')}
          onToggleThink={() => handleToggleInteractionMode('think')}
          inputMode={inputMode}
          onToggleInputMode={handleToggleInputMode}
          isApiLoading={isApiLoading}
          inputRef={inputRef}
          isRecording={isRecording}
        />
      </KeyboardAvoidingView>
      <SettingsModal
        isVisible={isSettingsModalVisible}
        styles={styles}
        colors={colors}
        onClose={() => setIsSettingsModalVisible(false)}
        onClearChat={handleClearChat}
        onShareChat={handleShareChat}
        onExportPDF={handleExportPDF}
        onExportMarkdown={handleExportMarkdown}
        onSelectModel={setSelectedModel}
        currentModel={selectedModel}
        models={MODELS}
        onSelectTheme={setTheme}
        currentTheme={theme}
        themes={THEMES}
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
const basePadding = 8;
const baseFontSize = 16;
const getAIStyles = (colors: Theme, screenWidth: number) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  headerButton: { paddingHorizontal: basePadding },
  idleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  idleIconSize: baseFontSize * 3.5,
  idleText: { fontSize: baseFontSize * 1.4, fontWeight: '600', color: colors.text, marginTop: basePadding },
  idleSubText: { fontSize: baseFontSize * 0.9, color: colors.textSecondary, marginTop: basePadding / 2 },
  pinnedMessagesContainer: { backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border, padding: basePadding },
  pinnedMessagesTitle: { fontSize: baseFontSize * 0.9, fontWeight: 'bold', color: colors.textSecondary, marginBottom: basePadding / 2 },
  pinnedMessagesList: { maxHeight: 150 },
  pinnedMessagesContent: { paddingBottom: basePadding },
  pinnedMessage: { backgroundColor: colors.tint + '20', borderWidth: 1, borderColor: colors.tint },
  chatList: { flex: 1 },
  chatListContent: { padding: basePadding, paddingBottom: basePadding * 1.5 },
  messageRow: { flexDirection: 'row', marginVertical: basePadding / 2, maxWidth: '85%' },
  userMessageContainer: { alignSelf: 'flex-end' },
  aiMessageContainer: { alignSelf: 'flex-start' },
  aiAvatar: { marginRight: basePadding / 2, marginTop: basePadding / 2 },
  aiAvatarSize: baseFontSize * 1.4,
  messageBubble: { padding: basePadding * 0.8, borderRadius: 12, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  userBubble: { backgroundColor: colors.tint, borderTopRightRadius: 4 },
  aiBubble: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  errorBubble: { borderColor: colors.danger, backgroundColor: colors.danger + '20' },
  userMessageText: { color: colors.textContrast, lineHeight: baseFontSize * 1.3 },
  aiMessageText: { color: colors.text, lineHeight: baseFontSize * 1.3 },
  messageImage: { width: 180, height: 180, borderRadius: 8, marginTop: basePadding / 2 },
  fileInfoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground + 'B0', borderRadius: 12, padding: basePadding / 2, marginTop: basePadding / 2 },
  fileInfoIconSize: baseFontSize * 0.9,
  fileInfoText: { color: colors.textSecondary, marginLeft: basePadding / 2 },
  messageActionsRow: { flexDirection: 'row', marginTop: basePadding / 2, gap: basePadding / 2 },
  messageActionIconSize: baseFontSize * 1.1,
  typingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: basePadding / 2 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tint, marginHorizontal: 3 },
  typingText: { fontSize: baseFontSize * 0.8, color: colors.textSecondary, marginLeft: basePadding, fontStyle: 'italic' },
  inputAreaContainer: { padding: basePadding / 2, backgroundColor: colors.inputAreaBackground, borderTopWidth: 1, borderTopColor: colors.border },
  inputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBackground, borderRadius: 24, padding: basePadding / 2, borderWidth: 1, borderColor: colors.inputBorder, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  inputIconSize: baseFontSize * 1.1,
  modeToggleContainer: { flexDirection: 'row', marginHorizontal: basePadding / 2 },
  inputModeButton: { flexDirection: 'row', alignItems: 'center', padding: basePadding / 2, borderRadius: 10, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border },
  inputModeButtonActive: { backgroundColor: colors.success, borderColor: colors.success },
  inputModeButtonText: { fontSize: baseFontSize * 0.7, color: colors.success, marginLeft: basePadding / 2 },
  inputModeButtonTextActive: { color: colors.textContrast },
  modeIconSize: baseFontSize * 0.9,
  textInput: { flex: 1, color: colors.text, paddingVertical: basePadding / 2, paddingHorizontal: basePadding, maxHeight: 80 },
  sendButtonContainer: { padding: basePadding / 4 },
  sendIconSize: baseFontSize * 1.4,
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sideMenu: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.cardBackground, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', padding: basePadding, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuTitleIconSize: baseFontSize * 1.4,
  menuTitle: { fontSize: baseFontSize * 1.1, fontWeight: '600', color: colors.text, marginLeft: basePadding, flex: 1 },
  menuCloseIconSize: baseFontSize * 1.7,
  menuScrollContent: { padding: basePadding, paddingBottom: basePadding * 2 },
  menuSectionTitle: { fontSize: baseFontSize * 0.8, fontWeight: 'bold', color: colors.textSecondary, marginVertical: basePadding, textTransform: 'uppercase' },
  modalOptionGrid: { gap: basePadding / 2 },
  modalOptionButton: { flexDirection: 'row', alignItems: 'center', padding: basePadding * 0.8, borderRadius: 10, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border },
  modalOptionButtonSelected: { borderColor: colors.tint, backgroundColor: colors.tint + '20' },
  modalOptionIconSize: baseFontSize * 1.1,
  modalOptionText: { fontSize: baseFontSize * 0.9, color: colors.text, marginLeft: basePadding },
  modalOptionTextSelected: { fontWeight: 'bold', color: colors.tint },
  instructionsInput: { height: 90, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 8, padding: basePadding, fontSize: baseFontSize * 0.9, color: colors.text, marginBottom: basePadding },
  themeOptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: basePadding / 2 },
  themeOptionButton: { flexDirection: 'row', alignItems: 'center', padding: basePadding / 2, borderRadius: 10, borderWidth: 1 },
  themeOptionButtonSelected: { borderColor: colors.tint },
  themeColorPreview: { width: baseFontSize * 0.9, height: baseFontSize * 0.9, borderRadius: baseFontSize * 0.45, marginRight: basePadding / 2 },
  themeOptionText: { fontSize: baseFontSize * 0.8, color: colors.text },
  themeOptionTextSelected: { fontWeight: 'bold', color: colors.tint },
  fontSizeSlider: { width: '100%', marginVertical: basePadding / 2 },
  fontSizeLabel: { fontSize: baseFontSize * 0.8, color: colors.textSecondary, textAlign: 'center' },
  menuActionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: basePadding / 2 },
  menuActionButton: { alignItems: 'center', padding: basePadding * 0.8, borderRadius: 10, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, flex: 1, minWidth: 80 },
  menuActionIconSize: baseFontSize * 1.4,
  menuActionButtonText: { fontSize: baseFontSize * 0.8, color: colors.textSecondary, marginTop: basePadding / 2 },
});