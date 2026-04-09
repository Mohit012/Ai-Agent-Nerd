'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { sharedAPI } from '@/lib/api';
import { MessageCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SharedChatPage() {
  const params = useParams();
  const token = params.token;
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const data = await sharedAPI.getConversation(token);
        setConversation(data);
      } catch (err) {
        setError('Conversation not found or link has expired');
      } finally {
        setLoading(false);
      }
    };
    fetchConversation();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9DAA9D]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F9F6] flex flex-col items-center justify-center">
        <p className="text-xl text-red-500 mb-4">{error}</p>
        <Link href="/login" className="text-[#9DAA9D] hover:underline">Go to Nerd</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F6]">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-6 h-6 text-[#9DAA9D]" />
            <h1 className="text-xl font-bold text-[#1A2436]">{conversation.title}</h1>
          </div>
          
          <p className="text-sm text-[#6B7280] mb-4">Shared Conversation</p>

          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {conversation.messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' ? 'bg-[#9DAA9D] text-white' : 'bg-[#E8EBE8] text-[#1A2436]'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center border-t border-[#9DAA9D] pt-4">
            <Link href="/login" className="text-[#9DAA9D] hover:underline">
              Sign up on Nerd to continue this conversation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
