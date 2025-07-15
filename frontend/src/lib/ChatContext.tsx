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

    // Optimistically update UI
    setCurrentChatMessages(prevMessages => [...prevMessages, userMessage]);
    setNewMessage('');

    // Add a "thinking" placeholder for the model's response
    const thinkingMessage: Message = { text: 'thinking', sender: 'model', timestamp: new Date().toISOString() };
    setCurrentChatMessages(prevMessages => [...prevMessages, { ...thinkingMessage, text: <div className="fade-in-out">thinking</div> }]);

    try {
      const url = chatId ? `${API_BASE_URL}/chats/${chatId}/messages` : `${API_BASE_URL}/chats`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let modelMessage: Message = { text: '', sender: 'model', timestamp: new Date().toISOString() };
        
        // Replace "thinking" placeholder with the actual message
        setCurrentChatMessages(prevMessages => [...prevMessages.slice(0, -1), modelMessage]);

        const read = async () => {
          const { done, value } = await reader.read();
          if (done) {
            if (!chatId) {
              // If it was a new chat, we need to get the new chat info
              // The full chat object is returned from the create_chat endpoint
              const finalChat: FullChat = JSON.parse(modelMessage.text);
              setChats(prevChats => [...prevChats, { id: finalChat.id, title: finalChat.title, timestamp: finalChat.timestamp }]);
              setCurrentChatMessages(finalChat.messages);
              router.push(`/chat/${finalChat.id}`);
            }
            fetchChats(); // Update chat list after streaming is complete
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          modelMessage.text += chunk;
          setCurrentChatMessages(prevMessages => [...prevMessages.slice(0, -1), { ...modelMessage }]);
          read();
        };
        read();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update
      setCurrentChatMessages(prevMessages => prevMessages.filter(msg => msg !== userMessage && msg.text !== 'thinking'));
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
