import React, { useState, useEffect } from 'react';
import {
  Play,
  Film,
  Image as ImageIcon,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

// ── SVG ICONS FOR YOUTUBE & INSTAGRAM ──
export function YouTubeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function InstagramIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// ── ROBUST MEDIA PARSER ──
export function parseMediaUrl(url = '', explicitType = '') {
  if (!url || typeof url !== 'string') {
    return { type: explicitType || 'unknown', url: '' };
  }
  const trimmed = url.trim();

  // 1. YouTube Detection (watch, shorts, embed, youtu.be)
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch) {
    const videoId = ytMatch[1];
    const isShorts = /youtube\.com\/shorts\//i.test(trimmed);
    return {
      type: 'youtube',
      url: trimmed,
      videoId,
      isShorts,
      aspectRatio: isShorts ? '9/16' : '16/9',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
    };
  }

  // 2. Instagram Detection (reels, p, tv)
  const igMatch = trimmed.match(/instagram\.com\/(?:reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    const code = igMatch[1];
    const isReel = /instagram\.com\/(?:reel|reels)\//i.test(trimmed);
    return {
      type: 'instagram',
      url: trimmed,
      code,
      isReel,
      aspectRatio: '9/16', // Always 9:16 for Reels as requested
      embedUrl: `https://www.instagram.com/reel/${code}/embed/`,
      cleanUrl: `https://www.instagram.com/reel/${code}/`
    };
  }

  // 3. Direct video format (.mp4, .webm, .ogg, .mov, or explicit video)
  if (
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed) ||
    /video\//i.test(trimmed) ||
    explicitType === 'video'
  ) {
    return {
      type: 'video',
      url: trimmed,
      aspectRatio: '16/9'
    };
  }

  // 4. Default to standard Image
  return {
    type: 'image',
    url: trimmed,
    aspectRatio: 'auto'
  };
}

// ── CARD COVER COMPONENT ──
export function MediaCardCover({
  media,
  title = '',
  onClick,
  className = ''
}) {
  const [imageError, setImageError] = useState(false);

  const firstMedia = Array.isArray(media) && media.length > 0 ? media[0] : media;
  const rawUrl = typeof firstMedia === 'string' ? firstMedia : firstMedia?.url || '';
  const rawType = typeof firstMedia === 'object' ? firstMedia?.type : '';

  if (!rawUrl) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950 gap-2 ${className}`}>
        <ImageIcon size={32} />
        <span className="text-xs">Sem fotos</span>
      </div>
    );
  }

  const parsed = parseMediaUrl(rawUrl, rawType);

  // ── YOUTUBE COVER ──
  if (parsed.type === 'youtube') {
    return (
      <div
        onClick={onClick}
        className={`w-full h-full relative overflow-hidden bg-slate-950 group/cover cursor-pointer select-none ${className}`}
      >
        <img
          src={parsed.thumbnailUrl}
          alt={title || 'Vídeo YouTube'}
          className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback to standard quality if hqdefault fails
            e.currentTarget.src = `https://img.youtube.com/vi/${parsed.videoId}/0.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-black/40 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl group-hover/cover:scale-110 group-hover/cover:bg-red-500 transition-all">
            <Play size={20} className="fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Badge superior direito */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 text-red-400 border border-red-500/30 backdrop-blur-md shadow-md">
          <YouTubeIcon className="w-3.5 h-3.5 text-red-500" />
          <span>{parsed.isShorts ? 'Shorts 9:16' : 'YouTube'}</span>
        </div>
      </div>
    );
  }

  // ── INSTAGRAM REEL COVER ──
  if (parsed.type === 'instagram') {
    return (
      <div
        onClick={onClick}
        className={`w-full h-full relative overflow-hidden bg-gradient-to-tr from-[#1f102a] via-[#2c1338] to-[#120a1f] group/cover cursor-pointer select-none flex flex-col items-center justify-center border-b border-white/5 ${className}`}
      >
        {/* Fundo dinâmico com brilho Instagram */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-500/20 via-purple-600/10 to-transparent" />

        <div className="relative z-10 flex flex-col items-center gap-2 p-4 text-center">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-0.5 shadow-xl group-hover/cover:scale-110 transition-transform duration-300">
            <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center text-white">
              <Play size={22} className="fill-white translate-x-0.5 text-pink-400" />
            </div>
          </div>
          <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
            <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
            <span>Vídeo Reel (9:16)</span>
          </span>
          <span className="text-[10px] text-pink-300/80 font-medium bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
            Clique para reproduzir
          </span>
        </div>

        {/* Badge do Instagram */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 text-pink-400 border border-pink-500/30 backdrop-blur-md shadow-md">
          <InstagramIcon className="w-3.5 h-3.5" />
          <span>Reels 9:16</span>
        </div>
      </div>
    );
  }

  // ── DIRECT VIDEO COVER ──
  if (parsed.type === 'video') {
    return (
      <div
        onClick={onClick}
        className={`w-full h-full relative overflow-hidden bg-slate-950 group/cover cursor-pointer select-none ${className}`}
      >
        <video
          src={parsed.url}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
        />
        <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-xl group-hover/cover:scale-110 transition-all">
            <Play size={20} className="fill-slate-950 translate-x-0.5" />
          </div>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-md">
          <Film size={12} />
          <span>Vídeo</span>
        </div>
      </div>
    );
  }

  // ── IMAGE COVER ──
  if (imageError) {
    return (
      <div
        onClick={onClick}
        className={`w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950 gap-2 p-4 text-center cursor-pointer ${className}`}
      >
        <ImageIcon size={32} className="text-slate-600" />
        <span className="text-xs font-semibold text-slate-400">Imagem Indisponível</span>
        <span className="text-[10px] text-slate-600 line-clamp-1 max-w-[200px]">{parsed.url}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`w-full h-full relative overflow-hidden bg-slate-950 group/cover cursor-pointer ${className}`}
    >
      <img
        src={parsed.url}
        alt={title || 'Mídia'}
        onError={() => setImageError(true)}
        className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-500"
      />
    </div>
  );
}

// ── FULLSCREEN MEDIA LIGHTBOX MODAL ──
export function MediaLightboxModal({
  mediaList = [],
  initialIndex = 0,
  isOpen = false,
  onClose = () => {},
  title = ''
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && mediaList.length > 1) {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
      }
      if (e.key === 'ArrowRight' && mediaList.length > 1) {
        setCurrentIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mediaList.length, onClose]);

  if (!isOpen || !mediaList || mediaList.length === 0) return null;

  const safeIndex = Math.max(0, Math.min(currentIndex, mediaList.length - 1));
  const currentItem = mediaList[safeIndex];
  const rawUrl = typeof currentItem === 'string' ? currentItem : currentItem?.url || '';
  const rawType = typeof currentItem === 'object' ? currentItem?.type : '';
  const parsed = parseMediaUrl(rawUrl, rawType);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fade-in"
    >
      {/* Top action bar */}
      <div
        className="absolute top-4 left-4 right-4 flex items-center justify-between z-30 pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-2xl">
          <span className="text-xs font-bold text-white truncate max-w-[240px] sm:max-w-md">
            {title || currentItem?.caption || 'Visualização de Mídia'}
          </span>
          {mediaList.length > 1 && (
            <span className="text-[11px] text-slate-400 font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {safeIndex + 1} / {mediaList.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {parsed.cleanUrl && (
            <a
              href={parsed.cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg border border-white/10"
            >
              <span>Abrir no Instagram</span>
              <ExternalLink size={14} />
            </a>
          )}
          {parsed.type === 'youtube' && (
            <a
              href={parsed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg border border-red-500/30"
            >
              <YouTubeIcon className="w-4 h-4" />
              <span>Ver no YouTube</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg border border-white/10"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      {mediaList.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 shadow-2xl transition-all"
            title="Anterior"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 shadow-2xl transition-all"
            title="Próximo"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Main Content Viewport */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center p-2"
      >
        {/* ── 1. YOUTUBE VIDEO (16:9 ou 9:16 Shorts) ── */}
        {parsed.type === 'youtube' && (
          <div
            className={`w-full overflow-hidden rounded-2xl shadow-2xl bg-black border border-white/10 ${
              parsed.isShorts
                ? 'h-[80vh] aspect-[9/16] max-w-[420px]'
                : 'max-w-4xl aspect-video'
            }`}
          >
            <iframe
              src={parsed.embedUrl}
              title={title || 'YouTube video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        )}

        {/* ── 2. INSTAGRAM REELS (FORMATO REELS 9:16) ── */}
        {parsed.type === 'instagram' && (
          <div className="h-[82vh] w-full max-w-[390px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/15 flex flex-col relative animate-scale-in">
            <div className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] p-2.5 px-3.5 flex items-center justify-between text-white text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <InstagramIcon className="w-4 h-4" />
                <span>Instagram Reel (9:16)</span>
              </span>
              <a
                href={parsed.cleanUrl || parsed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] underline opacity-90 hover:opacity-100 flex items-center gap-1"
              >
                <span>Ver no app</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <iframe
              src={parsed.embedUrl}
              title={title || 'Instagram Reel'}
              allowFullScreen
              scrolling="no"
              allow="encrypted-media"
              className="w-full flex-1 border-0 bg-black"
            />
          </div>
        )}

        {/* ── 3. DIRECT HTML5 VIDEO ── */}
        {parsed.type === 'video' && (
          <div className="max-w-4xl w-full flex items-center justify-center">
            <video
              src={parsed.url}
              controls
              autoPlay
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/10 bg-black"
            />
          </div>
        )}

        {/* ── 4. IMAGE ── */}
        {parsed.type === 'image' && (
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center">
            <img
              src={parsed.url}
              alt={title || ''}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default {
  YouTubeIcon,
  InstagramIcon,
  parseMediaUrl,
  MediaCardCover,
  MediaLightboxModal
};
