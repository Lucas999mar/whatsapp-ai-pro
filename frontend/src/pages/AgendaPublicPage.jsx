import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, MapPin, User, ExternalLink,
  CalendarDays, Loader2, ChevronLeft, ChevronRight, Eye, AlertTriangle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParams, useSearchParams } from 'react-router-dom';

const API_BASE = (() => {
  let base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  if (base.endsWith('/')) base = base.slice(0, -1);
  return base.endsWith('/api') ? base : `${base}/api`;
})();

export default function AgendaPublicPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode') || 'month'; // 'day', 'single', 'month'
  const dateParam = searchParams.get('date'); // yyyy-MM-dd
  const appointmentId = searchParams.get('id'); // UUID
  const monthsParam = searchParams.get('months'); // comma-separated list of YYYY-MM

  const allowedMonths = useMemo(() => {
    if (!monthsParam) return [];
    return monthsParam.split(',').filter(Boolean);
  }, [monthsParam]);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState('');

  // Calendar state for month view
  const initialDate = useMemo(() => {
    if (dateParam) return parseISO(dateParam);
    if (monthsParam) {
      const firstMonth = monthsParam.split(',')[0];
      if (firstMonth) return parseISO(`${firstMonth}-01`);
    }
    return new Date();
  }, [dateParam, monthsParam]);

  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    fetchPublicAgenda();
  }, [token, mode, dateParam, appointmentId, currentMonth]);

  const fetchPublicAgenda = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/agenda/public/${token}`;
      const params = new URLSearchParams();

      if (mode === 'single' && appointmentId) {
        params.set('id', appointmentId);
      } else if (mode === 'day' && dateParam) {
        params.set('date', dateParam);
      } else {
        if (monthsParam) {
          params.set('months', monthsParam);
        } else {
          // month mode - fetch all for current displayed month
          const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
          const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
          params.set('start', start);
          params.set('end', end);
        }
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Agenda não encontrada');
      }

      const data = await res.json();
      setAppointments(data.appointments || []);
      setCompanyName(data.company_name || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPrevMonthDisabled = useMemo(() => {
    if (!monthsParam || allowedMonths.length === 0) return false;
    const prev = subMonths(currentMonth, 1);
    const prevStr = format(prev, 'yyyy-MM');
    return !allowedMonths.includes(prevStr);
  }, [currentMonth, monthsParam, allowedMonths]);

  const isNextMonthDisabled = useMemo(() => {
    if (!monthsParam || allowedMonths.length === 0) return false;
    const next = addMonths(currentMonth, 1);
    const nextStr = format(next, 'yyyy-MM');
    return !allowedMonths.includes(nextStr);
  }, [currentMonth, monthsParam, allowedMonths]);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="apub-badge apub-badge-confirmed">Confirmado</span>;
      case 'canceled':
        return <span className="apub-badge apub-badge-canceled">Cancelado</span>;
      case 'completed':
        return <span className="apub-badge apub-badge-completed">Concluído</span>;
      default:
        return <span className="apub-badge apub-badge-scheduled">Agendado</span>;
    }
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'confirmed': return '#25D366';
      case 'canceled': return '#EF4444';
      case 'completed': return '#3B82F6';
      default: return '#EAB308';
    }
  };

  // Calendar logic for month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const dateInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array.from({ length: startDayOfWeek }, () => null);
  const allDays = [...emptyDays, ...dateInterval];

  const getAppointmentsForDate = (date) => {
    return appointments.filter(app => isSameDay(parseISO(app.appointment_date), date));
  };

  const selectedDayAppointments = getAppointmentsForDate(selectedDate);

  // For "day" mode, filter for the specific date only
  const dayAppointments = useMemo(() => {
    if (mode === 'day' && dateParam) {
      return appointments.filter(app => app.appointment_date === dateParam);
    }
    return appointments;
  }, [appointments, mode, dateParam]);

  const renderAppointmentCard = (app) => (
    <div key={app.id} className="apub-card">
      <div className="apub-card-header">
        <div className="apub-card-title-area">
          <h4 className="apub-card-title">{app.title}</h4>
          {app.description && (
            <p className="apub-card-desc">{app.description.replace(/\[(?:Criado|Atualizado) por: [^\]]+\]\s*/g, '').trim()}</p>
          )}
        </div>
        {getStatusBadge(app.status)}
      </div>

      <div className="apub-card-details">
        <div className="apub-detail-row">
          <Clock size={14} className="apub-icon-green" />
          <span>
            {app.start_time?.slice(0, 5)}
            {app.end_time ? ` às ${app.end_time.slice(0, 5)}` : ''}
          </span>
        </div>

        <div className="apub-detail-row">
          <CalendarDays size={14} className="apub-icon-blue" />
          <span>{format(parseISO(app.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
        </div>

        {app.contact_name && (
          <div className="apub-detail-row">
            <User size={14} className="apub-icon-blue" />
            <span style={{ fontWeight: 600 }}>Reunião com {app.contact_name}</span>
            {app.contact_phone && <span className="apub-phone">• {app.contact_phone}</span>}
          </div>
        )}

        {app.location && (
          <div className="apub-detail-row">
            <MapPin size={14} className="apub-icon-purple" />
            <span className="apub-location">{app.location}</span>
            {app.location.startsWith('http') && (
              <a href={app.location} target="_blank" rel="noopener noreferrer" className="apub-link">
                Abrir <ExternalLink size={10} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Error state
  if (error) {
    return (
      <div className="apub-page">
        <div className="apub-bg-glow-1" />
        <div className="apub-bg-glow-2" />
        <div className="apub-container">
          <div className="apub-error-box">
            <AlertTriangle size={48} className="apub-icon-red" />
            <h2 className="apub-error-title">Agenda Indisponível</h2>
            <p className="apub-error-text">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apub-page">
      <div className="apub-bg-glow-1" />
      <div className="apub-bg-glow-2" />

      <div className="apub-container">

        {/* HEADER */}
        <div className="apub-header">
          <div className="apub-header-icon-wrap">
            <CalendarIcon size={28} className="apub-icon-green" />
          </div>
          <div>
            <h1 className="apub-header-title">
              {mode === 'single' ? 'Detalhes da Reunião' :
                mode === 'day' ? 'Agenda do Dia' : 'Agenda de Reuniões'}
            </h1>
            {companyName && <p className="apub-header-company">{companyName}</p>}
          </div>
          <div className="apub-header-badge">
            <Eye size={14} />
            <span>Visualização</span>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="apub-loading">
            <Loader2 className="apub-spinner" size={40} />
            <p className="apub-loading-text">Carregando agenda...</p>
          </div>
        ) : (
          <>
            {/* ── SINGLE MODE ────────────────────────── */}
            {mode === 'single' && (
              <div className="apub-single-wrap">
                {appointments.length === 0 ? (
                  <div className="apub-empty">
                    <CalendarDays size={48} className="apub-icon-muted" />
                    <p className="apub-empty-text">Reunião não encontrada ou removida.</p>
                  </div>
                ) : (
                  appointments.map(renderAppointmentCard)
                )}
              </div>
            )}

            {/* ── DAY MODE ───────────────────────────── */}
            {mode === 'day' && (
              <div className="apub-day-wrap">
                <div className="apub-day-header">
                  <CalendarDays size={20} className="apub-icon-green" />
                  <h2 className="apub-day-title">
                    {dateParam ? format(parseISO(dateParam), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Hoje'}
                  </h2>
                </div>

                {dayAppointments.length === 0 ? (
                  <div className="apub-empty">
                    <CalendarDays size={48} className="apub-icon-muted" />
                    <p className="apub-empty-text">Nenhum compromisso para este dia.</p>
                  </div>
                ) : (
                  <div className="apub-cards-list">
                    {dayAppointments.map(renderAppointmentCard)}
                  </div>
                )}
              </div>
            )}

            {/* ── MONTH MODE ─────────────────────────── */}
            {mode === 'month' && (
              <div className="apub-month-layout">
                {/* Calendar Grid */}
                <div className="apub-calendar-panel">
                  <div className="apub-calendar-nav">
                    <h3 className="apub-month-name">
                      {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    <div className="apub-nav-btns">
                      <button onClick={handlePrevMonth} className="apub-nav-btn" disabled={isPrevMonthDisabled}>
                        <ChevronLeft size={18} />
                      </button>
                      <button onClick={handleNextMonth} className="apub-nav-btn" disabled={isNextMonthDisabled}>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="apub-weekdays">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} className="apub-weekday">{d}</div>
                    ))}
                  </div>

                  <div className="apub-days-grid">
                    {allDays.map((day, idx) => {
                      if (!day) return <div key={`e-${idx}`} className="apub-day-cell-empty" />;

                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());
                      const dayApps = getAppointmentsForDate(day);

                      return (
                        <button
                          key={day.toString()}
                          onClick={() => setSelectedDate(day)}
                          className={`apub-day-cell ${isSelected ? 'apub-day-selected' : isToday ? 'apub-day-today' : ''}`}
                        >
                          <span>{format(day, 'd')}</span>
                          {dayApps.length > 0 && (
                            <div className="apub-day-dots">
                              {dayApps.slice(0, 3).map((app) => (
                                <div
                                  key={app.id}
                                  className="apub-dot"
                                  style={{ backgroundColor: getStatusDotColor(app.status), boxShadow: `0 0 6px ${getStatusDotColor(app.status)}` }}
                                />
                              ))}
                              {dayApps.length > 3 && <div className="apub-dot apub-dot-more" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Day Details */}
                <div className="apub-day-detail-panel">
                  <div className="apub-detail-panel-header">
                    <span className="apub-detail-label">Compromissos para</span>
                    <h3 className="apub-detail-date">
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                  </div>

                  <div className="apub-detail-panel-body">
                    {selectedDayAppointments.length === 0 ? (
                      <div className="apub-empty-small">
                        <CalendarDays size={32} className="apub-icon-muted" />
                        <p className="apub-empty-text-sm">Nenhum compromisso neste dia.</p>
                      </div>
                    ) : (
                      <div className="apub-cards-list">
                        {selectedDayAppointments.map(renderAppointmentCard)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="apub-footer">
              <p>Agenda atualizada em tempo real • Somente visualização</p>
            </div>
          </>
        )}
      </div>

      <style>{`
        /* ── RESET & BASE ─────────────────────── */
        .apub-page {
          min-height: 100vh;
          background: #0B0F19;
          color: #e2e8f0;
          font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .apub-bg-glow-1 {
          position: fixed;
          top: -15%;
          left: -10%;
          width: 45%;
          height: 45%;
          border-radius: 50%;
          background: rgba(37, 211, 102, 0.06);
          filter: blur(120px);
          pointer-events: none;
        }

        .apub-bg-glow-2 {
          position: fixed;
          bottom: -15%;
          right: -10%;
          width: 35%;
          height: 35%;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.06);
          filter: blur(100px);
          pointer-events: none;
        }

        .apub-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 20px;
          position: relative;
          z-index: 1;
        }

        /* ── HEADER ───────────────────────────── */
        .apub-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 36px;
          flex-wrap: wrap;
        }

        .apub-header-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 20px;
          background: rgba(37, 211, 102, 0.1);
          border: 1px solid rgba(37, 211, 102, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .apub-header-title {
          font-size: 28px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.03em;
          margin: 0;
          line-height: 1.2;
        }

        .apub-header-company {
          font-size: 14px;
          color: #64748b;
          margin: 4px 0 0 0;
          font-weight: 600;
        }

        .apub-header-badge {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* ── LOADING ──────────────────────────── */
        .apub-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 0;
        }

        .apub-spinner {
          color: #25D366;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .apub-loading-text {
          margin-top: 16px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #64748b;
        }

        /* ── ERROR ────────────────────────────── */
        .apub-error-box {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 24px;
          padding: 60px 40px;
          text-align: center;
          max-width: 500px;
          margin: 80px auto;
        }

        .apub-error-title {
          font-size: 24px;
          font-weight: 900;
          color: #f87171;
          margin: 20px 0 8px;
        }

        .apub-error-text {
          color: #94a3b8;
          font-size: 14px;
        }

        /* ── APPOINTMENT CARD ─────────────────── */
        .apub-card {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s ease;
          min-width: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .apub-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .apub-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .apub-card-title-area {
          flex: 1;
          min-width: 0;
        }

        .apub-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .apub-card-desc {
          font-size: 13px;
          color: #94a3b8;
          margin: 6px 0 0 0;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .apub-card-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }

        .apub-detail-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: #94a3b8;
          min-width: 0;
        }

        .apub-detail-row svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .apub-phone {
          color: #64748b;
        }

        .apub-location {
          flex: 1;
          min-width: 0;
          white-space: normal;
          word-break: break-word;
        }

        .apub-link {
          color: #60a5fa;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 3px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .apub-link:hover {
          text-decoration: underline;
        }

        /* ── BADGES ───────────────────────────── */
        .apub-badge {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 100px;
          letter-spacing: 0.04em;
          flex-shrink: 0;
          border: 1px solid;
        }

        .apub-badge-confirmed {
          background: rgba(37, 211, 102, 0.1);
          color: #25D366;
          border-color: rgba(37, 211, 102, 0.2);
        }

        .apub-badge-canceled {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.2);
        }

        .apub-badge-completed {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.2);
        }

        .apub-badge-scheduled {
          background: rgba(234, 179, 8, 0.1);
          color: #facc15;
          border-color: rgba(234, 179, 8, 0.2);
        }

        /* ── ICON COLORS ──────────────────────── */
        .apub-icon-green { color: #25D366; }
        .apub-icon-blue { color: #60a5fa; }
        .apub-icon-purple { color: #a78bfa; }
        .apub-icon-red { color: #f87171; }
        .apub-icon-muted { color: #334155; }

        /* ── SINGLE MODE ──────────────────────── */
        .apub-single-wrap {
          max-width: 600px;
          margin: 0 auto;
        }

        /* ── DAY MODE ─────────────────────────── */
        .apub-day-wrap {
          max-width: 700px;
          margin: 0 auto;
        }

        .apub-day-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .apub-day-title {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          text-transform: capitalize;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .apub-cards-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── MONTH MODE ───────────────────────── */
        .apub-month-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
        }

        @media (max-width: 900px) {
          .apub-month-layout {
            grid-template-columns: 1fr;
          }
        }

        .apub-calendar-panel {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 28px;
          padding: 32px;
          backdrop-filter: blur(20px);
        }

        .apub-calendar-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .apub-month-name {
          font-size: 22px;
          font-weight: 900;
          color: #fff;
          text-transform: capitalize;
          letter-spacing: -0.03em;
          font-style: italic;
          margin: 0;
        }

        .apub-nav-btns {
          display: flex;
          gap: 8px;
        }

        .apub-nav-btn {
          padding: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .apub-nav-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .apub-nav-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.01);
          border-color: rgba(255, 255, 255, 0.02);
          color: #475569;
        }

        .apub-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 12px;
          text-align: center;
        }

        .apub-weekday {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #475569;
        }

        .apub-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .apub-day-cell-empty {
          aspect-ratio: 1;
        }

        .apub-day-cell {
          aspect-ratio: 1;
          position: relative;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(0, 0, 0, 0.2);
          color: #cbd5e1;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apub-day-cell:hover {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
        }

        .apub-day-selected {
          background: linear-gradient(135deg, rgba(37, 211, 102, 0.15), transparent);
          border-color: #25D366 !important;
          color: #25D366;
          box-shadow: inset 0 0 15px rgba(37, 211, 102, 0.1);
          transform: scale(1.04);
        }

        .apub-day-today {
          background: rgba(255, 255, 255, 0.04);
          border-color: #3B82F6 !important;
          color: #60a5fa;
        }

        .apub-day-dots {
          position: absolute;
          bottom: 6px;
          display: flex;
          gap: 3px;
          justify-content: center;
        }

        .apub-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .apub-dot-more {
          background: #fff !important;
          opacity: 0.3;
          box-shadow: none !important;
        }

        /* ── DAY DETAIL PANEL ─────────────────── */
        .apub-day-detail-panel {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 28px;
          padding: 32px;
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          min-height: 500px;
        }

        .apub-detail-panel-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .apub-detail-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #475569;
        }

        .apub-detail-date {
          font-size: 18px;
          font-weight: 900;
          color: #fff;
          text-transform: uppercase;
          font-style: italic;
          letter-spacing: -0.03em;
          margin: 6px 0 0 0;
        }

        .apub-detail-panel-body {
          flex: 1;
          overflow-y: auto;
        }

        /* ── EMPTY STATES ─────────────────────── */
        .apub-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          border: 2px dashed rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          text-align: center;
        }

        .apub-empty-text {
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
          margin: 12px 0 0 0;
        }

        .apub-empty-small {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          border: 2px dashed rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          text-align: center;
        }

        .apub-empty-text-sm {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          margin: 10px 0 0 0;
        }

        /* ── FOOTER ───────────────────────────── */
        .apub-footer {
          text-align: center;
          padding: 40px 0 20px;
          font-size: 12px;
          color: #334155;
          font-weight: 600;
        }

        /* ── RESPONSIVE ───────────────────────── */
        @media (max-width: 600px) {
          .apub-container {
            padding: 24px 16px;
          }

          .apub-header-title {
            font-size: 22px;
          }

          .apub-header-badge {
            display: none;
          }

          .apub-calendar-panel,
          .apub-day-detail-panel {
            padding: 20px;
            border-radius: 20px;
          }

          .apub-card {
            padding: 18px;
          }

          .apub-day-cell {
            font-size: 12px;
            border-radius: 10px;
          }
        }
      `}</style>
    </div>
  );
}
