import requests
import json

def test():
    # login
    login_res = requests.post("http://localhost:8000/api/auth/login", json={"email": "sumitagaria@gmail.com", "password": "password"})
    if login_res.status_code != 200:
        # maybe another password
        login_res = requests.post("http://localhost:8000/api/auth/login", json={"email": "sumitagaria@gmail.com", "password": "admin123"})
        
    token = login_res.json().get("access_token")
    if not token:
        print("Login failed", login_res.text)
        return
        
    # get projects
    projs = requests.get("http://localhost:8000/api/esg/projects", headers={"Authorization": f"Bearer {token}"})
    if projs.status_code != 200 or not projs.json():
        print("No projects")
        return
        
    pid = projs.json()[0]["id"]
    print(f"Testing project {pid}")
    # predict
    res = requests.get(f"http://localhost:8000/api/esg/v2/predict-net-zero/{pid}", headers={"Authorization": f"Bearer {token}"})
    print(res.status_code)
    print(res.text)

if __name__ == "__main__":
    test()
