'use client';

import { createContext, useContext, useState, ReactNode, FormEvent, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

interface Chat {
    id: string;
    title: string;
    messages: Message[];
    timestamp: string;
}

interface ChatContextType {
  chats: Chat[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: (chatId: string | null) => void;
  handleFormSubmit: (e: FormEvent, chatId: string | null) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, chatId: string | null) => void;
  getChatById: (chatId: string) => Chat | undefined;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const router = useRouter();

  const getChatById = (chatId: string) => chats.find(chat => chat.id === chatId);

  const sendMessage = (chatId: string | null) => {
    if (newMessage.trim() === '') return;

    const userMessage: Message = {
      text: newMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
    };

    const assistantMessage: Message = {
        text: newMessage,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
    }

    if (chatId) {
        setChats(prevChats => prevChats.map(chat => {
            if (chat.id === chatId) {
                return {
                    ...chat,
                    messages: [...chat.messages, userMessage, assistantMessage],
                    timestamp: new Date().toLocaleTimeString(),
                }
            }
            return chat;
        }));
    } else {
        const newChatId = Date.now().toString();
        const newChat: Chat = {
            id: newChatId,
            title: newMessage,
            messages: [userMessage, assistantMessage],
            timestamp: new Date().toLocaleTimeString(),
        }
        setChats(prevChats => [...prevChats, newChat]);
        router.push(`/chat/${newChatId}`);
    }

    setNewMessage('');
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
    <ChatContext.Provider value={{ chats, newMessage, setNewMessage, sendMessage, handleFormSubmit, handleKeyDown, getChatById }}>
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
