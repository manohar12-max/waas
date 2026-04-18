import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeProvider';
import Editor from '@monaco-editor/react';
import { Play, Terminal, ChevronDown, Check, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript (Node.js)', icon: 'js' },
    { id: 'python', name: 'Python 3', icon: 'py' },
    { id: 'cpp', name: 'C++ (GCC)', icon: 'cpp' },
    { id: 'java', name: 'Java (OpenJDK)', icon: 'java' },
];

const DEFAULT_CODE: Record<string, string> = {
    javascript: `// Welcome to the Coding Sandbox\nconsole.log("Hello, World!");\n\n// Example: Sum function\nconst sum = (a, b) => a + b;\nconsole.log("Sum of 5 + 3 =", sum(5, 3));`,
    python: `# Welcome to the Coding Sandbox\nprint("Hello, World!")\n\n# Example: List comprehension\nsquares = [x**2 for x in range(10)]\nprint(f"Squares: {squares}")`,
    cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
};

export default function CodingSandbox() {
    const { theme: globalTheme } = useTheme();
    const activeTheme = globalTheme === "system" 
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : globalTheme as 'light' | 'dark';
    
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(DEFAULT_CODE[LANGUAGES[0].id]);
    const [output, setOutput] = useState<{
        stdout?: string;
        stderr?: string;
        compile_output?: string;
        message?: string;
        status?: { description: string; id: number };
        time?: string;
        memory?: number;
    } | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput(null);
        try {
            const response = await axios.post(`${API_URL}/sandbox/run-code`, {
                language: language.id,
                sourceCode: code,
            });
            setOutput(response.data);
        } catch (error: any) {
            setOutput({
                stderr: error.response?.data?.message || 'Error connecting to execution server.',
                status: { description: 'API Error', id: 0 }
            });
        } finally {
            setIsRunning(false);
        }
    };



    const decodeBase64 = (str?: string) => {
        if (!str) return '';
        try {
            return atob(str);
        } catch (e) {
            console.error('Failed to decode base64:', e);
            return str;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark overflow-hidden font-outfit transition-colors duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-dark rounded-lg flex items-center justify-center text-white font-bold">
                            CS
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white hidden sm:block">
                            Coding Sandbox
                        </h1>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                        >
                            <span className="text-primary-light dark:text-primary-dark font-bold uppercase text-[10px] w-6 h-6 flex items-center justify-center border border-primary-light/30 rounded">
                                {language.icon}
                            </span>
                            {language.name}
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isDropdownOpen && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute left-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden z-50"
                                >
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.id}
                                            onClick={() => {
                                                setLanguage(lang);
                                                setCode(DEFAULT_CODE[lang.id]);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="flex items-center justify-between w-full px-4 py-3 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className="text-primary-light dark:text-primary-dark font-bold uppercase text-[10px]">
                                                    {lang.icon}
                                                </span>
                                                {lang.name}
                                            </span>
                                            {language.id === lang.id && <Check className="w-4 h-4 text-primary-dark" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRunCode}
                        disabled={isRunning}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all",
                            "bg-primary-dark hover:bg-indigo-700 text-white shadow-primary-dark/20",
                            "disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                        )}
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        {isRunning ? 'Running...' : 'Run Code'}
                    </button>
                </div>
            </header>

            {/* Editor Area */}
            <main className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 relative">
                    <Editor
                        height="100%"
                        language={language.id === 'nodejs' ? 'javascript' : language.id}
                        value={code}
                        theme={activeTheme === 'light' ? 'vs-light' : 'vs-dark'}
                        onChange={(value) => setCode(value || '')}
                        options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 16 },
                            fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                            smoothScrolling: true,
                            cursorBlinking: 'smooth',
                            lineNumbersMinChars: 3,
                        }}
                    />
                </div>

                {/* Console / Output */}
                <div className="h-1/3 min-h-[150px] border-t border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-[#050505]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/20">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Terminal className="w-3.5 h-3.5" />
                            Console
                        </div>
                        {output && (
                            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-500 flex gap-3">
                                {output.time && <span>Time: {output.time}s</span>}
                                {output.memory && <span>Memory: {(output.memory / 1024).toFixed(1)}MB</span>}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-sm custom-scrollbar">
                        {!output && !isRunning && (
                            <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-600 italic">
                                Run your code to see the output here...
                            </div>
                        )}
                        
                        {isRunning && (
                            <div className="flex items-center gap-2 text-primary-light animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-primary-light animate-ping" />
                                Executing code on Judge0 server...
                            </div>
                        )}

                        {output && (
                            <div className="space-y-2">
                                {output.compile_output && (
                                    <pre className="text-yellow-600 dark:text-yellow-400 whitespace-pre-wrap rounded bg-yellow-500/5 p-2 border border-yellow-500/10">
                                        {decodeBase64(output.compile_output)}
                                    </pre>
                                )}
                                {output.stdout && (
                                    <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                        {decodeBase64(output.stdout)}
                                    </pre>
                                )}
                                {output.stderr && (
                                    <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap rounded bg-red-500/5 p-2 border border-red-500/10">
                                        {decodeBase64(output.stderr)}
                                    </pre>
                                )}
                                {output.message && !output.stdout && !output.stderr && (
                                    <div className="text-slate-400 italic">
                                        {output.message}
                                    </div>
                                )}
                                {output.status && (
                                    <div className={cn(
                                        "mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest",
                                        output.status.id === 3 ? "text-green-500" : "text-red-500"
                                    )}>
                                        Status: {output.status.description}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <style>{`
                .dark .monaco-editor, .dark .monaco-editor .margin, .dark .monaco-editor-background {
                    background-color: #000000 !important;
                }
                .monaco-editor, .monaco-editor .margin, .monaco-editor-background {
                    transition: background-color 0.3s ease;
                }
            `}</style>
        </div>
    );
}
