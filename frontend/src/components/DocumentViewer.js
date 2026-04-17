'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { documentAPI } from '@/lib/api';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Loader2, Columns, Plus, Languages, History, Highlighter, Trash2, Eye, EyeOff, Save, Link as LinkIcon, ExternalLink, FileUp } from 'lucide-react';

export default function DocumentViewer({ documents, onDocumentsChange, highlightedText, onSidebarRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [extractedTexts, setExtractedTexts] = useState({});
  const [compareMode, setCompareMode] = useState(false);
  const [translatedTexts, setTranslatedTexts] = useState({});
  const [annotations, setAnnotations] = useState({});
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedDocForAnnotation, setSelectedDocForAnnotation] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [docVersions, setDocVersions] = useState({});
  const [showVersionHistory, setShowVersionHistory] = useState(null);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [annotationColor, setAnnotationColor] = useState('yellow');
  const [savingAnnotations, setSavingAnnotations] = useState(false);
  const highlightedRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setPendingFile(file);
      setShowSizeWarning(true);
      return;
    }

    await performUpload(file);
  }, [compareMode, documents, onDocumentsChange]);

  const performUpload = async (file) => {
    setShowSizeWarning(false);
    setPendingFile(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const doc = await documentAPI.upload(formData, (progress) => {
        setUploadProgress(progress);
      });
      if (compareMode) {
        onDocumentsChange([...documents, doc]);
      } else {
        onDocumentsChange([doc]);
        setCompareMode(false);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadAnyway = () => {
    if (pendingFile) {
      performUpload(pendingFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false,
    maxSize: MAX_FILE_SIZE
  });

  const handleImportFromUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL');
      return;
    }

    let url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setImportingUrl(true);
    setUrlError('');

    try {
      const doc = await documentAPI.importFromUrl(url);
      onDocumentsChange([doc]);
      setShowUrlInput(false);
      setUrlInput('');
      if (onSidebarRefresh) {
        onSidebarRefresh(prev => prev + 1);
      }
    } catch (error) {
      setUrlError(error.response?.data?.message || 'Failed to import from URL');
    } finally {
      setImportingUrl(false);
    }
  };

  const loadExtractedText = async (doc) => {
    if (!doc) return;
    try {
      const docData = await documentAPI.getOne(doc._id);
      setExtractedTexts(prev => ({ ...prev, [doc._id]: docData.extractedText }));
      if (docData.versions) {
        setDocVersions(prev => ({ ...prev, [doc._id]: docData.versions }));
      }
      if (docData.annotations && docData.annotations.length > 0) {
        setAnnotations(prev => ({ ...prev, [doc._id]: docData.annotations }));
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  const loadAllExtractedTexts = async () => {
    for (const doc of documents) {
      if (!extractedTexts[doc._id]) {
        await loadExtractedText(doc);
      }
    }
  };

  useEffect(() => {
    if (highlightedText && Object.values(extractedTexts).length > 0 && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedText, extractedTexts]);

  useEffect(() => {
    if (compareMode && documents.length > 0) {
      loadAllExtractedTexts();
    }
  }, [compareMode]);

  const highlightText = (text, docId) => {
    if (!text || !extractedTexts[docId]) return text;
    
    const docText = extractedTexts[docId];
    const index = docText.indexOf(text);
    if (index === -1) return text;
    
    const before = docText.slice(0, index);
    const match = text;
    const after = docText.slice(index + text.length);
    
    return (
      <>
        {before}
        <span ref={highlightedRef} className="bg-amber-200 dark:bg-amber-700 px-1 rounded">
          {match}
        </span>
        {after}
      </>
    );
  };

  const removeDocument = (docId) => {
    const updated = documents.filter(d => d._id !== docId);
    onDocumentsChange(updated);
    setExtractedTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[docId];
      return newTexts;
    });
  };

  const handleTranslate = async (doc, targetLang = 'en') => {
    if (!extractedTexts[doc._id]) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: extractedTexts[doc._id], targetLang })
      });
      const data = await res.json();
      setTranslatedTexts(prev => ({ ...prev, [doc._id]: data.translation }));
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  const handleAnnotate = (docId) => {
    setSelectedDocForAnnotation(docId === selectedDocForAnnotation ? null : docId);
  };

  const saveAnnotation = (docId, text) => {
    setAnnotations(prev => ({
      ...prev,
      [docId]: [...(prev[docId] || []), { id: Date.now(), text, color: annotationColor, createdAt: new Date().toISOString() }]
    }));
  };

  const deleteAnnotation = (docId, annotationId) => {
    setAnnotations(prev => ({
      ...prev,
      [docId]: prev[docId].filter(a => a.id !== annotationId)
    }));
  };

  const handleSaveAnnotations = async (docId) => {
    try {
      setSavingAnnotations(true);
      await documentAPI.updateAnnotations(docId, annotations[docId] || []);
    } catch (error) {
      console.error('Error saving annotations:', error);
    } finally {
      setSavingAnnotations(false);
    }
  };

  const loadVersionHistory = async (doc) => {
    try {
      const data = await documentAPI.getVersions(doc._id);
      setDocVersions(prev => ({ ...prev, [doc._id]: data.versions }));
      setShowVersionHistory(doc._id);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const restoreToVersion = async (doc, version) => {
    try {
      setRestoringVersion(true);
      await documentAPI.restoreVersion(doc._id, version._id);
      setExtractedTexts(prev => ({ ...prev, [doc._id]: version.extractedText }));
      setShowVersionHistory(null);
    } catch (error) {
      console.error('Error restoring version:', error);
    } finally {
      setRestoringVersion(false);
    }
  };

  const renderDocumentPanel = (doc, index) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">{doc.originalName}</span>
            <div className="flex items-center gap-3 mt-1">
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex gap-1">
                  {doc.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
              )}
              {doc.wordCount > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {doc.wordCount.toLocaleString()} words
                </span>
              )}
              {doc.pageCount > 1 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                </span>
              )}
              {doc.estimatedReadTime > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ~{doc.estimatedReadTime} min read
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!compareMode && (
            <>
              <button
                onClick={() => handleAnnotate(doc._id)}
                className={`p-2.5 rounded-xl transition-all duration-200 ${selectedDocForAnnotation === doc._id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'}`}
                title="Annotate"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadVersionHistory(doc)}
                className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300"
                title="Version History"
              >
                <History className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => handleTranslate(doc)}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300"
            title="Translate"
          >
            <Languages className="w-4 h-4" />
          </button>
          <button
            onClick={() => removeDocument(doc._id)}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!extractedTexts[doc._id] ? (
        <button
          onClick={() => loadExtractedText(doc)}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30 transition-all duration-200 font-medium"
        >
          Load Document Text
        </button>
      ) : (
        <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Extracted Text</h3>
            {translatedTexts[doc._id] && (
              <button
                onClick={() => {
                  setTranslatedTexts(prev => {
                    const newTexts = { ...prev };
                    delete newTexts[doc._id];
                    return newTexts;
                  });
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                Show Original
              </button>
            )}
          </div>
          {selectedDocForAnnotation === doc._id && (
            <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add annotation..."
                  className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      saveAnnotation(doc._id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex gap-1 items-center">
                  <button onClick={() => setAnnotationColor('yellow')} className={`w-7 h-7 rounded-lg border-2 ${annotationColor === 'yellow' ? 'border-slate-800 dark:border-white' : 'border-transparent'} hover:scale-110 transition-transform`} style={{ backgroundColor: '#FDE047' }} title="Yellow" />
                  <button onClick={() => setAnnotationColor('green')} className={`w-7 h-7 rounded-lg border-2 ${annotationColor === 'green' ? 'border-slate-800 dark:border-white' : 'border-transparent'} hover:scale-110 transition-transform`} style={{ backgroundColor: '#86EFAC' }} title="Green" />
                  <button onClick={() => setAnnotationColor('blue')} className={`w-7 h-7 rounded-lg border-2 ${annotationColor === 'blue' ? 'border-slate-800 dark:border-white' : 'border-transparent'} hover:scale-110 transition-transform`} style={{ backgroundColor: '#93C5FD' }} title="Blue" />
                  <button onClick={() => setAnnotationColor('pink')} className={`w-7 h-7 rounded-lg border-2 ${annotationColor === 'pink' ? 'border-slate-800 dark:border-white' : 'border-transparent'} hover:scale-110 transition-transform`} style={{ backgroundColor: '#F9A8D4' }} title="Pink" />
                </div>
                <button
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
                >
                  {showAnnotations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => handleSaveAnnotations(doc._id)}
                disabled={savingAnnotations}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30 disabled:opacity-50 transition-all duration-200 font-medium text-sm"
              >
                {savingAnnotations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          )}
          {showAnnotations && annotations[doc._id]?.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {annotations[doc._id].map(ann => (
                <div key={ann.id} className="flex items-center justify-between text-sm p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-sm transition-shadow">
                  <span className="flex items-center gap-3">
                    <span 
                      className="w-4 h-4 rounded-lg shadow-sm" 
                      style={{ backgroundColor: ann.color === 'yellow' ? '#FDE047' : ann.color === 'green' ? '#86EFAC' : ann.color === 'blue' ? '#93C5FD' : '#F9A8D4' }}
                    ></span>
                    <span className="text-slate-700 dark:text-slate-200 truncate">{ann.text}</span>
                  </span>
                  <button
                    onClick={() => deleteAnnotation(doc._id, ann.id)}
                    className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
            {translatedTexts[doc._id] || (highlightedText ? highlightText(highlightedText, doc._id) : extractedTexts[doc._id]?.slice(0, 5000))}
          </p>
          {(extractedTexts[doc._id]?.length > 5000 || translatedTexts[doc._id]) && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
              {translatedTexts[doc._id] ? 'Translated content' : '...Text truncated'}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">
              {compareMode ? 'Compare Documents' : 'Document'}
            </h2>
            {compareMode && (
              <span className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                {documents.length}/4
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setCompareMode(!compareMode);
            }}
            className={`p-2.5 rounded-xl transition-all duration-200 ${compareMode ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
            title={compareMode ? 'Exit compare mode' : 'Compare documents'}
          >
            <Columns className="w-4 h-4" />
          </button>
        </div>
        {compareMode && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Upload multiple documents to compare them</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {documents.length === 0 ? (
          <div
            className={`h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              isDragActive 
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            {uploading ? (
              <div className="text-center w-full max-w-sm mx-auto px-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 relative">
                  <FileUp className="w-8 h-8 text-white" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-medium mb-4">Uploading your document...</p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-teal-500 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">{uploadProgress}%</p>
                {uploadError && (
                  <p className="text-rose-500 dark:text-rose-400 text-sm mt-3 font-medium">{uploadError}</p>
                )}
              </div>
            ) : showUrlInput ? (
              <div className="w-full max-w-md p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Import from URL</h3>
                  <button onClick={() => setShowUrlInput(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
                <form onSubmit={handleImportFromUrl}>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/article"
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={importingUrl}
                      className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30 disabled:opacity-50 flex items-center gap-2 font-medium transition-all duration-200"
                    >
                      {importingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Import
                    </button>
                  </div>
                  {urlError && <p className="text-rose-500 dark:text-rose-400 text-sm mt-3">{urlError}</p>}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Paste a URL to extract content from web articles, blog posts, or any webpage.</p>
                </form>
              </div>
            ) : (
              <>
                <div {...getRootProps()} className="text-center p-8">
                  <input {...getInputProps()} />
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-slate-800 dark:text-slate-100 font-semibold text-lg mb-2">Drop your document here</p>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">or click to browse files</p>
                  <div className="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg font-medium">PDF</span>
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg font-medium">DOCX</span>
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg font-medium">TXT</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full max-w-sm mx-auto px-8">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                  <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">or</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
                </div>
                <button
                  onClick={() => setShowUrlInput(true)}
                  className="mt-6 flex items-center gap-2.5 px-5 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg transition-all duration-200 font-medium group"
                >
                  <LinkIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  Import from URL
                </button>
              </>
            )}
          </div>
        ) : compareMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {documents.map((doc, index) => renderDocumentPanel(doc, index))}
            {documents.length < 4 && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[250px] ${
                  isDragActive 
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 mb-4 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                  <Plus className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Add Another Document</p>
              </div>
            )}
          </div>
        ) : (
          renderDocumentPanel(documents[0], 0)
        )}
      </div>

      {showSizeWarning && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Large File Detected</h3>
              </div>
              <button
                onClick={() => { setShowSizeWarning(false); setPendingFile(null); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-2">
              The file "{pendingFile?.name}" is larger than 10MB ({Math.round(pendingFile?.size / 1024 / 1024 * 10) / 10}MB).
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Large files may take longer to upload and process. Would you like to continue anyway?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSizeWarning(false); setPendingFile(null); }}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAnyway}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30 transition-all font-medium"
              >
                Upload Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Version History</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Restore previous versions of your document</p>
              </div>
              <button
                onClick={() => setShowVersionHistory(null)}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Current Version</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Latest</p>
              </div>
              {docVersions[showVersionHistory]?.map((version) => (
                <div key={version._id} className="p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Version {version.versionNumber}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(version.uploadedAt).toLocaleDateString()} at {new Date(version.uploadedAt).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 truncate">
                      {version.extractedText?.slice(0, 100)}...
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const doc = documents.find(d => d._id === showVersionHistory);
                      if (doc) restoreToVersion(doc, version);
                    }}
                    disabled={restoringVersion}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm rounded-xl hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30 disabled:opacity-50 transition-all duration-200 font-medium whitespace-nowrap"
                  >
                    {restoringVersion ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
