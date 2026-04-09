'use client';
import { FileQuestion, MessageSquare, Search, Upload, Brain, Sparkles } from 'lucide-react';

export function EmptyState({ type, onAction, actionLabel }) {
  const states = {
    conversations: {
      icon: MessageSquare,
      title: 'No conversations yet',
      description: 'Start a new conversation by typing a message below or uploading a document.',
      color: 'from-blue-500 to-cyan-500',
    },
    documents: {
      icon: Upload,
      title: 'No documents yet',
      description: 'Upload a PDF, DOCX, or TXT file to start chatting with your documents.',
      color: 'from-emerald-500 to-teal-500',
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search terms or filters.',
      color: 'from-amber-500 to-orange-500',
    },
    chat: {
      icon: Sparkles,
      title: 'Ready to help you learn',
      description: 'Upload a document or start typing to begin your conversation with AI.',
      color: 'from-emerald-500 to-teal-500',
    },
    upload: {
      icon: Upload,
      title: 'Drag & drop files here',
      description: 'or click to browse your files',
      color: 'from-violet-500 to-purple-500',
    },
  };

  const state = states[type] || states.chat;
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`w-20 h-20 mb-6 bg-gradient-to-br ${state.color} rounded-2xl flex items-center justify-center shadow-lg transform rotate-3`}>
        <Icon className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{state.title}</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">{state.description}</p>
      {onAction && (
        <button
          onClick={onAction}
          className={`px-6 py-2.5 bg-gradient-to-r ${state.color} text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="relative mb-8">
        <div className="w-28 h-28 mx-auto bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 transform -rotate-6">
          <Brain className="w-14 h-14 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 rotate-12">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Welcome to Nerd</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
        Your AI study assistant. Upload documents to chat with them, or start a free-form conversation.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">PDF, DOCX, TXT support</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">Multi-language voice</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">Smart citations</span>
        </div>
      </div>
    </div>
  );
}
