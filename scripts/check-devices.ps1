$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue

$client = New-Object System.Net.Http.HttpClient

# Login
$loginBody = '{"email":"seketie@celiumzm.com","password":"admin"}'
$loginResponse = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResponse.token

# Get devices
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $token)
$response = $client.GetAsync('http://127.0.0.1:3001/api/v1/devices').Result
$body = $response.Content.ReadAsStringAsync().Result
$client.Dispose()

$body | Out-File -FilePath 'C:\Users\EmmanuelSeketi\Desktop\DASH\fleet-compliance\devices-response.json' -Encoding utf8
Write-Host 'Saved devices response'
