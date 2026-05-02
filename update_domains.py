import urllib.request
import json
import subprocess
import sys

gcloud_cmd = 'gcloud.cmd' if sys.platform == 'win32' else 'gcloud'

# Get token
token = subprocess.check_output([gcloud_cmd, 'auth', 'print-access-token']).decode('utf-8').strip()
project_id = 'votemitra-494915'
url = f'https://identitytoolkit.googleapis.com/admin/v2/projects/{project_id}/config'

req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(req) as response:
    config = json.loads(response.read())

domains = config.get('authorizedDomains', [])
new_domain = 'votemitra-frontend-470515065386.asia-south1.run.app'

if new_domain not in domains:
    domains.append(new_domain)
    
print("Current domains:", domains)

update_data = json.dumps({'authorizedDomains': domains}).encode('utf-8')
req = urllib.request.Request(
    url + '?updateMask=authorizedDomains', 
    data=update_data, 
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    method='PATCH'
)

try:
    with urllib.request.urlopen(req) as response:
        print("Update successful!", response.read())
except urllib.error.HTTPError as e:
    print("Error:", e.read())
