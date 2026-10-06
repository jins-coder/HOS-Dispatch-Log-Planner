from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
import logging
from .routing_service import geocode_location, CITY_COORDS
from .hos_engine import HOSScheduler

logger = logging.getLogger(__name__)

class GeocodeView(APIView):
    def get(self, request):
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon")

        if lat and lon:
            try:
                url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
                res = requests.get(url, headers={"User-Agent": "HOSPlanner/1.0"}, timeout=3)
                if res.status_code == 200:
                    data = res.json()
                    addr = data.get("address", {})
                    city = addr.get("city") or addr.get("town") or addr.get("county") or "Location"
                    state = addr.get("state") or addr.get("country", "")
                    disp = f"{city}, {state}" if state else city
                    return Response({"display_name": disp, "lat": float(lat), "lon": float(lon)})
            except Exception:
                pass
            return Response({"display_name": f"{float(lat):.3f}, {float(lon):.3f}", "lat": float(lat), "lon": float(lon)})

        query = request.query_params.get("q", "").strip()
        if not query:
            return Response([])

        q_lower = query.lower()
        suggestions = []
        for city_name, coords in CITY_COORDS.items():
            if q_lower in city_name:
                suggestions.append({"display_name": city_name.title(), "lat": coords[0], "lon": coords[1]})

        if len(suggestions) < 3 and len(query) >= 3:
            try:
                res = requests.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": query, "format": "json", "limit": 4},
                    headers={"User-Agent": "HOSPlanner/1.0"},
                    timeout=3
                )
                if res.status_code == 200:
                    for it in res.json():
                        suggestions.append({"display_name": it.get("display_name"), "lat": float(it["lat"]), "lon": float(it["lon"])})
            except Exception:
                pass

        return Response(suggestions[:6])


class PlanTripView(APIView):
    def post(self, request):
        curr_raw = request.data.get("current_location")
        pickup_raw = request.data.get("pickup_location")
        dropoff_raw = request.data.get("dropoff_location")
        cycle_used = float(request.data.get("current_cycle_used") or 0.0)

        if not curr_raw or not pickup_raw or not dropoff_raw:
            return Response({"error": "Current, pickup, and dropoff locations are required."}, status=status.HTTP_400_BAD_REQUEST)

        curr_loc = curr_raw if isinstance(curr_raw, dict) else geocode_location(str(curr_raw))
        pickup_loc = pickup_raw if isinstance(pickup_raw, dict) else geocode_location(str(pickup_raw))
        dropoff_loc = dropoff_raw if isinstance(dropoff_raw, dict) else geocode_location(str(dropoff_raw))

        try:
            scheduler = HOSScheduler(curr_loc, pickup_loc, dropoff_loc, cycle_used)
            result = scheduler.plan_trip()
            return Response({
                "status": "success",
                "locations": {"current": curr_loc, "pickup": pickup_loc, "dropoff": dropoff_loc},
                **result
            })
        except Exception as e:
            logger.exception("Trip planning error")
            return Response({"error": f"Failed to plan trip: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
