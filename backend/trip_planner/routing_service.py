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
}

def haversine_miles(lat1, lon1, lat2, lon2):
    R = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def geocode_location(query):
    clean = str(query).strip()
    norm = clean.lower()

    
    for key, coords in CITY_COORDS.items():
        if key in norm or norm in key:
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
        res = requests.get(url, params=params, headers={"User-Agent": "HOSPlanner/1.0"}, timeout=3)
        if res.status_code == 200 and res.json():
            data = res.json()[0]
            return {"lat": float(data["lat"]), "lon": float(data["lon"]), "display_name": data.get("display_name", clean)}
    except Exception as e:
        logger.warning(f"Geocoding error: {e}")

    
    return {"lat": 41.8781, "lon": -87.6298, "display_name": clean.title() or "Chicago, IL"}

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
