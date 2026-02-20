
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Music, 
  Search, 
  Loader2, 
  XCircle, 
  Sparkles, 
  Send,
  ArrowRight,
  Info,
  ExternalLink,
  Disc,
  Clock,
  Trash2,
  ChevronDown,
  Zap,
  Waves,
  MicVocal,
  CheckCircle2,
} from 'lucide-react';
import { TermsModal, PrivacyModal, ContactModal } from './components/LegalModals';
import { SongDetails, GeneratedResult, AppState } from './types';
import * as gemini from './services/geminiService';
import * as usage from './services/usageService';
import * as history from './services/historyService';
import { Button, Card, Input, SectionTitle, CopyBlock, Badge } from './components/UIComponents';

// Floating music particles for background
const MusicParticles = () => {
  const notes = ['♪', '♫', '♬', '♩', '🎵', '🎶'];
  const particles = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      note: notes[i % notes.length],
      left: `${8 + (i * 12)}%`,
      delay: `${i * 1.2}s`,
      duration: `${6 + (i % 4) * 2}s`,
    }))
  , []);

  return (
    <div className="bg-aurora">
      {particles.map((p, i) => (
        <span
          key={i}
          className="music-particle text-purple-400/30"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          {p.note}
        </span>
      ))}
    </div>
  );
};

// Analysis progress steps
const AnalysisProgress = () => {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: Search, label: '情報収集中', desc: 'レビュー・評論を検索...' },
    { icon: Waves, label: '楽曲構造を解析中', desc: 'BPM・コード・構成を分析...' },
    { icon: Zap, label: 'プロンプト構築中', desc: 'Suno AI用に最適化...' },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 2500),
      setTimeout(() => setStep(2), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {/* Step indicators */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div 
              key={i} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                isActive ? 'glass-card scale-105' : isDone ? 'opacity-50' : 'opacity-20'
              }`}
            >
              <div className={`p-2 rounded-lg transition-all ${
                isActive ? 'bg-purple-500/20' : 'bg-slate-800/50'
              }`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>{s.label}</p>
                <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>{s.desc}</p>
              </div>
              {isActive && (
                <div className="ml-auto">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.IDLE);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<SongDetails[]>([]);
  const [songDetails, setSongDetails] = useState<SongDetails | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [usageLocked, setUsageLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'lyrics'>('prompt');
  const [historyItems, setHistoryItems] = useState<history.HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [refineStep, setRefineStep] = useState(0);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [showRefineSuccess, setShowRefineSuccess] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load usage count + history on mount
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const status = await usage.hasRemainingUses();
        setRemainingUses(status.remaining);
        setUsageLocked(!status.allowed);
      } catch (e) {
        console.error('Usage check failed:', e);
        setRemainingUses(null);
        setUsageLocked(false);
      }
    };
    loadUsage();
    setHistoryItems(history.getHistory());
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setCurrentState(AppState.SEARCHING);
    setErrorMsg('');
    setCandidates([]);
    
    try {
      const results = await gemini.searchSongs(searchQuery);
      if (results.length === 0) {
        throw new Error("No songs found");
      } else if (results.length === 1) {
        setSongDetails(results[0]);
        setCurrentState(AppState.CONFIRMING);
      } else {
        setCandidates(results);
        setCurrentState(AppState.SELECTING);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("曲が見つかりませんでした。アーティスト名を含めるなど、詳しく入力してください。");
      setCurrentState(AppState.IDLE);
    }
  };

  const selectCandidate = (song: SongDetails) => {
    setSongDetails(song);
    setCurrentState(AppState.CONFIRMING);
  };

  const handleConfirm = async () => {
    if (!songDetails) return;
    
    if (usageLocked) {
      setErrorMsg('利用上限に達しました。');
      return;
    }
    
    setCurrentState(AppState.ANALYZING);
    
    try {
      const genResult = await gemini.analyzeAndGenerate(songDetails);
      setResult(genResult);
      setCurrentState(AppState.RESULTS);
      
      // Save to history
      history.saveToHistory(songDetails, genResult);
      setHistoryItems(history.getHistory());
      
      // Increment usage
      try {
        const newCount = await usage.incrementUsage();
        const remaining = Math.max(0, usage.MAX_USES - newCount);
        setRemainingUses(remaining);
        if (remaining <= 0) setUsageLocked(true);
      } catch (e) {
        console.error('Usage tracking failed:', e);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("分析に失敗しました。もう一度お試しください。");
      setCurrentState(AppState.CONFIRMING);
    }
  };

  const handleCancel = () => {
    setSongDetails(null);
    setCandidates([]);
    setResult(null);
    setCurrentState(AppState.IDLE);
    setSearchQuery('');
    setActiveTab('prompt');
  };

  const handleBackToSelect = () => {
    if (candidates.length > 0) {
      setCurrentState(AppState.SELECTING);
    } else {
      handleCancel();
    }
  };

  const handleRefine = async () => {
    if (!refinementInput.trim() || !result) return;

    setIsRefining(true);
    setRefineStep(0);
    const oldInput = refinementInput;
    setRefineInstruction(oldInput);
    setRefinementInput('');

    // Progress steps simulation
    const stepTimers = [
      setTimeout(() => setRefineStep(1), 1500),
      setTimeout(() => setRefineStep(2), 4000),
    ];

    try {
      const refined = await gemini.refineResult(result, oldInput);
      stepTimers.forEach(clearTimeout);
      const newResult = { ...result, ...refined };
      setResult(newResult);

      // Update history with refined result
      if (songDetails) {
        history.saveToHistory(songDetails, newResult);
        setHistoryItems(history.getHistory());
      }

      try {
        const newCount = await usage.incrementUsage();
        const remaining = Math.max(0, usage.MAX_USES - newCount);
        setRemainingUses(remaining);
        if (remaining <= 0) setUsageLocked(true);
      } catch (e) {
        console.error('Usage tracking failed:', e);
      }

      // Show success toast
      setIsRefining(false);
      setShowRefineSuccess(true);
      setTimeout(() => setShowRefineSuccess(false), 3000);
    } catch (e) {
      stepTimers.forEach(clearTimeout);
      console.error(e);
      setRefinementInput(oldInput);
      setRefineInstruction('');
      setIsRefining(false);
      setErrorMsg("調整に失敗しました。もう一度お試しください。");
    }
  };

  const loadFromHistory = (item: history.HistoryItem) => {
    setSongDetails(item.song);
    setResult(item.result);
    setCurrentState(AppState.RESULTS);
    setShowHistory(false);
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    history.deleteHistoryItem(id);
    setHistoryItems(history.getHistory());
  };

  useEffect(() => {
    if (currentState === AppState.RESULTS) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result, currentState]);

  return (
    <div className="min-h-screen text-slate-200 pb-20 relative">
      <MusicParticles />

      {/* Header */}
      <header className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-xl shadow-lg shadow-purple-500/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">musicseed</h1>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase">AI Music Prompt Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentState !== AppState.IDLE && (
              <button 
                onClick={handleCancel}
                className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                リセット
              </button>
            )}
            {remainingUses !== null && (
              <Badge variant={remainingUses <= 10 ? 'warning' : 'default'}>
                残り {remainingUses} 回
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10 relative z-10">
        
        {/* ===== IDLE: Search ===== */}
        {currentState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] animate-fade-in">
            {/* Hero */}
            <div className="w-full max-w-lg text-center mb-10">

              <h2 className="hero-title text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
                参考にする<br className="sm:hidden" />楽曲は？
              </h2>
              <p className="hero-subtitle text-slate-400 text-sm sm:text-base leading-relaxed">
                楽曲を徹底分析し、Suno AI に最適なプロンプトとオリジナル歌詞を生成します
              </p>
            </div>

            {/* Search input */}
            <div className="w-full max-w-xl relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
              <div className="relative flex">
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="例: Blinding Lights / The Weeknd"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
                <button 
                  onClick={handleSearch}
                  aria-label="検索"
                  className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white p-2.5 rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 active:scale-95"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="mt-5 animate-fade-in-down">
                <p className="text-red-400 bg-red-400/10 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </p>
              </div>
            )}

            {/* History section */}
            {historyItems.length > 0 && (
              <div className="w-full max-w-xl mt-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-3"
                >
                  <Clock className="w-4 h-4" />
                  最近の生成履歴
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                </button>
                {showHistory && (
                  <div className="space-y-2 animate-fade-in-down stagger-children">
                    {historyItems.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="w-full glass-card !p-3 rounded-xl flex items-center justify-between group hover:border-purple-500/20 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 bg-purple-500/10 rounded-lg shrink-0">
                            <Disc className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{item.song.title}</p>
                            <p className="text-xs text-slate-500 truncate">{item.song.artist}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-600">
                            {new Date(item.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteHistory(e, item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all"
                            aria-label="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== SEARCHING ===== */}
        {currentState === AppState.SEARCHING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-15 animate-pulse" />
              <Search className="w-12 h-12 text-purple-400 animate-bounce-subtle relative z-10" />
            </div>
            <h3 className="text-xl font-semibold text-white mt-6">楽曲を検索中...</h3>
            <p className="text-sm text-slate-500 mt-2">Google検索で楽曲情報を収集しています</p>
          </div>
        )}

        {/* ===== SELECTING ===== */}
        {currentState === AppState.SELECTING && (
          <div className="flex flex-col items-center animate-fade-in-up w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">楽曲を選択</h2>
              <p className="text-sm text-slate-400">正しい楽曲をタップしてください</p>
            </div>
            <div className="grid gap-3 w-full max-w-lg stagger-children">
              {candidates.map((song, idx) => (
                <button
                  key={idx}
                  onClick={() => selectCandidate(song)}
                  className="glass-card !p-4 rounded-xl text-left transition-all group hover:border-purple-500/30 active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors truncate">{song.title}</h3>
                      <p className="text-slate-300 text-sm">{song.artist}</p>
                    </div>
                    {song.year && (
                      <span className="text-xs bg-slate-900/80 text-slate-400 px-2 py-0.5 rounded-md shrink-0">{song.year}</span>
                    )}
                  </div>
                  {song.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-1">{song.description}</p>
                  )}
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={handleCancel} className="mt-6">キャンセル</Button>
          </div>
        )}

        {/* ===== CONFIRMING ===== */}
        {currentState === AppState.CONFIRMING && songDetails && (
          <div className="flex flex-col items-center animate-scale-in">
            <Card className="w-full max-w-lg border-purple-500/20 animate-pulse-glow">
              <div className="text-center mb-8">
                <div className="inline-flex p-3 bg-purple-500/10 rounded-2xl mb-4">
                  <MicVocal className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">この曲で合っていますか？</h3>
                <h2 className="text-2xl font-bold text-white mb-1">{songDetails.title}</h2>
                <p className="text-lg text-slate-300">{songDetails.artist}</p>
                {songDetails.year && (
                  <span className="inline-block mt-3 px-3 py-1 bg-slate-900/60 rounded-full text-xs text-slate-400 border border-slate-700/30">
                    {songDetails.year}
                  </span>
                )}
                {songDetails.description && (
                  <p className="mt-4 text-sm text-slate-400 italic leading-relaxed">"{songDetails.description}"</p>
                )}
              </div>

              {errorMsg && (
                <p className="text-red-400 bg-red-400/10 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 mb-4">
                  <XCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </p>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleBackToSelect}>いいえ、戻る</Button>
                <Button onClick={handleConfirm}>
                  <Sparkles className="w-4 h-4" />
                  分析する
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ===== ANALYZING ===== */}
        {currentState === AppState.ANALYZING && (
          <AnalysisProgress />
        )}

        {/* ===== RESULTS ===== */}
        {result && (currentState === AppState.RESULTS) && (
          <div className="space-y-6 animate-fade-in-up relative">

            {/* Refining overlay */}
            {isRefining && (
              <div className="absolute inset-0 z-30 flex items-start justify-center pt-24 rounded-2xl">
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm rounded-2xl" />
                <div className="relative glass-card !p-6 rounded-2xl text-center space-y-4 max-w-xs animate-scale-in shadow-2xl shadow-purple-900/40">
                  <div className="relative w-14 h-14 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600 via-purple-500 to-fuchsia-500 animate-spin-slow opacity-30 blur-md" />
                    <div className="absolute inset-1.5 rounded-full bg-slate-900/90 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-1">アレンジ適用中...</h4>
                    <p className="text-xs text-slate-400">
                      {refineStep === 0 && '指示を解析しています'}
                      {refineStep === 1 && 'プロンプトと歌詞を調整中'}
                      {refineStep === 2 && '最終仕上げ中...'}
                    </p>
                  </div>
                  <p className="text-[11px] text-purple-300/70 italic px-2 line-clamp-2">
                    「{refineInstruction}」
                  </p>
                  <div className="flex gap-1.5 justify-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${
                        i <= refineStep ? 'w-8 bg-purple-500' : 'w-4 bg-slate-700'
                      }`} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Success toast */}
            {showRefineSuccess && (
              <div className="sticky top-20 z-40 flex justify-center animate-fade-in-down">
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-sm shadow-lg shadow-emerald-900/20 backdrop-blur-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">アレンジが完了しました</span>
                </div>
              </div>
            )}
            
            {/* Song info badge */}
            {songDetails && (
              <div className="text-center animate-fade-in-down">
                <div className="inline-flex items-center gap-2 py-2 rounded-full glass-card !p-2 !px-4 text-sm">
                  <Disc className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white">{songDetails.title}</span>
                  <span className="text-slate-500">—</span>
                  <span className="text-slate-300">{songDetails.artist}</span>
                </div>
              </div>
            )}

            {/* Insight */}
            {result.reasoning && (
              <Card className="border-indigo-500/20 !bg-indigo-950/20">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                    <Info className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-indigo-300 mb-1 text-sm">分析インサイト</h4>
                    <p className="text-sm text-indigo-100/70 leading-relaxed">{result.reasoning}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-800/50 gap-6">
              <button 
                onClick={() => setActiveTab('prompt')}
                className={`pb-3 text-sm font-medium transition-all ${activeTab === 'prompt' ? 'tab-active' : 'tab-inactive'}`}
              >
                <span className="flex items-center gap-2">
                  <Disc className="w-4 h-4" />
                  スタイルプロンプト
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('lyrics')}
                className={`pb-3 text-sm font-medium transition-all ${activeTab === 'lyrics' ? 'tab-active' : 'tab-inactive'}`}
              >
                <span className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  歌詞
                </span>
              </button>
            </div>

            {/* Tab content */}
            <div className="animate-fade-in" key={activeTab}>
              {activeTab === 'prompt' && (
                <Card>
                  <SectionTitle icon={Disc}>Suno スタイルプロンプト</SectionTitle>
                  <div className="space-y-6">
                    <CopyBlock label="English Prompt (そのまま貼り付け)" text={result.sunoPrompt} />
                    <div className="pt-4 border-t border-slate-700/30">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">日本語訳（参考）</span>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {result.sunoPromptTranslation}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>{result.sunoPrompt.length} 文字</span>
                      <span>•</span>
                      <span>{result.sunoPrompt.length >= 700 && result.sunoPrompt.length <= 999 ? '✓ 最適な長さ' : '⚠ 長さが範囲外'}</span>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'lyrics' && (
                <Card>
                  <SectionTitle icon={Music}>オリジナル歌詞</SectionTitle>
                  <CopyBlock label="Lyrics" text={result.lyrics} />
                </Card>
              )}
            </div>

            {/* Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1.5 items-center justify-center py-2">
                <span className="text-slate-500">参照ソース:</span>
                {result.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-purple-400 transition-colors underline decoration-slate-700/50 underline-offset-2"
                  >
                    {source.title} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}

            {/* Refinement Chat */}
            <div className="sticky bottom-4 z-40" ref={bottomRef}>
              <Card className="shadow-2xl shadow-purple-900/30 border-purple-500/20 !bg-slate-900/90 backdrop-blur-2xl">
                {isRefining && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/50 animate-fade-in">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                    </div>
                    <span className="text-xs text-purple-300 font-medium">アレンジを適用中...</span>
                  </div>
                )}
                <div className="flex gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={refinementInput}
                      onChange={(e) => setRefinementInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isRefining && handleRefine()}
                      placeholder="もっとアップテンポに？歌詞を変えたい？指示を入力..."
                      disabled={isRefining}
                      className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-slate-500 py-1.5 text-sm"
                    />
                  </div>
                  <button 
                    onClick={handleRefine} 
                    disabled={isRefining || !refinementInput.trim()}
                    className="p-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-purple-500/20"
                  >
                    {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </Card>
            </div>

          </div>
        )}
      </main>

      {/* Legal Modals */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            <button onClick={() => setShowTerms(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1">利用規約</button>
            <span className="text-slate-700">|</span>
            <button onClick={() => setShowPrivacy(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1">プライバシーポリシー</button>
            <span className="text-slate-700">|</span>
            <button onClick={() => setShowContact(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1">お問い合わせ</button>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-700">© 2026 株式会社ヒトコト</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
