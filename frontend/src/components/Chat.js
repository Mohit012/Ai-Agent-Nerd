'use client';
import { useState, useRef, useEffect } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside.jsx';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts.jsx';
import { chatAPI, conversationAPI } from '@/lib/api';
import { speak, stopSpeaking, setVoice, getLanguageName, getLanguageFlag, groupVoicesByLanguage } from '@/lib/tts';
import { Send, Volume2, VolumeX, Loader2, Sparkles, FileText, BookOpen, Mic, MicOff, Square, Bot, GraduationCap, Eye, Lightbulb, HelpCircle, Layers, Download, FileDown, MicVocal, User, Wand2, Globe, RotateCcw, Layers3 } from 'lucide-react';
import { WelcomeState } from '@/components/EmptyState';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import FlashcardModal from '@/components/FlashcardModal';

const VOICE_RECOGNITION_LANGS = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
  { code: 'hi-IN', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'nl-NL', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl-PL', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr-TR', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi-VN', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th-TH', name: 'ไทย', flag: '🇹🇭' },
  { code: 'id-ID', name: 'Bahasa', flag: '🇮🇩' },
];

const CHAT_MODES = [
  { id: 'assistant', name: 'Assistant', icon: Bot, description: 'Helpful study assistant', color: 'from-blue-500 to-blue-600' },
  { id: 'tutor', name: 'Tutor', icon: GraduationCap, description: 'Step-by-step explanations', color: 'from-emerald-500 to-teal-500' },
  { id: 'critic', name: 'Critic', icon: Eye, description: 'Critical analysis & review', color: 'from-rose-500 to-rose-600' },
  { id: 'explainer', name: 'Simple', icon: Lightbulb, description: 'Easy-to-understand', color: 'from-amber-500 to-amber-600' }
];

export default function Chat({ conversationId, documentId, onNewConversation, onHighlightCitation }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatMode, setChatMode] = useState('assistant');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [showMicLangSelector, setShowMicLangSelector] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [recognitionLang, setRecognitionLang] = useState(VOICE_RECOGNITION_LANGS[0]);
  const [flashcardsContent, setFlashcardsContent] = useState(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamingRef = useRef({});
  const stopRef = useRef(null);
  const modeSelectorRef = useClickOutside(() => setShowModeSelector(false));
  const exportRef = useClickOutside(() => setShowExportMenu(false));
  const voiceSelectorRef = useClickOutside(() => setShowVoiceSelector(false));
  const micLangSelectorRef = useClickOutside(() => setShowMicLangSelector(false));

  useKeyboardShortcuts({
    onCtrlEnter: () => {
      if (input.trim() && !loading) {
        handleSend();
      }
    },
    onCtrlN: () => {
      if (onNewConversation) {
        onNewConversation(null);
      }
    },
    onCtrlK: () => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.focus();
    },
    onEscape: () => {
      setShowModeSelector(false);
      setShowExportMenu(false);
      setShowVoiceSelector(false);
      setShowMicLangSelector(false);
    }
  });

  useEffect(() => {
    if (conversationId) {
      loadConversation();
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          setInput(transcript);
        };

        recognitionRef.current.onend = () => {
          setListening(false);
        };
      }
    }
  }, []);

  useEffect(() => {
    const loadTTSVoices = () => {
      const ttsVoices = window.speechSynthesis?.getVoices() || [];
      setVoices(ttsVoices);
      const englishVoice = ttsVoices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || ttsVoices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        setSelectedVoiceName(englishVoice.name);
      } else if (ttsVoices.length > 0) {
        setSelectedVoiceName(ttsVoices[0].name);
      }
    };

    loadTTSVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadTTSVoices);
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadTTSVoices);
    };
  }, []);

  const handleVoiceChange = (voiceName) => {
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      setVoice(voice);
      setSelectedVoiceName(voiceName);
      setShowVoiceSelector(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const conv = await conversationAPI.getOne(conversationId);
      setMessages(conv.messages);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setError(null);
    setLastUserMessage(input.trim());
    
    setFollowUpQuestions([]);
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setIsStreaming(true);

    const tempId = Date.now();
    streamingRef.current[tempId] = '';
    
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', isStreaming: true, tempId }
    ]);

    try {
      await chatAPI.sendMessage(userMessage, conversationId, documentId, chatMode, (token) => {
        streamingRef.current[tempId] += token;
        setMessages(prev => prev.map(m => 
          m.tempId === tempId ? { ...m, content: streamingRef.current[tempId] } : m
        ));
      }, stopRef).then(res => {
        setIsStreaming(false);
        if (res.followUpQuestions && res.followUpQuestions.length > 0) {
          setFollowUpQuestions(res.followUpQuestions);
        }
      });

      const finalMessage = streamingRef.current[tempId];
      const citationRegex = /\[CITATION: ([^\]]+)\]/g;
      const citations = [];
      let match;
      while ((match = citationRegex.exec(finalMessage)) !== null) {
        citations.push(match[1].trim());
      }
      const cleanedContent = finalMessage.replace(citationRegex, '').trim();

      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, isStreaming: false, content: cleanedContent, citations } : m
      ));

      if (citations.length > 0 && onHighlightCitation) {
        onHighlightCitation(citations[0]);
      }

      delete streamingRef.current[tempId];

      if (!conversationId) {
        const conv = await conversationAPI.getAll();
        if (conv.length > 0) {
          onNewConversation(conv[0]._id);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.name === 'AbortError' || error.message === 'Request stopped') {
        setMessages(prev => prev.map(m => 
          m.tempId === tempId ? { ...m, isStreaming: false } : m
        ));
      } else {
        setMessages(prev => prev.filter(m => m.tempId !== tempId));
        if (error.message?.includes('Not authorized') || error.message?.includes('token')) {
          setError('Session expired. Please login again.');
          setTimeout(() => window.location.href = '/login', 2000);
        } else {
          setError('Failed to send message. Please try again.');
        }
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRegenerate = async () => {
    if (!lastUserMessage || loading) return;

    const lastAssistantIdx = messages.findLastIndex(m => m.role === 'assistant' && !m.isStreaming);
    if (lastAssistantIdx !== -1) {
      setMessages(prev => prev.slice(0, lastAssistantIdx));
    }
    setInput(lastUserMessage);
    setTimeout(() => handleSend(), 100);
  };

  const handleSpeak = (text) => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text);
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), text.length * 50);
    }
  };

  const stopStreaming = () => {
    if (stopRef.current) {
      stopRef.current.abort('Request stopped');
      stopRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
  };

  const handleSummarize = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await chatAPI.summarize(documentId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.summary }]);
    } catch (error) {
      console.error('Error summarizing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await chatAPI.generateNotes(documentId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.notes }]);
    } catch (error) {
      console.error('Error generating notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await chatAPI.generateQuiz(documentId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.quiz }]);
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await chatAPI.generateFlashcards(documentId);
      setFlashcardsContent(res.flashcards);
      setShowFlashcards(true);
    } catch (error) {
      console.error('Error generating flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition not supported in this browser');
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.lang = recognitionLang.code;
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (e) {
        recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = recognitionLang.code;
        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          setInput(transcript);
        };
        recognitionRef.current.onend = () => {
          setListening(false);
        };
        recognitionRef.current.start();
        setListening(true);
      }
    }
  };

  const handleFollowUpClick = (question) => {
    setInput(question);
    setFollowUpQuestions([]);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const exportAsMarkdown = () => {
    const md = messages.map(m => {
      const role = m.role === 'user' ? '**You**' : '**Assistant**';
      return `${role}:\n${m.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    const text = messages.map(m => {
      const role = m.role === 'user' ? 'You:' : 'Assistant:';
      return `${role} ${m.content}`;
    }).join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMode = CHAT_MODES.find(m => m.id === chatMode);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">Chat</h2>
            <div className="relative" ref={modeSelectorRef}>
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r ${currentMode?.color} text-white rounded-full hover:shadow-lg hover:shadow-current/20 transition-all duration-200`}
              >
                {currentMode && <currentMode.icon className="w-4 h-4" />}
                {currentMode?.name}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showModeSelector && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 min-w-[220px] overflow-hidden">
                  {CHAT_MODES.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setChatMode(mode.id);
                        setShowModeSelector(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${chatMode === mode.id ? 'bg-gradient-to-r ' + mode.color + ' text-white' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-md`}>
                        <mode.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{mode.name}</p>
                        <p className={`text-xs ${chatMode === mode.id ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{mode.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <div className="relative" ref={voiceSelectorRef}>
              <button
                onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                className="p-2.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Voice Settings"
              >
                <MicVocal className="w-4 h-4" />
              </button>
              {showVoiceSelector && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 min-w-[280px] overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Select Voice</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {(() => {
                      const groupedVoices = groupVoicesByLanguage(voices);
                      return groupedVoices.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Loading voices...</p>
                      ) : (
                        groupedVoices.map((group) => (
                          <div key={group.lang}>
                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {getLanguageFlag(group.lang)} {getLanguageName(group.lang)}
                              </p>
                            </div>
                            {group.voices.map((voice) => (
                              <button
                                key={voice.name}
                                onClick={() => handleVoiceChange(voice.name)}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${selectedVoiceName === voice.name ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}
                              >
                                {voice.name}
                              </button>
                            ))}
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            {messages.length > 0 && (
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title="Export Chat"
                >
                  <Download className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 min-w-[180px] overflow-hidden">
                    <button
                      onClick={() => { exportAsMarkdown(); setShowExportMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <FileDown className="w-4 h-4 text-emerald-500" /> Markdown (.md)
                    </button>
                    <button
                      onClick={() => { exportAsText(); setShowExportMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-emerald-500" /> Text (.txt)
                    </button>
                  </div>
                )}
              </div>
            )}
            {documentId && (
              <>
                <button
                  onClick={handleRegenerate}
                  disabled={loading || !lastUserMessage}
                  className="p-2.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSummarize}
                  disabled={loading}
                  className="p-2.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  title="Summarize Document"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGenerateNotes}
                  disabled={loading}
                  className="p-2.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  title="Generate Notes"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={loading}
                  className="p-2.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  title="Generate Quiz"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGenerateFlashcards}
                  disabled={loading}
                  className="p-2.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  title="Review Flashcards"
                >
                  <Layers3 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {messages.length === 0 && <WelcomeState />}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-emerald-500 to-teal-500' 
                : 'bg-gradient-to-br from-blue-500 to-purple-500'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`px-5 py-3 rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-br-md' 
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'
              }`}>
                {msg.role === 'assistant' && !msg.isStreaming ? (
                  <div className="leading-relaxed">
                    <MarkdownRenderer content={msg.content} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block ml-1">
                        <svg className="animate-spin h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    )}
                  </p>
                )}
              </div>
              {!msg.isStreaming && msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 ml-2 max-w-xs">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Sources:</p>
                  <div className="space-y-1">
                    {msg.citations.map((citation, i) => (
                      <button
                        key={i}
                        onClick={() => onHighlightCitation && onHighlightCitation(citation)}
                        className="block w-full text-left px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-sm transition-all truncate text-slate-700 dark:text-slate-200"
                      >
                        "{citation.slice(0, 80)}{citation.length > 80 ? '...' : ''}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!msg.isStreaming && msg.role === 'assistant' && msg.content && (
                <button
                  onClick={() => handleSpeak(msg.content)}
                  className="mt-2 ml-2 p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && messages.every(m => !m.isStreaming) && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {followUpQuestions.length > 0 && !loading && (
        <div className="px-6 pb-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">Suggested follow-ups:</p>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleFollowUpClick(question)}
                className="text-sm px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-full hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-sm transition-all"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            className="flex-1 p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
            rows={2}
          />
          <div className="relative" ref={micLangSelectorRef}>
            <button
              onClick={toggleVoiceSearch}
              className={`p-4 rounded-xl transition-all duration-200 ${listening ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              title={listening ? 'Stop listening' : 'Voice search'}
            >
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMicLangSelector(!showMicLangSelector); }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              title="Voice language"
            >
              {recognitionLang.flag}
            </button>
            {showMicLangSelector && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 w-48 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 font-medium">Voice Language</p>
                  {VOICE_RECOGNITION_LANGS.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setRecognitionLang(lang);
                        setShowMicLangSelector(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        recognitionLang.code === lang.code 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="p-4 bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all"
              title="Stop generating"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <FlashcardModal
        isOpen={showFlashcards}
        onClose={() => setShowFlashcards(false)}
        flashcardsContent={flashcardsContent}
      />

      </div>
  );
}
