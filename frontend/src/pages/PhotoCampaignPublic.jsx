import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Página pública para eleitores fazerem upload da foto 
 * e escolherem o modelo do candidato.
 * Acessada via /foto-candidato/:shareToken (sem auth)
 */
export default function PhotoCampaignPublic() {
    const { shareToken } = useParams();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [voterName, setVoterName] = useState('');
    const [voterPhoto, setVoterPhoto] = useState(null);
    const [voterPreview, setVoterPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submission, setSubmission] = useState(null);
    const [result, setResult] = useState(null);
    const [step, setStep] = useState(1); // 1=choose, 2=upload, 3=processing, 4=done
    const fileInputRef = useRef(null);
    const pollingRef = useRef(null);

    // Determinar API baseURL
    const apiBase = (() => {
        let base = import.meta?.env?.VITE_API_URL || 'http://localhost:3001';
        if (base.endsWith('/')) base = base.slice(0, -1);
        return base.endsWith('/api') ? base : `${base}/api`;
    })();

    // ── CARREGAR CAMPANHA ──────────────────────────────────
    useEffect(() => {
        async function load() {
            try {
                const resp = await fetch(`${apiBase}/photo-campaigns/public/${shareToken}`);
                if (!resp.ok) throw new Error('Campanha não encontrada');
                const data = await resp.json();
                setCampaign(data);
                if (data.templates?.length === 1) {
                    setSelectedTemplate(data.templates[0].id);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [shareToken]);

    // ── UPLOAD DE FOTO DO ELEITOR ──────────────────────────
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo (inclui 'image/jpg' para compatibilidade mobile)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
            alert('Por favor, envie uma imagem JPG, PNG ou WebP.');
            return;
        }

        // Validar tamanho (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 20MB.');
            return;
        }

        setVoterPhoto(file);
        setError(null); // limpar erros anteriores
        const reader = new FileReader();
        reader.onload = (ev) => setVoterPreview(ev.target.result);
        reader.readAsDataURL(file);
    }

    // ── ENVIAR PARA COMPOSIÇÃO ─────────────────────────────
    async function handleSubmit() {
        if (!selectedTemplate || !voterPhoto) return;

        try {
            setSubmitting(true);
            setStep(3);

            const formData = new FormData();
            formData.append('photo', voterPhoto);
            formData.append('template_id', selectedTemplate);
            formData.append('voter_name', voterName || 'Apoiador');

            const resp = await fetch(`${apiBase}/photo-campaigns/public/${shareToken}/submit`, {
                method: 'POST',
                body: formData,
            });

            if (!resp.ok) {
                let errMsg = 'Erro ao enviar foto';
                try { const err = await resp.json(); errMsg = err.error || errMsg; } catch { }
                throw new Error(errMsg);
            }

            const data = await resp.json();
            setSubmission(data);

            // Iniciar polling para verificar status
            startPolling(data.id);
        } catch (err) {
            console.error('Erro ao submeter foto:', err);
            setError(err.message || 'Erro de conexão. Verifique sua internet e tente novamente.');
            setStep(2);
        } finally {
            setSubmitting(false);
        }
    }

    function startPolling(submissionId) {
        pollingRef.current = setInterval(async () => {
            try {
                const resp = await fetch(`${apiBase}/photo-campaigns/public/status/${submissionId}`);
                if (!resp.ok) return;
                const data = await resp.json();

                if (data.status === 'completed') {
                    clearInterval(pollingRef.current);
                    setResult(data);
                    setStep(4);
                } else if (data.status === 'error') {
                    clearInterval(pollingRef.current);
                    setError('Ocorreu um erro na geração. Tente novamente.');
                    setStep(2);
                }
            } catch { }
        }, 3000); // Polling a cada 3 segundos
    }

    function handleDownload() {
        if (!result?.result_url) return;
        const link = document.createElement('a');
        link.href = result.result_url;
        link.download = `foto-com-${campaign?.candidate_name || 'candidato'}.png`;
        link.click();
    }

    function handleShare() {
        if (!result?.result_url) return;
        if (navigator.share) {
            navigator.share({
                title: `Minha foto com ${campaign?.candidate_name || 'o candidato'}!`,
                text: campaign?.description || 'Veja minha foto!',
                url: result.result_url
            });
        } else {
            navigator.clipboard.writeText(result.result_url);
            alert('Link da foto copiado!');
        }
    }

    function resetFlow() {
        setStep(1);
        setSelectedTemplate(campaign?.templates?.length === 1 ? campaign.templates[0].id : null);
        setVoterPhoto(null);
        setVoterPreview(null);
        setSubmission(null);
        setResult(null);
        setError(null);
    }

    // ── RENDER ─────────────────────────────────────────────

    // Loading
    if (loading) {
        return (
            <div style={styles.fullPage}>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner} />
                    <p style={{ color: '#94A3B8', marginTop: '16px', fontSize: '14px' }}>Carregando...</p>
                </div>
            </div>
        );
    }

    // Error (campanha não encontrada)
    if (error && !campaign) {
        return (
            <div style={styles.fullPage}>
                <div style={styles.errorContainer}>
                    <div style={styles.errorIcon}>❌</div>
                    <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '22px' }}>Campanha não encontrada</h2>
                    <p style={{ color: '#64748B', fontSize: '14px', marginTop: '8px' }}>
                        Este link pode estar inativo ou ter sido removido.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.fullPage}>
            {/* Background decorations */}
            <div style={styles.bgOrb1} />
            <div style={styles.bgOrb2} />

            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerBadge}>
                        <span style={{ fontSize: '24px' }}>📸</span>
                    </div>
                    <h1 style={styles.title}>
                        {campaign?.title || 'Foto com Candidato'}
                    </h1>
                    {campaign?.candidate_name && (
                        <p style={styles.candidateName}>
                            com <strong>{campaign.candidate_name}</strong>
                        </p>
                    )}
                    {campaign?.description && (
                        <p style={styles.description}>{campaign.description}</p>
                    )}
                </div>

                {/* Step Indicator */}
                <div style={styles.stepsContainer}>
                    {[
                        { num: 1, label: 'Escolha o Modelo' },
                        { num: 2, label: 'Envie sua Foto' },
                        { num: 3, label: 'Processando' },
                        { num: 4, label: 'Resultado' },
                    ].map((s, i) => (
                        <React.Fragment key={s.num}>
                            {i > 0 && <div style={{
                                ...styles.stepLine,
                                background: step >= s.num ? '#8B5CF6' : '#1E293B'
                            }} />}
                            <div style={{
                                ...styles.stepDot,
                                background: step >= s.num
                                    ? 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                                    : '#1E293B',
                                border: step >= s.num ? 'none' : '2px solid #334155',
                                color: step >= s.num ? '#fff' : '#475569',
                            }}>
                                {step > s.num ? '✓' : s.num}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
                <div style={styles.stepsLabels}>
                    {['Escolha', 'Sua Foto', 'IA', 'Pronto!'].map((label, i) => (
                        <span key={i} style={{
                            color: step >= i + 1 ? '#8B5CF6' : '#475569',
                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.05em', textAlign: 'center', flex: 1
                        }}>
                            {label}
                        </span>
                    ))}
                </div>

                {/* ── STEP 1: Escolher Modelo ───────────────────── */}
                {step === 1 && (
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        <h2 style={styles.stepTitle}>Escolha um modelo de foto</h2>
                        <p style={styles.stepDesc}>
                            Selecione a foto em que você gostaria de aparecer ao lado do candidato
                        </p>

                        <div style={styles.templateGrid}>
                            {(campaign?.templates || []).map(template => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                    style={{
                                        ...styles.templateCard,
                                        border: selectedTemplate === template.id
                                            ? '3px solid #8B5CF6'
                                            : '3px solid transparent',
                                        boxShadow: selectedTemplate === template.id
                                            ? '0 0 24px rgba(139,92,246,0.3)'
                                            : 'none',
                                        transform: selectedTemplate === template.id ? 'scale(1.02)' : 'scale(1)',
                                    }}
                                >
                                    <img
                                        src={template.url}
                                        alt={template.original_name}
                                        style={styles.templateImage}
                                    />
                                    {selectedTemplate === template.id && (
                                        <div style={styles.selectedBadge}>
                                            ✓ Selecionado
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {selectedTemplate && (
                            <button
                                onClick={() => setStep(2)}
                                style={styles.primaryButton}
                            >
                                Continuar →
                            </button>
                        )}
                    </div>
                )}

                {/* ── STEP 2: Upload da Foto ───────────────────── */}
                {step === 2 && (
                    <div style={{ animation: 'fadeIn 0.4s ease' }}>
                        <h2 style={styles.stepTitle}>Envie sua foto</h2>
                        <p style={styles.stepDesc}>
                            Escolha uma foto sua em boa qualidade para a composição ficar perfeita
                        </p>

                        {/* Nome do eleitor */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={styles.label}>Seu Nome (opcional)</label>
                            <input
                                type="text"
                                value={voterName}
                                onChange={e => setVoterName(e.target.value)}
                                placeholder="Como você quer ser identificado"
                                style={styles.input}
                            />
                        </div>

                        {/* Upload Area */}
                        {!voterPreview ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={styles.uploadArea}
                            >
                                <div style={styles.uploadIcon}>📷</div>
                                <p style={{ color: '#8B5CF6', fontWeight: 700, fontSize: '16px' }}>
                                    Toque para enviar sua foto
                                </p>
                                <p style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>
                                    JPG, PNG ou WebP · Máximo 20MB
                                </p>
                                <p style={{ color: '#475569', fontSize: '11px', marginTop: '12px' }}>
                                    💡 Dica: Use uma foto com boa iluminação e rosto visível
                                </p>
                            </div>
                        ) : (
                            <div style={styles.previewContainer}>
                                <img src={voterPreview} alt="Sua foto" style={styles.previewImage} />
                                <button
                                    onClick={() => {
                                        setVoterPhoto(null);
                                        setVoterPreview(null);
                                    }}
                                    style={styles.changePhotoBtn}
                                >
                                    Trocar foto
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />

                        {error && (
                            <div style={styles.errorBanner}>
                                ⚠️ {error}
                                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', marginLeft: '8px', fontWeight: 700 }}>✕</button>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setStep(1)} style={styles.secondaryButton}>
                                ← Voltar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!voterPhoto || submitting}
                                style={{
                                    ...styles.primaryButton,
                                    flex: 1,
                                    opacity: (!voterPhoto || submitting) ? 0.5 : 1,
                                    cursor: (!voterPhoto || submitting) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {submitting ? 'Enviando...' : '✨ Gerar Minha Foto'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Processando ──────────────────────── */}
                {step === 3 && (
                    <div style={{ animation: 'fadeIn 0.4s ease', textAlign: 'center', padding: '40px 0' }}>
                        <div style={styles.processingContainer}>
                            <div style={styles.processingAnimation}>
                                <div style={styles.pulseRing} />
                                <div style={styles.processingIcon}>🤖</div>
                            </div>
                            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '22px', marginTop: '32px' }}>
                                A IA está criando sua foto...
                            </h2>
                            <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '8px', maxWidth: '350px', margin: '8px auto 0' }}>
                                Estamos analisando as imagens e criando uma composição natural e realista. Isso pode levar até 30 segundos.
                            </p>

                            <div style={styles.processingSteps}>
                                <ProcessingStep icon="🔍" text="Analisando iluminação e cenário" active delay="0s" />
                                <ProcessingStep icon="🎨" text="Ajustando cores e perspectiva" active delay="3s" />
                                <ProcessingStep icon="✨" text="Refinando detalhes finais" active delay="6s" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Resultado ────────────────────────── */}
                {step === 4 && result && (
                    <div style={{ animation: 'fadeIn 0.4s ease', textAlign: 'center' }}>
                        <div style={styles.confetti}>🎉</div>
                        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '24px', marginTop: '8px' }}>
                            Sua foto ficou incrível!
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px' }}>
                            Baixe ou compartilhe nas redes sociais
                        </p>

                        <div style={styles.resultImageContainer}>
                            <img
                                src={result.result_url}
                                alt="Foto com candidato"
                                style={styles.resultImage}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
                            <button onClick={handleDownload} style={styles.primaryButton}>
                                📥 Baixar Foto
                            </button>
                            <button onClick={handleShare} style={{
                                ...styles.primaryButton,
                                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                                boxShadow: '0 4px 24px rgba(34,197,94,0.3)'
                            }}>
                                📤 Compartilhar
                            </button>
                        </div>

                        <button onClick={resetFlow} style={{
                            ...styles.secondaryButton,
                            marginTop: '20px', display: 'inline-flex'
                        }}>
                            Fazer outra foto
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    <p>Powered by <strong style={{ color: '#8B5CF6' }}>WhatsApp AI Pro</strong></p>
                </div>
            </div>

            {/* Global Styles */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes stepFade {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
      `}</style>
        </div>
    );
}

// ── SUBCOMPONENT: Processing Step ────────────────────────
function ProcessingStep({ icon, text, active, delay }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '12px',
            background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)',
            animation: active ? `stepFade 3s ease ${delay} infinite` : 'none',
        }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>{text}</span>
        </div>
    );
}

// ── STYLES ───────────────────────────────────────────────
const styles = {
    fullPage: {
        minHeight: '100vh',
        background: '#0B0F19',
        fontFamily: "'Inter', -apple-system, sans-serif",
        position: 'relative',
        overflow: 'hidden',
    },
    bgOrb1: {
        position: 'fixed', top: '-20%', right: '-10%',
        width: '40vw', height: '40vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)',
        pointerEvents: 'none',
    },
    bgOrb2: {
        position: 'fixed', bottom: '-20%', left: '-10%',
        width: '35vw', height: '35vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.06), transparent)',
        pointerEvents: 'none',
    },
    container: {
        maxWidth: '560px',
        margin: '0 auto',
        padding: '32px 20px',
        position: 'relative',
        zIndex: 1,
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    headerBadge: {
        width: '72px', height: '72px', borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', border: '1px solid rgba(139,92,246,0.2)',
    },
    title: {
        fontSize: '28px', fontWeight: 900, color: '#fff',
        letterSpacing: '-0.02em', lineHeight: 1.2,
    },
    candidateName: {
        color: '#8B5CF6', fontSize: '16px', marginTop: '8px',
        fontWeight: 400,
    },
    description: {
        color: '#64748B', fontSize: '14px', marginTop: '8px',
        lineHeight: 1.5, maxWidth: '400px', margin: '8px auto 0',
    },
    stepsContainer: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0', marginBottom: '8px', padding: '0 20px',
    },
    stepDot: {
        width: '32px', height: '32px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 800, flexShrink: 0,
        transition: 'all 0.3s ease',
    },
    stepLine: {
        flex: 1, height: '2px', maxWidth: '60px',
        transition: 'background 0.3s ease',
    },
    stepsLabels: {
        display: 'flex', justifyContent: 'space-around',
        marginBottom: '32px', padding: '0 10px',
    },
    stepTitle: {
        color: '#fff', fontWeight: 800, fontSize: '20px',
        textAlign: 'center', marginBottom: '8px',
    },
    stepDesc: {
        color: '#64748B', fontSize: '14px', textAlign: 'center',
        marginBottom: '24px',
    },
    templateGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px', marginBottom: '24px',
    },
    templateCard: {
        borderRadius: '16px', overflow: 'hidden',
        cursor: 'pointer', position: 'relative',
        background: '#1E293B', transition: 'all 0.3s ease',
        aspectRatio: '3/4',
    },
    templateImage: {
        width: '100%', height: '100%', objectFit: 'cover',
    },
    selectedBadge: {
        position: 'absolute', bottom: '8px', left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
        color: '#fff', padding: '4px 14px', borderRadius: '20px',
        fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
    },
    label: {
        color: '#94A3B8', fontSize: '12px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'block', marginBottom: '6px',
    },
    input: {
        width: '100%', padding: '14px 16px', borderRadius: '12px',
        background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', fontSize: '15px', outline: 'none',
        fontFamily: 'inherit', boxSizing: 'border-box',
    },
    uploadArea: {
        border: '2px dashed rgba(139,92,246,0.3)',
        borderRadius: '20px', padding: '48px 20px',
        textAlign: 'center', cursor: 'pointer',
        background: 'rgba(139,92,246,0.03)',
        transition: 'all 0.3s ease',
    },
    uploadIcon: {
        fontSize: '48px', marginBottom: '16px',
    },
    previewContainer: {
        borderRadius: '20px', overflow: 'hidden',
        position: 'relative', background: '#1E293B',
        border: '1px solid rgba(139,92,246,0.2)',
    },
    previewImage: {
        width: '100%', maxHeight: '350px', objectFit: 'contain',
        display: 'block',
    },
    changePhotoBtn: {
        position: 'absolute', bottom: '12px', right: '12px',
        padding: '8px 16px', borderRadius: '10px', border: 'none',
        background: 'rgba(0,0,0,0.7)', color: '#fff',
        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        backdropFilter: 'blur(8px)',
    },
    primaryButton: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: '16px 32px', borderRadius: '14px',
        border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
        color: '#fff', fontWeight: 800, fontSize: '15px',
        cursor: 'pointer', boxShadow: '0 4px 24px rgba(139,92,246,0.3)',
        width: '100%', transition: 'all 0.3s ease', fontFamily: 'inherit',
    },
    secondaryButton: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: '14px 24px', borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
        color: '#94A3B8', fontWeight: 600, fontSize: '14px',
        cursor: 'pointer', fontFamily: 'inherit',
    },
    errorBanner: {
        marginTop: '16px', padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
        color: '#EF4444', fontSize: '13px', fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    processingContainer: {
        padding: '20px 0',
    },
    processingAnimation: {
        position: 'relative', width: '100px', height: '100px',
        margin: '0 auto', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute', width: '100%', height: '100%',
        borderRadius: '50%', border: '2px solid rgba(139,92,246,0.3)',
        animation: 'pulse 2s ease infinite',
    },
    processingIcon: {
        fontSize: '48px', zIndex: 1,
    },
    processingSteps: {
        display: 'flex', flexDirection: 'column', gap: '10px',
        marginTop: '32px', maxWidth: '350px', margin: '32px auto 0',
    },
    confetti: {
        fontSize: '48px', marginBottom: '8px',
    },
    resultImageContainer: {
        borderRadius: '20px', overflow: 'hidden',
        border: '2px solid rgba(139,92,246,0.3)',
        boxShadow: '0 8px 40px rgba(139,92,246,0.15)',
        marginTop: '24px', background: '#1E293B',
    },
    resultImage: {
        width: '100%', display: 'block',
    },
    footer: {
        textAlign: 'center', marginTop: '48px',
        padding: '20px', color: '#334155', fontSize: '12px',
    },
    loadingContainer: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
    },
    spinner: {
        width: '48px', height: '48px',
        border: '3px solid rgba(139,92,246,0.2)',
        borderTop: '3px solid #8B5CF6', borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    errorContainer: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '20px', textAlign: 'center',
    },
    errorIcon: {
        fontSize: '48px', marginBottom: '16px',
    },
};
