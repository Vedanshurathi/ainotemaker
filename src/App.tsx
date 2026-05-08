import React, { useState } from 'react';
import { generateNotes, generateDiagram, generateAudioExplanation, generateQuiz, TopperNotes, NoteStyle, QuizQuestion } from './services/geminiService';
import { Search, Loader2, Sparkles, Download, ArrowLeft, RefreshCw, Zap, Image as ImageIcon, BookOpen, Layers, Volume2, Square, Headphones, FileQuestion, CheckCircle2, XCircle, ChevronRight, PlayCircle, Bookmark, Trash2, Library as LibraryIcon, Clock, Star, Send, MessageSquare, Trophy, TrendingUp, Target, BarChart3, Timer, Pause } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('10');
  const [style, setStyle] = useState<NoteStyle>('balanced');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<TopperNotes | null>(null);
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Quiz State
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Update timer every second
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Sync timer with library when stopped or notes change
  const syncTimerWithLibrary = () => {
    if (!notes || timerSeconds === 0) return;
    
    const updated = savedLibrary.map(item => {
      if (item.notes.title === notes.title) {
        return { ...item, totalStudiedSeconds: item.totalStudiedSeconds + timerSeconds };
      }
      return item;
    });
    
    setSavedLibrary(updated);
    localStorage.setItem('topper_notes_library', JSON.stringify(updated));
    setTimerSeconds(0);
  };

  const toggleTimer = () => {
    if (isTimerRunning) {
      syncTimerWithLibrary();
    }
    setIsTimerRunning(!isTimerRunning);
  };

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Library State
  const [savedLibrary, setSavedLibrary] = useState<{ 
    id: string; 
    notes: TopperNotes; 
    grade: string; 
    diagramUrl: string | null; 
    date: string;
    isCompleted: boolean;
    lastQuizScore?: { score: number; total: number };
    totalStudiedSeconds: number;
  }[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  const filteredLibrary = savedLibrary.filter(item => 
    item.notes.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
    item.notes.content.toLowerCase().includes(librarySearch.toLowerCase())
  );

  React.useEffect(() => {
    const saved = localStorage.getItem('topper_notes_library');
    if (saved) {
      try {
        setSavedLibrary(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load library");
      }
    }
  }, []);

  const saveToLibrary = () => {
    if (!notes) return;
    const newItem = {
      id: Date.now().toString(),
      notes,
      grade,
      diagramUrl,
      date: new Date().toLocaleDateString(),
      isCompleted: false,
      totalStudiedSeconds: timerSeconds
    };
    const updated = [newItem, ...savedLibrary];
    setSavedLibrary(updated);
    localStorage.setItem('topper_notes_library', JSON.stringify(updated));
    setTimerSeconds(0); // Reset after saving to library
  };

  const toggleCompletion = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = savedLibrary.map(item => {
      if (item.id === id) return { ...item, isCompleted: !item.isCompleted };
      return item;
    });
    setSavedLibrary(updated);
    localStorage.setItem('topper_notes_library', JSON.stringify(updated));
  };

  const deleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedLibrary.filter(item => item.id !== id);
    setSavedLibrary(updated);
    localStorage.setItem('topper_notes_library', JSON.stringify(updated));
  };

  const loadFromLibrary = (item: any) => {
    syncTimerWithLibrary();
    setNotes(item.notes);
    setGrade(item.grade);
    setDiagramUrl(item.diagramUrl);
    setShowLibrary(false);
    setShowQuiz(false);
    setIsPlaying(false);
    setAudioUrl(null);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    
    // Reset Feedback
    setFeedbackRating(0);
    setFeedbackComment('');
    setIsFeedbackSubmitted(false);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackRating === 0) return;
    
    setIsSubmittingFeedback(true);
    // Mocking an API call to save feedback
    setTimeout(() => {
      setIsFeedbackSubmitted(true);
      setIsSubmittingFeedback(false);
    }, 800);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!topic.trim()) return;

    syncTimerWithLibrary();
    setLoading(true);
    setError(null);
    setNotes(null);
    setDiagramUrl(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setShowQuiz(false);
    setQuizQuestions([]);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    
    // Reset Feedback
    setFeedbackRating(0);
    setFeedbackComment('');
    setIsFeedbackSubmitted(false);

    try {
      const generatedNotes = await generateNotes(topic, grade, style);
      setNotes(generatedNotes);
      
      const url = await generateDiagram(generatedNotes.imagePrompt, grade);
      setDiagramUrl(url);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while generating notes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAudioExplain = async () => {
    if (!notes) return;
    if (audioUrl) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    setAudioLoading(true);
    try {
      const url = await generateAudioExplanation(notes.content, grade);
      setAudioUrl(url);
      if (url) {
        setTimeout(() => {
          audioRef.current?.play();
          setIsPlaying(true);
        }, 100);
      }
    } catch (err) {
      console.error("Audio failed", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!notes) return;
    setShowQuiz(true);
    setQuizLoading(true);
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsQuizFinished(false);
    setSelectedOption(null);

    try {
      const questions = await generateQuiz(notes.content, grade);
      setQuizQuestions(questions);
    } catch (err) {
      console.error("Quiz failed", err);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    if (index === quizQuestions[currentQuestionIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
    } else {
      setIsQuizFinished(true);
      // Update score in library if this topic is saved
      if (notes) {
        const updated = savedLibrary.map(item => {
          if (item.notes.title === notes.title) {
            return {
              ...item,
              lastQuizScore: { score: score + (selectedOption === quizQuestions[currentQuestionIndex].correctAnswer ? 1 : 0), total: quizQuestions.length }
            };
          }
          return item;
        });
        setSavedLibrary(updated);
        localStorage.setItem('topper_notes_library', JSON.stringify(updated));
      }
    }
  };

  const styles: { id: NoteStyle, label: string, icon: any, desc: string }[] = [
    { id: 'balanced', label: 'Balanced', icon: Layers, desc: 'Mixed theory & facts' },
    { id: 'formulas', label: 'Formulas', icon: Zap, desc: 'Exam math focus' },
    { id: 'visual', label: 'Visual', icon: ImageIcon, desc: 'Concept diagrams' },
    { id: 'simple', label: 'Simple', icon: BookOpen, desc: 'Easy analogies' },
  ];

  const handleReset = () => {
    syncTimerWithLibrary();
    setTopic('');
    setNotes(null);
    setDiagramUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <AnimatePresence mode="wait">
        {!notes && !loading && !showLibrary ? (
          <motion.main 
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto px-6 pt-32 pb-20 flex flex-col items-center text-center"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest border-b-2 border-indigo-800 shadow-sm">
                <Sparkles className="w-3 h-3" />
                School Prep Pro
              </div>
              {savedLibrary.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowProgress(true)}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest border-b-2 border-emerald-800 shadow-sm hover:shadow-md transition-all"
                  >
                    <TrendingUp className="w-3 h-3" />
                    My Progress
                  </button>
                  <button
                    onClick={() => setShowLibrary(true)}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-indigo-600 text-[10px] font-bold uppercase tracking-widest border border-indigo-100 shadow-sm hover:bg-slate-50 transition-all"
                  >
                    <LibraryIcon className="w-3 h-3" />
                    My Library ({savedLibrary.length})
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-800 tracking-tight mb-8 leading-[1.1] relative">
              <span className="relative z-10">Smart</span>{' '}
              <span className="text-indigo-600 relative z-10">
                Revision
                <svg className="absolute -bottom-2 -left-2 w-full h-4 text-indigo-200 -z-10" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M5,15 Q50,5 95,15" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
                </svg>
              </span> <br />
              <span className="sketch-highlight">Grades 7–12.</span>
            </h1>
            <p className="text-slate-500 max-w-xl mb-12 text-lg font-medium italic relative">
              Generate topper-style notes with AI audio explanations for any topic.
              <span className="absolute -top-12 -right-8 text-indigo-400 opacity-20 transform rotate-12 select-none pointer-events-none hidden md:block">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <path d="M10,10 Q60,0 110,10 Q120,60 110,110 Q60,120 10,110 Q0,60 10,10" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" fill="none" />
                </svg>
              </span>
            </p>

            <div className="w-full max-w-2xl mb-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 text-left ml-2">Choose Your Grade</p>
              <div className="flex flex-wrap justify-between gap-2 p-2 bg-slate-100 rounded-2xl border border-slate-200">
                {['7', '8', '9', '10', '11', '12'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={`flex-1 min-w-[3rem] py-2.5 rounded-xl font-bold transition-all ${
                      grade === g
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group mb-8">
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic (e.g., Light Reflection, Carbon Compounds...)"
                className="w-full h-16 pl-6 pr-16 rounded-2xl border-2 border-slate-200 bg-white focus:border-indigo-600 outline-none transition-all text-lg shadow-sm group-hover:shadow-md"
              />
              <button 
                type="submit"
                className="absolute right-3 top-3 bottom-3 aspect-square bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                <Search className="w-6 h-6" />
              </button>
            </form>

            <div className="w-full max-w-2xl mb-12">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 text-left ml-2">Select Note Style</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {styles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all group ${
                      style === s.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'
                    }`}
                  >
                    <s.icon className={`w-5 h-5 ${style === s.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-tighter leading-none">{s.label}</p>
                      <p className="text-[9px] opacity-60 mt-1 whitespace-nowrap">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="mb-6 text-red-500 font-bold uppercase text-[10px] tracking-widest">{error}</p>
            )}

            <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
              {['Refraction', 'Electric Current', 'Metals & Non-metals'].map(sugg => (
                <button
                  key={sugg}
                  onClick={() => setTopic(sugg)}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-sm font-bold uppercase tracking-tighter"
                >
                  {sugg}
                </button>
              ))}
            </div>
          </motion.main>
        ) : showLibrary ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-5xl mx-auto px-6 pt-24 pb-20"
          >
            <div className="flex items-center justify-between mb-12">
              <button 
                onClick={() => setShowLibrary(false)}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold uppercase text-xs tracking-widest group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Search
              </button>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight italic">Personal <span className="text-indigo-600">Library</span></h2>
            </div>

            <div className="mb-8 relative max-w-xl">
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search through your study notes..."
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500 shadow-sm transition-all text-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              {librarySearch && (
                <button 
                  onClick={() => setLibrarySearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {filteredLibrary.length === 0 ? (
              <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                <LibraryIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                  {librarySearch ? "No matches found for your search." : "No saved notes yet."}
                </p>
                {!librarySearch && (
                  <button
                    onClick={() => setShowLibrary(false)}
                    className="mt-6 text-indigo-600 font-bold text-sm underline underline-offset-4"
                  >
                    Start generating to build your library
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLibrary.map((item) => (
                  <motion.div
                    layoutId={item.id}
                    key={item.id}
                    onClick={() => loadFromLibrary(item)}
                    className="group bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded">Class {item.grade}</span>
                      <button 
                        onClick={(e) => deleteFromLibrary(item.id, e)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors bg-white rounded-lg border border-slate-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-2 truncate group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{item.notes.title}</h3>
                    <div className="flex items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.date}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : showProgress ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-6xl mx-auto px-6 pt-24 pb-20"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 px-4">
              <div className="space-y-2">
                <button 
                  onClick={() => setShowProgress(false)}
                  className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold uppercase text-[10px] tracking-widest group mb-4"
                >
                  <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                  Back
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight leading-none">Learning <span className="text-indigo-600 italic">Dashboard</span></h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Class {grade} Academics</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-2xl">
                    {savedLibrary.filter(i => i.isCompleted).length}
                  </div>
                  <div className="pr-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastered</p>
                    <p className="text-xs font-bold text-slate-700">Topics Done</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {[
                { 
                  label: 'Global Accuracy', 
                  value: `${Math.round(savedLibrary.reduce((acc, curr) => acc + (curr.lastQuizScore ? (curr.lastQuizScore.score / curr.lastQuizScore.total) * 100 : 0), 0) / (savedLibrary.filter(i => i.lastQuizScore).length || 1))}%`,
                  icon: Target, 
                  color: 'text-indigo-600', 
                  bg: 'bg-indigo-50' 
                },
                { 
                  label: 'Total Sessions', 
                  value: savedLibrary.length, 
                  icon: BookOpen, 
                  color: 'text-emerald-600', 
                  bg: 'bg-emerald-50' 
                },
                { 
                  label: 'Study Time', 
                  value: (() => {
                    const totalSecs = savedLibrary.reduce((acc, curr) => acc + curr.totalStudiedSeconds, 0);
                    const hours = Math.floor(totalSecs / 3600);
                    const mins = Math.floor((totalSecs % 3600) / 60);
                    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                  })(), 
                  icon: Clock, 
                  color: 'text-blue-600', 
                  bg: 'bg-blue-50' 
                },
                { 
                  label: 'Library Mastery', 
                  value: `${Math.round((savedLibrary.filter(i => i.isCompleted).length / (savedLibrary.length || 1)) * 100)}%`, 
                  icon: BarChart3, 
                  color: 'text-orange-600', 
                  bg: 'bg-orange-50' 
                }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                  <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity`} />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`mb-4 p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <h4 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">{stat.value}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl p-8 md:p-12 mb-12">
              <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                <Target className="w-5 h-5 text-rose-500" />
                Areas for Improvement
              </h3>
              {savedLibrary.filter(item => item.lastQuizScore && (item.lastQuizScore.score / item.lastQuizScore.total) < 0.7).length > 0 ? (
                <div className="space-y-4">
                  {savedLibrary.filter(item => item.lastQuizScore && (item.lastQuizScore.score / item.lastQuizScore.total) < 0.7).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-6 bg-rose-50 rounded-2xl border border-rose-100">
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-tight">{item.notes.title}</h4>
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1">
                          Score: {item.lastQuizScore?.score}/{item.lastQuizScore?.total} — Focus on this topic
                        </p>
                      </div>
                      <button 
                        onClick={() => loadFromLibrary(item)}
                        className="px-4 py-2 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-200 hover:bg-rose-100 transition-all font-bold"
                      >
                        Re-Study
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">You're doing great! No weak areas identified yet.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl p-8 md:p-12">
              <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                <Layers className="w-5 h-5 text-indigo-600" />
                Topic Performance Archive
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {savedLibrary.map((item) => (
                  <div key={item.id} className="group p-6 rounded-3xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {item.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.notes.title}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.date}
                          </span>
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {Math.floor(item.totalStudiedSeconds / 60)}m
                          </span>
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Class {item.grade}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      {item.lastQuizScore ? (
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Quiz</p>
                          <p className={`text-sm font-bold ${item.lastQuizScore.score / item.lastQuizScore.total >= 0.8 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {item.lastQuizScore.score}/{item.lastQuizScore.total} Correct
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 px-3 py-1 rounded-lg">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No Quiz Done</p>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => toggleCompletion(item.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          item.isCompleted 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
                        }`}
                      >
                        {item.isCompleted ? 'Mastered ✓' : 'Mark Done'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50 px-6 text-center"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
              <div className="absolute inset-0 blur-2xl bg-indigo-400 opacity-20 -z-10" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-slate-800 uppercase tracking-widest italic">Curating your path to 100...</h2>
            <p className="mt-2 text-slate-500 font-medium">Applying toppers' logic and scientific clarity.</p>
          </motion.div>
        ) : notes && (
          <motion.div 
            key="notes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-5xl mx-auto px-6 py-12"
          >
            <div className="flex items-center justify-between mb-8 no-print">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold uppercase text-xs tracking-widest group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Change Topic
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  onClick={handleAudioExplain}
                  disabled={audioLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all ${
                    isPlaying 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                  } disabled:opacity-50`}
                >
                  {audioLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isPlaying ? (
                    <Square className="w-3 h-3 fill-current" />
                  ) : (
                    <Headphones className="w-3 h-3" />
                  )}
                  {audioLoading ? 'Preparing Audio...' : isPlaying ? 'Stop Audio' : 'Audio Explanation'}
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  onClick={toggleTimer}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all ${
                    isTimerRunning
                      ? 'bg-amber-50 text-amber-600 border border-amber-100'
                      : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-white'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
                  {isTimerRunning ? 'Stop Timer' : 'Start Study Timer'}
                  {timerSeconds > 0 && (
                    <span className="ml-1 opacity-60">
                      ({Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')})
                    </span>
                  )}
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  onClick={startQuiz}
                  className="flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all"
                >
                  <FileQuestion className="w-3 h-3" />
                  Test Knowledge
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  onClick={() => {
                    const libItem = savedLibrary.find(i => i.notes.title === notes.title);
                    if (libItem) toggleCompletion(libItem.id);
                    else saveToLibrary();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all ${
                    savedLibrary.some(item => item.notes.title === notes.title && item.isCompleted)
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-white'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {savedLibrary.some(item => item.notes.title === notes.title && item.isCompleted) ? 'Mastered' : 'Mark Done'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <audio 
                  ref={audioRef} 
                  src={audioUrl ?? undefined} 
                  onEnded={() => setIsPlaying(false)}
                  className="hidden" 
                />
                <button 
                  onClick={saveToLibrary}
                  disabled={savedLibrary.some(item => item.notes.title === notes.title)}
                  className={`p-2.5 rounded-full border transition-all ${
                    savedLibrary.some(item => item.notes.title === notes.title)
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                  title="Save to Library"
                >
                  <Bookmark className={`w-5 h-5 ${savedLibrary.some(item => item.notes.title === notes.title) ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={handleSubmit}
                  className="p-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-white transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform"
                >
                  <Download className="w-4 h-4" />
                  Save as PDF
                </button>
              </div>
            </div>

            <article id="notes-content" className="bg-white border-2 border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <header className="bg-slate-50 border-b-2 border-indigo-600 p-8 flex justify-between items-end">
                <div>
                  <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">Class {grade} | Board Prep</span>
                  <h1 className="text-4xl font-extrabold text-slate-800 mt-3 tracking-tight">{notes.title}</h1>
                </div>
                <div className="text-right text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1 flex flex-col items-end">
                  <span>Smart Revision Notes</span>
                  <span className="text-indigo-600">Chapter Insights</span>
                </div>
              </header>

              <div className="p-8 md:p-12 lg:p-16 flex-1 bg-slate-50/50">
                {diagramUrl && (
                  <div className="mb-12">
                    <button 
                      onClick={() => setIsDiagramModalOpen(true)}
                      className="w-full text-left rounded-[2.5rem] overflow-hidden bg-white border border-slate-200 group p-2 cursor-zoom-in relative shadow-sm"
                    >
                      <div className="relative aspect-video flex items-center justify-center bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100">
                        <img 
                          src={diagramUrl ?? undefined} 
                          alt="Scientific Diagram" 
                          className="max-h-full object-contain mix-blend-multiply group-hover:scale-[1.02] transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">View Full Detail</span>
                        </div>
                      </div>
                      <p className="text-center text-[10px] text-slate-400 my-4 font-bold uppercase tracking-[0.3em] italic">
                        Conceptual Illustration: {notes.title}
                      </p>
                    </button>
                  </div>
                )}

                <div className="space-y-8">
                  {notes.content.split(/(?=## )/).filter(Boolean).map((section, idx) => (
                    <motion.section
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="prose prose-slate max-w-none 
                        prose-headings:text-slate-800 prose-headings:tracking-tight
                        prose-h2:text-2xl prose-h2:font-black prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b-2 prose-h2:border-indigo-50
                        prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-6
                        prose-li:text-slate-600 prose-li:mb-2
                        prose-strong:text-indigo-600 prose-strong:font-bold
                        prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic prose-blockquote:text-slate-700
                        prose-table:border prose-table:border-slate-200 prose-table:rounded-xl prose-table:overflow-hidden
                        prose-th:bg-slate-50 prose-th:p-4 prose-th:text-xs prose-th:font-black prose-th:uppercase prose-th:tracking-widest
                        prose-td:p-4 prose-td:text-sm prose-td:border-t prose-td:border-slate-100"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section}</ReactMarkdown>
                      </div>
                    </motion.section>
                  ))}
                </div>
              </div>

              <footer className="bg-slate-900 text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] whitespace-nowrap">Summary</span>
                  <div className="flex gap-6 overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Level</span>
                      <span className="text-xs font-bold text-emerald-400 uppercase">Board Ready</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Mode</span>
                      <span className="text-xs font-bold text-amber-400 uppercase">Exam Focused</span>
                    </div>
                  </div>
                </div>
                <div className="text-right pl-6 border-l border-slate-700">
                  <p className="text-[9px] italic text-slate-500 uppercase tracking-widest">Authored by</p>
                  <p className="font-extrabold text-sm tracking-tight text-white leading-tight">Vedanshu Rathi</p>
                  <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-tighter mt-0.5">CEO & Founder, Kishan Suraksha AI</p>
                </div>
              </footer>

              {/* Feedback Section */}
              <div className="bg-slate-50 border-t border-slate-100 p-8 md:p-12 no-print">
                <div className="max-w-2xl mx-auto">
                  <AnimatePresence mode="wait">
                    {!isFeedbackSubmitted ? (
                      <motion.div
                        key="feedback-form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="bg-indigo-100 p-2 rounded-xl">
                            <MessageSquare className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-800 tracking-tight">Help improve these notes</h4>
                            <p className="text-xs text-slate-500 font-medium italic">Your feedback trains our AI to be a better study companion.</p>
                          </div>
                        </div>

                        <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                          <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate the accuracy & clarity</p>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onMouseEnter={() => !feedbackRating && setFeedbackRating(star)}
                                  onMouseLeave={() => !feedbackRating && setFeedbackRating(0)}
                                  onClick={() => setFeedbackRating(star)}
                                  className="transition-transform hover:scale-110"
                                >
                                  <Star 
                                    className={`w-8 h-8 ${
                                      (feedbackRating || 0) >= star 
                                        ? 'fill-amber-400 text-amber-400' 
                                        : 'text-slate-200'
                                    }`} 
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optional Comments</p>
                            <textarea
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                              placeholder="What could be better? (e.g., more diagrams needed, explain X more simply...)"
                              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none transition-all resize-none h-32 text-sm text-slate-600"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={feedbackRating === 0 || isSubmittingFeedback}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale"
                          >
                            {isSubmittingFeedback ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            {isSubmittingFeedback ? 'Submitting...' : 'Send Feedback'}
                          </button>
                        </form>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="feedback-success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-6"
                      >
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-1 tracking-tight">Feedback Received!</h4>
                        <p className="text-sm text-slate-500 italic">Thank you for helping us build better tools for students.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </article>

            {/* Diagram Lightbox */}
            <AnimatePresence>
              {isDiagramModalOpen && diagramUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDiagramModalOpen(false)}
                  className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12 cursor-zoom-out no-print"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative max-w-7xl w-full bg-white rounded-[2.5rem] p-4 md:p-8 shadow-2xl overflow-hidden shadow-indigo-500/20"
                  >
                    <button 
                      onClick={() => setIsDiagramModalOpen(false)}
                      className="absolute top-6 right-6 z-10 p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                    <div className="bg-slate-50 rounded-[1.5rem] p-4 md:p-8 flex items-center justify-center">
                      <img 
                        src={diagramUrl} 
                        alt="Enlarged Diagram" 
                        className="max-h-[80vh] w-auto object-contain mix-blend-multiply"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="mt-6 text-center">
                      <h4 className="text-xl font-bold text-slate-800 tracking-tight">{notes.title}</h4>
                      <p className="text-xs text-indigo-600 font-black uppercase tracking-widest mt-1">Detailed Scientific Illustration</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quiz Section */}
            <AnimatePresence>
              {showQuiz && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-12 bg-white border-2 border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl no-print"
                >
                  {quizLoading ? (
                    <div className="flex flex-col items-center py-12">
                      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Generating Quiz...</p>
                    </div>
                  ) : isQuizFinished ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h2 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">Quiz Completed!</h2>
                      <p className="text-slate-500 text-lg mb-8">You scored <span className="text-indigo-600 font-black">{score}</span> out of <span className="font-bold">{quizQuestions.length}</span></p>
                      <button
                        onClick={startQuiz}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : quizQuestions.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                        <div className="h-1.5 flex-1 mx-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-500" 
                            style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-slate-400 font-bold text-xs">Score: {score}</span>
                      </div>

                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-tight italic">
                        {quizQuestions[currentQuestionIndex].question}
                      </h3>

                      <div className="grid grid-cols-1 gap-3 mb-8">
                        {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                          const isCorrect = idx === quizQuestions[currentQuestionIndex].correctAnswer;
                          const isSelected = selectedOption === idx;
                          
                          let cardClasses = "p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between ";
                          if (selectedOption === null) {
                            cardClasses += "border-slate-100 hover:border-indigo-200 hover:bg-slate-50 cursor-pointer";
                          } else {
                            if (isCorrect) {
                              cardClasses += "border-emerald-500 bg-emerald-50 text-emerald-900";
                            } else if (isSelected) {
                              cardClasses += "border-rose-500 bg-rose-50 text-rose-900";
                            } else {
                              cardClasses += "border-slate-100 opacity-50";
                            }
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleOptionSelect(idx)}
                              disabled={selectedOption !== null}
                              className={cardClasses}
                            >
                              <span className="font-medium">{option}</span>
                              {selectedOption !== null && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                              {selectedOption !== null && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {selectedOption !== null && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mb-8"
                        >
                          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Explanation</p>
                            <p className="text-slate-600 text-sm leading-relaxed">{quizQuestions[currentQuestionIndex].explanation}</p>
                          </div>
                          <button
                            onClick={nextQuestion}
                            className="mt-6 w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                          >
                            {currentQuestionIndex === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promotional Footer */}
      <section className="mt-40 border-t border-slate-200 bg-white py-32 no-print relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
        
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-12 xl:col-span-7 space-y-10">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute -inset-4 bg-indigo-500/10 rounded-[2.5rem] blur-xl animate-pulse" />
                  <img 
                    src="input_file_4.png" 
                    alt="Kishan Suraksha AI Logo" 
                    className="w-28 h-28 rounded-[2rem] shadow-2xl border-4 border-white object-cover relative z-10" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-3 rounded-full shadow-lg z-20">
                    <Sparkles className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <div>
                  <h3 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter leading-none mb-3">Kishan Suraksha AI</h3>
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-0.5 bg-indigo-600" />
                    <p className="text-indigo-600 font-black text-xs uppercase tracking-[0.5em]">Future of Agriculture</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-8 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-24 h-24 text-indigo-600" />
                  </div>
                  <p className="text-slate-700 leading-relaxed text-xl italic relative z-10">
                    "<span className="text-slate-900 font-bold not-italic">Vedanshu Rathi</span> is pioneering the future of Indian agriculture as the <span className="text-indigo-600 font-black uppercase text-sm tracking-[0.2em] not-italic">CEO & Founder</span> of Kishan Suraksha AI."
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-xl mt-1">
                      <Zap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Advanced AI Systems</p>
                      <p className="text-xs text-slate-500">Transforming farming with intelligence.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-2 rounded-xl mt-1">
                      <BookOpen className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Tech Workshops</p>
                      <p className="text-xs text-slate-500">Empowering communities with knowledge.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-4">
                <a 
                  href="https://play.google.com/store/apps/details?id=app.kishanai.android" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-indigo-700 hover:-translate-y-1 transition-all shadow-2xl shadow-indigo-200 group"
                >
                  <Download className="w-5 h-5 group-hover:animate-bounce" />
                  Get it on Play Store
                </a>
                <button className="px-12 py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                  Visit Website
                </button>
              </div>
            </div>

            <div className="lg:col-span-12 xl:col-span-5 relative group">
              <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/20 via-emerald-500/20 to-amber-500/20 rounded-full blur-[100px] opacity-70 group-hover:opacity-100 transition duration-1000" />
              <div className="relative bg-white p-3 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden group-hover:scale-[1.02] transition-transform duration-700">
                <img 
                  src="input_file_1.png" 
                  alt="Founder Business Card" 
                  className="rounded-[2.5rem] w-full" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-10">
                  <div className="text-white">
                    <p className="text-xs font-black uppercase tracking-[0.3em] mb-1">Contact Vedanshu</p>
                    <p className="text-sm font-medium opacity-80 italic">Available for AI training & consulting</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-10 -right-6 bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border-4 border-white flex items-center gap-5 max-w-xs animate-bounce-slow no-print">
                <div className="bg-indigo-600 p-3 rounded-2xl">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-sm font-bold">Innovation Leader</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-32 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">TopperNotes Pro</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Built with Passion by Vedanshu Rathi</p>
            </div>
            <div className="flex gap-12">
              {['AI Training', 'Agri-Tech', 'Web Dev'].map((tag) => (
                <span key={tag} className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors cursor-default">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
