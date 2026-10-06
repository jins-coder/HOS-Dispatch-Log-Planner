import React from 'react';
import { 
  Truck, 
  Package, 
  Flag, 
  Fuel, 
  Coffee, 
  Moon, 
  RefreshCw,
  Clock,
  Compass
} from 'lucide-react';

export default function MilestonesTimeline({ milestones }) {
  if (!milestones || milestones.length === 0) return null;

  const getMilestoneIcon = (type) => {
    switch (type) {
      case 'ORIGIN':
        return { icon: <Truck size={18} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
      case 'PICKUP':
        return { icon: <Package size={18} />, bg: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa' };
      case 'DROPOFF':
        return { icon: <Flag size={18} />, bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      case 'FUEL':
        return { icon: <Fuel size={18} />, bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' };
      case 'REST_30MIN':
        return { icon: <Coffee size={18} />, bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
      case 'REST_10HR':
        return { icon: <Moon size={18} />, bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' };
      case 'RESTART_34HR':
        return { icon: <RefreshCw size={18} />, bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' };
      default:
        return { icon: <Compass size={18} />, bg: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8' };
    }
  };

  return (
    <div className="glass-card milestones-section">
      <div className="card-title-group">
        <h3 className="card-title">
          <Clock size={19} />
          Route Itinerary & HOS Compliance Milestones
        </h3>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          {milestones.length} Total Route Stops
        </span>
      </div>

      <div className="milestones-list">
        {milestones.map((m, idx) => {
          const style = getMilestoneIcon(m.type);
          const arrivalFormatted = m.arrival_time ? new Date(m.arrival_time).toLocaleString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '';

          return (
            <div key={idx} className="milestone-item">
              <div 
                className="milestone-badge-icon"
                style={{ background: style.bg, color: style.color }}
              >
                {style.icon}
              </div>

              <div className="milestone-content">
                <div className="milestone-header">
                  <span className="milestone-name">{m.name}</span>
                  <span className="milestone-time">{arrivalFormatted}</span>
                </div>
                <div className="milestone-desc">
                  <strong>{m.location}</strong> &mdash; {m.description}
                </div>
                <div className="milestone-meta">
                  <span>Cumulative Distance: {m.odometer} mi</span>
                  <span>Type: {m.type.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
