'use client';

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send } from "lucide-react";
import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react';

interface Message {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
  }

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-screen text-lg">
      <aside className="w-72 bg-gray-100 p-4 dark:bg-gray-800">
        <h2 className="text-2xl font-semibold">Chat History</h2>
      </aside>
      <main className="flex flex-1 flex-col">
        <div ref={chatContainerRef} className="flex-1 p-4 px-20 space-y-8 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index}>
              {msg.sender === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-2xl rounded-xl px-4 py-3 bg-primary text-white break-words">
                    <p className="text-lg">{msg.text}</p>
                    {/* <span className="text-xs text-gray-200 block text-right mt-1">{msg.timestamp}</span> */}
                  </div>
                </div>
              )}
              {msg.sender === 'assistant' && (
                <div className="flex justify-start items-start gap-3">
                  <div className="w-8 h-8 mt-2 rounded-full bg-gray-400 flex-shrink-0"></div>
                  <p className="text-lg max-w-2xl break-words">{msg.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleFormSubmit} className="border m-6 mx-16 rounded-lg dark:border-gray-800">
          <div className="relative flex flex-col">
            <Textarea
              placeholder="Type your message..."
              className="min-h-[120px] max-h-[200px] w-full resize-none border-0 bg-transparent text-lg p-4 pr-20 focus-visible:ring-0"
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute bottom-3 right-2 flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button type="submit" variant="ghost" size="icon">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}