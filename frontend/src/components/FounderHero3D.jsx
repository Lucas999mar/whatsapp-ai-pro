import React, { useRef, useState, useEffect, useCallback } from 'react';
import founderImage from '../assets/founder-hero.png';
import { motion } from 'framer-motion';

// Digital Face Mesh Overlay - Creating a tech-mesh effect
function FaceMesh({ mouseX, mouseY }) {
    return (
        <div className="absolute inset-0 z-20 pointer-events-none opacity-40 overflow-hidden mix-blend-screen">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <pattern id="mesh" width="10" height="10" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.5" fill="#25D366" opacity="0.5" />
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#25D366" strokeWidth="0.1" opacity="0.2" />
                    </pattern>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="url(#mesh)"
                    style={{
                        transform: `translate(${mouseX * 5}px, ${mouseY * 5}px)`,
                        transition: 'transform 0.2s ease-out'
                    }}
                />
            </svg>
        </div>
    );
}

// Particle system for floating digital particles
function DigitalParticles({ count = 30 }) {
    const particles = useRef([]);
    if (particles.current.length === 0) {
        particles.current = Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            duration: Math.random() * 8 + 4,
            delay: Math.random() * 5,
        }));
    }
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            {particles.current.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full bg-[#25D366]/40"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
                    }}
                />
            ))}
        </div>
    );
}

// Interactive Digital HUD / Target UI
function DigitalHUD({ mouseX, mouseY }) {
    return (
        <div
            className="absolute inset-0 pointer-events-none z-35 overflow-hidden"
            style={{
                transform: `translate(${mouseX * 40}px, ${mouseY * 30}px)`,
                transition: 'transform 0.1s ease-out'
            }}
        >
            {/* Target Reticle Centered on Eyes Area */}
            <div className="absolute top-[39%] left-[48.5%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-[#25D366]/10 rounded-full animate-spin-slow opacity-30" />

            {/* Data Readouts */}
            <div className="absolute top-[20%] left-[70%] text-[8px] font-mono text-[#25D366] opacity-70 bg-black/40 backdrop-blur-md p-3 border-l-2 border-[#25D366] rounded-r-md">
                <p className="font-black mb-1 text-blue-400">VISION_SCAN_V2</p>
                <p>LAT: {mouseX.toFixed(2)}</p>
                <p>LNG: {mouseY.toFixed(2)}</p>
                <p className="mt-1 animate-pulse">EYE_TRACKING: TRUE</p>
            </div>

            <div className="absolute bottom-[20%] left-[15%] text-[8px] font-mono text-blue-400 opacity-70 bg-black/40 backdrop-blur-md p-3 border-r-2 border-blue-400 text-right rounded-l-md">
                <p className="font-black mb-1 text-[#25D366]">NEURAL_CORE</p>
                <p>SYNC: 99.8%</p>
                <p>PHASE: ACTIVE</p>
            </div>
        </div>
    );
}

export default function FounderHero3D() {
    const containerRef = useRef(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = useCallback((e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setMousePos({ x, y });
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full min-h-[600px] flex items-center justify-center p-4 sm:p-12 perspective-2000"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">

                {/* 3D Visual Intro Head */}
                <div
                    className="relative w-full max-w-md aspect-[4/5] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] group"
                    style={{
                        transform: `rotateY(${mousePos.x * 20}deg) rotateX(${-mousePos.y * 15}deg) scale(${isHovered ? 1.02 : 1})`,
                        transition: 'transform 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* Background Layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#020617] to-[#0F172A] z-0" />
                    <DigitalParticles />
                    <FaceMesh mouseX={mousePos.x} mouseY={mousePos.y} />

                    {/* Main Photo with deep parallax */}
                    <div
                        className="relative z-10 w-full h-full flex items-center justify-center p-6"
                        style={{
                            transform: `translate(${mousePos.x * -25}px, ${mousePos.y * -20}px)`,
                            transition: 'transform 0.4s ease-out',
                        }}
                    >
                        <img
                            src={founderImage}
                            alt="Lucas Vieira - Visionary Index"
                            className="w-full h-full object-cover transition-all duration-700 grayscale-[0.4] group-hover:grayscale-0 shadow-inner"
                        />
                    </div>

                    {/* Laser Scan Line */}
                    <div className="absolute inset-0 z-30 pointer-events-none opacity-40">
                        <div
                            className="absolute w-full h-[1px] bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
                            style={{ animation: 'scanVertical 4s linear infinite' }}
                        />
                    </div>

                    {/* HUD & Overlays */}
                    <DigitalHUD mouseX={mousePos.x} mouseY={mousePos.y} />

                    {/* Vignette */}
                    <div className="absolute inset-0 z-40 pointer-events-none bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/20" />

                    {/* Floating Name Label Inside 3D Space */}
                    <div
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 text-center space-y-1"
                        style={{ transform: 'translateZ(50px)' }}
                    >
                        <p className="text-[10px] font-black tracking-[0.3em] text-[#25D366] uppercase animate-pulse">Founder & Visionary</p>
                        <h3 className="text-3xl font-black text-white italic tracking-tighter">LUCAS VIEIRA</h3>
                    </div>
                </div>

                {/* Section Title Background */}
                <div
                    className="mt-12 text-center max-w-2xl px-6 opacity-60"
                    style={{ transform: `translateY(${mousePos.y * 10}px)` }}
                >
                    <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest mb-4">Neural Visualization Protocol v1.02</p>
                    <h2 className="text-2xl sm:text-4xl font-black text-white">O futuro já começou. Estás pronto para <span className="gradient-text italic">enxergar além</span>?</h2>
                </div>

            </div>
        </div>
    );
}
