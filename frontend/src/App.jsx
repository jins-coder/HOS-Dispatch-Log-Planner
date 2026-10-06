import React, { useState, useEffect } from 'react';
import {
  Truck,
  Clock,
  Fuel,
  ShieldCheck,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Gauge
} from 'lucide-react';
import TripForm from './components/TripForm.jsx';
import MapView from './components/MapView.jsx';
import EldLogSheet from './components/EldLogSheet.jsx';
import MilestonesTimeline from './components/MilestonesTimeline.jsx';

export default function App() {
  const [currentLoc, setCurrentLoc] = useState('Chicago, IL');
  const [pickupLoc, setPickupLoc] = useState('St. Louis, MO');
  const [dropoffLoc, setDropoffLoc] = useState('Dallas, TX');
  const [cycleUsed, setCycleUsed] = useState(12.0);

  const [pickingMode, setPickingMode] = useState(null);
  const [previewPins, setPreviewPins] = useState({});
  const [notice, setNotice] = useState(null);

  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const handlePlanTrip = async (params) => {
    const payload = params || {
      current_location: currentLoc,
      pickup_location: pickupLoc,
      dropoff_location: dropoffLoc,
      current_cycle_used: Number(cycleUsed)
    };

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/plan-trip/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to plan trip. Please check your locations.');
      }

      setPlanResult(data);
      setSelectedDayIndex(0);

      if (data.locations) {
        setPreviewPins({
          current: data.locations.current ? { lat: data.locations.current.lat, lon: data.locations.current.lon, name: data.locations.current.display_name } : null,
          pickup: data.locations.pickup ? { lat: data.locations.pickup.lat, lon: data.locations.pickup.lon, name: data.locations.pickup.display_name } : null,
          dropoff: data.locations.dropoff ? { lat: data.locations.dropoff.lat, lon: data.locations.dropoff.lon, name: data.locations.dropoff.display_name } : null,
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred while calculating route.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (lat, lng, mode) => {
    if (!mode) return;

    try {
      const res = await fetch(`/api/geocode/?lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const disp = data.display_name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

      if (mode === 'current') {
        setCurrentLoc(disp);
        setPreviewPins((prev) => ({ ...prev, current: { lat, lon: lng, name: disp } }));
        showNotice(`Set Starting Location to: ${disp}`);
      } else if (mode === 'pickup') {
        setPickupLoc(disp);
        setPreviewPins((prev) => ({ ...prev, pickup: { lat, lon: lng, name: disp } }));
        showNotice(`Set Pickup Location to: ${disp}`);
      } else if (mode === 'dropoff') {
        setDropoffLoc(disp);
        setPreviewPins((prev) => ({ ...prev, dropoff: { lat, lon: lng, name: disp } }));
        showNotice(`Set Dropoff Location to: ${disp}`);
      }
    } catch {
      const coords = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
      if (mode === 'current') {
        setCurrentLoc(coords);
        setPreviewPins((prev) => ({ ...prev, current: { lat, lon: lng, name: coords } }));
      } else if (mode === 'pickup') {
        setPickupLoc(coords);
        setPreviewPins((prev) => ({ ...prev, pickup: { lat, lon: lng, name: coords } }));
      } else if (mode === 'dropoff') {
        setDropoffLoc(coords);
        setPreviewPins((prev) => ({ ...prev, dropoff: { lat, lon: lng, name: coords } }));
      }
      showNotice(`Set coordinates: ${coords}`);
    }

    setPickingMode(null);
  };

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    handlePlanTrip();
  }, []);

  const activeLog = planResult?.daily_logs?.[selectedDayIndex] || null;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-group">
            <div className="logo-icon-wrapper">
              <Truck size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 className="logo-title">HOS Dispatch &amp; Log Planner</h1>
                <span className="logo-badge">49 CFR - 395</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Property-Carrying Commercial Vehicle Operations (70h / 8-Day Rule)
              </p>
            </div>
          </div>

          <div className="header-badges">
            <div className="spec-badge">
              <Clock size={13} />
              <span><strong>11h</strong> Drive / <strong>14h</strong> Window</span>
            </div>
            <div className="spec-badge">
              <Fuel size={13} />
              <span>Fuel &lt; <strong>1,000 mi</strong></span>
            </div>
            <div className="spec-badge">
              <ShieldCheck size={13} />
              <span><strong>70h / 8-Day</strong> Rule</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {notice && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#a7f3d0',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem'
          }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>{notice}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}>
            <AlertTriangle size={20} color="#ef4444" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="planner-grid">
          <TripForm
            currentLoc={currentLoc}
            setCurrentLoc={setCurrentLoc}
            pickupLoc={pickupLoc}
            setPickupLoc={setPickupLoc}
            dropoffLoc={dropoffLoc}
            setDropoffLoc={setDropoffLoc}
            cycleUsed={cycleUsed}
            setCycleUsed={setCycleUsed}
            pickingMode={pickingMode}
            setPickingMode={setPickingMode}
            onSubmit={handlePlanTrip}
            loading={loading}
            apiBaseUrl="/api"
          />

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-title-group">
              <h2 className="card-title">
                <Truck size={20} />
                Interactive Route & Stop Map
              </h2>
            </div>
            <MapView
              geometry={planResult?.full_geometry}
              milestones={planResult?.milestones}
              locations={planResult?.locations}
              previewPins={previewPins}
              pickingMode={pickingMode}
              onMapClick={handleMapClick}
              onCancelPicking={() => setPickingMode(null)}
            />
          </div>
        </div>

        {planResult?.summary && (
          <div className="summary-bar">
            <div className="kpi-card">
              <div className="kpi-icon blue">
                <Gauge size={22} />
              </div>
              <div>
                <div className="kpi-val">{planResult.summary.total_miles.toLocaleString()} mi</div>
                <div className="kpi-lbl">Total Trip Distance</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon emerald">
                <Clock size={22} />
              </div>
              <div>
                <div className="kpi-val">{planResult.summary.total_driving_hours} hrs</div>
                <div className="kpi-lbl">Total Driving Time</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon amber">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="kpi-val">{planResult.summary.total_on_duty_hours} hrs</div>
                <div className="kpi-lbl">Total On-Duty Time</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon purple">
                <Calendar size={22} />
              </div>
              <div>
                <div className="kpi-val">{planResult.summary.total_days} {planResult.summary.total_days === 1 ? 'Day' : 'Days'}</div>
                <div className="kpi-lbl">ELD Log Sheets</div>
              </div>
            </div>
          </div>
        )}

        {planResult?.daily_logs && planResult.daily_logs.length > 0 && (
          <div className="glass-card">
            <div className="log-section-header">
              <div className="card-title-group" style={{ marginBottom: 0 }}>
                <h2 className="card-title">
                  <Printer size={18} />
                  Driver's Daily Log (ELD Format)
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="day-tabs">
                  {planResult.daily_logs.map((sheet, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`day-tab ${selectedDayIndex === idx ? 'active' : ''}`}
                      onClick={() => setSelectedDayIndex(idx)}
                    >
                      <Calendar size={14} />
                      <span>Day {sheet.day_number} ({sheet.date})</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Print Daily Logs</span>
                </button>
              </div>
            </div>

            {activeLog && (
              <EldLogSheet
                log={activeLog}
                currentDayIndex={selectedDayIndex}
                totalDays={planResult.daily_logs.length}
              />
            )}
          </div>
        )}

        {planResult?.milestones && planResult.milestones.length > 0 && (
          <MilestonesTimeline milestones={planResult.milestones} />
        )}
      </main>
    </div>
  );
}