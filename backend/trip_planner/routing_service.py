import math
import requests
import logging

logger = logging.getLogger(__name__)


CITY_COORDS = {
    "chicago, il": (41.8781, -87.6298),
    "st. louis, mo": (38.6270, -90.1994),
    "dallas, tx": (32.7767, -96.7970),
    "los angeles, ca": (34.0522, -118.2437),
    "phoenix, az": (33.4484, -112.0740),
    "atlanta, ga": (33.7490, -84.3880),
    "indianapolis, in": (39.7684, -86.1581),
    "cincinnati, oh": (39.1031, -84.5120),
    "columbus, oh": (39.9612, -82.9988),
    "denver, co": (39.7392, -104.9903),
    "omaha, ne": (41.2565, -95.9345),
    "pittsburgh, pa": (40.4406, -79.9959),
    "philadelphia, pa": (39.9526, -75.1652),
    "new york, ny": (40.7128, -74.0060),
    "houston, tx": (29.7604, -95.3698),
    "san antonio, tx": (29.4241, -98.4936),
    "detroit, mi": (42.3314, -83.0458),
    "memphis, tn": (35.1495, -90.0490),
    "nashville, tn": (36.1627, -86.7816),
    "kansas city, mo": (39.0997, -94.5786),
    "minneapolis, mn": (44.9778, -93.2650),
    "cleveland, oh": (41.4993, -81.6944),
    "louisville, ky": (38.2527, -85.7585),
    "milwaukee, wi": (43.0389, -87.9065),
    "charlotte, nc": (35.2271, -80.8431),
    "salt lake city, ut": (40.7608, -111.8910),
    "seattle, wa": (47.6062, -122.3321),
    "portland, or": (45.5152, -122.6784),
    "las vegas, nv": (36.1699, -115.1398),
    "miami, fl": (25.7617, -80.1918),
    "tampa, fl": (27.9506, -82.4572),
    "orlando, fl": (28.5383, -81.3792),
    "jacksonville, fl": (30.3322, -81.6557),
    "new orleans, la": (29.9511, -90.0715),
    "birmingham, al": (33.5186, -86.8104),
    "richmond, va": (37.5407, -77.4360),
    "baltimore, md": (39.2904, -76.6122),
    "washington, dc": (38.9072, -77.0369),
    "boston, ma": (42.3601, -71.0589),
    "buffalo, ny": (42.8864, -78.8784),
    "albuquerque, nm": (35.0844, -106.6504),
    "el paso, tx": (31.7619, -106.4850),
    "oklahoma city, ok": (35.4676, -97.5164),
    "tulsa, ok": (36.1540, -95.9928),
    "des moines, ia": (41.5868, -93.6250),
    "fargo, nd": (46.8772, -96.7898),
    "sioux falls, sd": (43.5446, -96.7311),
    "ottawa, on": (45.4215, -75.6972),
    "toronto, on": (43.6532, -79.3832),
    "montreal, qc": (45.5017, -73.5673),
    "vancouver, bc": (49.2827, -123.1207),
    "calgary, ab": (51.0447, -114.0719),
}

def haversine_miles(lat1, lon1, lat2, lon2):
    R = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def geocode_location(query):
    if isinstance(query, dict) and "lat" in query and "lon" in query:
        return {
            "lat": float(query["lat"]),
            "lon": float(query["lon"]),
            "display_name": query.get("display_name") or f"{float(query['lat']):.3f}, {float(query['lon']):.3f}"
        }

    clean = str(query).strip()
    norm = clean.lower()

    if not clean or norm == "location":
        return {"lat": 41.8781, "lon": -87.6298, "display_name": "Chicago, IL"}

    for key, coords in CITY_COORDS.items():
        city_part = key.split(",")[0]
        if key in norm or norm in key or city_part in norm:
            return {"lat": coords[0], "lon": coords[1], "display_name": clean.title()}

    if "," in clean:
        parts = clean.split(",")
        try:
            lat, lon = float(parts[0].strip()), float(parts[1].strip())
            return {"lat": lat, "lon": lon, "display_name": f"{lat:.3f}, {lon:.3f}"}
        except ValueError:
            pass

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": clean, "format": "json", "limit": 1}
        res = requests.get(url, params=params, headers={"User-Agent": "HOSPlannerApp/2.0"}, timeout=4.5)
        if res.status_code == 200 and res.json():
            data = res.json()[0]
            disp = data.get("display_name", clean)
            parts = [p.strip() for p in disp.split(",")]
            short_disp = ", ".join(parts[:2]) if len(parts) >= 2 else disp
            return {"lat": float(data["lat"]), "lon": float(data["lon"]), "display_name": short_disp}
    except Exception as e:
        logger.warning(f"Geocoding error: {e}")

    return {"lat": 39.8283, "lon": -98.5795, "display_name": clean.title() or "Waypoint"}

def get_route(origin_coords, dest_coords):
    lat1, lon1 = origin_coords
    lat2, lon2 = dest_coords

    
    try:
        url = f"https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"
        res = requests.get(url, timeout=3.5)
        if res.status_code == 200:
            data = res.json()
            if data.get("code") == "Ok" and data.get("routes"):
                r = data["routes"][0]
                return {
                    "distance_miles": round(r["distance"] * 0.000621371, 1),
                    "duration_hours": round(r["duration"] / 3600.0, 2),
                    "geometry": r["geometry"]["coordinates"]
                }
    except Exception as e:
        logger.warning(f"OSRM timeout: {e}")

    road_miles = round(haversine_miles(lat1, lon1, lat2, lon2) * 1.22, 1)
    duration_hours = round(road_miles / 58.0, 2)
    coords = [[round(lon1 + (lon2 - lon1) * (i / 20.0), 5), round(lat1 + (lat2 - lat1) * (i / 20.0), 5)] for i in range(21)]
    return {"distance_miles": road_miles, "duration_hours": duration_hours, "geometry": coords}

def interpolate_point(geometry, fraction):
    if not geometry:
        return [0, 0]
    idx = min(int(fraction * len(geometry)), len(geometry) - 1)
    pt = geometry[idx]
    return [pt[1], pt[0]]
