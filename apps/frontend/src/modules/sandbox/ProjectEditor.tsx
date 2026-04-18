import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
    Play, 
    Terminal, 
    ChevronDown, 
    Check, 
    Loader2, 
    Save, 
    Maximize2, 
    Minimize2, 
    FileCode, 
    Cloud, 
    RefreshCcw,
    ChevronLeft,
    Monitor,
    Menu,
    Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../components/ThemeProvider';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ProjectEditor({ isFullscreen = false }: { isFullscreen?: boolean }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme: globalTheme } = useTheme();
    const activeTheme = globalTheme === "system" 
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : globalTheme as 'light' | 'dark';

    const [project, setProject] = useState<any>(null);
    const [code, setCode] = useState('');
    const [output, setOutput] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const editorRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCode(content);
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/sandbox/projects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProject(response.data);
            setCode(response.data.code);
            setLastSaved(new Date(response.data.updatedAt));
        } catch (err) {
            console.error('Failed to fetch project', err);
            navigate('/sandbox');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/sandbox/projects/${id}`, { code }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLastSaved(new Date());
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/sandbox/run-code`, {
                language: project.language,
                sourceCode: code,
            }, {
                headers: { Authorization: `Bearer ${token}` }
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
            return str;
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-primary-light font-outfit">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
    );

    return (
        <div className={cn(
            "flex flex-col bg-background-light dark:bg-background-dark overflow-hidden font-outfit",
            isFullscreen ? "h-screen fixed inset-0 z-[100]" : "h-[calc(100vh-80px)]"
        )}>
            {/* Control Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    {!isFullscreen && (
                        <button 
                            onClick={() => navigate('/sandbox')}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-sm font-black tracking-tight">{project?.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-primary-light uppercase tracking-widest">{project?.language}</span>
                            {lastSaved && (
                                <span className="text-[10px] opacity-40">
                                    Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-white/5">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-white/5 transition-all text-slate-600 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>

                    <button
                        onClick={handleRunCode}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-5 py-2 bg-primary-dark hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-dark/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        Run
                    </button>

                    <button
                        onClick={() => navigate(isFullscreen ? `/sandbox/projects/${id}` : `/sandbox/fullscreen/${id}`)}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-primary-light transition-all cursor-pointer"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 240, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col"
                        >
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Files</span>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 hover:bg-primary-light/10 text-primary-light rounded-lg transition-all cursor-pointer"
                                    title="Upload File"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                    accept=".js,.py,.cpp,.java,.c,.dart,.txt"
                                />
                            </div>
                            <div className="p-2 space-y-1 overflow-y-auto">
                                <div className="flex items-center gap-2 p-3 bg-primary-light/10 text-primary-light rounded-xl cursor-not-allowed">
                                    <FileCode className="w-4 h-4" />
                                    <span className="text-xs font-bold">
                                        main.{project?.language === 'javascript' ? 'js' : 
                                              project?.language === 'python' ? 'py' : 
                                              project?.language === 'c' ? 'c' : 
                                              project?.language === 'dart' ? 'dart' : 
                                              project?.language === 'java' ? 'java' : 'cpp'}
                                    </span>
                                </div>
                                <div className="p-8 text-center space-y-2">
                                    <Cloud className="w-8 h-8 mx-auto opacity-10" />
                                    <p className="text-[10px] opacity-40 font-bold leading-relaxed">Multi-file support coming soon</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Editor & Console */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language={project?.language === 'nodejs' ? 'javascript' : project?.language}
                            value={code}
                            theme={activeTheme === 'light' ? 'vs-light' : 'vs-dark'}
                            onChange={(val) => setCode(val || '')}
                            onMount={(editor) => { editorRef.current = editor; }}
                            options={{
                                fontSize: 15,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 20 },
                                fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                                lineNumbers: 'on',
                                roundedSelection: true,
                                scrollbar: {
                                    useShadows: false,
                                    verticalHasArrows: false,
                                    horizontalHasArrows: false,
                                    vertical: 'visible',
                                    horizontal: 'visible'
                                }
                            }}
                        />
                    </div>

                    {/* Console Output */}
                    <div className="h-1/3 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-black/60 flex flex-col">
                        <div className="h-10 px-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5 opacity-40" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Output Console</span>
                            </div>
                            {output && (
                                <button 
                                    onClick={() => setOutput(null)}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-2 custom-scrollbar">
                            {!output ? (
                                <p className="opacity-20 italic">Press "Run" to see output...</p>
                            ) : (
                                <>
                                    {output.compile_output && (
                                        <div className="pb-4 border-b border-white/5">
                                            <p className="text-yellow-500 font-bold mb-1 opacity-60">COMPILATION:</p>
                                            <pre className="whitespace-pre-wrap dark:text-yellow-100/80">{decodeBase64(output.compile_output)}</pre>
                                        </div>
                                    )}
                                    {output.stdout && (
                                        <div>
                                            <p className="text-green-500 font-bold mb-1 opacity-60">STDOUT:</p>
                                            <pre className="whitespace-pre-wrap dark:text-green-50/90">{decodeBase64(output.stdout)}</pre>
                                        </div>
                                    )}
                                    {output.stderr && (
                                        <div>
                                            <p className="text-red-500 font-bold mb-1 opacity-60">STDERR:</p>
                                            <pre className="whitespace-pre-wrap text-red-400">{decodeBase64(output.stderr)}</pre>
                                        </div>
                                    )}
                                    {output.status?.id !== 3 && output.status?.id !== 0 && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                                            <p className="font-bold">Execution Failed: {output.status?.description}</p>
                                            <p className="text-[10px] mt-1 opacity-80">{output.message}</p>
                                        </div>
                                    )}
                                    {output.time && (
                                        <div className="pt-4 flex items-center gap-4 text-[10px] opacity-30 font-bold">
                                            <span>TIME: {output.time}s</span>
                                            <span>MEMORY: {(output.memory / 1024).toFixed(2)}MB</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
