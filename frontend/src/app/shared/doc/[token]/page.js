'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { sharedAPI } from '@/lib/api';
import { FileText, Tag, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SharedDocumentPage() {
  const params = useParams();
  const token = params.token;
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const data = await sharedAPI.getDocument(token);
        setDocument(data);
      } catch (err) {
        setError('Document not found or link has expired');
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
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
            <FileText className="w-6 h-6 text-[#9DAA9D]" />
            <h1 className="text-xl font-bold text-[#1A2436]">{document.originalName}</h1>
          </div>
          
          {document.tags && document.tags.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-[#6B7280]" />
              <div className="flex gap-1">
                {document.tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-[#B8C9B8] rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-[#6B7280] mb-4">
            <span className="inline-flex items-center gap-1">
              <Eye className="w-4 h-4" /> Shared Document
            </span>
          </p>

          <div className="border-t border-[#9DAA9D] pt-4">
            <h2 className="font-semibold text-[#1A2436] mb-2">Content</h2>
            <div className="bg-[#F9F9F6] p-4 rounded-lg max-h-[500px] overflow-y-auto">
              <p className="text-sm text-[#1A2436] whitespace-pre-wrap">
                {document.extractedText?.slice(0, 10000)}
                {document.extractedText?.length > 10000 && '... (content truncated)'}
              </p>
            </div>
          </div>

          {document.annotations && document.annotations.length > 0 && (
            <div className="border-t border-[#9DAA9D] pt-4 mt-4">
              <h2 className="font-semibold text-[#1A2436] mb-2">Annotations</h2>
              <div className="space-y-2">
                {document.annotations.map((ann, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-[#F9F9F6] rounded">
                    <span 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: ann.color === 'yellow' ? '#FDE047' : ann.color === 'green' ? '#86EFAC' : ann.color === 'blue' ? '#93C5FD' : '#F9A8D4' }}
                    ></span>
                    <span className="text-sm">{ann.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[#9DAA9D] hover:underline">
              Sign up on Nerd to save and study this document
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
