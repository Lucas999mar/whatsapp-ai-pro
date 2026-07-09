import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Wand2, Upload, Download, Sparkles, Image as ImageIcon,
    Palette, Maximize2, RotateCcw, Loader2, X, ChevronDown,
    Layers, Camera, Paintbrush, Cpu, Zap, Eye, AlertCircle,
    ArrowLeft, Star, Grid3X3, Trash2, Share2, Copy, Check
} from 'lucide-react';
import api from '../api/api';

const STYLE_OPTIONS = [
    { id: 'realistic', name: 'Fotorealista', icon: '📸', color: 'from-blue-500 to-cyan-500' },
    { id: '3d', name: 'Render 3D', icon: '🧊', color: 'from-violet-500 to-purple-500' },
    { id: 'digital_art', name: 'Arte Digital', icon: '🎨', color: 'from-pink-500 to-rose-500' },
    { id: 'anime', name: 'Anime', icon: '🎌', color: 'from-red-500 to-orange-500' },
    { id: 'logo', name: 'Logo & Marca', icon: '✏️', color: 'from-slate-500 to-gray-600' },
    { id: 'poster', name: 'Poster', icon: '🎬', color: 'from-amber-500 to-yellow-500' },
    { id: 'watercolor', name: 'Aquarela', icon: '🖌️', color: 'from-teal-500 to-emerald-500' },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌆', color: 'from-fuchsia-500 to-purple-600' },
    { id: 'minimalist', name: 'Minimalista', icon: '◻️', color: 'from-gray-400 to-slate-500' },
    { id: 'comic', name: 'HQ / Comic', icon: '💥', color: 'from-yellow-500 to-red-500' },
    { id: 'product', name: 'Produto', icon: '📦', color: 'from-sky-500 to-blue-600' },
    { id: 'fashion', name: 'Moda', icon: '👗', color: 'from-rose-400 to-pink-600' },
    { id: 'fantasy', name: 'Fantasia', icon: '🐉', color: 'from-indigo-500 to-violet-600' },
    { id: 'vintage', name: 'Vintage', icon: '📷', color: 'from-orange-400 to-amber-600' },
];

const SIZE_OPTIONS = [
    { id: '1024x1024', name: '1:1 Quadrado', desc: '1024×1024' },
    { id: '1792x1024', name: '16:9 Paisagem', desc: '1792×1024' },
    { id: '1024x1792', name: '9:16 Portrait', desc: '1024×1792' },
];

const PROMPT_SUGGESTIONS = [
    '🏙️ Uma cidade futurista cyberpunk ao pôr do sol com carros voadores e neon',
    '🎨 Logo minimalista para uma startup de tecnologia chamada "NexaFlow"',
    '👤 Retrato profissional corporativo de uma mulher executiva em escritório moderno',
    '📦 Fotografia de produto premium de um perfume luxury em fundo escuro',
    '🏠 Interior de apartamento moderno e luxuoso estilo escandinavo',
    '🐉 Dragão épico voando sobre montanhas nevadas ao amanhecer',
    '🍕 Fotografia gastronômica de uma pizza artesanal saindo do forno a lenha',
    '🎮 Personagem de videogame 3D estilo Pixar, herói futurístico com armadura',
];

export default function AIDesigner() {
    // State
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('realistic');
    const [selectedSize, setSelectedSize] = useState('1024x1024');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [activeImage, setActiveImage] = useState(null);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [mode, setMode] = useState('create'); // 'create' | 'edit'
    const [error, setError] = useState(null);
    const [showStylePicker, setShowStylePicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [imageAnalysis, setImageAnalysis] = useState(null);
    const [showGallery, setShowGallery] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);

    const fileInputRef = useRef(null);
    const promptInputRef = useRef(null);

    // Focus prompt on mount
    useEffect(() => {
        promptInputRef.current?.focus();
    }, []);

    // Handle image upload
    const handleImageUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione um arquivo de imagem válido.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            setError('A imagem deve ter no máximo 20MB.');
            return;
        }

        setUploadedFile(file);
        setMode('edit');
        setError(null);

        const reader = new FileReader();
        reader.onload = (ev) => {
            setUploadedImage(ev.target.result);
        };
        reader.readAsDataURL(file);
    }, []);

    // Remove uploaded image
    const removeUploadedImage = useCallback(() => {
        setUploadedImage(null);
        setUploadedFile(null);
        setMode('create');
        setImageAnalysis(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // Analyze uploaded image
    const handleAnalyzeImage = useCallback(async () => {
        if (!uploadedFile) return;
        setIsAnalyzing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', uploadedFile);

            const res = await api.post('/image-analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setImageAnalysis(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao analisar a imagem.');
        } finally {
            setIsAnalyzing(false);
        }
    }, [uploadedFile]);

    // Generate image
    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) return;
        if (isGenerating) return;

        setIsGenerating(true);
        setError(null);
        setShowSuggestions(false);

        try {
            let result;

            if (mode === 'edit' && uploadedFile) {
                // Image-to-image editing
                const formData = new FormData();
                formData.append('image', uploadedFile);
                formData.append('prompt', prompt.trim());
                formData.append('style', selectedStyle);
                formData.append('size', selectedSize);

                const res = await api.post('/image-edit', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000,
                });
                result = res.data;
            } else {
                // Text-to-image generation
                const res = await api.post('/image-generate', {
                    prompt: prompt.trim(),
                    style: selectedStyle,
                    size: selectedSize,
                    quality: 'high',
                }, { timeout: 120000 });
                result = res.data;
            }

            const newImage = {
                id: Date.now(),
                url: result.url,
                prompt: prompt.trim(),
                revisedPrompt: result.revisedPrompt,
                style: selectedStyle,
                size: selectedSize,
                mode,
                createdAt: new Date().toISOString(),
            };

            setGeneratedImages(prev => [newImage, ...prev]);
            setActiveImage(newImage);

        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Erro desconhecido ao gerar imagem.';
            setError(msg);
        } finally {
            setIsGenerating(false);
        }
    }, [prompt, selectedStyle, selectedSize, mode, uploadedFile, isGenerating]);

    // Download image
    const handleDownload = useCallback(async (image) => {
        if (!image?.url) return;
        try {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `ai-designer-${image.id}.png`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            // Fallback: open in new tab
            window.open(image.url, '_blank');
        }
    }, []);

    // Copy image URL
    const handleCopyUrl = useCallback(async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        } catch { }
    }, []);

    // Use suggestion
    const useSuggestion = useCallback((text) => {
        // Remove emoji prefix
        const cleanText = text.replace(/^[^\s]+\s/, '');
        setPrompt(cleanText);
        setShowSuggestions(false);
        promptInputRef.current?.focus();
    }, []);

    const currentStyleObj = STYLE_OPTIONS.find(s => s.id === selectedStyle) || STYLE_OPTIONS[0];
    const currentSizeObj = SIZE_OPTIONS.find(s => s.id === selectedSize) || SIZE_OPTIONS[0];

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">

            {/* ═══ HEADER ═══ */}
            <div className="glass-panel p-4 sm:p-5 border-l-4 border-l-[#25D366] mb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Wand2 size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            AI Designer
                            <span className="text-[10px] font-bold bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Pro</span>
                        </h1>
                        <p className="text-slate-400 text-xs">Crie qualquer tipo de imagem com inteligência artificial avançada</p>
                    </div>
                </div>

                {generatedImages.length > 0 && (
                    <button
                        onClick={() => setShowGallery(!showGallery)}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm text-slate-300 hover:text-white"
                    >
                        <Grid3X3 size={16} />
                        <span className="hidden sm:inline">Galeria ({generatedImages.length})</span>
                    </button>
                )}
            </div>

            {/* ═══ MAIN CONTENT ═══ */}
            <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 overflow-hidden">

                {/* ─── LEFT: Controls Panel ─── */}
                <div className="w-full xl:w-[420px] flex flex-col gap-3 shrink-0 overflow-y-auto custom-scrollbar pb-2">

                    {/* Mode Toggle */}
                    <div className="glass-panel p-3 flex gap-2">
                        <button
                            onClick={() => { setMode('create'); removeUploadedImage(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'create'
                                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Sparkles size={16} /> Criar do Zero
                        </button>
                        <button
                            onClick={() => { setMode('edit'); fileInputRef.current?.click(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'edit'
                                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Paintbrush size={16} /> Editar Imagem
                        </button>
                    </div>

                    {/* Upload area (edit mode) */}
                    {mode === 'edit' && (
                        <div className="glass-panel p-3">
                            {uploadedImage ? (
                                <div className="relative group">
                                    <img
                                        src={uploadedImage}
                                        alt="Uploaded"
                                        className="w-full h-40 object-cover rounded-xl border border-white/10"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                        <button
                                            onClick={removeUploadedImage}
                                            className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors"
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        {!isAnalyzing && (
                                            <button
                                                onClick={handleAnalyzeImage}
                                                className="p-2 bg-purple-500/80 hover:bg-purple-500 rounded-lg text-white transition-colors"
                                                title="Analisar com IA"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                                            <div className="flex items-center gap-2 text-white text-sm">
                                                <Loader2 size={18} className="animate-spin" />
                                                Analisando...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-40 border-2 border-dashed border-white/10 hover:border-fuchsia-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-fuchsia-400 transition-all group"
                                >
                                    <Upload size={28} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-medium">Clique para enviar uma imagem</span>
                                    <span className="text-xs text-slate-500">PNG, JPG, WEBP (máx. 20MB)</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />

                            {/* AI Analysis Results */}
                            {imageAnalysis && (
                                <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                                    <div className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Cpu size={12} /> Análise da IA
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">{imageAnalysis.description}</p>
                                    {imageAnalysis.suggestions?.length > 0 && (
                                        <div className="space-y-1.5 mt-2">
                                            <div className="text-xs text-slate-500 font-semibold">Sugestões de transformação:</div>
                                            {imageAnalysis.suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setPrompt(s); promptInputRef.current?.focus(); }}
                                                    className="w-full text-left text-xs text-slate-300 hover:text-fuchsia-400 bg-white/5 hover:bg-fuchsia-500/10 p-2 rounded-lg transition-all border border-transparent hover:border-fuchsia-500/20"
                                                >
                                                    💡 {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Style Picker */}
                    <div className="glass-panel p-3">
                        <button
                            onClick={() => setShowStylePicker(!showStylePicker)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${currentStyleObj.color} flex items-center justify-center text-lg shadow-lg`}>
                                    {currentStyleObj.icon}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{currentStyleObj.name}</div>
                                    <div className="text-xs text-slate-500">Estilo visual</div>
                                </div>
                            </div>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showStylePicker ? 'rotate-180' : ''}`} />
                        </button>

                        {showStylePicker && (
                            <div className="grid grid-cols-2 gap-1.5 mt-3 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                                {STYLE_OPTIONS.map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => { setSelectedStyle(style.id); setShowStylePicker(false); }}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg transition-all text-left ${selectedStyle === style.id
                                                ? 'bg-white/10 border border-white/20 shadow-lg'
                                                : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <span className="text-lg">{style.icon}</span>
                                        <span className={`text-xs font-semibold ${selectedStyle === style.id ? 'text-white' : 'text-slate-400'}`}>
                                            {style.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Size Picker */}
                    <div className="glass-panel p-3">
                        <button
                            onClick={() => setShowSizePicker(!showSizePicker)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shadow-lg">
                                    <Maximize2 size={16} className="text-slate-300" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{currentSizeObj.name}</div>
                                    <div className="text-xs text-slate-500">{currentSizeObj.desc}</div>
                                </div>
                            </div>
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showSizePicker ? 'rotate-180' : ''}`} />
                        </button>

                        {showSizePicker && (
                            <div className="flex gap-2 mt-3">
                                {SIZE_OPTIONS.map(size => (
                                    <button
                                        key={size.id}
                                        onClick={() => { setSelectedSize(size.id); setShowSizePicker(false); }}
                                        className={`flex-1 p-3 rounded-xl border transition-all text-center ${selectedSize === size.id
                                                ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-white'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <div className={`w-full mx-auto mb-1.5 border-2 rounded ${size.id === '1024x1024' ? 'w-8 h-8' :
                                                size.id === '1792x1024' ? 'w-10 h-6' : 'w-6 h-10'
                                            } ${selectedSize === size.id ? 'border-fuchsia-500' : 'border-slate-600'}`}></div>
                                        <div className="text-xs font-bold">{size.name}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">{size.desc}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="glass-panel p-3 bg-red-500/10 border-l-4 border-l-red-500 flex items-start gap-3">
                            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-sm font-bold text-red-400">Erro</div>
                                <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── RIGHT: Canvas & Preview ─── */}
                <div className="flex-1 flex flex-col min-h-0 gap-3">

                    {/* Image Preview / Canvas */}
                    <div className="flex-1 glass-panel flex items-center justify-center overflow-hidden relative min-h-0">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-fuchsia-500/30 animate-bounce">
                                        <Wand2 size={32} className="text-white" />
                                    </div>
                                    <div className="absolute -inset-4 border-2 border-fuchsia-500/30 rounded-3xl animate-ping"></div>
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-bold text-lg">Criando sua obra-prima...</p>
                                    <p className="text-slate-400 text-sm mt-1">A IA está processando seu pedido</p>
                                </div>
                                <div className="flex gap-1.5">
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce"
                                            style={{ animationDelay: `${i * 0.15}s` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : activeImage ? (
                            <div className="w-full h-full flex flex-col">
                                {/* Image toolbar */}
                                <div className="flex items-center justify-between p-3 border-b border-white/5 shrink-0">
                                    <button
                                        onClick={() => setActiveImage(null)}
                                        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
                                    >
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleCopyUrl(activeImage.url)}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                            title="Copiar URL"
                                        >
                                            {copiedUrl ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(activeImage)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1DA851] rounded-lg text-slate-900 font-bold text-sm transition-colors"
                                        >
                                            <Download size={14} /> Baixar
                                        </button>
                                    </div>
                                </div>
                                {/* Image display */}
                                <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
                                    <img
                                        src={activeImage.url}
                                        alt={activeImage.prompt}
                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-black/50 border border-white/5"
                                    />
                                </div>
                                {/* Image info */}
                                <div className="p-3 border-t border-white/5 shrink-0">
                                    <p className="text-xs text-slate-400 line-clamp-2">
                                        <span className="text-slate-500 font-semibold">Prompt:</span> {activeImage.revisedPrompt || activeImage.prompt}
                                    </p>
                                    <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                                        <span>🎭 {STYLE_OPTIONS.find(s => s.id === activeImage.style)?.name || activeImage.style}</span>
                                        <span>📐 {activeImage.size}</span>
                                        <span>⏰ {new Date(activeImage.createdAt).toLocaleTimeString('pt-BR')}</span>
                                    </div>
                                </div>
                            </div>
                        ) : showGallery && generatedImages.length > 0 ? (
                            <div className="w-full h-full overflow-y-auto p-4 custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {generatedImages.map(img => (
                                        <button
                                            key={img.id}
                                            onClick={() => { setActiveImage(img); setShowGallery(false); }}
                                            className="group relative aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-fuchsia-500/50 transition-all hover:scale-[1.02]"
                                        >
                                            <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <p className="text-[10px] text-white font-medium line-clamp-2">{img.prompt}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center px-6 max-w-md">
                                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-500/20 flex items-center justify-center mb-4">
                                    <Wand2 size={32} className="text-fuchsia-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Imagine, a IA cria.</h2>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Descreva o que você quer e o AI Designer gera a imagem perfeita.
                                    De logos a arte 3D, de fotos de produto a ilustrações fantásticas.
                                </p>

                                {/* Quick prompt suggestions */}
                                {showSuggestions && (
                                    <div className="mt-6 space-y-2">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Experimente</div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => useSuggestion(suggestion)}
                                                    className="text-left text-xs text-slate-400 hover:text-fuchsia-400 bg-white/5 hover:bg-fuchsia-500/10 p-2.5 rounded-lg transition-all border border-transparent hover:border-fuchsia-500/20"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Prompt Input Bar */}
                    <div className="glass-panel p-3 shrink-0">
                        <div className="flex gap-2 items-end">
                            {/* Image upload button (quick) */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`shrink-0 p-3 rounded-xl border transition-all ${uploadedImage
                                        ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-400'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                                title={uploadedImage ? 'Imagem carregada' : 'Enviar imagem para editar'}
                            >
                                {uploadedImage ? <ImageIcon size={18} /> : <Upload size={18} />}
                            </button>

                            {/* Prompt textarea */}
                            <div className="flex-1 relative">
                                <textarea
                                    ref={promptInputRef}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                    placeholder={mode === 'edit'
                                        ? 'Descreva como quer transformar a imagem...'
                                        : 'Descreva a imagem que você quer criar...'
                                    }
                                    className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 pr-12 text-white text-sm focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 resize-none h-12 custom-scrollbar transition-all shadow-inner placeholder:text-slate-500"
                                    rows={1}
                                />
                            </div>

                            {/* Generate button */}
                            <button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isGenerating}
                                className="shrink-0 px-5 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 disabled:opacity-40 disabled:hover:from-fuchsia-500 disabled:hover:to-purple-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-fuchsia-500/20 disabled:shadow-none text-sm"
                            >
                                {isGenerating ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Wand2 size={18} />
                                )}
                                <span className="hidden sm:inline">Gerar</span>
                            </button>
                        </div>

                        {/* Style & Size quick tags */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Config:</span>
                            <button
                                onClick={() => setShowStylePicker(!showStylePicker)}
                                className="text-[11px] px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1"
                            >
                                <span>{currentStyleObj.icon}</span> {currentStyleObj.name}
                            </button>
                            <button
                                onClick={() => setShowSizePicker(!showSizePicker)}
                                className="text-[11px] px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1"
                            >
                                <Maximize2 size={10} /> {currentSizeObj.name}
                            </button>
                            {uploadedImage && (
                                <span className="text-[11px] px-2 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg text-fuchsia-400 flex items-center gap-1">
                                    <ImageIcon size={10} /> Imagem anexada
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
