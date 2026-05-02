import subprocess
import sys

secrets = {
    "GEMINI_API_KEY": "AIzaSyD9TNYcj4cB-cp6Dtut107vUYCB9KgtyV0",
    "GCP_API_KEY": "AIzaSyC-Sc5PUm6tqPjrkhRbpnGXXWaXZTvzDto",
    "VITE_GCP_API_KEY": "AIzaSyDZQvbVGPs8Vagh2UZjS3rLPZDR9eXU2BA",
    "VITE_GCP_PROJECT_ID": "votemitra-494915",
    "VITE_AUTH_DOMAIN": "votemitra-494915.firebaseapp.com",
    "VITE_MESSAGING_SENDER_ID": "470515065386",
    "VITE_APP_ID": "1:470515065386:web:57505e60d94d6e565e5953"
}

gcloud_cmd = "gcloud.cmd" if sys.platform == "win32" else "gcloud"

for name, value in secrets.items():
    print(f"Creating secret {name}...")
    try:
        subprocess.run([gcloud_cmd, "secrets", "create", name, "--replication-policy", "automatic"], check=True)
    except subprocess.CalledProcessError:
        print(f"Secret {name} might already exist.")
    
    print(f"Adding version for {name}...")
    process = subprocess.Popen([gcloud_cmd, "secrets", "versions", "add", name, "--data-file=-"], stdin=subprocess.PIPE)
    process.communicate(input=value.encode('utf-8'))
    
print("Secrets setup complete.")
