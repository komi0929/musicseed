import React, { useState } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';

export const Button = ({ 
  onClick, 
  children, 
  variant = 'primary',
  className = '',
  disabled = false
}: { 
  onClick?: () => void; 
  children?: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'ghost'; 
  className?: string;
  disabled?: boolean;
}) => {
  const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.97]";
  
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] hover:brightness-110 btn-glow",
    secondary: "bg-slate-800/80 text-slate-100 hover:bg-slate-700 border border-slate-600/50 hover:border-purple-500/30",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', hover = true }: { children?: React.ReactNode; className?: string; hover?: boolean }) => (
  <div className={`glass-card rounded-2xl p-6 transition-all duration-300 ${hover ? '' : ''} ${className}`}>
    {children}
  </div>
);

export const Input = ({ 
  value, 
  onChange, 
  placeholder, 
  onKeyDown,
  autoFocus
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}) => (
  <input
    autoFocus={autoFocus}
    type="text"
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-5 py-4 focus:outline-none input-glow focus:border-purple-500/50 placeholder-slate-500 transition-all duration-300 text-base"
  />
);

export const SectionTitle = ({ children, icon: Icon }: { children?: React.ReactNode; icon?: any }) => (
  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
    {Icon && (
      <div className="p-1.5 bg-purple-500/10 rounded-lg">
        <Icon className="w-4 h-4 text-purple-400" />
      </div>
    )}
    {children}
  </h2>
);

export const CopyBlock = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setFlash(true);
    setTimeout(() => setCopied(false), 2500);
    setTimeout(() => setFlash(false), 500);
  };

  return (
    <div className="relative group">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <button 
          onClick={handleCopy}
          aria-label={`${label}をコピー`}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-300 ${
            copied 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 hover:border-purple-500/30'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              コピー完了
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              コピー
            </>
          )}
        </button>
      </div>
      <div className={`bg-slate-950/80 rounded-xl p-4 border border-slate-800/50 text-sm text-slate-300 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-72 overflow-y-auto transition-all duration-300 ${flash ? 'copy-flash' : ''}`}>
        {text}
      </div>
    </div>
  );
};

export const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: 'default' | 'warning' | 'success'; className?: string }) => {
  const variants = {
    default: 'border-slate-700/50 text-slate-400 bg-slate-800/50',
    warning: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    success: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};