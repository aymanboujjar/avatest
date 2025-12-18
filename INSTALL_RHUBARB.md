# Quick Install Guide: Rhubarb Lip Sync for Windows

## Step 1: Download Rhubarb Lip Sync

1. Go to: https://github.com/DanielSWolf/rhubarb-lip-sync/releases
2. Download the latest `rhubarb-windows.zip` file
3. Extract the zip file

## Step 2: Place the Executable

Copy `rhubarb.exe` to your backend directory:

**Option 1 (Recommended):**
```
avatarrbackend/
  └── rhubarb/
      └── rhubarb.exe
```

**Option 2:**
```
avatarrbackend/
  └── rhubarb.exe
```

## Step 3: Verify Installation

Open PowerShell in the `avatarrbackend` directory and run:

```powershell
# If placed in rhubarb subfolder:
.\rhubarb\rhubarb.exe --version

# If placed in root:
.\rhubarb.exe --version
```

You should see version information if it's working.

## Step 4: Restart Laravel Server

After installing, restart your Laravel server:

```bash
cd avatarrbackend
php artisan serve --host=192.168.100.100 --port=8000
```

## That's It!

Once Rhubarb is installed, the lip sync will work automatically. The backend will:
1. Receive the audio file
2. Process it with Rhubarb Lip Sync
3. Return mouth cue data
4. Your avatar's lips will sync with the speech!

