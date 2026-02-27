param(
  [string]$BaseUrl = "https://n8n.wendealai.com",
  [string]$ApiKey = "",
  [string]$WorkflowFile = "workflows/invoice-ocr-llm-webhook.json"
)

$resolvedFile = Resolve-Path $WorkflowFile -ErrorAction Stop
if (-not $ApiKey) {
  $ApiKey = [Environment]::GetEnvironmentVariable('N8N_API_KEY')
}

if (-not $ApiKey) {
  Write-Error "Missing API key. Pass -ApiKey or set N8N_API_KEY env var."
  exit 1
}

$headers = @{
  "X-N8N-API-KEY" = $ApiKey
  "Content-Type" = "application/json"
}

$payload = Get-Content $resolvedFile -Raw
$createUrl = "$($BaseUrl.TrimEnd('/'))/api/v1/workflows"

try {
  $response = Invoke-RestMethod -Method Post -Uri $createUrl -Headers $headers -Body $payload -TimeoutSec 60
  $id = $response.id
  if (-not $id -and $response.data) {
    $id = $response.data.id
  }
  if ($id) {
    Write-Output "CREATED_WORKFLOW_ID=$id"
  } else {
    Write-Output "CREATED_WORKFLOW_RESPONSE=$($response | ConvertTo-Json -Depth 20)"
  }
} catch {
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
    Write-Output "HTTP_STATUS=$statusCode"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    if ($body) {
      Write-Output $body
    }
  } else {
    Write-Output "ERROR=$($_.Exception.Message)"
  }
  exit 1
}
