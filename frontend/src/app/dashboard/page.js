'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DocumentViewer from '@/components/DocumentViewer';
import Chat from '@/components/Chat';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { DashboardSkeleton } from '@/components/Skeleton';
import { useTheme } from '@/context/ThemeContext';
import { Sparkles, Keyboard } from 'lucide-react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { toggleDarkMode } = useTheme();
  const router = useRouter();
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [highlightedText, setHighlightedText] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleDarkMode]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) return null;

  return (
    <div className="h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex overflow-hidden">
      <Sidebar 
        onSelectConversation={(id) => { setActiveConversation(id); setSidebarOpen(false); }}
        onSelectDocument={(doc) => { setActiveDocuments(doc ? [doc] : []); setSidebarOpen(false); }}
        activeConversation={activeConversation}
        activeDocument={activeDocuments[0]}
        sidebarRefresh={sidebarRefresh}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="flex-1 flex relative">
        <div className="w-1/2 border-r border-slate-200 dark:border-slate-700">
          <DocumentViewer 
            documents={activeDocuments}
            onDocumentsChange={setActiveDocuments}
            highlightedText={highlightedText}
            onSidebarRefresh={setSidebarRefresh}
          />
        </div>
        
        <div className="w-1/2">
          <Chat 
            conversationId={activeConversation}
            documentId={activeDocuments[0]?._id}
            onNewConversation={setActiveConversation}
            onHighlightCitation={setHighlightedText}
          />
        </div>

        <button
          onClick={() => setShowShortcuts(true)}
          className="absolute bottom-4 right-4 p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 group"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
        </button>

        <KeyboardShortcutsModal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </main>
    </div>
  );
}
