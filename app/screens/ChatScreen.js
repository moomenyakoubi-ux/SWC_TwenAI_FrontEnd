import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import WebSidebar, { WEB_SIDE_MENU_WIDTH } from '../components/WebSidebar';
import { WEB_TAB_BAR_WIDTH } from '../components/WebTabBar';

const backgroundImage = require('../images/image2.png');

const ChatScreen = ({ navigation }) => {
  const isWeb = Platform.OS === 'web';
  const { strings, isRTL } = useLanguage();
  const chatStrings = strings.chat;
  const menuStrings = strings.menu;
  const sidebarTitle = strings.home?.greeting || chatStrings.title;
  const [activeChatId, setActiveChatId] = useState(null);
  const [conversations, setConversations] = useState({});
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const replyTimeoutRef = useRef(null);

  const chatProfiles = useMemo(
    () => [
      {
        id: 'ai',
        name: 'Ahna AI',
        subtitle: chatStrings.aiTitle,
        status: chatStrings.statusOnline,
        lastMessage: chatStrings.initialMessages[chatStrings.initialMessages.length - 1]?.text,
        color: '#D72323',
        initialMessages: chatStrings.initialMessages,
        autoReply: chatStrings.aiReply,
      },
      {
        id: 'kader',
        name: 'Kader',
        subtitle: 'Chef a Milano',
        status: `${chatStrings.statusOffline} 09:45`,
        lastMessage: 'Ho nuove ricette tunisine da condividere!',
        color: '#0C1B33',
        initialMessages: [
          { id: 'k-1', sender: 'ai', text: 'Ehi! Hai provato il cous cous con harissa leggera?' },
          { id: 'k-2', sender: 'user', text: 'Non ancora, consigli su come farlo più speziato?' },
          { id: 'k-3', sender: 'ai', text: 'Aggiungi un cucchiaino di tabil e un filo di limone.' },
        ],
        autoReply: 'Ti mando presto altre ricette e idee per il menù!',
      },
      {
        id: 'sara',
        name: 'Sara',
        subtitle: 'Community manager',
        status: `${chatStrings.statusOffline} 08:10`,
        lastMessage: 'Organizziamo il meetup di sabato a Roma?',
        color: '#F2A365',
        initialMessages: [
          { id: 's-1', sender: 'ai', text: 'Ciao! Sto preparando la lista dei partecipanti al meetup.' },
          { id: 's-2', sender: 'user', text: 'Perfetto, vuoi che porti qualcosa?' },
          { id: 's-3', sender: 'ai', text: 'Un dolce tunisino sarebbe apprezzatissimo!' },
        ],
        autoReply: 'Grazie! Aggiungo il tuo nome all\'evento e condivido i dettagli.',
      },
    ],
    [chatStrings],
  );

  useEffect(() => {
    const initialState = chatProfiles.reduce((acc, chat) => {
      acc[chat.id] = chat.initialMessages;
      return acc;
    }, {});
    setConversations(initialState);
    setIsTyping(false);
    setActiveChatId(null);
    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
      replyTimeoutRef.current = null;
    }
  }, [chatProfiles]);

  useEffect(
    () => () => {
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
      }
    },
    [],
  );

  const handleOpenChat = (chatId) => {
    setActiveChatId(chatId);
    setIsTyping(false);
    setInput('');
    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
      replyTimeoutRef.current = null;
    }
  };

  const handleSend = (overrideText) => {
    if (!activeChatId) return;
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend) return;
    const newMessage = { id: `${activeChatId}-${Date.now()}`, sender: 'user', text: textToSend };
    const activeChat = chatProfiles.find((chat) => chat.id === activeChatId);
    const autoReply = { id: `reply-${Date.now()}`, sender: 'ai', text: activeChat?.autoReply };

    setConversations((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage],
    }));
    setInput('');
    setIsTyping(true);

    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
    }

    replyTimeoutRef.current = setTimeout(() => {
      if (!activeChat?.autoReply) {
        setIsTyping(false);
        replyTimeoutRef.current = null;
        return;
      }
      setConversations((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), autoReply],
      }));
      setIsTyping(false);
      replyTimeoutRef.current = null;
    }, activeChatId === 'ai' ? 1300 : 900);
  };

  const TypingIndicator = () => {
    const dotScales = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current;

    useEffect(() => {
      const animations = dotScales.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 120),
            Animated.timing(anim, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.4,
              duration: 280,
              useNativeDriver: true,
            }),
          ]),
        ),
      );

      animations.forEach((animation) => animation.start());
      return () => animations.forEach((animation) => animation.stop());
    }, [dotScales]);

    return (
      <View style={styles.typingDots}>
        {dotScales.map((scale, index) => (
          <Animated.View key={`dot-${index}`} style={[styles.typingDot, { transform: [{ scale }] }]} />
        ))}
      </View>
    );
  };

  const renderBubble = (message) => {
    const isUser = message.sender === 'user';
    return (
      <View key={message.id} style={[styles.bubbleWrapper, isUser ? styles.alignEnd : styles.alignStart]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.userText : styles.aiText,
              isRTL && styles.rtlText,
            ]}
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  const handleSubmitEditing = ({ nativeEvent }) => {
    handleSend(nativeEvent?.text);
  };

  const activeChat = chatProfiles.find((chat) => chat.id === activeChatId);
  const currentMessages = activeChatId ? conversations[activeChatId] || [] : [];

  const ChatList = () => (
    <View style={[styles.listContainer, isWeb && styles.webContentPadding, isWeb && styles.webMaxWidth]}>
      <Text style={[styles.listTitle, isRTL && styles.rtlText]}>{chatStrings.listTitle}</Text>
      <ScrollView contentContainerStyle={styles.chatList} showsVerticalScrollIndicator={false}>
        {chatProfiles.map((chat) => {
          const lastMessage = (conversations[chat.id] || chat.initialMessages).slice(-1)[0];
          return (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatCard}
              activeOpacity={0.9}
              onPress={() => handleOpenChat(chat.id)}
            >
              <View style={[styles.avatar, { backgroundColor: chat.color }]}>
                <Text style={styles.avatarText}>{chat.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.chatMeta}>
                <View style={[styles.chatHeader, isRTL && styles.rowReverse]}>
                  <Text style={[styles.chatName, isRTL && styles.rtlText]}>{chat.name}</Text>
                  <Text style={styles.chatStatus}>{chat.status}</Text>
                </View>
                <Text style={[styles.chatSubtitle, isRTL && styles.rtlText]}>{chat.subtitle}</Text>
                <Text numberOfLines={1} style={[styles.chatLast, isRTL && styles.rtlText]}>
                  {lastMessage?.text}
                </Text>
              </View>
              <View style={styles.openPill}>
                <Ionicons name="arrow-forward" size={18} color={theme.colors.card} />
                <Text style={styles.openPillText}>{chatStrings.openChat}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <ImageBackground
      source={backgroundImage}
      defaultSource={backgroundImage}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={[styles.overlay, isWeb && styles.overlayWeb]}>
        <Navbar
          title={activeChat ? activeChat.name : chatStrings.title}
          isRTL={isRTL}
          onBack={activeChat ? () => handleOpenChat(null) : undefined}
          backLabel={activeChat ? chatStrings.backToList : undefined}
        />
        {!activeChat && <ChatList />}

        {activeChat && (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.chatWrapper, isWeb && styles.webContentPadding, isWeb && styles.webMaxWidth]}>
              <View style={[styles.chatHero, isRTL && styles.rowReverse]}>
                <View style={[styles.avatarLarge, { backgroundColor: activeChat.color }]}>
                  <Text style={styles.avatarLargeText}>{activeChat.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.heroMeta}>
                  <Text style={[styles.heroTitle, isRTL && styles.rtlText]}>{activeChat.subtitle}</Text>
                  <Text style={[styles.heroStatus, isRTL && styles.rtlText]}>{activeChat.status}</Text>
                </View>
              </View>

              <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.messages}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
              >
                {currentMessages.map(renderBubble)}
                {isTyping && (
                  <View style={[styles.bubbleWrapper, styles.alignStart]}>
                    <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
                      <TypingIndicator />
                      <Text style={[styles.typingLabel, isRTL && styles.rtlText]}>{chatStrings.typing}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
              <View style={styles.inputRow}>
                <View style={[styles.inputRowInner, isWeb && styles.inputRowWeb]}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder={chatStrings.placeholder}
                  placeholderTextColor={theme.colors.muted}
                  multiline
                  returnKeyType="send"
                  blurOnSubmit={false}
                  onSubmitEditing={handleSubmitEditing}
                  textAlign={isRTL ? 'right' : 'left'}
                  writingDirection={isRTL ? 'rtl' : 'ltr'}
                />
                <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
                  <Ionicons name="send" size={20} color={theme.colors.card} />
                </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
        <WebSidebar
          title={sidebarTitle}
          menuStrings={menuStrings}
          navigation={navigation}
          isRTL={isRTL}
        />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 27, 51, 0.78)',
  },
  overlayWeb: {
    paddingLeft: WEB_TAB_BAR_WIDTH,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  webMaxWidth: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  listTitle: {
    color: theme.colors.card,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  chatList: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  chatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.card,
    fontWeight: '800',
    fontSize: 16,
  },
  chatMeta: {
    flex: 1,
    gap: 2,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatName: {
    color: theme.colors.card,
    fontSize: 17,
    fontWeight: '800',
  },
  chatStatus: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  chatSubtitle: {
    color: 'rgba(255,255,255,0.8)',
  },
  chatLast: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
  },
  openPillText: {
    color: theme.colors.card,
    fontWeight: '700',
  },
  chatWrapper: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  chatHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    color: theme.colors.card,
    fontWeight: '800',
    fontSize: 18,
  },
  heroMeta: {
    gap: 4,
  },
  heroTitle: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: '800',
  },
  heroStatus: {
    color: 'rgba(255,255,255,0.7)',
  },
  messages: {
    flexGrow: 1,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  bubbleWrapper: {
    flexDirection: 'row',
  },
  alignStart: {
    justifyContent: 'flex-start',
  },
  alignEnd: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.radius.sm,
  },
  bubbleAi: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomLeftRadius: theme.radius.sm,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: theme.colors.card,
  },
  aiText: {
    color: theme.colors.secondary,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingLabel: {
    color: theme.colors.secondary,
    fontSize: 13,
    marginLeft: theme.spacing.xs,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
    marginHorizontal: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadow.card,
  },
  inputRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  inputRowWeb: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: theme.colors.text,
  },
  sendButton: {
    marginLeft: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  webContentPadding: {
    paddingRight: theme.spacing.lg + WEB_SIDE_MENU_WIDTH,
    paddingLeft: theme.spacing.lg + WEB_TAB_BAR_WIDTH,
  },
});

export default ChatScreen;
