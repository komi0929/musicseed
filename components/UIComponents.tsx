import React from 'react';

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
  const baseStyle = "px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02]",
    secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600 border border-slate-600",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800/50"
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

export const Card = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 shadow-xl ${className}`}>
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
    className="w-full bg-slate-900/80 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-500 transition-all"
  />
);

export const SectionTitle = ({ children, icon: Icon }: { children?: React.ReactNode; icon?: any }) => (
  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
    {Icon && <Icon className="w-5 h-5 text-purple-400" />}
    {children}
  </h2>
);

export const CopyBlock = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <button 
          onClick={handleCopy}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="bg-slate-950 rounded-lg p-4 border border-slate-700 text-sm text-slate-300 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
        {text}
      </div>
    </div>
  );
};