import React from 'react';
import { Calendar, Truck, User, MapPin, Printer } from 'lucide-react';

export default function EldLogSheet({ log, currentDayIndex, totalDays }) {
  if (!log) return null;

  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 160;
  
  const ROW_HEIGHT = 35;
  const HEADER_HEIGHT = 20;
  const LEFT_LABEL_WIDTH = 140;
  const RIGHT_TOTAL_WIDTH = 70;
  const GRID_WIDTH = SVG_WIDTH - LEFT_LABEL_WIDTH - RIGHT_TOTAL_WIDTH;
  
  const hourToX = (hour) => {
    return LEFT_LABEL_WIDTH + (hour / 24.0) * GRID_WIDTH;
  };

  const rowToY = (rowNumber) => {
    return HEADER_HEIGHT + (rowNumber - 0.5) * ROW_HEIGHT;
  };

  const dutyEvents = log.duty_events || [];
  let pathD = "";

  if (dutyEvents.length > 0) {
    dutyEvents.forEach((ev, idx) => {
      const xStart = hourToX(ev.start_hour);
      const xEnd = hourToX(ev.end_hour);
      const yRow = rowToY(ev.row);

      if (idx === 0) {
        pathD += `M ${xStart} ${yRow} L ${xEnd} ${yRow}`;
      } else {
        const prevEv = dutyEvents[idx - 1];
        const prevY = rowToY(prevEv.row);
        if (prevY !== yRow) {
          pathD += ` L ${xStart} ${yRow}`;
        }
        pathD += ` L ${xEnd} ${yRow}`;
      }
    });
  }

  const dateObj = new Date(log.date);
  const monthStr = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = dateObj.getDate().toString().padStart(2, '0');
  const yearStr = dateObj.getFullYear().toString();

  return (
    <div className="fmcsa-log-sheet" id={`fmcsa-log-day-${log.day_number}`}>
      <div className="log-header-top">
        <div>
          <h2 className="log-main-title">Drivers Daily Log</h2>
          <span className="log-sub-title">(24 hours) &mdash; FMCSA Property-Carrying Driver</span>
        </div>

        <div className="log-date-fields">
          <div className="date-box">
            <span className="date-val">{monthStr}</span>
            <span className="date-lbl">Month</span>
          </div>
          <span>/</span>
          <div className="date-box">
            <span className="date-val">{dayStr}</span>
            <span className="date-lbl">Day</span>
          </div>
          <span>/</span>
          <div className="date-box">
            <span className="date-val">{yearStr}</span>
            <span className="date-lbl">Year</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#444', lineHeight: '1.3' }}>
          <strong>Original:</strong> File at home terminal<br/>
          <strong>Duplicate:</strong> Driver retains for 8 days
        </div>
      </div>

      <div className="log-meta-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="meta-box">
            <span className="meta-box-lbl">From (Origin):</span>
            <span className="meta-box-val">{log.origin}</span>
          </div>
          <div className="meta-box">
            <span className="meta-box-lbl">To (Destination):</span>
            <span className="meta-box-val">{log.destination}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="meta-box" style={{ background: '#f8fafc' }}>
            <span className="meta-box-lbl">Total Miles Driving Today:</span>
            <span className="meta-box-val" style={{ color: '#0284c7' }}>{log.total_miles_driving_today} mi</span>
          </div>
          <div className="meta-box">
            <span className="meta-box-lbl">Total Mileage Today (Odometer):</span>
            <span className="meta-box-val">{log.total_mileage_today} mi</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="meta-box">
            <span className="meta-box-lbl">Name of Carrier:</span>
            <span className="meta-box-val">{log.carrier_name}</span>
          </div>
          <div className="meta-box">
            <span className="meta-box-lbl">Truck / Trailer Unit IDs:</span>
            <span className="meta-box-val">{log.truck_number} / {log.trailer_number}</span>
          </div>
        </div>
      </div>

      <div className="grid-container">
        <svg 
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
          className="grid-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="0" y="0" width={SVG_WIDTH} height={HEADER_HEIGHT} fill="#0f172a" />
          <text x="10" y="14" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            DUTY STATUS
          </text>

          {Array.from({ length: 25 }).map((_, h) => {
            const x = hourToX(h);
            let label = h === 0 || h === 24 ? "Mid" : h === 12 ? "Noon" : (h > 12 ? h - 12 : h).toString();
            return (
              <text 
                key={`lbl-${h}`}
                x={x} 
                y="14" 
                fill="#ffffff" 
                fontSize={h === 0 || h === 24 || h === 12 ? "8" : "9"}
                fontWeight="bold" 
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {label}
              </text>
            );
          })}

          <text x={SVG_WIDTH - 35} y="14" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
            TOTAL
          </text>

          {Array.from({ length: 4 }).map((_, r) => {
            const yTop = HEADER_HEIGHT + r * ROW_HEIGHT;
            const labels = [
              "1. Off Duty",
              "2. Sleeper Berth",
              "3. Driving",
              "4. On Duty (Not Drv)"
            ];
            const hoursVal = [
              log.hours_summary?.off_duty,
              log.hours_summary?.sleeper_berth,
              log.hours_summary?.driving,
              log.hours_summary?.on_duty_not_driving
            ][r] ?? 0;

            return (
              <g key={`row-${r}`}>
                <rect 
                  x="0" 
                  y={yTop} 
                  width={SVG_WIDTH} 
                  height={ROW_HEIGHT} 
                  fill={r % 2 === 0 ? "#ffffff" : "#fcfcfc"} 
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                />

                <text 
                  x="10" 
                  y={yTop + ROW_HEIGHT / 2 + 4} 
                  fill="#0f172a" 
                  fontSize="10" 
                  fontWeight="bold" 
                  fontFamily="sans-serif"
                >
                  {labels[r]}
                </text>

                <rect 
                  x={SVG_WIDTH - RIGHT_TOTAL_WIDTH} 
                  y={yTop} 
                  width={RIGHT_TOTAL_WIDTH} 
                  height={ROW_HEIGHT} 
                  fill="#f8fafc" 
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text 
                  x={SVG_WIDTH - RIGHT_TOTAL_WIDTH / 2} 
                  y={yTop + ROW_HEIGHT / 2 + 4} 
                  fill="#0f172a" 
                  fontSize="11" 
                  fontWeight="bold" 
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {Number(hoursVal).toFixed(2)}
                </text>
              </g>
            );
          })}

          {Array.from({ length: 25 }).map((_, h) => {
            const x = hourToX(h);
            const gridTop = HEADER_HEIGHT;
            const gridBottom = HEADER_HEIGHT + 4 * ROW_HEIGHT;

            return (
              <g key={`ticks-${h}`}>
                <line 
                  x1={x} 
                  y1={gridTop} 
                  x2={x} 
                  y2={gridBottom} 
                  stroke="#64748b" 
                  strokeWidth={h === 0 || h === 12 || h === 24 ? "1.5" : "0.75"} 
                />

                {h < 24 && Array.from({ length: 3 }).map((_, quarter) => {
                  const qFrac = (quarter + 1) * 0.25;
                  const qX = hourToX(h + qFrac);
                  const isHalfHour = quarter === 1;

                  return Array.from({ length: 4 }).map((_, r) => {
                    const rowTop = HEADER_HEIGHT + r * ROW_HEIGHT;
                    const rowMid = rowTop + ROW_HEIGHT / 2;
                    const tickHeight = isHalfHour ? 12 : 7;

                    return (
                      <line
                        key={`q-${h}-${quarter}-${r}`}
                        x1={qX}
                        y1={rowMid - tickHeight / 2}
                        x2={qX}
                        y2={rowMid + tickHeight / 2}
                        stroke="#94a3b8"
                        strokeWidth="0.5"
                      />
                    );
                  });
                })}
              </g>
            );
          })}

          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#0284c7"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {dutyEvents.map((ev, idx) => {
            const x = hourToX(ev.start_hour);
            const y = rowToY(ev.row);
            return (
              <circle
                key={`dot-${idx}`}
                cx={x}
                cy={y}
                r="3"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
            );
          })}
        </svg>
      </div>

      <div className="log-footer-grid">
        <div className="remarks-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h4>Remarks (Change of Duty Status & Location)</h4>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>Home Terminal Time Standard</span>
          </div>

          <table className="remarks-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Time</th>
                <th style={{ width: '90px' }}>Status</th>
                <th>Location & Operational Note</th>
              </tr>
            </thead>
            <tbody>
              {log.remarks && log.remarks.map((rem, idx) => (
                <tr key={`rem-${idx}`}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{rem.time}</td>
                  <td>
                    <span className={`status-tag ${rem.status}`}>
                      {rem.status === 'OFF_DUTY' ? 'OFF' : rem.status === 'SLEEPER' ? 'SLEEP' : rem.status === 'DRIVING' ? 'DRIVE' : 'ON DUTY'}
                    </span>
                  </td>
                  <td>
                    <strong>{rem.location}:</strong> {rem.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="recap-panel">
          <h4>Recap: 70 Hour / 8 Day Rule</h4>
          <table className="recap-table">
            <tbody>
              <tr>
                <td className="lbl">On duty hours today (Lines 3 & 4):</td>
                <td className="val">{log.recap?.on_duty_today?.toFixed(2)} hrs</td>
              </tr>
              <tr>
                <td className="lbl">A. Total hours on duty last 7 days:</td>
                <td className="val">{log.recap?.total_hours_last_7_days?.toFixed(2)} hrs</td>
              </tr>
              <tr>
                <td className="lbl">B. Hours available tomorrow (70 - A):</td>
                <td className="val" style={{ color: log.recap?.available_tomorrow < 5 ? '#dc2626' : '#16a34a' }}>
                  {log.recap?.available_tomorrow?.toFixed(2)} hrs
                </td>
              </tr>
              <tr>
                <td className="lbl">C. Total hours on duty last 8 days:</td>
                <td className="val">{log.recap?.total_hours_last_8_days?.toFixed(2)} hrs</td>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <td className="lbl" style={{ fontWeight: 'normal', fontSize: '0.68rem' }} colSpan="2">
                  * 34 consecutive hours off duty will reset 70-hour / 8-day cycle clock to 0.0 available hours.
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #000', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.72rem' }}>
              <strong>Driver's Signature:</strong>
              <div style={{ borderBottom: '1px solid #000', width: '220px', height: '20px', marginTop: '4px', fontSize: '0.82rem', fontWeight: 600 }}>
                {log.driver_name || ''}
              </div>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#666', textAlign: 'right' }}>
              I certify that these entries are true and correct.<br/>
              FMCSA 49 CFR Part 395
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
