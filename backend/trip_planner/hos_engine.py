from datetime import datetime, timedelta
from .routing_service import get_route, interpolate_point

STATUS_OFF_DUTY = "OFF_DUTY"
STATUS_SLEEPER  = "SLEEPER"
STATUS_DRIVING  = "DRIVING"
STATUS_ON_DUTY  = "ON_DUTY"

ROW_MAP = {
    STATUS_OFF_DUTY: 1,
    STATUS_SLEEPER: 2,
    STATUS_DRIVING: 3,
    STATUS_ON_DUTY: 4
}

class HOSScheduler:
    def __init__(self, current_loc, pickup_loc, dropoff_loc, current_cycle_used=0.0):
        self.current_loc = current_loc
        self.pickup_loc = pickup_loc
        self.dropoff_loc = dropoff_loc
        self.current_cycle_used = float(current_cycle_used or 0.0)

    def plan_trip(self):
        r1 = get_route((self.current_loc["lat"], self.current_loc["lon"]), (self.pickup_loc["lat"], self.pickup_loc["lon"]))
        r2 = get_route((self.pickup_loc["lat"], self.pickup_loc["lon"]), (self.dropoff_loc["lat"], self.dropoff_loc["lon"]))
        
        full_geometry = (r1.get("geometry") or []) + (r2.get("geometry") or [])[1:]
        events, milestones = [], []

        today = datetime.now()
        sim_time = datetime(today.year, today.month, today.day, 6, 0, 0)
        day_start = datetime(today.year, today.month, today.day, 0, 0, 0)
        
        events.append({
            "status": STATUS_SLEEPER,
            "start_dt": day_start,
            "end_dt": sim_time,
            "duration": 6.0,
            "remark": "Rest before shift",
            "location": self.current_loc["display_name"],
            "lat": self.current_loc["lat"],
            "lon": self.current_loc["lon"],
            "miles": 0.0
        })

        milestones.append({
            "type": "ORIGIN",
            "name": "Starting Location",
            "location": self.current_loc["display_name"],
            "lat": self.current_loc["lat"],
            "lon": self.current_loc["lon"],
            "arrival_time": sim_time.isoformat(),
            "odometer": 0.0,
            "description": "Trip departure"
        })

        
        drive_shift = 0.0       
        duty_window = 0.0       
        drive_since_break = 0.0 
        miles_fuel = 0.0        
        odometer = 0.0
        accum_cycle = self.current_cycle_used

        def add_event(status, duration, remark, loc, lat, lon, miles=0.0):
            nonlocal sim_time, duty_window, accum_cycle
            end_t = sim_time + timedelta(hours=duration)
            events.append({
                "status": status,
                "start_dt": sim_time,
                "end_dt": end_t,
                "duration": duration,
                "remark": remark,
                "location": loc,
                "lat": lat,
                "lon": lon,
                "miles": miles
            })
            sim_time = end_t
            if status in [STATUS_DRIVING, STATUS_ON_DUTY]:
                duty_window += duration
                accum_cycle += duration

        def do_10hr_rest(loc, lat, lon, reason="11h driving / 14h window"):
            nonlocal drive_shift, duty_window, drive_since_break
            add_event(STATUS_SLEEPER, 10.0, f"10-Hour Rest ({reason})", loc, lat, lon)
            milestones.append({
                "type": "REST_10HR",
                "name": "10-Hour Rest",
                "location": loc,
                "lat": lat,
                "lon": lon,
                "arrival_time": sim_time.isoformat(),
                "odometer": round(odometer, 1),
                "description": f"Mandatory 10h rest ({reason})"
            })
            drive_shift, duty_window, drive_since_break = 0.0, 0.0, 0.0
            add_event(STATUS_ON_DUTY, 0.25, "Pre-Trip Inspection", loc, lat, lon)

        
        add_event(STATUS_ON_DUTY, 0.25, "Pre-Trip Inspection", self.current_loc["display_name"], self.current_loc["lat"], self.current_loc["lon"])

        
        def drive_route(route_info, from_name, to_name):
            nonlocal drive_shift, duty_window, drive_since_break, miles_fuel, odometer, accum_cycle
            leg_miles = route_info["distance_miles"]
            speed = 55.0
            miles_done = 0.0
            geom = route_info.get("geometry", [])

            while miles_done < leg_miles:
                if accum_cycle >= 70.0:
                    pt = interpolate_point(geom, miles_done / leg_miles if leg_miles else 0)
                    add_event(STATUS_OFF_DUTY, 34.0, "34-Hour Restart (Cycle Reset)", f"Rest Area near {to_name}", pt[0], pt[1])
                    milestones.append({
                        "type": "RESTART_34HR", "name": "34-Hour Restart", "location": f"En route to {to_name}",
                        "lat": pt[0], "lon": pt[1], "arrival_time": sim_time.isoformat(), "odometer": round(odometer, 1),
                        "description": "34h Off-duty cycle reset"
                    })
                    drive_shift, duty_window, drive_since_break, accum_cycle = 0.0, 0.0, 0.0, 0.0
                    add_event(STATUS_ON_DUTY, 0.25, "Pre-Trip Inspection", f"Rest Area near {to_name}", pt[0], pt[1])
                    continue

                allowed = min(11.0 - drive_shift, 14.0 - duty_window, 8.0 - drive_since_break)
                hours_to_fuel = (1000.0 - miles_fuel) / speed

                if allowed <= 0.05:
                    pt = interpolate_point(geom, miles_done / leg_miles if leg_miles else 0)
                    if drive_since_break >= 7.95:
                        add_event(STATUS_OFF_DUTY, 0.5, "30-Min Rest Break", f"Rest Area near {to_name}", pt[0], pt[1])
                        milestones.append({
                            "type": "REST_30MIN", "name": "30-Min Break", "location": f"En route to {to_name}",
                            "lat": pt[0], "lon": pt[1], "arrival_time": sim_time.isoformat(), "odometer": round(odometer, 1),
                            "description": "FMCSA 30-min break"
                        })
                        drive_since_break = 0.0
                    else:
                        do_10hr_rest(f"Truck Stop near {to_name}", pt[0], pt[1])
                    continue

                rem_hours = (leg_miles - miles_done) / speed
                slice_hours = min(rem_hours, allowed, hours_to_fuel)
                slice_miles = slice_hours * speed

                pt = interpolate_point(geom, (miles_done + slice_miles) / leg_miles if leg_miles else 1.0)
                add_event(STATUS_DRIVING, slice_hours, f"Driving to {to_name}", f"En route to {to_name}", pt[0], pt[1], slice_miles)

                miles_done += slice_miles
                odometer += slice_miles
                drive_shift += slice_hours
                drive_since_break += slice_hours
                miles_fuel += slice_miles

                if miles_fuel >= 995.0 and miles_done < leg_miles:
                    add_event(STATUS_ON_DUTY, 0.5, "Fueling Stop", f"Fuel Stop near {to_name}", pt[0], pt[1])
                    milestones.append({
                        "type": "FUEL", "name": "Fuel Stop", "location": f"Fuel Plaza near {to_name}",
                        "lat": pt[0], "lon": pt[1], "arrival_time": sim_time.isoformat(), "odometer": round(odometer, 1),
                        "description": "Fueling commercial motor vehicle"
                    })
                    miles_fuel = 0.0
                elif drive_since_break >= 7.95 and miles_done < leg_miles:
                    add_event(STATUS_OFF_DUTY, 0.5, "30-Min Rest Break", f"Rest Plaza near {to_name}", pt[0], pt[1])
                    milestones.append({
                        "type": "REST_30MIN", "name": "30-Min Break", "location": f"En route to {to_name}",
                        "lat": pt[0], "lon": pt[1], "arrival_time": sim_time.isoformat(), "odometer": round(odometer, 1),
                        "description": "FMCSA 30-minute break"
                    })
                    drive_since_break = 0.0
                elif (drive_shift >= 10.95 or duty_window >= 13.95) and miles_done < leg_miles:
                    do_10hr_rest(f"Truck Stop near {to_name}", pt[0], pt[1])

        drive_route(r1, self.current_loc["display_name"], self.pickup_loc["display_name"])

        if duty_window + 1.0 > 14.0:
            do_10hr_rest(self.pickup_loc["display_name"], self.pickup_loc["lat"], self.pickup_loc["lon"])
        add_event(STATUS_ON_DUTY, 1.0, "Loading Freight at Shipper", self.pickup_loc["display_name"], self.pickup_loc["lat"], self.pickup_loc["lon"])
        milestones.append({
            "type": "PICKUP", "name": "Pickup Location", "location": self.pickup_loc["display_name"],
            "lat": self.pickup_loc["lat"], "lon": self.pickup_loc["lon"], "arrival_time": sim_time.isoformat(),
            "odometer": round(odometer, 1), "description": "1.0 hr Shipper loading"
        })

        drive_route(r2, self.pickup_loc["display_name"], self.dropoff_loc["display_name"])

        if duty_window + 1.0 > 14.0:
            do_10hr_rest(self.dropoff_loc["display_name"], self.dropoff_loc["lat"], self.dropoff_loc["lon"])
        add_event(STATUS_ON_DUTY, 1.0, "Unloading Freight at Receiver", self.dropoff_loc["display_name"], self.dropoff_loc["lat"], self.dropoff_loc["lon"])
        milestones.append({
            "type": "DROPOFF", "name": "Dropoff Location", "location": self.dropoff_loc["display_name"],
            "lat": self.dropoff_loc["lat"], "lon": self.dropoff_loc["lon"], "arrival_time": sim_time.isoformat(),
            "odometer": round(odometer, 1), "description": "1.0 hr Receiver unloading"
        })
        add_event(STATUS_ON_DUTY, 0.25, "Post-Trip Inspection", self.dropoff_loc["display_name"], self.dropoff_loc["lat"], self.dropoff_loc["lon"])

        day_end = datetime(sim_time.year, sim_time.month, sim_time.day, 0, 0, 0) + timedelta(days=1)
        rem_off = (day_end - sim_time).total_seconds() / 3600.0
        if rem_off > 0:
            add_event(STATUS_OFF_DUTY, rem_off, "Off Duty at Destination", self.dropoff_loc["display_name"], self.dropoff_loc["lat"], self.dropoff_loc["lon"])

        daily_logs = self._split_daily_logs(events)

        return {
            "summary": {
                "total_miles": round(odometer, 1),
                "total_driving_hours": round(sum(e["duration"] for e in events if e["status"] == STATUS_DRIVING), 2),
                "total_on_duty_hours": round(sum(e["duration"] for e in events if e["status"] in [STATUS_DRIVING, STATUS_ON_DUTY]), 2),
                "total_days": len(daily_logs)
            },
            "milestones": milestones,
            "full_geometry": full_geometry,
            "daily_logs": daily_logs
        }

    def _split_daily_logs(self, events):
        start_d = events[0]["start_dt"].date()
        end_d = events[-1]["end_dt"].date()
        num_days = (end_d - start_d).days + 1
        daily_sheets = []
        running_cycle = self.current_cycle_used
        running_miles = 0.0

        for d in range(num_days):
            cur_date = start_d + timedelta(days=d)
            d_start = datetime(cur_date.year, cur_date.month, cur_date.day, 0, 0, 0)
            d_end = d_start + timedelta(days=1)

            day_events = []
            miles_today = 0.0

            for ev in events:
                s = max(ev["start_dt"], d_start)
                e = min(ev["end_dt"], d_end)
                if s < e:
                    dur = (e - s).total_seconds() / 3600.0
                    tot_dur = (ev["end_dt"] - ev["start_dt"]).total_seconds() / 3600.0
                    m = ev.get("miles", 0.0) * (dur / tot_dur if tot_dur else 1.0)
                    miles_today += m

                    day_events.append({
                        "status": ev["status"],
                        "row": ROW_MAP[ev["status"]],
                        "start_hour": round((s - d_start).total_seconds() / 3600.0, 4),
                        "end_hour": round((e - d_start).total_seconds() / 3600.0, 4),
                        "duration": round(dur, 2),
                        "remark": ev["remark"],
                        "location": ev["location"]
                    })

            off = round(sum(x["duration"] for x in day_events if x["status"] == STATUS_OFF_DUTY), 2)
            slp = round(sum(x["duration"] for x in day_events if x["status"] == STATUS_SLEEPER), 2)
            drv = round(sum(x["duration"] for x in day_events if x["status"] == STATUS_DRIVING), 2)
            on  = round(sum(x["duration"] for x in day_events if x["status"] == STATUS_ON_DUTY), 2)
            diff = round(24.0 - (off + slp + drv + on), 2)
            if abs(diff) <= 0.2:
                off = round(off + diff, 2)

            on_duty_today = round(drv + on, 2)
            running_miles += miles_today
            running_cycle += on_duty_today

            remarks = [{
                "time": f"{int(x['start_hour']):02d}:{int(round((x['start_hour'] - int(x['start_hour'])) * 60)):02d}",
                "status": x["status"],
                "location": x["location"],
                "note": x["remark"]
            } for x in day_events]

            daily_sheets.append({
                "day_number": d + 1,
                "date": cur_date.strftime("%Y-%m-%d"),
                "date_display": cur_date.strftime("%B %d, %Y"),
                "origin": self.current_loc["display_name"],
                "destination": self.dropoff_loc["display_name"],
                "carrier_name": "Swift Freight Logistics",
                "truck_number": "TRK-8821",
                "driver_name": "Alex Henderson",
                "total_miles_driving_today": round(miles_today, 1),
                "total_mileage_today": round(running_miles, 1),
                "duty_events": day_events,
                "hours_summary": {
                    "off_duty": off, "sleeper_berth": slp, "driving": drv,
                    "on_duty_not_driving": on, "total_on_duty_today": on_duty_today, "total_hours": 24.0
                },
                "recap": {
                    "on_duty_today": on_duty_today,
                    "total_hours_last_7_days": round(running_cycle, 2),
                    "available_tomorrow": round(max(0.0, 70.0 - running_cycle), 2),
                    "total_hours_last_8_days": round(running_cycle, 2)
                },
                "remarks": remarks
            })

        return daily_sheets
