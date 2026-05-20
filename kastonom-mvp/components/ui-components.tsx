'use client';
import React from 'react';
import { Loader2 } from 'lucide-react';

// Button bileşenini dışarıya aktarıyoruz (export)
export const Button = ({ children, variant = 'primary', isLoading = false, className = '', ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 text-sm";
  const variants = {
    primary: "text-white bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 shadow-md",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
    outline: "border border-slate-700 bg-transparent text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800",
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

// Card bileşenini dışarıya aktarıyoruz (export)
export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 ${className}`}>
    {children}
  </div>
);

// Badge bileşenini dışarıya aktarıyoruz (export)
export const Badge = ({ children, variant = 'default', className = '' }: any) => {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none";
  const variants = {
    default: "border-transparent bg-slate-900 text-slate-50",
    success: "border-transparent bg-emerald-500/15 text-emerald-500",
    warning: "border-transparent bg-amber-500/15 text-amber-500",
    demo: "border-transparent bg-purple-500/15 text-purple-400 border border-purple-500/30",
  };
  return <div className={`${base} ${variants[variant as keyof typeof variants]} ${className}`}>{children}</div>;
};

// Progress bileşenini dışarıya aktarıyoruz (export)
export const Progress = ({ value, className = '' }: { value: number, className?: string }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}>
    <div className="h-full w-full flex-1 bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500 ease-in-out" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
  </div>
);