import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Animated,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import theme from '../styles/theme';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NOTIFICATION_ICONS = {
  message: 'chatbubble-outline',
  like: 'heart-outline',
  comment: 'chatbubble-ellipses-outline',
  follow: 'person-add-outline',
  mention: 'at-outline',
  system: 'notifications-outline',
  default: 'notifications-outline',
};

const NOTIFICATION_COLORS = {
  message: '#0066CC',
  like: '#d64545',
  comment: '#00CCFF',
  follow: '#10b981',
  mention: '#f59e0b',
  system: '#7A869A',
  default: '#7A869A',
};

const formatTimeAgo = (dateString, strings) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return strings?.justNow || 'Adesso';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}g`;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

// Menu a tre puntini per singola notifica
const NotificationMenu = ({ 
  visible, 
  onClose, 
  onMarkAsRead, 
  onDelete, 
  isUnread,
  isRTL,
  strings 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Animated.View 
          style={[
            styles.menuContainer,
            isRTL && styles.menuContainerRtl,
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {isUnread && (
            <TouchableOpacity 
              style={[styles.menuItem, isRTL && styles.menuItemRtl]} 
              onPress={onMarkAsRead}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.menuItemText, isRTL && styles.rtlText]}>
                {strings?.markAsRead || 'Segna come letta'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.menuItem, styles.menuItemDanger, isRTL && styles.menuItemRtl]} 
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            <Text style={[styles.menuItemText, styles.menuItemTextDanger, isRTL && styles.rtlText]}>
              {strings?.delete || 'Elimina'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// Componente per notifica con animazione di entrata e menu
const AnimatedNotificationItem = ({ 
  notification, 
  isRTL, 
  strings, 
  onPress, 
  onMarkAsRead, 
  onDelete,
  isNew 
}) => {
  const type = notification.type || 'default';
  const icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
  const iconColor = NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.default;
  const isUnread = !notification.read;
  
  const fadeAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? -20 : 0)).current;
  const [menuVisible, setMenuVisible] = useState(false);
  
  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew]);

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setMenuVisible(true);
  };

  const handleMarkAsRead = () => {
    setMenuVisible(false);
    onMarkAsRead();
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      strings?.deleteConfirmTitle || 'Elimina notifica',
      strings?.deleteConfirmMessage || 'Sei sicuro di voler eliminare questa notifica?',
      [
        { 
          text: strings?.cancel || 'Annulla', 
          style: 'cancel',
          onPress: () => {}
        },
        { 
          text: strings?.delete || 'Elimina', 
          style: 'destructive',
          onPress: onDelete 
        }
      ]
    );
  };

  return (
    <>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Pressable
          style={[styles.notificationItem, isRTL && styles.notificationItemRtl]}
          onPress={onPress}
          android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
        >
          <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationText,
                isRTL && styles.rtlText,
                isUnread && styles.unreadText,
              ]}
              numberOfLines={2}
            >
              {notification.message || notification.body}
            </Text>
            <Text style={[styles.timeText, isRTL && styles.rtlText]}>
              {formatTimeAgo(notification.created_at, strings)}
            </Text>
          </View>
          <View style={styles.notificationActions}>
            {isUnread && <View style={styles.unreadDot} />}
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={handleMenuOpen}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
      <NotificationMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDelete}
        isUnread={isUnread}
        isRTL={isRTL}
        strings={strings}
      />
    </>
  );
};

const NotificationsSummary = ({ isRTL = false, maxItems = 5 }) => {
  const navigation = useNavigation();
  const { strings } = useLanguage();
  const { 
    notifications, 
    unreadCount, 
    refreshNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    isInitialized 
  } = useNotifications();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [newIds, setNewIds] = useState(new Set());
  const prevNotificationsRef = useRef([]);
  
  // Animation values
  const expandAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const contentHeightAnim = useRef(new Animated.Value(1)).current;

  // Track new notifications for animation
  useEffect(() => {
    const currentIds = new Set(notifications.map(n => n.id));
    const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
    const newlyAdded = new Set([...currentIds].filter(id => !prevIds.has(id)));
    
    if (newlyAdded.size > 0) {
      setNewIds(newlyAdded);
      setTimeout(() => setNewIds(new Set()), 1000);
    }
    
    prevNotificationsRef.current = notifications;
  }, [notifications]);

  // Handle expand/collapse animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(expandAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  // Pull to refresh manuale
  const handleRefresh = () => {
    refreshNotifications(true);
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigazione basata sul tipo
    switch (notification.type) {
      case 'message':
        if (notification.data?.conversationId) {
          navigation.navigate('Chat', { conversationId: notification.data.conversationId });
        }
        break;
      case 'like':
      case 'comment':
        if (notification.data?.likerId || notification.data?.commenterId) {
          navigation.navigate('PublicProfile', { 
            profileId: notification.data.likerId || notification.data.commenterId 
          });
        }
        break;
      case 'follow':
        if (notification.data?.followerId) {
          navigation.navigate('PublicProfile', { profileId: notification.data.followerId });
        }
        break;
      default:
        break;
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId) => {
    const success = await deleteNotification(notificationId);
    if (!success) {
      Alert.alert(
        strings?.error || 'Errore',
        strings?.deleteError || 'Impossibile eliminare la notifica'
      );
    }
  };

  const handleViewAll = () => {
    // TODO: Naviga a schermata notifiche completa
    console.log('[NotificationsSummary] View all pressed');
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Limita notifiche visualizzate
  const displayedNotifications = notifications.slice(0, maxItems);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg'],
  });

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con toggle expand/collapse */}
      <TouchableOpacity 
        style={[styles.header, isRTL && styles.headerRtl]}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={[styles.headerLeft, isRTL && styles.headerLeftRtl]}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
            {strings.notifications?.title || 'Notifiche'}
          </Text>
          {unreadCount > 0 && !isExpanded && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.headerActions, isRTL && styles.headerActionsRtl]}>
          {notifications.length > 0 && isExpanded && (
            <>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
                  <Text style={styles.markAllText}>
                    {strings.notifications?.markAllAsRead || 'Segna tutte come lette'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={theme.colors.muted} />
              </TouchableOpacity>
            </>
          )}
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={22} color={theme.colors.muted} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Content espandibile */}
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: expandAnim,
            transform: [
              { 
                scaleY: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                })
              }
            ],
            maxHeight: expandAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
          }
        ]}
      >
        {displayedNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={32} color={theme.colors.muted} />
            </View>
            <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
              {strings.notifications?.empty || 'Nessuna notifica'}
            </Text>
            <Text style={[styles.emptySubtext, isRTL && styles.rtlText]}>
              {strings.notifications?.emptySubtext || 'Ti avviseremo quando arrivano nuovi aggiornamenti'}
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {displayedNotifications.map((notification, index) => (
              <AnimatedNotificationItem
                key={notification.id}
                notification={notification}
                isRTL={isRTL}
                strings={strings.notifications}
                onPress={() => handleNotificationPress(notification)}
                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                onDelete={() => handleDelete(notification.id)}
                isNew={newIds.has(notification.id)}
              />
            ))}
            {notifications.length > maxItems && (
              <TouchableOpacity 
                style={[styles.viewAllButton, isRTL && styles.viewAllButtonRtl]}
                onPress={handleViewAll}
              >
                <Text style={styles.viewAllButtonText}>
                  {strings.notifications?.viewAll || 'Vedi tutte'} ({notifications.length})
                </Text>
                <Ionicons 
                  name={isRTL ? "arrow-back-outline" : "arrow-forward-outline"} 
                  size={16} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerLeftRtl: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerActionsRtl: {
    flexDirection: 'row-reverse',
  },
  headerButton: {
    paddingHorizontal: theme.spacing.xs,
  },
  markAllText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 4,
  },
  contentContainer: {
    overflow: 'hidden',
  },
  loadingContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  notificationsList: {
    paddingVertical: theme.spacing.xs,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  notificationItemRtl: {
    flexDirection: 'row-reverse',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 2,
  },
  notificationText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  unreadText: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  menuButton: {
    padding: 6,
    borderRadius: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    marginHorizontal: theme.spacing.md,
  },
  viewAllButtonRtl: {
    flexDirection: 'row-reverse',
  },
  viewAllButtonText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    right: 20,
    top: '30%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
    paddingVertical: theme.spacing.xs,
  },
  menuContainerRtl: {
    right: 'auto',
    left: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  menuItemRtl: {
    flexDirection: 'row-reverse',
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  menuItemText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  menuItemTextDanger: {
    color: theme.colors.danger,
  },
});

export default NotificationsSummary;
