import React, { useState, useEffect } from 'react';
import { QuizQuestion, QuizAnswer } from '../types';
import { BrainCircuit, Check, ArrowRight, ArrowLeft, X, Sparkles } from 'lucide-react';

interface QuizModalProps {
  questions: QuizQuestion[];
  onComplete: (answers: QuizAnswer[]) => void;
  onUpdate: (answers: QuizAnswer[]) => void; // New prop for syncing
  onSkip: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ questions, onComplete, onUpdate, onSkip }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Store answers keyed by questionId to allow back/forward navigation with persistence
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIndex];
  const selectedOption = answersMap[currentQuestion?.id] || null;

  // Sync parent whenever answersMap changes
  useEffect(() => {
    const currentAnswers: QuizAnswer[] = questions
      .filter(q => answersMap[q.id]) // Only include answered questions
      .map(q => ({
        questionId: q.id,
        questionText: q.question,
        selectedOption: answersMap[q.id]
      }));
    onUpdate(currentAnswers);
  }, [answersMap, questions, onUpdate]);

  const handleOptionSelect = (option: string) => {
    if (!currentQuestion) return;
    setAnswersMap(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const handleNext = () => {
    if (!selectedOption) return;

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finish: Transform map to ordered array
      const finalAnswers: QuizAnswer[] = questions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        selectedOption: answersMap[q.id]
      }));
      onComplete(finalAnswers);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!currentQuestion) return null;

  const isDynamic = currentQuestion.source === 'dynamic';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-1 overflow-hidden animate-in zoom-in-95 duration-300 transition-all">
        
        {/* Progress Bar (Dynamic: Just shows current relative to known total) */}
        <div className="h-1 w-full bg-slate-800 rounded-t-3xl overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl transition-colors ${isDynamic ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {isDynamic ? <Sparkles size={24} /> : <BrainCircuit size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isDynamic ? "New Insight Found" : "Help me organize"}
              </h2>
              <p className="text-sm text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <button 
              onClick={onSkip} 
              className="ml-auto text-slate-500 hover:text-white text-xs uppercase font-bold tracking-wider px-3 py-1 hover:bg-slate-800 rounded transition-colors"
            >
              Skip
            </button>
          </div>

          <h3 className="text-lg text-slate-200 font-medium mb-6 leading-relaxed min-h-[3.5rem] animate-in slide-in-from-right-4 fade-in duration-300 key={currentQuestion.id}">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={`${currentQuestion.id}-${idx}`}
                onClick={() => handleOptionSelect(option)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group
                  ${selectedOption === option 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-750'
                  }
                `}
              >
                <span>{option}</span>
                {selectedOption === option && <Check size={18} className="animate-in fade-in zoom-in" />}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              disabled={currentIndex === 0}
              className={`
                px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                ${currentIndex === 0 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }
              `}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            
            <button
              onClick={handleNext}
              disabled={!selectedOption}
              className="flex-1 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {currentIndex === questions.length - 1 ? 'Finish & Analyze' : 'Next Question'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};