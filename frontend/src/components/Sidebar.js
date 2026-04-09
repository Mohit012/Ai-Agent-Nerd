'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { conversationAPI, documentAPI } from '@/lib/api';
import { FolderOpen, FileText, Trash2, Plus, User, Search, X, Edit3, Share2, Copy, Check, LogOut, Sparkles, Menu, PanelLeftClose, PanelRightClose } from 'lucide-react';
import Link from 'next/link';

export default function Sidebar({ onSelectConversation, onSelectDocument, activeConversation, activeDocument, sidebarRefresh, isOpen, onClose }) {
  const { logout, user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [convFolders, setConvFolders] = useState({});
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [showFolderMenu, setShowFolderMenu] = useState(null);
  const [sharingItem, setSharingItem] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isOpen !== undefined) {
      setMobileOpen(isOpen);
    }
  }, [isOpen]);

  const handleClose = () => {
    setMobileOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadData();
  }, [sidebarRefresh]);

  const loadData = async () => {
    try {
      const [convData, docData] = await Promise.all([
        conversationAPI.getAll(),
        documentAPI.getAll()
      ]);
      setConversations(convData);
      setDocuments(docData);
      const folders = {};
      convData.forEach(c => {
        if (c.folder && c.folder !== 'Default') {
          folders[c.folder] = true;
        }
      });
      setConvFolders(folders);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const allTags = [...new Set(documents.flatMap(d => d.tags || []))];

  const filteredDocuments = documents.filter(doc => {
    const matchesTag = selectedTags.length === 0 || selectedTags.some(tag => doc.tags?.includes(tag));
    const matchesSearch = !searchQuery || doc.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || conv.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'All' || conv.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    await conversationAPI.delete(id);
    setConversations(conversations.filter(c => c._id !== id));
  };

  const handleDeleteDocument = async (e, id) => {
    e.stopPropagation();
    await documentAPI.delete(id);
    setDocuments(documents.filter(d => d._id !== id));
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleRenameConversation = async (id) => {
    if (!editTitle.trim()) return;
    try {
      await conversationAPI.rename(id, editTitle);
      setConversations(conversations.map(c => c._id === id ? { ...c, title: editTitle } : c));
      setEditingConvId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  const handleRenameDocument = async (id) => {
    if (!editTitle.trim()) return;
    try {
      await documentAPI.rename(id, editTitle);
      setDocuments(documents.map(d => d._id === id ? { ...d, originalName: editTitle } : d));
      setEditingDocId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error renaming document:', error);
    }
  };

  const handleFolderChange = async (convId, folder) => {
    try {
      await conversationAPI.updateFolder(convId, folder);
      setConversations(conversations.map(c => c._id === convId ? { ...c, folder } : c));
      setShowFolderMenu(null);
    } catch (error) {
      console.error('Error updating folder:', error);
    }
  };

  const handleShareConversation = async (conv) => {
    try {
      const res = await conversationAPI.share(conv._id);
      setSharingItem({ type: 'conversation', id: conv._id, title: conv.title });
      setShareUrl(res.shareUrl);
    } catch (error) {
      console.error('Error sharing conversation:', error);
    }
  };

  const handleShareDocument = async (doc) => {
    try {
      const res = await documentAPI.share(doc._id);
      setSharingItem({ type: 'document', id: doc._id, title: doc.originalName });
      setShareUrl(res.shareUrl);
    } catch (error) {
      console.error('Error sharing document:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeShareModal = () => {
    setSharingItem(null);
    setShareUrl('');
    setCopied(false);
  };

  return (
    <>
      <div className={`bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-xl fixed lg:static inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out ${collapsed ? 'w-0 lg:w-16 overflow-hidden' : 'w-72'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={`p-5 border-b border-slate-200 dark:border-slate-700 ${collapsed ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Nerd</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">AI Study Companion</p>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute top-1/2 -translate-y-1/2 z-50 p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-all ${collapsed ? 'left-64 lg:left-14' : 'left-64'}`}
        >
          {collapsed ? (
            <PanelRightClose className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          )}
        </button>

        <div className={`p-3 ${collapsed ? 'hidden' : ''}`}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        <div className={`px-3 flex gap-1 ${collapsed ? 'hidden' : ''}`}>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === 'conversations' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Chats
            </div>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === 'documents' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Docs
            </div>
          </button>
        </div>

        {activeTab === 'conversations' && !collapsed && (
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {['All', 'Default', ...Object.keys(convFolders)].map(folder => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                  selectedFolder === folder 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {folder}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'documents' && allTags.length > 0 && !collapsed && (
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {allTags.slice(0, 6).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${
                  selectedTags.includes(tag) 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 font-medium transition-all duration-200"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className={`flex-1 overflow-y-auto p-3 space-y-1 ${collapsed ? 'hidden' : ''}`}>
          {activeTab === 'conversations' ? (
            filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <div
                  key={conv._id}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
                    activeConversation === conv._id 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center min-w-0" onClick={() => onSelectConversation(conv._id)}>
                    <FolderOpen className="w-4 h-4 mr-3 flex-shrink-0" />
                    {editingConvId === conv._id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRenameConversation(conv._id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameConversation(conv._id)}
                        className="flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white min-w-0"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium truncate" title={conv.title}>{conv.title.length > 30 ? conv.title.slice(0, 30) + '...' : conv.title}</span>
                    )}
                  </div>
                  <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 transition-opacity ${activeConversation === conv._id ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareConversation(conv); }}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingConvId(conv._id); setEditTitle(conv.title); }}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFolderMenu(conv._id); }}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Move to folder"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv._id)}
                      className="p-1.5 hover:bg-rose-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {showFolderMenu === conv._id && (
                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 p-2 min-w-[160px] overflow-hidden">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-1.5">Move to folder:</p>
                      {['Default', 'Study', 'Work'].map(folder => (
                        <button
                          key={folder}
                          onClick={() => handleFolderChange(conv._id, folder)}
                          className="block w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200"
                        >
                          {folder}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">No documents found</p>
              </div>
            ) : (
              filteredDocuments.map(doc => (
                <div
                  key={doc._id}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
                    activeDocument?._id === doc._id 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center min-w-0" onClick={() => onSelectDocument(doc)}>
                    <FileText className="w-4 h-4 mr-3 flex-shrink-0" />
                    {editingDocId === doc._id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRenameDocument(doc._id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameDocument(doc._id)}
                        className="flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white min-w-0"
                        autoFocus
                      />
                    ) : (
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate" title={doc.originalName}>{doc.originalName.length > 30 ? doc.originalName.slice(0, 30) + '...' : doc.originalName}</span>
                        {doc.estimatedReadTime && (
                          <span className="text-xs opacity-70">{doc.estimatedReadTime} min read</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 transition-opacity ${activeDocument?._id === doc._id ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareDocument(doc); }}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingDocId(doc._id); setEditTitle(doc.originalName); }}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDocument(e, doc._id); }}
                      className="p-1.5 hover:bg-rose-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        <div className={`p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 ${collapsed ? 'hidden' : ''}`}>
          <button
            onClick={() => onSelectConversation(null)}
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30 transition-all duration-200 font-medium mb-4"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
          <div className="flex items-center justify-between">
            <Link href="/profile" className="flex items-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-xl transition-colors flex-1">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{user?.name}</span>
            </Link>
            <button onClick={logout} className="p-2.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={handleClose}
        />
      )}

      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-4 left-4 z-50 lg:hidden p-3 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-colors lg:hidden"
        title="Toggle sidebar"
      >
        {mobileOpen ? <PanelLeftClose className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {sharingItem && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Share {sharingItem.type}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Anyone with this link can view</p>
              </div>
              <button onClick={closeShareModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sharingItem.title}</p>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-4 py-3 text-sm bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 ${
                  copied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-200'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
