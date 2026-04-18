import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Plus, Rocket, Code, ChevronRight, Hash, Terminal, Sparkles, Layout, Monitor, MousePointer2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../components/ThemeProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', icon: 'JS' },
    { id: 'python', name: 'Python 3', icon: 'PY' },
    { id: 'cpp', name: 'C++ (GCC)', icon: 'C++' },
    { id: 'java', name: 'Java', icon: 'JAVA' },
    { id: 'c', name: 'C (GCC)', icon: 'C' },
    { id: 'dart', name: 'Dart', icon: 'DART' },
];

const InteractiveBackground = ({ theme }: { theme: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouse = useRef({ x: 0, y: 0, active: false });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: any[] = [];
        let animationFrame: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        const init = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            particles = [];
            
            // Create a grid of particles
            const gap = 30;
            for (let x = gap / 2; x < width; x += gap) {
                for (let y = gap / 2; y < height; y += gap) {
                    particles.push({
                        x, y,
                        originX: x,
                        originY: y,
                        size: 1.5,
                        color: theme === 'dark' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.2)',
                        dx: 0,
                        dy: 0,
                        vx: 0,
                        vy: 0,
                        force: 0,
                        angle: 0,
                        distance: 0
                    });
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                
                // Calculate distance from mouse
                const dx = mouse.current.x - p.x;
                const dy = mouse.current.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 150;
                
                if (distance < maxDistance) {
                    const force = (maxDistance - distance) / maxDistance;
                    const angle = Math.atan2(dy, dx);
                    
                    // Repel effect
                    p.vx -= Math.cos(angle) * force * 5;
                    p.vy -= Math.sin(angle) * force * 5;
                }

                // Easing back to origin
                p.vx += (p.originX - p.x) * 0.05;
                p.vy += (p.originY - p.y) * 0.05;

                // Friction
                p.vx *= 0.9;
                p.vy *= 0.9;

                p.x += p.vx;
                p.y += p.vy;

                // Draw
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            animationFrame = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.current.x = e.clientX - rect.left;
            mouse.current.y = e.clientY - rect.top;
            mouse.current.active = true;
        };

        const handleResize = () => {
            init();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);
        
        init();
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrame);
        };
    }, [theme]);

    return (
        <canvas 
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
        />
    );
};

export default function ProjectLanding() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newProject, setNewProject] = useState({ name: '', language: 'javascript' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/sandbox/projects`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProjects(response.data);
        } catch (err) {
            console.error('Failed to fetch projects', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProject.name) return;
        
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/sandbox/projects`, newProject, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate(`/sandbox/projects/${response.data._id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create project');
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-outfit relative overflow-x-hidden transition-colors duration-500">
            <InteractiveBackground theme={theme} />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-16 space-y-16">
                
                {/* Hero Banner Section */}
                <div className="text-center space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-xl"
                    >
                        <Sparkles className="w-3 h-3 text-primary-light animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Engineered for Excellence</span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-2"
                    >
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                            Build the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-indigo-400">Future</span>
                        </h1>
                        <p className="text-sm md:text-base opacity-40 max-w-xl mx-auto font-medium">
                            Develop and experiment with code instantly in a professional sandbox environment.
                        </p>
                    </motion.div>
                </div>

                {/* Primary Action Section - Project Creation */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative group lg:px-20"
                >
                    <div className="absolute inset-0 bg-primary-light/5 blur-[100px] rounded-[64px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    
                    <div className="bg-slate-50/95 dark:bg-slate-900/90 backdrop-blur-3xl border border-slate-200 dark:border-white/10 p-8 md:p-12 rounded-[48px] shadow-2xl shadow-black/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Monitor className="w-48 h-48 rotate-12" />
                        </div>

                        <div className="relative z-10 max-w-3xl mx-auto space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-white shadow-lg shadow-primary-light/30">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight">Create New Project</h2>
                            </div>

                            <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-widest opacity-60 ml-1">Project Name</label>
                                    <input 
                                        required
                                        placeholder="e.g. My Algorithm Library"
                                        className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-base outline-none focus:ring-2 focus:ring-primary-light transition-all shadow-inner"
                                        value={newProject.name}
                                        onChange={e => setNewProject({...newProject, name: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-widest opacity-60 ml-1">Programming Language</label>
                                    <div className="p-3 bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-wrap gap-2">
                                        {LANGUAGES.map(lang => (
                                            <button
                                                key={lang.id}
                                                type="button"
                                                onClick={() => setNewProject({...newProject, language: lang.id})}
                                                className={`flex-1 px-4 py-2.5 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap min-w-[100px] cursor-pointer ${
                                                    newProject.language === lang.id 
                                                    ? 'bg-primary-light border-primary-light text-white shadow-xl shadow-primary-light/30 scale-105' 
                                                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-primary-light/50 opacity-60'
                                                }`}
                                            >
                                                {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="md:col-span-2 pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        className="w-full bg-primary-dark hover:bg-indigo-700 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-primary-dark/20 transition-all flex items-center justify-center gap-3 text-lg group cursor-pointer"
                                    >
                                        Start Coding Session
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </motion.button>
                                </div>
                                
                                {error && <p className="text-xs text-red-500 text-center font-medium md:col-span-2">{error}</p>}
                            </form>
                        </div>
                    </div>
                </motion.div>

                {/* Recent Projects */}
                <div className="space-y-10 lg:px-20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Layout className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Recent Projects</h2>
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-slate-500/10 text-[10px] font-bold opacity-60">
                            {projects.length} PROJECTS
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-64 rounded-[40px] bg-slate-100 dark:bg-white/5 animate-pulse" />
                            ))
                        ) : projects.length === 0 ? (
                            <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-200 dark:border-white/5 rounded-[48px] group hover:border-primary-light/20 transition-colors">
                                <Code className="w-16 h-16 mx-auto opacity-5 mb-6 group-hover:opacity-20 group-hover:rotate-12 transition-all transition-duration-500" />
                                <p className="opacity-20 font-black text-xl uppercase tracking-widest">Workspace Empty</p>
                                <p className="text-sm opacity-40 mt-2">Initialize your first session above</p>
                            </div>
                        ) : projects.map((project, idx) => (
                            <motion.div
                                key={project._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + idx * 0.05 }}
                                whileHover={{ y: -10, scale: 1.02 }}
                                onClick={() => navigate(`/sandbox/projects/${project._id}`)}
                                className="group bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 p-8 rounded-[40px] cursor-pointer shadow-xl shadow-black/[0.02] hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] transition-all relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-light/5 blur-[80px] -mr-10 -mt-10 group-hover:bg-primary-light/20 transition-all duration-700" />
                                
                                <div className="flex flex-col h-full justify-between gap-12 relative z-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="px-3 py-1 rounded-lg bg-primary-light/10 text-[9px] font-black uppercase tracking-[0.2em] text-primary-light border border-primary-light/10">
                                                {project.language}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-30">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                REMOTE SYNC
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black leading-tight group-hover:text-primary-light transition-colors">
                                            {project.name}
                                        </h3>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 opacity-30 text-[10px] font-bold uppercase tracking-widest">
                                                <Hash className="w-3 h-3" />
                                                main.{project.language === 'javascript' ? 'js' : project.language === 'python' ? 'py' : project.language === 'c' ? 'c' : 'cpp'}
                                            </div>
                                            <span className="text-[9px] opacity-20 font-bold">CREATED ON {new Date(project.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-800 dark:text-white group-hover:bg-primary-light group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-light/30 transition-all duration-300">
                                            <MousePointer2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="text-center pb-20 opacity-20 text-[10px] font-black uppercase tracking-[0.4em]">
                    Powered by Pixaflip Computing Engine
                </div>

            </div>
        </div>
    );
}
