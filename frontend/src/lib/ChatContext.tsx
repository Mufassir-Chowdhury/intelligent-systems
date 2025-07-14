'use client';

import { createContext, useContext, useState, ReactNode, FormEvent, KeyboardEvent } from 'react';

interface Message {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

interface ChatContextType {
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: () => void;
  handleFormSubmit: (e: FormEvent) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
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

    setMessages(prevMessages => [...prevMessages, userMessage, assistantMessage]);
    setNewMessage('');
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ChatContext.Provider value={{ messages, newMessage, setNewMessage, sendMessage, handleFormSubmit, handleKeyDown }}>
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
