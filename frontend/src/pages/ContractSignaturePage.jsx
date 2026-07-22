import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';
import {
    FileText, CheckCircle, AlertTriangle, ShieldCheck, Download,
    ExternalLink, User, Mail, CreditCard, Loader2, Sparkles, Printer
} from 'lucide-react';
import logoImage from '../assets/logo.png';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContractSignaturePage() {
    const { id } = useParams();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorObj, setErrorObj] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [signedSuccess, setSignedSuccess] = useState(false);

    // Form Inputs
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientDocument, setClientDocument] = useState('');

    // Canvas signature
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);

    useEffect(() => {
        fetchPublicContract();
    }, [id]);

    const fetchPublicContract = async () => {
        setLoading(true);
        setErrorObj(null);
        try {
            // Endpoint público configurado no backend
            const res = await api.get(`/contracts/public/${id}`);
            const data = res.data;
            setContract(data);

            // Preenche os dados pré-cadastrados, se houver
            if (data.client_name) setClientName(data.client_name);
            if (data.client_email) setClientEmail(data.client_email);
            if (data.client_document) setClientDocument(data.client_document);

            if (data.status === 'signed') {
                setSignedSuccess(true);
            }
        } catch (err) {
            console.error(err);
            setErrorObj(err.response?.data?.error || 'Não foi possível carregar este contrato. Link inválido ou inativo.');
        } finally {
            setLoading(false);
        }
    };

    // 📝 INICIALIZA O CANVAS COM FUNDO BRANCO
    useEffect(() => {
        if (!loading && contract && contract.status !== 'signed' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, [loading, contract]);

    // ── FUNÇÕES DE DESENHO NO CANVAS ──────────────────────────────

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        // Suporta mouse e toque mobile
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { x, y } = getCoordinates(e);

        ctx.strokeStyle = '#0F172A'; // Cor da tinta (azul escuro elegante)
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { x, y } = getCoordinates(e);

        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSigned(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    // ── ENVIO DA ASSINATURA ───────────────────────────────────────

    const handleSubmitSignature = async (e) => {
        e.preventDefault();
        if (!clientName || !clientDocument) {
            alert('Por favor, preencha o seu nome completo e documento (CPF/CNPJ).');
            return;
        }
        if (!hasSigned) {
            alert('Por favor, desenhe sua assinatura no quadro branco.');
            return;
        }

        setIsSubmitting(true);
        try {
            const canvas = canvasRef.current;
            const signatureDataUrl = canvas.toDataURL('image/png'); // Exporta PNG da assinatura

            const payload = {
                client_name: clientName,
                client_document: clientDocument,
                client_email: clientEmail,
                signature_data: signatureDataUrl
            };

            const res = await api.post(`/contracts/public/${id}/sign`, payload);
            if (res.data.success) {
                setContract(res.data.contract);
                setSignedSuccess(true);
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Erro ao processar assinatura eletrônica.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // TELA DE CARREGAMENTO
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-slate-400 p-6">
                <Loader2 className="animate-spin text-[#25D366] mb-4" size={48} />
                <h3 className="text-lg font-black uppercase tracking-widest">Carregando Contrato...</h3>
                <p className="text-xs text-slate-500 mt-1">Carregando termos seguros do sistema</p>
            </div>
        );
    }

    // TELA DE ERRO (Contrato não encontrado/cancelado)
    if (errorObj) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
                <div className="bg-[#0F172A] border border-white/10 rounded-[32px] p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Erro ao acessar</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{errorObj}</p>
                    <div className="border-t border-white/5 pt-4 text-xs text-slate-500">
                        WhatsApp AI Pro Core Security Module
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-200 py-10 px-4 md:px-8 selection:bg-[#25D366]/30">

            {/* CONTAINER PRINCIPAL */}
            <div className="max-w-4xl mx-auto space-y-8">

                {/* LOGO DA EMPRESA */}
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-black/40 border border-white/5">
                        {contract.company_logo ? (
                            <img src={contract.company_logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <img src={logoImage} alt="Logo" className="w-full h-full object-cover scale-110" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">{contract.company_name}</h1>
                        <span className="text-[10px] text-[#25D366] font-black uppercase tracking-[0.3em]">Plataforma de Assinatura Online</span>
                    </div>
                </div>

                {/* TELA DE SUCESSO APÓS ASSINAR */}
                {signedSuccess ? (
                    <div className="bg-[#0F172A] border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl flex flex-col items-center justify-center text-center space-y-6 animate-fade-in print:bg-white print:text-black print:border-none print:shadow-none">

                        <div className="w-20 h-20 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center border border-[#25D366]/20 animate-bounce print:hidden">
                            <CheckCircle size={40} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tight print:text-black">Contrato Assinado Digitalmente!</h2>
                            <p className="text-slate-400 text-sm max-w-md mx-auto print:text-slate-700">
                                Esta assinatura eletrônica possui validade jurídica respaldada pelas diretrizes regulamentares de assinatura eletrônica do WhatsApp AI Pro.
                            </p>
                        </div>

                        {/* SELO DE AUDITORIA DIGITAL */}
                        <div className="w-full max-w-2xl bg-black/40 border border-white/5 rounded-2xl p-6 text-left space-y-4 font-mono text-xs text-slate-300 print:bg-slate-100 print:text-black print:border-slate-350">
                            <div className="flex items-center gap-2 text-[#25D366] font-sans font-black uppercase tracking-widest text-[11px] border-b border-white/5 pb-3 print:text-green-800 print:border-slate-300">
                                <ShieldCheck size={16} /> Comprovante de Integridade de Assinatura
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold">Documento / Contrato</span>
                                    <span className="font-semibold text-slate-200 print:text-black">{contract.title}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold">Código de Identificação</span>
                                    <span className="font-semibold text-slate-200 print:text-black">{contract.id}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold">Assinado por (Cliente)</span>
                                    <span className="font-semibold text-slate-200 print:text-black">{contract.client_name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold">Documento do Signatário</span>
                                    <span className="font-semibold text-slate-200 print:text-black">{contract.client_document}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold">Data e Hora</span>
                                    <span className="font-semibold text-slate-200 print:text-black">
                                        {format(new Date(contract.signed_at || new Date()), 'dd/MM/yyyy HH:mm:ss XXX', { locale: ptBR })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold font-sans">Endereço IP</span>
                                    <span className="font-semibold text-slate-200 print:text-black">{contract.signed_ip || 'IP registrado'}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/5 print:border-slate-300">
                                <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold mb-1">Hash de Segurança SHA-256</span>
                                <span className="block text-[10px] text-blue-400 font-bold break-all bg-black/40 p-2.5 rounded border border-white/5 print:bg-white print:text-blue-900 print:border-slate-300">
                                    {contract.signed_hash || 'SHA256_INTEGRITY_SEAL'}
                                </span>
                            </div>

                            {contract.signature_url && (
                                <div className="pt-2 flex flex-col items-start">
                                    <span className="text-slate-500 text-[10px] block uppercase font-sans font-bold mb-2">Rubrica Desenrolada</span>
                                    <div className="bg-white rounded-xl p-3 h-24 flex items-center justify-center border border-slate-200">
                                        <img src={contract.signature_url} alt="Assinatura Cliente" className="max-h-full object-contain filter invert" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 w-full justify-center pt-4 print:hidden">
                            <button
                                onClick={handlePrint}
                                className="bg-white/5 hover:bg-white/10 text-white font-black py-4 px-8 rounded-xl transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                            >
                                <Printer size={16} /> Imprimir / PDF
                            </button>
                        </div>

                    </div>
                ) : (
                    /* FORMULÁRIO DE ASSINATURA */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Visualização de Cláusula de Contrato */}
                        <div className="lg:col-span-2 bg-[#0F172A] border border-white/10 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl flex flex-col justify-between">

                            <div className="space-y-4">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Documento Termos</span>
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">{contract.title}</h2>

                                <div className="border border-white/5 bg-black/30 rounded-2xl p-6 h-[400px] overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed text-slate-300">
                                    {contract.file_url ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                                            <FileText className="text-[#25D366]" size={64} />
                                            <div>
                                                <h4 className="text-base font-bold text-white">Este contrato possui um anexo em PDF</h4>
                                                <p className="text-xs text-slate-500 mt-1 max-w-sm">Você deve abrir e ler os termos do PDF em anexo antes de realizar a assinatura eletrônica abaixo.</p>
                                            </div>
                                            <a
                                                href={contract.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-black py-3.5 px-6 rounded-xl flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5"
                                            >
                                                Abrir e Ler PDF Contrato <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap">
                                            {contract.content || 'Sem conteúdo inserido nos termos de contrato.'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-[#25D366]/5 border border-[#25D366]/10 p-4 rounded-2xl text-xs text-slate-400 leading-relaxed flex items-center gap-3">
                                <ShieldCheck className="text-[#25D366] shrink-0" size={20} />
                                <span>
                                    Ao assinar este documento, as informações de data, hora, endereço IP e assinatura desenhada serão criptografadas e salvas em um selo de auditoria integrado.
                                </span>
                            </div>

                        </div>

                        {/* Painel do Signatário e Canvas de Rabisco */}
                        <div className="lg:col-span-1 bg-[#0F172A] border border-white/10 rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl flex flex-col">

                            <div className="border-b border-white/5 pb-4">
                                <span className="text-[10px] text-[#25D366] font-black uppercase tracking-widest">Etapa Final</span>
                                <h3 className="text-xl font-black text-white italic uppercase mt-1">Assinatura Digital</h3>
                            </div>

                            <form onSubmit={handleSubmitSignature} className="space-y-4 flex-1 flex flex-col justify-between">

                                <div className="space-y-4">

                                    {/* Nome */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <User size={12} className="text-[#25D366]" /> Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="João da Silva Cardoso"
                                            value={clientName}
                                            onChange={e => setClientName(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white font-semibold text-sm outline-none focus:border-[#25D366] transition-colors"
                                        />
                                    </div>

                                    {/* CPF/CNPJ */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <CreditCard size={12} className="text-blue-400" /> CPF ou CNPJ
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="000.000.000-00"
                                            value={clientDocument}
                                            onChange={e => setClientDocument(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white font-mono text-sm outline-none focus:border-[#25D366] transition-colors"
                                        />
                                    </div>

                                    {/* E-mail */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <Mail size={12} className="text-purple-400" /> E-mail (Opcional)
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="joao@email.com"
                                            value={clientEmail}
                                            onChange={e => setClientEmail(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white font-semibold text-sm outline-none focus:border-[#25D366] transition-colors"
                                        />
                                    </div>

                                    {/* Quadro de Rabisco / Assinatura */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Desenhe sua assinatura abaixo
                                            </label>
                                            <button
                                                type="button"
                                                onClick={clearCanvas}
                                                className="text-[9px] font-black text-[#25D366] uppercase tracking-wider hover:text-green-400"
                                            >
                                                Limpar
                                            </button>
                                        </div>

                                        <div className="border border-white/10 rounded-xl overflow-hidden bg-white shadow-inner">
                                            <canvas
                                                ref={canvasRef}
                                                width={280}
                                                height={160}
                                                onMouseDown={startDrawing}
                                                onMouseMove={draw}
                                                onMouseUp={stopDrawing}
                                                onMouseLeave={stopDrawing}
                                                onTouchStart={startDrawing}
                                                onTouchMove={draw}
                                                onTouchEnd={stopDrawing}
                                                className="w-full cursor-crosshair h-40 blockTouchScroll touch-none"
                                            />
                                        </div>
                                    </div>

                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !hasSigned}
                                        className="w-full bg-gradient-to-r from-[#25D366] to-green-600 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="animate-spin" size={16} /> Gravando Assinatura...</>
                                        ) : (
                                            <><Sparkles size={16} /> Assinar Contrato</>
                                        )}
                                    </button>
                                </div>

                            </form>

                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
