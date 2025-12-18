<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class LipSyncController extends Controller
{
    /**
     * Add CORS headers to response
     * 
     * @param \Illuminate\Http\JsonResponse $response
     * @return \Illuminate\Http\JsonResponse
     */
    private function addCorsHeaders($response)
    {
        return $response->header('Access-Control-Allow-Origin', '*')
                        ->header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                        ->header('Access-Control-Allow-Headers', 'Content-Type');
    }
    /**
     * Process audio file upload with Rhubarb Lip Sync
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function processFile(Request $request)
    {
        $request->validate([
            'audio' => 'required|file|mimes:wav,mp3,m4a,ogg|max:10240', // 10MB max
        ]);

        // Handle CORS preflight
        if ($request->isMethod('OPTIONS')) {
            return response()->json([], 200)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type');
        }

        try {
            $audioFile = $request->file('audio');
            
            // Ensure temp directory exists
            $tempDir = storage_path('app/temp');
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }
            
            // Save file with proper extension
            $extension = $audioFile->getClientOriginalExtension() ?: 'wav';
            $filename = 'audio_' . time() . '_' . uniqid() . '.' . $extension;
            $fullPath = $tempDir . DIRECTORY_SEPARATOR . $filename;
            
            // Move uploaded file
            $audioFile->move($tempDir, $filename);
            
            // Verify file exists
            if (!file_exists($fullPath)) {
                throw new \Exception('Failed to save uploaded audio file');
            }

            Log::info('Audio file uploaded', [
                'path' => $fullPath,
                'size' => filesize($fullPath),
                'exists' => file_exists($fullPath)
            ]);

            return $this->processAudioFile($fullPath);
        } catch (\Exception $e) {
            Log::error('Lip sync file processing error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->addCorsHeaders(response()->json([
                'error' => 'An error occurred while processing lip sync',
                'message' => $e->getMessage()
            ], 500));
        }
    }

    /**
     * Process audio file with Rhubarb Lip Sync
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function process(Request $request)
    {
        // Handle CORS preflight
        if ($request->isMethod('OPTIONS')) {
            return response()->json([], 200)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type');
        }

        $request->validate([
            'audio_url' => 'required|url',
        ]);

        try {
            $audioUrl = $request->input('audio_url');
            
            // Download the audio file
            $audioContent = file_get_contents($audioUrl);
            if ($audioContent === false) {
            return $this->addCorsHeaders(response()->json([
                'error' => 'Failed to download audio file'
            ], 400));
            }

            // Save audio file temporarily
            $tempFilename = 'audio_' . time() . '_' . uniqid() . '.wav';
            $tempPath = storage_path('app/temp/' . $tempFilename);
            
            // Ensure temp directory exists
            if (!is_dir(storage_path('app/temp'))) {
                mkdir(storage_path('app/temp'), 0755, true);
            }

            // Save audio file
            file_put_contents($tempPath, $audioContent);

            return $this->processAudioFile($tempPath);

        } catch (\Exception $e) {
            Log::error('Lip sync processing error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->addCorsHeaders(response()->json([
                'error' => 'An error occurred while processing lip sync',
                'message' => $e->getMessage()
            ], 500));
        }
    }

    /**
     * Process audio file with Rhubarb Lip Sync
     * 
     * @param string $audioPath - Path to audio file
     * @return \Illuminate\Http\JsonResponse
     */
    private function processAudioFile($audioPath)
    {
        // Normalize path for Windows
        $audioPath = str_replace('/', DIRECTORY_SEPARATOR, $audioPath);
        
        // Verify audio file exists
        if (!file_exists($audioPath)) {
            Log::error('Audio file not found', ['path' => $audioPath]);
            return $this->addCorsHeaders(response()->json([
                'error' => 'Audio file not found',
                'path' => $audioPath
            ], 500));
        }

        // Get Rhubarb executable path
        $rhubarbPath = $this->getRhubarbPath();
        
        if (!$rhubarbPath || !file_exists($rhubarbPath)) {
            // Clean up temp file
            @unlink($audioPath);
            
            return $this->addCorsHeaders(response()->json([
                'error' => 'Rhubarb Lip Sync executable not found. Please install Rhubarb Lip Sync.',
                'instructions' => 'Download from: https://github.com/DanielSWolf/rhubarb-lip-sync/releases'
            ], 500));
        }

        // Normalize Rhubarb path for Windows
        $rhubarbPath = str_replace('/', DIRECTORY_SEPARATOR, $rhubarbPath);

        // Run Rhubarb Lip Sync
        // Output format: JSON
        // Extended shapes: false (use basic shapes: A, B, C, D, E, F, G, H, X)
        $outputPath = storage_path('app/temp/' . pathinfo($audioPath, PATHINFO_FILENAME) . '.json');
        $outputPath = str_replace('/', DIRECTORY_SEPARATOR, $outputPath);
        
        // Ensure output directory exists
        $outputDir = dirname($outputPath);
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }
        
        // Build command - use proper escaping for Windows
        $command = escapeshellarg($rhubarbPath) . ' ' . 
                  escapeshellarg($audioPath) . ' ' .
                  '-f json ' .
                  '-o ' . escapeshellarg($outputPath);

        Log::info('Running Rhubarb command', [
            'command' => $command,
            'audio_path' => $audioPath,
            'output_path' => $outputPath,
            'audio_exists' => file_exists($audioPath)
        ]);

        // Execute command
        $output = [];
        $returnCode = 0;
        exec($command . ' 2>&1', $output, $returnCode);

        // Check if processing succeeded BEFORE cleaning up
        if ($returnCode !== 0 || !file_exists($outputPath)) {
            Log::warning('Rhubarb Lip Sync failed, returning empty data for fallback animation', [
                'command' => $command,
                'output' => implode("\n", $output),
                'return_code' => $returnCode,
                'audio_exists' => file_exists($audioPath),
                'output_exists' => file_exists($outputPath)
            ]);

            // Clean up temp audio file
            @unlink($audioPath);

            // Return success with empty data - frontend will use fallback animation
            return $this->addCorsHeaders(response()->json([
                'success' => true,
                'data' => [
                    'metadata' => [
                        'soundFile' => basename($audioPath),
                        'duration' => 0
                    ],
                    'mouthCues' => []
                ],
                'fallback' => true,
                'message' => 'Rhubarb processing failed, using fallback animation'
            ]));
        }

        // Read and return JSON output
        $lipSyncData = json_decode(file_get_contents($outputPath), true);
        
        // Clean up files AFTER successful processing
        @unlink($audioPath);
        @unlink($outputPath);

        if (!$lipSyncData) {
            return $this->addCorsHeaders(response()->json([
                'error' => 'Failed to parse Rhubarb output',
                'output_path' => $outputPath
            ], 500));
        }

        return $this->addCorsHeaders(response()->json([
            'success' => true,
            'data' => $lipSyncData
        ]));
    }

    /**
     * Get the path to Rhubarb executable
     * 
     * @return string|null
     */
    private function getRhubarbPath()
    {
        // Check common locations
        $possiblePaths = [
            // Windows
            base_path('rhubarb/rhubarb.exe'),
            base_path('rhubarb.exe'),
            storage_path('app/rhubarb/rhubarb.exe'),
            
            // Linux/Mac
            base_path('rhubarb/rhubarb'),
            base_path('rhubarb'),
            storage_path('app/rhubarb/rhubarb'),
            
            // System PATH
            'rhubarb',
            'rhubarb.exe',
        ];

        foreach ($possiblePaths as $path) {
            if (file_exists($path) && is_executable($path)) {
                return $path;
            }
        }

        // Check if it's in PATH
        $whichOutput = [];
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $command = $isWindows ? 'where rhubarb.exe' : 'which rhubarb';
        
        exec($command . ' 2>&1', $whichOutput, $returnCode);
        
        if ($returnCode === 0 && !empty($whichOutput[0])) {
            $foundPath = trim($whichOutput[0]);
            if (file_exists($foundPath)) {
                return $foundPath;
            }
        }

        return null;
    }
}

