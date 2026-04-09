'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, ChevronLeft, ChevronRight, BookOpen, Brain, Zap, Check, Clock, Star } from 'lucide-react';

const SM2_GRADES = {
  AGAIN: 0,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

const calculateNextReview = (card, grade) => {
  let { repetitions, easeFactor, interval } = card;
  
  if (grade < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }
  
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  
  return {
    ...card,
    repetitions,
    easeFactor,
    interval,
    nextReview: nextReview.toISOString(),
    lastReview: new Date().toISOString()
  };
};

const parseFlashcards = (content) => {
  const cards = [];
  const patterns = [
    /Q:\s*([\s\S]*?)\s*A:\s*([\s\S]*?)(?=\n\n|$)/g,
    /\*\*([^*]+)\*\*\s*([\s\S]*?)(?=\*\*|\n\n|$)/g,
    /(\d+\.\s*[^\n]+)\s*[-–]\s*([^\n]+)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let front = match[1].trim();
      let back = match[2].trim();
      
      front = front.replace(/\*\*/g, '').replace(/^#+\s*/, '');
      back = back.replace(/\*\*/g, '');
      
      if (front && back && front !== back) {
        cards.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          front,
          back,
          repetitions: 0,
          easeFactor: 2.5,
          interval: 0,
          nextReview: new Date().toISOString(),
          lastReview: null
        });
      }
    }
    if (cards.length > 0) break;
  }
  
  return cards;
};

const getDueCards = (cards) => {
  const now = new Date();
  return cards.filter(card => new Date(card.nextReview) <= now)
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
};

export default function FlashcardModal({ isOpen, onClose, flashcardsContent }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [showComplete, setShowComplete] = useState(false);
  const [mode, setMode] = useState('review');

  useEffect(() => {
    if (isOpen && flashcardsContent) {
      const parsed = parseFlashcards(flashcardsContent);
      setCards(parsed);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionStats({ reviewed: 0, correct: 0 });
      setShowComplete(false);
      setMode('review');
    }
  }, [isOpen, flashcardsContent]);

  const dueCards = getDueCards(cards);
  const currentCard = dueCards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleGrade = (grade) => {
    const updatedCard = calculateNextReview(currentCard, grade);
    
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: grade >= 3 ? prev.correct + 1 : prev.correct
    }));
    
    setIsFlipped(false);
    
    if (currentIndex < getDueCards(cards).length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
    } else {
      setShowComplete(true);
    }
  };

  const handleKeyPress = useCallback((e) => {
    if (!isOpen) return;
    
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleFlip();
    } else if (e.key === '1') {
      if (isFlipped) handleGrade(SM2_GRADES.AGAIN);
    } else if (e.key === '2') {
      if (isFlipped) handleGrade(SM2_GRADES.HARD);
    } else if (e.key === '3') {
      if (isFlipped) handleGrade(SM2_GRADES.GOOD);
    } else if (e.key === '4') {
      if (isFlipped) handleGrade(SM2_GRADES.EASY);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, isFlipped, currentCard, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (!isOpen) return null;

  if (showComplete || dueCards.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {dueCards.length === 0 ? 'All Caught Up!' : 'Session Complete!'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {dueCards.length === 0 
                ? 'No cards due for review right now. Come back later!' 
                : `You reviewed ${sessionStats.reviewed} cards`}
            </p>
            
            {sessionStats.reviewed > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{sessionStats.reviewed}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Reviewed</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-blue-500" />
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Accuracy</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setShowComplete(false);
                  setIsFlipped(false);
                }}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restart
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Flashcard Review</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Card {currentIndex + 1} of {dueCards.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Next: {new Date(currentCard.nextReview).toLocaleDateString()}</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="relative h-80 mb-6" style={{ perspective: '1000px' }}>
            <div
              onClick={handleFlip}
              className={`absolute inset-0 cursor-pointer transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
              style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              <div 
                className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 border-2 border-slate-200 dark:border-slate-600 shadow-xl"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-slate-400">
                  <BookOpen className="w-4 h-4" />
                  <span>Question</span>
                </div>
                <p className="text-xl md:text-2xl text-center text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                  {currentCard.front}
                </p>
                <div className="absolute bottom-4 text-xs text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Click or press Space to reveal</span>
                </div>
              </div>

              <div 
                className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl flex flex-col items-center justify-center p-8 border-2 border-emerald-200 dark:border-emerald-700 shadow-xl"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Answer</span>
                </div>
                <p className="text-xl md:text-2xl text-center text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            {!isFlipped ? (
              <button
                onClick={handleFlip}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Show Answer
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleGrade(SM2_GRADES.AGAIN)}
                  className="flex-1 py-4 px-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors flex flex-col items-center"
                >
                  <span className="text-lg font-bold">Again</span>
                  <span className="text-xs opacity-70">1</span>
                </button>
                <button
                  onClick={() => handleGrade(SM2_GRADES.HARD)}
                  className="flex-1 py-4 px-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex flex-col items-center"
                >
                  <span className="text-lg font-bold">Hard</span>
                  <span className="text-xs opacity-70">2</span>
                </button>
                <button
                  onClick={() => handleGrade(SM2_GRADES.GOOD)}
                  className="flex-1 py-4 px-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex flex-col items-center"
                >
                  <span className="text-lg font-bold">Good</span>
                  <span className="text-xs opacity-70">3</span>
                </button>
                <button
                  onClick={() => handleGrade(SM2_GRADES.EASY)}
                  className="flex-1 py-4 px-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex flex-col items-center"
                >
                  <span className="text-lg font-bold">Easy</span>
                  <span className="text-xs opacity-70">4</span>
                </button>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            {[...Array(Math.min(dueCards.length, 10))].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex 
                    ? 'bg-emerald-500' 
                    : i < currentIndex 
                      ? 'bg-emerald-300 dark:bg-emerald-600' 
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
            {dueCards.length > 10 && (
              <>
                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-xs text-slate-400">+{dueCards.length - 10}</span>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                Streak: {sessionStats.reviewed}
              </span>
              <span className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                EF: {currentCard.easeFactor.toFixed(1)}
              </span>
            </div>
            <span>Press 1-4 to grade • Space to flip • Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
