'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ChatProvider, useChat } from '@/lib/ChatContext';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Plus, X } from "lucide-react";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { useParams } from 'next/navigation';

import { useEffect } from 'react';

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const chatId = params.id as string | null;
  const { chats, newMessage, setNewMessage, handleFormSubmit, handleKeyDown, fetchChats, deleteChat } = useChat();

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return (
    <div className="flex h-screen text-lg">
      <aside className="w-72 bg-gray-100 p-4 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Chat History</h2>
            <Link href="/">
                <Button variant="ghost" size="icon">
                    <Plus className="h-6 w-6" />
                </Button>
            </Link>
        </div>
        <ul>
            {chats.map(chat => (
                <li key={chat.id} className="mb-2">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Link href={`/chat/${chat.id}`} className="flex-grow">
                            <p className="font-semibold overflow-clip">{chat.title}</p>
                            <p className="text-sm text-gray-500">{chat.timestamp}</p>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => deleteChat(chat.id)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </li>
            ))}
        </ul>
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="text-3xl font-semibold text-center m-8">
          Intelligent Systems
        </header>
        {children}
        <form onSubmit={(e) => handleFormSubmit(e, chatId)} className="border m-6 mx-16 rounded-lg dark:border-gray-800">
          <div className="relative flex flex-col">
            <Textarea
              placeholder="Type your message..."
              className="min-h-[120px] max-h-[200px] w-full resize-none border-0 bg-transparent text-lg p-4 pr-20 focus-visible:ring-0"
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, chatId)}
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ChatProvider>
          <ChatLayout>{children}</ChatLayout>
        </ChatProvider>
      </body>
    </html>
  );
}
