import requests
import polyline
import json

url = "https://route.mappls.com/route/direction/route_adv/driving/77.5610,12.9780;77.4800,12.9880?access_token=<API_KEY>"

data = requests.get(url).json()

encoded = data["routes"][0]["geometry"]

coords = [[lng, lat] for lat, lng in polyline.decode(encoded)]

print(json.dumps(coords, indent=2))