#Requires -Version 5.1
<#
.SYNOPSIS
    One-time setup for the taskingmodule Docker environment.

.DESCRIPTION
    Prepares a fresh clone so `docker compose up -d --build` will work.
    Safe to re-run: every step is idempotent.

    Steps:
      1. Verify Docker is available.
      2. Ensure the `xbi-keycloak:hostname` local image tag exists.
      3. Materialize `xbi_tasking_backend/docker.config` from the example.
      4. Populate `xbi_tasking_backend/certs/` (keycloak.crt, server.crt, server.key).
      5. Add `tangy.local` / `tangy.auth.local` to the Windows hosts file.

.PARAMETER SkipHosts
    Skip the hosts-file modification (useful if you manage it yourself).
#>

param(
    [switch]$SkipHosts
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [ok] $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "    [skip] $msg" -ForegroundColor DarkGray }
function Write-Warn2($msg){ Write-Host "    [warn] $msg" -ForegroundColor Yellow }

# -- 1. Docker available --------------------------------------------------------
Write-Step "Checking Docker"
try {
    $null = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -ne 0) { throw "docker not running" }
    Write-Ok "Docker is running"
} catch {
    Write-Error "Docker is not running or not installed. Start Docker Desktop and re-run."
    exit 1
}

# -- 2. Tag xbi-keycloak:hostname ----------------------------------------------
Write-Step "Ensuring xbi-keycloak:hostname image tag"
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
docker image inspect xbi-keycloak:hostname *> $null
$tagExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEAP
if ($tagExists) {
    Write-Skip "xbi-keycloak:hostname already tagged"
} else {
    docker pull quay.io/keycloak/keycloak:latest | Out-Host
    docker tag quay.io/keycloak/keycloak:latest xbi-keycloak:hostname
    Write-Ok "Tagged xbi-keycloak:hostname from quay.io/keycloak/keycloak:latest"
}

# -- 3. docker.config from example ---------------------------------------------
Write-Step "Ensuring xbi_tasking_backend/docker.config"
$cfg     = Join-Path $RepoRoot "xbi_tasking_backend/docker.config"
$cfgEx   = Join-Path $RepoRoot "xbi_tasking_backend/docker.config.example"
if (Test-Path $cfg) {
    Write-Skip "docker.config already exists"
} elseif (Test-Path $cfgEx) {
    Copy-Item $cfgEx $cfg
    Write-Ok "Copied docker.config.example -> docker.config"
} else {
    Write-Error "docker.config.example not found; cannot generate docker.config"
    exit 1
}

# -- 4. Backend certs ----------------------------------------------------------
Write-Step "Ensuring backend certs (xbi_tasking_backend/certs/)"
$certDir = Join-Path $RepoRoot "xbi_tasking_backend/certs"
$kcSrc   = Join-Path $RepoRoot "deployment_stuff/xbi-keycloak/ca_certs/keycloak.crt"
$kcDst   = Join-Path $certDir "keycloak.crt"
$srvCrt  = Join-Path $certDir "server.crt"
$srvKey  = Join-Path $certDir "server.key"
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

# 4a. keycloak.crt must match the one the Keycloak container serves.
if (Test-Path $kcDst) {
    Write-Skip "keycloak.crt already in certs/"
} elseif (Test-Path $kcSrc) {
    Copy-Item $kcSrc $kcDst
    Write-Ok "Copied deployment_stuff/xbi-keycloak/ca_certs/keycloak.crt -> certs/"
} else {
    Write-Error "Keycloak CA cert not found at $kcSrc. Generate it first (see deployment_stuff/README.md)."
    exit 1
}

# 4b. server.crt / server.key generated in a throwaway alpine/openssl container.
if ((Test-Path $srvCrt) -and (Test-Path $srvKey)) {
    Write-Skip "server.crt and server.key already present"
} else {
    Write-Host "    Generating self-signed server cert via alpine/openssl container..."
    $mount = (Resolve-Path $certDir).Path -replace '\\','/'
    $subj  = "/CN=tangy.local"
    $san   = "subjectAltName=DNS:tangy.local,DNS:localhost,IP:127.0.0.1"
    docker run --rm -v "${mount}:/certs" -w /certs alpine/openssl `
        req -x509 -newkey rsa:2048 -nodes -days 365 `
        -keyout server.key -out server.crt `
        -subj $subj -addext $san | Out-Host
    if (-not (Test-Path $srvCrt) -or -not (Test-Path $srvKey)) {
        Write-Error "Failed to generate server cert/key"
        exit 1
    }
    Write-Ok "Generated server.crt and server.key"
}

# -- 5. Hosts file --------------------------------------------------------------
Write-Step "Windows hosts file entries"
if ($SkipHosts) {
    Write-Skip "Skipped by -SkipHosts flag"
} else {
    $hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
    $needed = @("tangy.local", "tangy.auth.local")
    $content = Get-Content $hostsFile -Raw -ErrorAction SilentlyContinue
    $missing = $needed | Where-Object { $content -notmatch [regex]::Escape($_) }

    if (-not $missing) {
        Write-Skip "hosts file already has tangy.local / tangy.auth.local"
    } else {
        # Need admin. Re-launch elevated with a short inline script.
        $entries = ($missing | ForEach-Object { "127.0.0.1 $_" }) -join "`r`n"
        $escaped = $entries.Replace("'", "''")
        $inline = @"
`$hostsFile = '$hostsFile'
`$content = Get-Content `$hostsFile -Raw
`$toAdd = '$escaped'
if (`$content -notmatch 'tangy') {
    Add-Content -Path `$hostsFile -Value (""`r`n"" + `$toAdd + ""`r`n"")
}
"@
        $tmp = Join-Path $env:TEMP "add_hosts_$([guid]::NewGuid()).ps1"
        Set-Content -Path $tmp -Value $inline -Encoding UTF8
        Write-Host "    Requesting admin rights to edit hosts file..."
        Start-Process -FilePath "powershell" -Verb RunAs -Wait `
            -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File",$tmp
        Remove-Item $tmp -ErrorAction SilentlyContinue

        $after = Get-Content $hostsFile -Raw
        $stillMissing = $needed | Where-Object { $after -notmatch [regex]::Escape($_) }
        if ($stillMissing) {
            Write-Warn2 "Could not add $($stillMissing -join ', ') to hosts file. Add manually:"
            foreach ($h in $stillMissing) { Write-Host "      127.0.0.1 $h" }
        } else {
            Write-Ok "Added tangy.local / tangy.auth.local to hosts file"
        }
    }
}

# -- Done -----------------------------------------------------------------------
Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  1. docker compose up -d --build"
Write-Host "  2. Visit https://tangy.auth.local:8443 once in your browser and accept"
Write-Host "     the self-signed certificate warning."
Write-Host "  3. Open http://tangy.local:5173"
Write-Host ""
