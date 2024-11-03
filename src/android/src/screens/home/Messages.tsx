/**
 * HUMAN TASKS:
 * 1. Configure message notification channels in device settings
 * 2. Verify offline message storage capacity limits
 * 3. Test message sync behavior with poor network conditions
 */

import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet
} from 'react-native'; // ^0.72.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal components
import Loading from '../../components/common/Loading';
import Card from '../../components/common/Card';
import { NotificationService } from '../../services/notification';

/**
 * Interface defining the structure of a message
 * Requirement: Two-way communication system (1.2 Scope/Core Functionality)
 */
interface Message {
  id: string;
  type: 'system' | 'delivery' | 'communication';
  title: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

/**
 * Screen component for displaying and managing driver messages
 * Requirements:
 * - Two-way communication system (1.2 Scope/Core Functionality)
 * - Mobile Applications (1.1 System Overview/Mobile Applications)
 * - Offline-first architecture (1.1 System Overview/Mobile Applications)
 */
const Messages: React.FC = () => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const navigation = useNavigation();
  const notificationService = new NotificationService();

  /**
   * Fetches messages from local storage and server
   * Requirement: Offline-first architecture
   */
  const fetchMessages = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      // Fetch from local storage first
      const storedMessages = await AsyncStorage.getItem('@messages');
      const localMessages = storedMessages ? JSON.parse(storedMessages) : [];

      // Update state with local data immediately
      setMessages(localMessages);

      // Check online status and fetch from server if available
      const isOnline = await NetInfo.fetch();
      if (isOnline.isConnected) {
        const response = await fetch('api/messages');
        const serverMessages = await response.json();

        // Merge local and server messages, removing duplicates
        const mergedMessages = [...serverMessages, ...localMessages]
          .reduce((unique: Message[], message: Message) => {
            return unique.some(msg => msg.id === message.id)
              ? unique
              : [...unique, message];
          }, []);

        // Sort by timestamp in descending order
        const sortedMessages = mergedMessages.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Update local storage and state
        await AsyncStorage.setItem('@messages', JSON.stringify(sortedMessages));
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handles pull-to-refresh action
   * Requirement: Mobile Applications
   */
  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  /**
   * Renders individual message item
   * Requirement: Two-way communication system
   */
  const renderMessage = useCallback(({ item }: { item: Message }): JSX.Element => {
    const handlePress = () => {
      navigation.navigate('MessageDetail', { messageId: item.id });
    };

    return (
      <Card
        onPress={handlePress}
        style={[
          styles.messageCard,
          !item.read && styles.unreadMessage
        ]}
      >
        <View style={styles.messageHeader}>
          <Text style={styles.messageType}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.messageTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.messageContent} numberOfLines={2}>
          {item.content}
        </Text>
      </Card>
    );
  }, [navigation]);

  // Set up notification listener
  useEffect(() => {
    const setupNotifications = async () => {
      await notificationService.initialize();
      notificationService.onNotificationReceived = async (notification) => {
        // Refresh messages when a new message notification is received
        await fetchMessages();
      };
    };

    setupNotifications();
  }, []);

  // Initial messages fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  if (loading) {
    return <Loading size="large" fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={messages.length === 0 && styles.emptyContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No messages available
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  messageList: {
    flex: 1,
    paddingVertical: 8
  },
  messageCard: {
    marginHorizontal: 16,
    marginVertical: 8
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  messageType: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'uppercase'
  },
  timestamp: {
    fontSize: 12,
    color: '#999999'
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  messageContent: {
    fontSize: 14,
    color: '#333333'
  },
  unreadMessage: {
    backgroundColor: '#F5F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center'
  }
});

export default Messages;