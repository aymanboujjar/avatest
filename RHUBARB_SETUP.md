# Rhubarb Lip Sync Setup Guide

This guide explains how to set up Rhubarb Lip Sync for synchronized lip movements with audio.

## What is Rhubarb Lip Sync?

Rhubarb Lip Sync is a command-line tool that automatically creates 2D mouth animation from voice recordings. It analyzes audio files and generates mouth shape data (visemes) that can be used to animate your avatar's mouth movements in sync with speech.

**GitHub Repository:** https://github.com/DanielSWolf/rhubarb-lip-sync

## Installation Steps

### 1. Download Rhubarb Lip Sync

Download the appropriate binary for your operating system from:
https://github.com/DanielSWolf/rhubarb-lip-sync/releases

### 2. Install on Your System

#### Windows:
1. Download `rhubarb-windows.zip`
2. Extract the zip file
3. Place `rhubarb.exe` in one of these locations:
   - `avatarrbackend/rhubarb/rhubarb.exe` (recommended)
   - `avatarrbackend/rhubarb.exe`
   - Or add it to your system PATH

#### Linux:
1. Download `rhubarb-linux.tar.gz`
2. Extract: `tar -xzf rhubarb-linux.tar.gz`
3. Place `rhubarb` in one of these locations:
   - `avatarrbackend/rhubarb/rhubarb` (recommended)
   - `avatarrbackend/rhubarb`
   - Or add it to your system PATH
4. Make it executable: `chmod +x rhubarb`

#### macOS:
1. Download `rhubarb-macos.tar.gz`
2. Extract: `tar -xzf rhubarb-macos.tar.gz`
3. Place `rhubarb` in one of these locations:
   - `avatarrbackend/rhubarb/rhubarb` (recommended)
   - `avatarrbackend/rhubarb`
   - Or add it to your system PATH
4. Make it executable: `chmod +x rhubarb`

### 3. Verify Installation

Test that Rhubarb is accessible:

```bash
# Windows
cd avatarrbackend
rhubarb.exe --version

# Linux/Mac
cd avatarrbackend
./rhubarb --version
```

Or if added to PATH:
```bash
rhubarb --version
```

## How It Works

1. **Audio Generation**: When you generate speech using Puter.js, an audio file is created
2. **Lip Sync Processing**: The audio is sent to the Laravel backend
3. **Rhubarb Analysis**: The backend runs Rhubarb Lip Sync on the audio file
4. **Mouth Cue Data**: Rhubarb generates JSON data with mouth shapes (A, B, C, D, E, F, G, H, X) mapped to timestamps
5. **Avatar Animation**: The frontend receives this data and applies it to the 3D avatar's morph targets

## Mouth Shapes (Visemes)

Rhubarb uses these mouth shapes:
- **A** - Open wide (as in "father")
- **B** - Closed lips (as in "mom")
- **C** - Open rounded (as in "dog")
- **D** - Wide open (as in "bed")
- **E** - Slightly open (as in "red")
- **F** - Bottom lip on teeth (as in "five")
- **G** - Tongue between teeth (as in "the")
- **H** - Mouth open, tongue up (as in "cat")
- **X** - Closed/silence

These are mapped to your avatar's viseme morph targets:
- `viseme_aa`, `viseme_oh`, `viseme_ou`, `viseme_ee`, `viseme_ih`, `viseme_ff`, `viseme_th`, `viseme_kk`, `viseme_sil`

## Troubleshooting

### "Rhubarb Lip Sync executable not found"

- Make sure `rhubarb.exe` (Windows) or `rhubarb` (Linux/Mac) is in one of the expected locations
- Check file permissions (Linux/Mac: `chmod +x rhubarb`)
- Verify the path in `LipSyncController.php` if using a custom location

### "Failed to process audio with Rhubarb Lip Sync"

- Check that the audio file format is supported (WAV, MP3, etc.)
- Verify Rhubarb has read/write permissions in the temp directory
- Check Laravel logs: `storage/logs/laravel.log`

### Lip sync not working

- Verify the audio element is playing (check browser console)
- Check that lip sync data is being received (check Network tab)
- Ensure your avatar model has the correct viseme morph targets

## API Endpoints

- `POST /api/lipsync` - Process audio from URL
- `POST /api/lipsync-file` - Process audio from file upload

Both endpoints return JSON with mouth cue data:
```json
{
  "success": true,
  "data": {
    "metadata": {
      "soundFile": "...",
      "duration": 2.5
    },
    "mouthCues": [
      { "start": 0.0, "end": 0.1, "value": "X" },
      { "start": 0.1, "end": 0.3, "value": "D" },
      ...
    ]
  }
}
```

## Additional Resources

- [Rhubarb Lip Sync Documentation](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [Rhubarb Lip Sync Releases](https://github.com/DanielSWolf/rhubarb-lip-sync/releases)

