import React from 'react';
import { Bookmark, Route, ArrowRight } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete.jsx';

const PRESET_TRIPS = [
  { label: "LA → Phoenix → Atlanta", current: "Los Angeles, CA", pickup: "Phoenix, AZ", dropoff: "Atlanta, GA", cycle: 14.5 },
  { label: "Chicago → St. Louis → Dallas", current: "Chicago, IL", pickup: "St. Louis, MO", dropoff: "Dallas, TX", cycle: 8.0 },
  { label: "Indianapolis → Cincinnati → Columbus", current: "Indianapolis, IN", pickup: "Cincinnati, OH", dropoff: "Columbus, OH", cycle: 25.0 },
  { label: "Denver → Omaha → Chicago", current: "Denver, CO", pickup: "Omaha, NE", dropoff: "Chicago, IL", cycle: 62.0 }
];

export default function TripForm({
  currentLoc, setCurrentLoc,
  pickupLoc, setPickupLoc,
  dropoffLoc, setDropoffLoc,
  cycleUsed, setCycleUsed,
  pickingMode, setPickingMode,
  onSubmit, loading, apiBaseUrl = '/api'
}) {
  const applyPreset = (preset) => {
    setCurrentLoc(preset.current);
    setPickupLoc(preset.pickup);
    setDropoffLoc(preset.dropoff);
    setCycleUsed(preset.cycle);
    setPickingMode(null);
    onSubmit({
      current_location: preset.current,
      pickup_location: preset.pickup,
      dropoff_location: preset.dropoff,
      current_cycle_used: parseFloat(preset.cycle)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentLoc || !pickupLoc || !dropoffLoc) return;
    setPickingMode(null);
    onSubmit({
      current_location: currentLoc,
      pickup_location: pickupLoc,
      dropoff_location: dropoffLoc,
      current_cycle_used: parseFloat(cycleUsed)
    });
  };

  return (
    <div className="glass-card">
      <div className="card-title-group">
        <h2 className="card-title">
          <Route size={18} />
          Dispatch & HOS Parameters
        </h2>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>49 CFR - 395</span>
      </div>

      <div className="presets-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div className="presets-label" style={{ marginBottom: 0 }}>
            <Bookmark size={13} />
            Route Templates
          </div>
          <button
            type="button"
            onClick={() => { setCurrentLoc(''); setPickupLoc(''); setDropoffLoc(''); setCycleUsed(0); setPickingMode(null); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear Form
          </button>
        </div>
        <div className="preset-chips">
          {PRESET_TRIPS.map((p, idx) => (
            <button key={idx} type="button" className="preset-btn" onClick={() => applyPreset(p)}>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <LocationAutocomplete
          label="1. Starting Location (Origin)"
          value={currentLoc}
          onChange={(val, meta) => setCurrentLoc(val, meta)}
          onPickOnMap={() => setPickingMode(pickingMode === 'current' ? null : 'current')}
          isPicking={pickingMode === 'current'}
          placeholder="e.g. Chicago, IL or click 'Pick on Map'"
          iconColor="#10b981"
          apiBaseUrl={apiBaseUrl}
        />

        <LocationAutocomplete
          label="2. Pickup Location (Shipper - 1h Loading)"
          value={pickupLoc}
          onChange={(val, meta) => setPickupLoc(val, meta)}
          onPickOnMap={() => setPickingMode(pickingMode === 'pickup' ? null : 'pickup')}
          isPicking={pickingMode === 'pickup'}
          placeholder="e.g. St. Louis, MO or click 'Pick on Map'"
          iconColor="#2563eb"
          apiBaseUrl={apiBaseUrl}
        />

        <LocationAutocomplete
          label="3. Dropoff Location (Receiver - 1h Unloading)"
          value={dropoffLoc}
          onChange={(val, meta) => setDropoffLoc(val, meta)}
          onPickOnMap={() => setPickingMode(pickingMode === 'dropoff' ? null : 'dropoff')}
          isPicking={pickingMode === 'dropoff'}
          placeholder="e.g. Dallas, TX or click 'Pick on Map'"
          iconColor="#ef4444"
          apiBaseUrl={apiBaseUrl}
        />

        <div className="form-group">
          <label className="form-label">
            <span>4. Current Cycle Used (Hours in Last 8 Days)</span>
            <span className="req">*</span>
          </label>
          <div className="cycle-slider-wrapper">
            <div className="cycle-slider-header">
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Accumulated On-Duty:</span>
              <span className="cycle-value">{Number(cycleUsed || 0).toFixed(1)} / 70.0 hrs</span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              step="0.5"
              value={cycleUsed ?? 0}
              onChange={(e) => setCycleUsed(parseFloat(e.target.value) || 0)}
              className="cycle-slider"
            />
            <div className="cycle-slider-footer">
              <span>0 hrs (Fresh cycle)</span>
              <span>Available: {Math.max(0, 70 - Number(cycleUsed || 0)).toFixed(1)} hrs</span>
              <span>70 hrs (Restart needed)</span>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary" id="btn-plan-trip">
          {loading ? <span>Calculating Route & ELD Logs...</span> : (
            <>
              <span>Calculate Route & Generate Schedule</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
