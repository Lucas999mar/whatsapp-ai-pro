import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import {
    Camera, Plus, Trash2, Copy, ExternalLink, Image as ImageIcon,
    CheckCircle2, XCircle, Clock, Users, Eye, Share2, Settings,
    Upload, ChevronDown, ChevronUp, Link2, BarChart2, Sparkles,
    RefreshCw, AlertCircle
} from 'lucide-react';

export default function PhotoCampaignAdmin() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [expandedCampaign, setExpandedCampaign] = useState(null);
    const [submissions, setSubmissions] = useState({});
    const [uploadingTemplate, setUploadingTemplate] = useState(null);
    const [newCampaign, setNewCampaign] = useState({ title: '', description: '', candidate_name: '' });
    const [copiedLink, setCopiedLink] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => { loadCampaigns(); }, []);

    async function loadCampaigns() {
        try {
            setLoading(true);
            const { data } = await api.get('/photo-campaigns');
            setCampaigns(data || []);
        } catch (err) {
            console.error('Erro ao carregar campanhas:', err);
        } finally {
            setLoading(false);
        }
    }

    async function createCampaign() {
        if (!newCampaign.title.trim()) return;
        try {
            const { data } = await api.post('/photo-campaigns', newCampaign);
            setCampaigns(prev => [data, ...prev]);
            setNewCampaign({ title: '', description: '', candidate_name: '' });
            setShowCreate(false);
        } catch (err) {
            alert('Erro ao criar campanha: ' + (err.response?.data?.error || err.message));
        }
    }

    async function deleteCampaign(id) {
        if (!confirm('Tem certeza que deseja excluir esta campanha? Todas as fotos serão perdidas.')) return;
        try {
            await api.delete(`/photo-campaigns/${id}`);
            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert('Erro ao excluir: ' + (err.response?.data?.error || err.message));
        }
    }

    async function toggleCampaign(campaign) {
        try {
            const { data } = await api.put(`/photo-campaigns/${campaign.id}`, { active: !campaign.active });
            setCampaigns(prev => prev.map(c => c.id === data.id ? data : c));
        } catch (err) {
            alert('Erro ao atualizar: ' + err.message);
        }
    }

    async function uploadTemplate(campaignId, file) {
        try {
            setUploadingTemplate(campaignId);
            const formData = new FormData();
            formData.append('template', file);

            const { data } = await api.post(`/photo-campaigns/${campaignId}/templates`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Recarregar campanhas para pegar o template atualizado
            await loadCampaigns();
        } catch (err) {
            alert('Erro no upload: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploadingTemplate(null);
        }
    }

    async function deleteTemplate(campaignId, templateId) {
        if (!confirm('Remover esta foto modelo?')) return;
        try {
            await api.delete(`/photo-campaigns/${campaignId}/templates/${templateId}`);
            await loadCampaigns();
        } catch (err) {
            alert('Erro ao remover: ' + err.message);
        }
    }

    async function loadSubmissions(campaignId) {
        try {
            const { data } = await api.get(`/photo-campaigns/${campaignId}/submissions`);
            setSubmissions(prev => ({ ...prev, [campaignId]: data || [] }));
        } catch (err) {
            console.error('Erro ao carregar submissões:', err);
        }
    }

    function getShareUrl(shareToken) {
        const base = window.location.origin;
        return `${base}/foto-candidato/${shareToken}`;
    }

    function copyLink(shareToken) {
        navigator.clipboard.writeText(getShareUrl(shareToken));
        setCopiedLink(shareToken);
        setTimeout(() => setCopiedLink(null), 2000);
    }

    function toggleExpand(campaignId) {
        if (expandedCampaign === campaignId) {
            setExpandedCampaign(null);
        } else {
            setExpandedCampaign(campaignId);
            loadSubmissions(campaignId);
        }
    }

    // ────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────

    return (
        <div style={{ padding: '0' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '32px', flexWrap: 'wrap', gap: '16px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '28px', fontWeight: 900, color: '#fff',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        letterSpacing: '-0.02em'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '16px',
                            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 32px rgba(139,92,246,0.3)'
                        }}>
                            <Camera size={24} color="#fff" />
                        </div>
                        Foto com Candidato
                    </h1>
                    <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px' }}>
                        Crie campanhas de foto com o candidato para eleitores
                    </p>
                </div>

                <button
                    onClick={() => setShowCreate(!showCreate)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 24px', borderRadius: '12px', border: 'none',
                        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                        color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                        boxShadow: '0 4px 24px rgba(139,92,246,0.3)',
                        transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                >
                    <Plus size={18} /> Nova Campanha
                </button>
            </div>

            {/* Create Campaign Modal */}
            {showCreate && (
                <div style={{
                    background: '#0F172A', borderRadius: '20px', padding: '28px',
                    border: '1px solid rgba(139,92,246,0.2)', marginBottom: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    animation: 'slideDown 0.3s ease'
                }}>
                    <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', marginBottom: '20px' }}>
                        <Sparkles size={18} style={{ display: 'inline', marginRight: '8px', color: '#8B5CF6' }} />
                        Nova Campanha
                    </h3>

                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                            <label style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Nome da Campanha *
                            </label>
                            <input
                                value={newCampaign.title}
                                onChange={e => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ex: Campanha Eleição 2026"
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '10px',
                                    background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '14px', marginTop: '6px',
                                    outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Nome do Candidato
                            </label>
                            <input
                                value={newCampaign.candidate_name}
                                onChange={e => setNewCampaign(prev => ({ ...prev, candidate_name: e.target.value }))}
                                placeholder="Ex: João Silva"
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '10px',
                                    background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '14px', marginTop: '6px',
                                    outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Descrição
                            </label>
                            <textarea
                                value={newCampaign.description}
                                onChange={e => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descrição que aparecerá na página pública..."
                                rows={3}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '10px',
                                    background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: '14px', marginTop: '6px',
                                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowCreate(false)}
                            style={{
                                padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                                background: 'transparent', color: '#94A3B8', fontWeight: 600,
                                cursor: 'pointer', fontSize: '14px'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={createCampaign}
                            disabled={!newCampaign.title.trim()}
                            style={{
                                padding: '10px 24px', borderRadius: '10px', border: 'none',
                                background: newCampaign.title.trim() ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : '#334155',
                                color: '#fff', fontWeight: 700, cursor: newCampaign.title.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '14px'
                            }}
                        >
                            Criar Campanha
                        </button>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{
                        width: '48px', height: '48px', border: '3px solid rgba(139,92,246,0.2)',
                        borderTop: '3px solid #8B5CF6', borderRadius: '50%',
                        animation: 'spin 1s linear infinite', margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#64748B', fontSize: '14px' }}>Carregando campanhas...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && campaigns.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '80px 20px',
                    background: '#0F172A', borderRadius: '24px',
                    border: '1px dashed rgba(139,92,246,0.3)'
                }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '24px',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <Camera size={36} color="#8B5CF6" />
                    </div>
                    <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>
                        Nenhuma campanha criada
                    </h3>
                    <p style={{ color: '#64748B', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Crie sua primeira campanha de "Foto com Candidato" e compartilhe o link com eleitores.
                    </p>
                </div>
            )}

            {/* Campaign Cards */}
            <div style={{ display: 'grid', gap: '20px' }}>
                {campaigns.map(campaign => {
                    const isExpanded = expandedCampaign === campaign.id;
                    const campaignSubs = submissions[campaign.id] || [];
                    const templateCount = (campaign.templates || []).length;

                    return (
                        <div key={campaign.id} style={{
                            background: '#0F172A', borderRadius: '20px',
                            border: `1px solid ${campaign.active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)'}`,
                            overflow: 'hidden', transition: 'all 0.3s ease',
                            boxShadow: campaign.active ? '0 4px 24px rgba(139,92,246,0.1)' : 'none'
                        }}>
                            {/* Campaign Header */}
                            <div style={{
                                padding: '24px', display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', cursor: 'pointer',
                                flexWrap: 'wrap', gap: '12px'
                            }}
                                onClick={() => toggleExpand(campaign.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '200px' }}>
                                    <div style={{
                                        width: '52px', height: '52px', borderRadius: '16px',
                                        background: campaign.active
                                            ? 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                                            : '#1E293B',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <Camera size={22} color={campaign.active ? '#fff' : '#475569'} />
                                    </div>
                                    <div>
                                        <h3 style={{
                                            color: '#fff', fontWeight: 800, fontSize: '16px',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            {campaign.title}
                                            <span style={{
                                                fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                                                background: campaign.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: campaign.active ? '#22C55E' : '#EF4444',
                                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
                                            }}>
                                                {campaign.active ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </h3>
                                        <p style={{ color: '#64748B', fontSize: '13px', marginTop: '2px' }}>
                                            {campaign.candidate_name && `Candidato: ${campaign.candidate_name} · `}
                                            {templateCount} modelo{templateCount !== 1 ? 's' : ''} ·
                                            Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {/* Copy Link */}
                                    <button
                                        onClick={e => { e.stopPropagation(); copyLink(campaign.share_token); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px', borderRadius: '10px', border: 'none',
                                            background: copiedLink === campaign.share_token ? 'rgba(34,197,94,0.15)' : 'rgba(139,92,246,0.1)',
                                            color: copiedLink === campaign.share_token ? '#22C55E' : '#8B5CF6',
                                            fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        title="Copiar link público"
                                    >
                                        {copiedLink === campaign.share_token ? <CheckCircle2 size={14} /> : <Link2 size={14} />}
                                        {copiedLink === campaign.share_token ? 'Copiado!' : 'Link'}
                                    </button>

                                    {/* Toggle Active */}
                                    <button
                                        onClick={e => { e.stopPropagation(); toggleCampaign(campaign); }}
                                        style={{
                                            padding: '8px 14px', borderRadius: '10px', border: 'none',
                                            background: campaign.active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                            color: campaign.active ? '#EF4444' : '#22C55E',
                                            fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}
                                    >
                                        {campaign.active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                        {campaign.active ? 'Desativar' : 'Ativar'}
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={e => { e.stopPropagation(); deleteCampaign(campaign.id); }}
                                        style={{
                                            padding: '8px', borderRadius: '10px', border: 'none',
                                            background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    {/* Expand */}
                                    <div style={{ color: '#64748B' }}>
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div style={{
                                    padding: '0 24px 24px',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                    animation: 'slideDown 0.3s ease'
                                }}>
                                    {/* Share Link Section */}
                                    <div style={{
                                        marginTop: '20px', padding: '16px', borderRadius: '12px',
                                        background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)'
                                    }}>
                                        <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                            <Share2 size={12} style={{ display: 'inline', marginRight: '6px' }} />
                                            Link Público para Eleitores
                                        </p>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            background: '#1E293B', borderRadius: '10px', padding: '10px 14px'
                                        }}>
                                            <code style={{
                                                flex: 1, color: '#8B5CF6', fontSize: '13px',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                            }}>
                                                {getShareUrl(campaign.share_token)}
                                            </code>
                                            <button
                                                onClick={() => copyLink(campaign.share_token)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                    background: '#8B5CF6', color: '#fff', fontSize: '12px',
                                                    fontWeight: 700, cursor: 'pointer', flexShrink: 0
                                                }}
                                            >
                                                <Copy size={12} />
                                            </button>
                                            <button
                                                onClick={() => window.open(getShareUrl(campaign.share_token), '_blank')}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                    background: 'rgba(139,92,246,0.2)', color: '#8B5CF6', fontSize: '12px',
                                                    fontWeight: 700, cursor: 'pointer', flexShrink: 0
                                                }}
                                            >
                                                <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Templates Section */}
                                    <div style={{ marginTop: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <h4 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                                                <ImageIcon size={16} style={{ display: 'inline', marginRight: '8px', color: '#8B5CF6' }} />
                                                Fotos Modelo ({templateCount})
                                            </h4>
                                            <label style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '8px 16px', borderRadius: '10px', border: 'none',
                                                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                                                color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                                            }}>
                                                {uploadingTemplate === campaign.id ? (
                                                    <>
                                                        <RefreshCw size={14} className="animate-spin" /> Enviando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={14} /> Adicionar Foto Modelo
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    style={{ display: 'none' }}
                                                    disabled={uploadingTemplate === campaign.id}
                                                    onChange={e => {
                                                        if (e.target.files[0]) uploadTemplate(campaign.id, e.target.files[0]);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        {templateCount === 0 ? (
                                            <div style={{
                                                textAlign: 'center', padding: '40px', borderRadius: '12px',
                                                border: '2px dashed rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.03)'
                                            }}>
                                                <Upload size={32} color="#475569" />
                                                <p style={{ color: '#64748B', fontSize: '13px', marginTop: '12px' }}>
                                                    Adicione fotos do candidato como modelos.<br />
                                                    Os eleitores escolherão em qual desejam aparecer.
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                                gap: '12px'
                                            }}>
                                                {(campaign.templates || []).map(template => (
                                                    <div key={template.id} style={{
                                                        position: 'relative', borderRadius: '12px', overflow: 'hidden',
                                                        border: '1px solid rgba(255,255,255,0.05)', background: '#1E293B',
                                                        aspectRatio: '1', group: 'template'
                                                    }}>
                                                        <img
                                                            src={template.url}
                                                            alt={template.original_name}
                                                            style={{
                                                                width: '100%', height: '100%', objectFit: 'cover',
                                                            }}
                                                            onError={e => { e.target.style.display = 'none'; }}
                                                        />
                                                        <div style={{
                                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                                            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                            padding: '24px 12px 12px', display: 'flex',
                                                            alignItems: 'flex-end', justifyContent: 'space-between'
                                                        }}>
                                                            <span style={{
                                                                color: '#fff', fontSize: '11px', fontWeight: 600,
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                maxWidth: '70%'
                                                            }}>
                                                                {template.original_name || 'Modelo'}
                                                            </span>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); deleteTemplate(campaign.id, template.id); }}
                                                                style={{
                                                                    padding: '4px 8px', borderRadius: '6px', border: 'none',
                                                                    background: 'rgba(239,68,68,0.8)', color: '#fff',
                                                                    cursor: 'pointer', fontSize: '10px'
                                                                }}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        {template.scene_analysis && (
                                                            <div style={{
                                                                position: 'absolute', top: '8px', right: '8px',
                                                                background: 'rgba(139,92,246,0.9)', padding: '3px 8px',
                                                                borderRadius: '6px', fontSize: '9px', color: '#fff',
                                                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
                                                            }}>
                                                                IA Analisada ✓
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submissions/Gallery */}
                                    <div style={{ marginTop: '28px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <h4 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                                                <Users size={16} style={{ display: 'inline', marginRight: '8px', color: '#EC4899' }} />
                                                Fotos Geradas ({campaignSubs.length})
                                            </h4>
                                            <button
                                                onClick={() => loadSubmissions(campaign.id)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', border: 'none',
                                                    background: 'rgba(255,255,255,0.05)', color: '#94A3B8',
                                                    cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'
                                                }}
                                            >
                                                <RefreshCw size={12} /> Atualizar
                                            </button>
                                        </div>

                                        {campaignSubs.length === 0 ? (
                                            <p style={{
                                                color: '#475569', fontSize: '13px', textAlign: 'center',
                                                padding: '30px', background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '12px'
                                            }}>
                                                Nenhuma foto gerada ainda. Compartilhe o link público!
                                            </p>
                                        ) : (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                                gap: '12px'
                                            }}>
                                                {campaignSubs.map(sub => (
                                                    <div key={sub.id} style={{
                                                        borderRadius: '12px', overflow: 'hidden',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        background: '#1E293B'
                                                    }}>
                                                        {sub.status === 'completed' && sub.result_url ? (
                                                            <img
                                                                src={sub.result_url}
                                                                alt={`Foto de ${sub.voter_name}`}
                                                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: '100%', aspectRatio: '1',
                                                                display: 'flex', flexDirection: 'column',
                                                                alignItems: 'center', justifyContent: 'center',
                                                                background: sub.status === 'error' ? 'rgba(239,68,68,0.05)' : 'rgba(139,92,246,0.05)'
                                                            }}>
                                                                {sub.status === 'processing' && (
                                                                    <>
                                                                        <div style={{
                                                                            width: '32px', height: '32px', border: '3px solid rgba(139,92,246,0.2)',
                                                                            borderTop: '3px solid #8B5CF6', borderRadius: '50%',
                                                                            animation: 'spin 1s linear infinite'
                                                                        }} />
                                                                        <p style={{ color: '#8B5CF6', fontSize: '12px', marginTop: '12px' }}>
                                                                            Processando...
                                                                        </p>
                                                                    </>
                                                                )}
                                                                {sub.status === 'error' && (
                                                                    <>
                                                                        <AlertCircle size={32} color="#EF4444" />
                                                                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '12px' }}>
                                                                            Erro na geração
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div style={{ padding: '12px' }}>
                                                            <p style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>
                                                                {sub.voter_name || 'Anônimo'}
                                                            </p>
                                                            <p style={{ color: '#64748B', fontSize: '11px' }}>
                                                                {new Date(sub.created_at).toLocaleString('pt-BR')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Animations */}
            <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
