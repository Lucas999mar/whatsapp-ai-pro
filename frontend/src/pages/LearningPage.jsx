import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { BrainCircuit, Lightbulb, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LearningPage() {
  const [learnings, setLearnings] = useState([]);
  const [loading, setLoading] = useState(true);

  // In a real app, this would fetch from /api/learnings
  // Since we didn't expose this endpoint in the plan yet, let's just show a beautiful placeholder 
  // or fetch from knowledge where type='learning'
  useEffect(() => {
    const fetchLearnings = async () => {
      try {
        const res = await api.get('/api/learnings');
        setLearnings(res.data);
      } catch (err) {
        console.error('Error fetching learnings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLearnings();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in h-[calc(100vh-4rem)] flex flex-col">
      <div>
        <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
          <BrainCircuit className="text-[#25D366]" size={36} />
          Aprendizado Contínuo
        </h2>
        <p className="text-slate-400 mt-2 text-lg">Insights extraídos automaticamente das conversas com os usuários.</p>
      </div>

      <div className="glass-panel flex-1 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5 bg-[#1E293B]/50">
          <p className="text-slate-300">
            A cada 20 interações, a IA analisa as conversas para identificar novos padrões, correções feitas pelos usuários e preferências, adicionando-os à sua base neural.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div></div>
          ) : learnings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Lightbulb size={64} className="opacity-20 mb-4 text-yellow-500" />
              <p className="text-xl">O motor de aprendizado está analisando as conversas.</p>
              <p className="text-sm mt-2">Os primeiros insights aparecerão aqui em breve.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {learnings.map((learning) => (
                <div key={learning.id} className="glass-card p-6 flex gap-4">
                  <div className="mt-1">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                      <Lightbulb size={20} className="text-yellow-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-200 leading-relaxed">{learning.content}</p>
                    <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(learning.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

