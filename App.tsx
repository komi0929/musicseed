
import React, { useState, useRef, useEffect } from 'react';
import { 
  Music, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Send,
  ArrowRight,
  Info,
  ExternalLink,
  ListMusic,
  Disc,
  Lock
} from 'lucide-react';
import { SongDetails, GeneratedResult, AppState } from './types';
import * as gemini from './services/geminiService';
import * as usage from './services/usageService';
import { Button, Card, Input, SectionTitle, CopyBlock } from './components/UIComponents';

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
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load usage count on mount
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const status = await usage.hasRemainingUses();
        setRemainingUses(status.remaining);
        setUsageLocked(!status.allowed);
      } catch (e) {
        console.error('Usage check failed:', e);
        // If Supabase is unavailable, allow usage
        setRemainingUses(null);
        setUsageLocked(false);
      }
    };
    loadUsage();
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
    
    // Check usage limit
    if (usageLocked) {
      setErrorMsg('利用上限に達しました。');
      return;
    }
    
    setCurrentState(AppState.ANALYZING);
    
    try {
      const genResult = await gemini.analyzeAndGenerate(songDetails);
      setResult(genResult);
      setCurrentState(AppState.RESULTS);
      
      // Increment usage after successful generation
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
    setCurrentState(AppState.IDLE);
    setSearchQuery('');
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
    const oldInput = refinementInput;
    setRefinementInput(''); // Optimistic clear

    try {
      const refined = await gemini.refineResult(result, oldInput);
      setResult({ ...result, ...refined });

      // Increment usage after successful refinement
      try {
        const newCount = await usage.incrementUsage();
        const remaining = Math.max(0, usage.MAX_USES - newCount);
        setRemainingUses(remaining);
        if (remaining <= 0) setUsageLocked(true);
      } catch (e) {
        console.error('Usage tracking failed:', e);
      }
    } catch (e) {
      console.error(e);
      // Revert input on error
      setRefinementInput(oldInput);
      alert("調整に失敗しました。もう一度お試しください。");
    } finally {
      setIsRefining(false);
    }
  };

  useEffect(() => {
    if (currentState === AppState.RESULTS) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">musicseed</h1>
              <p className="text-xs text-slate-400">AI音楽プロンプト生成ツール</p>
            </div>
          </div>
          {currentState !== AppState.IDLE && (
            <button 
              onClick={handleCancel}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              最初からやり直す
            </button>
          )}
          {remainingUses !== null && (
            <div className={`text-xs px-2.5 py-1 rounded-full border ${
              remainingUses <= 10 
                ? 'border-red-500/30 text-red-400 bg-red-500/10' 
                : 'border-slate-700 text-slate-400 bg-slate-800/50'
            }`}>
              残り {remainingUses} 回
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-12">
        
        {/* Step 1: Search */}
        {currentState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
            <div className="w-full max-w-lg text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">参考にする楽曲は？</h2>
              <p className="text-slate-400">曲名を入力してください。スタイル、雰囲気、歌詞などを徹底的に分析し、Suno AIに最適なプロンプトを生成します。</p>
            </div>
            <div className="w-full max-w-xl relative">
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
                className="absolute right-2 top-2 bottom-2 bg-slate-700 hover:bg-purple-600 text-white p-2 rounded-md transition-all"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            {errorMsg && (
              <p className="mt-4 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {errorMsg}
              </p>
            )}
          </div>
        )}

        {/* Step 2: Searching Indicator */}
        {currentState === AppState.SEARCHING && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Search className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-medium text-white">楽曲を検索中...</h3>
          </div>
        )}

        {/* Step 2.5: Selecting Candidate */}
        {currentState === AppState.SELECTING && (
          <div className="flex flex-col items-center animate-fade-in w-full">
            <h2 className="text-2xl font-bold text-white mb-6">楽曲を選択してください</h2>
            <div className="grid gap-4 w-full max-w-lg">
              {candidates.map((song, idx) => (
                <button
                  key={idx}
                  onClick={() => selectCandidate(song)}
                  className="bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 hover:border-purple-500/50 rounded-xl p-4 text-left transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">{song.title}</h3>
                      <p className="text-slate-300">{song.artist}</p>
                    </div>
                    {song.year && <span className="text-xs bg-slate-900 text-slate-400 px-2 py-1 rounded">{song.year}</span>}
                  </div>
                  {song.description && <p className="text-xs text-slate-500 mt-2 line-clamp-1">{song.description}</p>}
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={handleCancel} className="mt-6">キャンセル</Button>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentState === AppState.CONFIRMING && songDetails && (
          <div className="flex flex-col items-center animate-fade-in-up">
            <Card className="w-full max-w-lg border-purple-500/30 shadow-purple-500/10">
              <div className="text-center mb-6">
                <h3 className="text-sm uppercase tracking-widest text-purple-400 font-semibold mb-2">この曲で間違いありませんか？</h3>
                <h2 className="text-2xl font-bold text-white mb-1">{songDetails.title}</h2>
                <p className="text-lg text-slate-300">{songDetails.artist}</p>
                {songDetails.year && <span className="inline-block mt-2 px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">{songDetails.year}</span>}
                {songDetails.description && <p className="mt-4 text-sm text-slate-400 italic">"{songDetails.description}"</p>}
              </div>
              <div className="flex gap-4 justify-center">
                <Button variant="secondary" onClick={handleBackToSelect}>いいえ、戻る</Button>
                <Button onClick={handleConfirm}>はい、分析する</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 4: Analyzing Indicator */}
        {currentState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse"></div>
              <Loader2 className="w-16 h-16 text-purple-400 animate-spin relative z-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">徹底的に分析中...</h3>
              <div className="flex flex-col gap-2 text-sm text-slate-400 animate-pulse">
                <p>レビューや感想を収集中...</p>
                <p>楽曲構造を解析中...</p>
                <p>最適なプロンプトを構築中...</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {result && (currentState === AppState.RESULTS) && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Reasoning / Insight Header */}
            {result.reasoning && (
               <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 flex gap-3 items-start">
                 <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="font-semibold text-indigo-300 mb-1">分析インサイト</h4>
                   <p className="text-sm text-indigo-100/80 leading-relaxed">{result.reasoning}</p>
                 </div>
               </div>
            )}



            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Style Prompts */}
              <div className="space-y-6">
                <Card className="h-full flex flex-col">
                  <SectionTitle icon={Disc}>スタイルプロンプト (Suno用)</SectionTitle>
                  <div className="flex-1 space-y-6">
                    <CopyBlock label="English Prompt (そのまま使用)" text={result.sunoPrompt} />
                    
                    <div className="pt-4 border-t border-slate-700/50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">日本語訳 (参考)</span>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {result.sunoPromptTranslation}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Lyrics */}
              <div className="space-y-6">
                <Card className="h-full">
                  <SectionTitle icon={Music}>歌詞</SectionTitle>
                  <CopyBlock label="Lyrics" text={result.lyrics} />
                </Card>
              </div>
            </div>
            
            {/* Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 items-center justify-center">
                <span>参照ソース:</span>
                {result.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-purple-400 transition-colors underline decoration-slate-700 underline-offset-2"
                  >
                    {source.title} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}

            {/* Refinement Chat */}
            <div className="sticky bottom-6 z-40" ref={bottomRef}>
              <Card className="shadow-2xl shadow-purple-900/20 border-purple-500/20 bg-slate-800/90 backdrop-blur-xl">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={refinementInput}
                      onChange={(e) => setRefinementInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isRefining && handleRefine()}
                      placeholder="もっとアップテンポに？歌詞を変えたい？指示を入力してください..."
                      disabled={isRefining}
                      className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 py-2 px-2"
                    />
                  </div>
                  <Button 
                    onClick={handleRefine} 
                    disabled={isRefining || !refinementInput.trim()}
                    className="!px-4 !py-2 !rounded-md"
                  >
                    {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </Card>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
