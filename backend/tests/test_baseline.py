def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_list_and_search(client):
    r = client.get("/satellites?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 30 and len(body["items"]) == 5
    assert body["items"][0]["element"]["period_min"] > 0
    r = client.get("/satellites/search?q=90100")      # NORAD id
    assert [s["name"] for s in r.json()] == ["TEST-PAIR-A"]
    assert client.get("/satellites/search?q=TEST-GEO").json()


def test_positions_now_and_track(client):
    pos = client.get("/satellites/positions/now?limit=50").json()
    assert len(pos) > 20
    assert all(-90 <= p["latitude_deg"] <= 90 for p in pos)
    sid = pos[0]["satellite_id"]
    tr = client.get(f"/satellites/{sid}/positions?minutes=10&step_seconds=60").json()
    assert len(tr) == 11


def test_geo_altitude_is_geo(client):
    geo = client.get("/satellites?category=test-geo").json()["items"][0]
    tr = client.get(f"/satellites/{geo['satellite_id']}/positions?minutes=1").json()
    assert 35500 < tr[0]["altitude_km"] < 36100


def test_history_record_and_filter(client):
    sid = client.get("/satellites/search?q=90100").json()[0]["satellite_id"]
    r = client.post(f"/satellites/{sid}/history/record?hours_back=2&step_minutes=10")
    assert r.status_code == 200
    again = client.post(f"/satellites/{sid}/history/record?hours_back=2&step_minutes=10").json()
    assert again["inserted"] == 0                      # idempotent
    rows = client.get(f"/satellites/{sid}/history").json()
    assert len(rows) >= 13


def test_analytics(client):
    a = client.get("/analytics").json()
    assert a["totals"]["satellites"] >= 30
    assert {c["category"] for c in a["categories"]} >= {"test-leo", "debris"}


def test_proximity_finds_close_pair(client):
    ids = [client.get(f"/satellites/search?q={n}").json()[0]["satellite_id"] for n in (90100, 90101, 90200)]
    r = client.get(f"/proximity?ids={','.join(map(str, ids))}&threshold_km=50").json()
    top = r["pairs"][0]
    assert {top["satellite_a"], top["satellite_b"]} == {"TEST-PAIR-A", "TEST-PAIR-B"}
    assert top["min_distance_km"] < 10 and top["below_threshold"]


def test_watchlist_cycle(client):
    sid = client.get("/satellites/search?q=90200").json()[0]["satellite_id"]
    r = client.post("/watchlist", json={"satellite_id": sid})
    assert r.status_code == 201
    assert client.post("/watchlist", json={"satellite_id": sid}).status_code == 409
    wid = r.json()["watchlist_id"]
    assert client.delete(f"/watchlist/{wid}").status_code == 204
    assert client.delete(f"/watchlist/{wid}").status_code == 404


def test_not_found_and_validation(client):
    assert client.get("/satellites/999999").status_code == 404
    assert client.get("/satellites?limit=0").status_code == 422


def test_limits_endpoint_and_proximity_cap(client):
    lim = client.get("/meta/limits").json()
    ids = ",".join(str(i) for i in range(1, lim["proximity_max_objects"] + 2))
    assert client.get(f"/proximity?ids={ids}").status_code == 422
    assert client.get(f"/proximity?max_objects={lim['proximity_max_objects'] + 1}").status_code == 422
