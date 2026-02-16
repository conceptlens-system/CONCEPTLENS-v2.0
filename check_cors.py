import requests

try:
    print("Sending OPTIONS request to http://localhost:8000/api/v1/exams/")
    resp = requests.options(
        "http://localhost:8000/api/v1/exams/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
    )
    print(f"Status: {resp.status_code}")
    print("Headers:")
    for k, v in resp.headers.items():
        print(f"{k}: {v}")
except Exception as e:
    print(f"Error: {e}")
