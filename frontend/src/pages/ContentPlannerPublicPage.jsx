import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    Layout, Calendar, Tag, Clock, FileText, Share2, AlertCircle, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_BASE = (() => {
    let base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    if (base.endsWith('/')) base = base.slice(0, -1);
    return base.endsWith('/api') ? base : `${base}/api`;
})();

export default function ContentPlannerPublicPage() {
    const { token } = useParams();
    const [searchParams] = useSearchParams();
    const boardIdParam = searchParams.get('board_id');
    const cardIdParam = searchParams.get('card_id');
    const boardsParam = searchParams.get('boards'); // comma-separated board IDs

    const [boards, setBoards] = useState([]);
    const [columns, setColumns] = useState([]);
    const [cards, setCards] = useState([]);
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBoardId, setSelectedBoardId] = useState(boardIdParam || '');

    useEffect(() => {
        fetchPublicData();
    }, [token, selectedBoardId]);

    const fetchPublicData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (cardIdParam) {
                params.set('card_id', cardIdParam);
            } else {
                // Always pass the boards filter if present in URL
                if (boardsParam) params.set('boards', boardsParam);
                // Pass selected board to load its columns/cards
                if (selectedBoardId) params.set('board_id', selectedBoardId);
                else if (boardIdParam) params.set('board_id', boardIdParam);
            }

            const qs = params.toString();
            const url = `${API_BASE}/content/public/${token}${qs ? `?${qs}` : ''}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Link inválido ou expirado');
            const data = await res.json();

            setBoards(data.boards || []);
            setColumns(data.columns || []);
            setCards(data.cards || []);
            setCompanyName(data.company_name || '');

            if (!selectedBoardId && data.boards?.length > 0 && !cardIdParam) {
                setSelectedBoardId(data.boards[0].id);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getDueDateStatus = (dueDateStr) => {
        if (!dueDateStr) return null;
        const dueDate = new Date(dueDateStr);
        const now = new Date();
        const diff = dueDate.getTime() - now.getTime();

        if (diff < 0) return { label: 'Atrasado', color: 'text-red-400 bg-red-400/10 border-red-500/20' };
        if (diff < 24 * 60 * 60 * 1000) return { label: 'Hoje', color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' };
        return { label: format(dueDate, 'dd/MM/yyyy HH:mm'), color: 'text-slate-400 bg-white/5 border-white/5' };
    };

    // Single card view mode
    if (cardIdParam && cards.length > 0) {
        const card = cards[0];
        const board = boards[0];
        const dueStatus = getDueDateStatus(card.due_date);

        return (
            <div className="min-h-screen bg-[#0B0F19] text-white font-sans flex items-center justify-center p-4">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#25D366]/5 blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

                <div className="w-full max-w-2xl relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-[#25D366]/10 px-4 py-2 rounded-full mb-4">
                            <Share2 size={14} className="text-[#25D366]" />
                            <span className="text-xs font-black text-[#25D366] uppercase tracking-widest">
                                Conteúdo Compartilhado
                            </span>
                        </div>
                        {companyName && (
                            <p className="text-slate-500 text-sm font-bold">{companyName}</p>
                        )}
                    </div>

                    {/* Card Detail */}
                    <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
                        {board && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest">
                                <Layout size={14} /> Quadro: {board.name}
                            </div>
                        )}

                        <h1 className="text-3xl font-black text-white leading-tight">{card.title}</h1>

                        {card.description && (
                            <div className="bg-[#1E293B] border border-white/5 rounded-xl p-5">
                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{card.description}</p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                            {/* Tags */}
                            {Array.isArray(card.tags) && card.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {card.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-indigo-500/10 text-xs text-indigo-400 border border-indigo-500/20 rounded-lg font-black uppercase tracking-wider"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Due Date */}
                            {dueStatus && (
                                <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border font-black ${dueStatus.color}`}>
                                    <Clock size={14} />
                                    {dueStatus.label}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6">
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                            Powered by WhatsApp AI Pro
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando Conteúdos...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
                <div className="bg-[#0F172A] border border-red-500/20 rounded-2xl p-8 max-w-md text-center shadow-2xl">
                    <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-black text-white mb-2">Link Inválido</h2>
                    <p className="text-slate-400 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    // Board view mode
    return (
        <div className="min-h-screen bg-[#0B0F19] text-white font-sans">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#25D366]/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 p-4 md:p-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-[#25D366]/10 px-4 py-2 rounded-full mb-3">
                            <Share2 size={14} className="text-[#25D366]" />
                            <span className="text-xs font-black text-[#25D366] uppercase tracking-widest">
                                Planejamento Compartilhado
                            </span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Layout className="text-[#25D366]" size={32} />
                            {companyName ? `${companyName} - Planejador` : 'Planejador de Conteúdos'}
                        </h1>
                    </div>

                    {/* Board selector */}
                    {boards.length > 1 && (
                        <div className="flex items-center gap-2 bg-[#0F172A] px-4 py-3 rounded-xl border border-white/10 shadow">
                            <Layout size={16} className="text-[#25D366]" />
                            <select
                                className="outline-none bg-transparent text-slate-200 font-bold text-sm cursor-pointer"
                                value={selectedBoardId}
                                onChange={(e) => setSelectedBoardId(e.target.value)}
                            >
                                {boards.map(b => (
                                    <option key={b.id} value={b.id} className="bg-slate-950 text-slate-200 font-bold">{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Board Name as subtitle */}
                {boards.length > 0 && (
                    <div className="mb-6">
                        <p className="text-slate-400 text-sm font-bold">
                            📋 {boards.find(b => b.id === selectedBoardId)?.name || boards[0]?.name}
                        </p>
                    </div>
                )}

                {/* Columns Grid */}
                {columns.length === 0 ? (
                    <div className="flex items-center justify-center h-64 bg-[#0F172A]/30 border border-white/5 rounded-2xl">
                        <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhum conteúdo neste quadro</p>
                    </div>
                ) : (
                    <div className="flex gap-6 overflow-x-auto pb-4 items-start">
                        {columns.map(col => {
                            const colCards = cards.filter(c => c.column_id === col.id);

                            return (
                                <div key={col.id} className="flex-none w-80 flex flex-col bg-[#0F172A]/50 border border-white/5 rounded-2xl overflow-hidden">
                                    {/* Column Header */}
                                    <div className="p-4 flex items-center gap-2 bg-white/5 border-b border-white/5">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }}></div>
                                        <h3 className="font-black text-sm text-white uppercase tracking-widest truncate">{col.title}</h3>
                                        <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-full font-black ml-auto">
                                            {colCards.length}
                                        </span>
                                    </div>

                                    {/* Cards */}
                                    <div className="p-3 space-y-3 overflow-y-auto max-h-[70vh]">
                                        {colCards.map(card => {
                                            const dueStatus = getDueDateStatus(card.due_date);

                                            return (
                                                <div
                                                    key={card.id}
                                                    className="bg-[#1E293B] p-4 rounded-xl border border-white/5 shadow-xl space-y-3"
                                                >
                                                    <h4 className="text-sm font-black text-white leading-snug">{card.title}</h4>

                                                    {card.description && (
                                                        <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">{card.description}</p>
                                                    )}

                                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Array.isArray(card.tags) && card.tags.slice(0, 3).map((tag, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-1.5 py-0.5 bg-indigo-500/10 text-[8px] text-indigo-400 border border-indigo-500/20 rounded-md font-bold uppercase"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {dueStatus && (
                                                            <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md border font-black ${dueStatus.color}`}>
                                                                <Clock size={10} />
                                                                {dueStatus.label}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {colCards.length === 0 && (
                                            <div className="h-20 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-700 text-xs font-bold uppercase tracking-widest">
                                                Vazio
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        Powered by WhatsApp AI Pro
                    </p>
                </div>
            </div>
        </div>
    );
}
