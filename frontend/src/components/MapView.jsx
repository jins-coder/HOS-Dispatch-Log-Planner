import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair, X } from 'lucide-react';

export default function MapView({ 
  geometry, 
  milestones, 
  locations,
  previewPins,
  pickingMode,
  onMapClick,
  onCancelPicking
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const clickHandlerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([39.8283, -98.5795], 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
    }

    if (pickingMode) {
      map.getContainer().style.cursor = 'crosshair';
      clickHandlerRef.current = (e) => {
        const { lat, lng } = e.latlng;
        if (onMapClick) {
          onMapClick(lat, lng, pickingMode);
        }
      };
      map.on('click', clickHandlerRef.current);
    } else {
      map.getContainer().style.cursor = '';
    }

    return () => {
      if (map && clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current);
      }
    };
  }, [pickingMode, onMapClick]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    if (geometry && geometry.length > 0) {
      const latLngs = geometry.map(pt => [pt[1], pt[0]]);
      L.polyline(latLngs, {
        color: '#0284c7',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      latLngs.forEach(pt => bounds.extend(pt));
    }

    const getMarkerIcon = (type) => {
      let iconColor = '#0284c7';
      let symbol = '📍';

      if (type === 'ORIGIN') {
        iconColor = '#10b981';
        symbol = 'O';
      } else if (type === 'PICKUP') {
        iconColor = '#2563eb';
        symbol = 'P';
      } else if (type === 'DROPOFF') {
        iconColor = '#ef4444';
        symbol = 'D';
      } else if (type === 'FUEL') {
        iconColor = '#f97316';
        symbol = 'F';
      } else if (type === 'REST_30MIN') {
        iconColor = '#f59e0b';
        symbol = '30m';
      } else if (type === 'REST_10HR') {
        iconColor = '#8b5cf6';
        symbol = '10h';
      } else if (type === 'RESTART_34HR') {
        iconColor = '#ec4899';
        symbol = '34h';
      }

      return L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="
            background: ${iconColor};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            font-family: sans-serif;
          ">
            ${symbol}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });
    };

    if (milestones && milestones.length > 0) {
      milestones.forEach((m) => {
        if (m.lat && m.lon) {
          const latLng = [m.lat, m.lon];
          bounds.extend(latLng);

          const arrival = m.arrival_time ? new Date(m.arrival_time).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            month: 'short', 
            day: 'numeric' 
          }) : '';

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px; color: #111; line-height: 1.4;">
              <strong style="font-size: 13px; color: #0f172a;">${m.name}</strong><br/>
              <span style="color: #475569;">${m.location}</span><br/>
              <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e2e8f0;"/>
              <b>Time:</b> ${arrival}<br/>
              <b>Odometer:</b> ${m.odometer} mi<br/>
              <span style="font-size: 11px; color: #2563eb; font-weight: 600;">${m.description}</span>
            </div>
          `;

          L.marker(latLng, { icon: getMarkerIcon(m.type) })
            .bindPopup(popupContent)
            .addTo(layerGroup);
        }
      });
    }

    if (previewPins && Object.keys(previewPins).length > 0) {
      Object.entries(previewPins).forEach(([key, pin]) => {
        if (pin && pin.lat && pin.lon) {
          const latLng = [pin.lat, pin.lon];
          bounds.extend(latLng);

          const isOrigin = key === 'current';
          const isPickup = key === 'pickup';
          const iconColor = isOrigin ? '#10b981' : isPickup ? '#2563eb' : '#ef4444';
          const symbol = isOrigin ? 'O' : isPickup ? 'P' : 'D';
          const title = isOrigin ? 'Starting Origin' : isPickup ? 'Pickup Location' : 'Dropoff Location';

          const pinIcon = L.divIcon({
            className: 'custom-map-icon',
            html: `
              <div style="
                background: ${iconColor};
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                font-size: 12px;
                font-weight: 700;
                color: #ffffff;
                font-family: sans-serif;
              ">
                ${symbol}
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
          });

          L.marker(latLng, { icon: pinIcon })
            .bindPopup(`<b>${title}:</b><br/>${pin.name}`)
            .addTo(layerGroup);
        }
      });
    }

    if (bounds.isValid() && !pickingMode) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [geometry, milestones, locations, previewPins]);

  const pickingLabels = {
    current: "1. Starting Location (Origin)",
    pickup: "2. Pickup Location (Shipper)",
    dropoff: "3. Dropoff Location (Receiver)"
  };

  return (
    <div className="map-wrapper" style={{ position: 'relative' }}>
      {pickingMode && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1.5px solid #38bdf8',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          borderRadius: '9999px',
          padding: '0.45rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          color: '#ffffff',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <Crosshair size={16} color="#38bdf8" className="spin-anim" />
          <span>Click anywhere on the map to set <strong>{pickingLabels[pickingMode]}</strong></span>
          <button
            type="button"
            onClick={onCancelPicking}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              marginLeft: '0.3rem'
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div ref={mapContainerRef} className="map-canvas" id="route-map" />
    </div>
  );
}
