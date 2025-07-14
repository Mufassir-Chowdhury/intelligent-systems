'use client';

import { createContext, useContext, useState, ReactNode, FormEvent, KeyboardEvent, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface Message {
  text: string;
  sender: 'user' | 'model';
  timestamp: string;
}

interface ChatSummary {
    id: string;
    title: string;
    timestamp: string;
}

interface FullChat extends ChatSummary {
    messages: Message[];
}

interface ChatContextType {
  chats: ChatSummary[];
  currentChatMessages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: (chatId: string | null) => Promise<void>;
  handleFormSubmit: (e: FormEvent, chatId: string | null) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, chatId: string | null) => void;
  fetchChatMessages: (chatId: string) => Promise<void>;
  fetchChats: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  isSendingMessage: boolean;
  isFetchingChats: boolean;
  isFetchingMessages: boolean;
  isDeletingChat: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [currentChatMessages, setCurrentChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchChats = useCallback(async () => {
    setIsFetchingChats(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chats`);
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data: ChatSummary[] = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsFetchingChats(false);
    }
  }, []);

  const fetchChatMessages = useCallback(async (chatId: string) => {
    setIsFetchingMessages(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat messages');
      }
      const data: Message[] = await response.json();
      setCurrentChatMessages(data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      setCurrentChatMessages([]); // Clear messages on error
    } finally {
      setIsFetchingMessages(false);
    }
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    setIsDeletingChat(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
      fetchChats(); // Refresh chat list after deletion
      const currentChatId = pathname.split('/').pop();
      if (currentChatId === chatId) {
        router.push('/'); // Redirect to home page only if the deleted chat is the current one
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setIsDeletingChat(false);
    }
  }, [fetchChats, router, pathname]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const sendMessage = async (chatId: string | null) => {
    if (newMessage.trim() === '') return;

    setIsSendingMessage(true);
    const userMessage: Message = {
      text: newMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    try {
      if (chatId) {
        // Optimistically update UI
        setCurrentChatMessages(prevMessages => [...prevMessages, userMessage]);

        // Send message to existing chat
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userMessage),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        // No need to update currentChatMessages again if optimistic update was done
        fetchChats(); // Optionally, refetch chats to update timestamp in sidebar

      } else {
        // Create new chat
        const response = await fetch(`${API_BASE_URL}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userMessage),
        });

        if (!response.ok) {
          throw new Error('Failed to create new chat');
        }
        const newChat: FullChat = await response.json();
        setChats(prevChats => [...prevChats, { id: newChat.id, title: newChat.title, timestamp: newChat.timestamp }]);
        setCurrentChatMessages(newChat.messages);
        router.push(`/chat/${newChat.id}`);
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update if it was done
      if (chatId) {
        setCurrentChatMessages(prevMessages => prevMessages.filter(msg => msg !== userMessage));
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleFormSubmit = (e: FormEvent, chatId: string | null) => {
    e.preventDefault();
    sendMessage(chatId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, chatId: string | null) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatId);
    }
  };

  return (
    <ChatContext.Provider value={{ chats, currentChatMessages, newMessage, setNewMessage, sendMessage, handleFormSubmit, handleKeyDown, fetchChatMessages, fetchChats, deleteChat, isSendingMessage, isFetchingChats, isFetchingMessages, isDeletingChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
