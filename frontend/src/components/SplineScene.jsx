import React, { Suspense, Component } from 'react';
import Spline from '@splinetool/react-spline';

// Error boundary to prevent Spline crashes from breaking the whole page
class SplineErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.warn('SplineScene: Failed to load 3D scene', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full min-h-[400px] lg:min-h-[600px] flex flex-col items-center justify-center bg-[#020617]/50 rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/10 flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Experiência 3D</p>
                    <p className="text-slate-600 text-[10px] mt-1">Interaja com a seção abaixo</p>
                </div>
            );
        }

        return this.props.children;
    }
}

const SplineScene = ({ scene = "https://prod.spline.design/6Wq1Q7YGyM9VldYx/scene.splinecode" }) => {
    return (
        <div className="w-full h-full relative min-h-[400px] lg:min-h-[600px] flex items-center justify-center bg-[#020617]/50 rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
            <SplineErrorBoundary>
                <Suspense fallback={
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando Experiência 3D...</p>
                    </div>
                }>
                    <Spline
                        scene={scene}
                        className="w-full h-full"
                        onError={() => console.warn('Spline scene failed to load')}
                    />
                </Suspense>
            </SplineErrorBoundary>
        </div>
    );
};

export default SplineScene;
