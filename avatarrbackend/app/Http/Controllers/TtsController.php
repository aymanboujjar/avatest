<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class TtsController extends Controller
{
    public function speak(Request $request)
    {
        $request->validate([
            'text' => 'required|string|max:1000'
        ]);

        $text = $request->input('text');
        $apiKey = env('OPENAI_API_KEY');

        if (!$apiKey) {
            return response()->json([
                'error' => 'OpenAI API key not configured'
            ], 500);
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(30)
                ->post('https://api.openai.com/v1/audio/speech', [
                    'model' => 'tts-1',
                    'voice' => 'alloy',
                    'input' => $text,
                ]);

            if (!$response->successful()) {
                $errorBody = $response->json();
                $errorMessage = 'Failed to generate speech';
                
                // Parse OpenAI error response
                if (isset($errorBody['error'])) {
                    $openAiError = $errorBody['error'];
                    if (isset($openAiError['message'])) {
                        $errorMessage = $openAiError['message'];
                    }
                    if (isset($openAiError['code'])) {
                        $errorCode = $openAiError['code'];
                        if ($errorCode === 'insufficient_quota') {
                            $errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits.';
                        } elseif ($errorCode === 'invalid_api_key') {
                            $errorMessage = 'Invalid OpenAI API key. Please check your API key configuration.';
                        }
                    }
                }
                
                Log::error('OpenAI TTS API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'parsed_error' => $errorMessage
                ]);

                return response()->json([
                    'error' => $errorMessage,
                    'status' => $response->status()
                ], $response->status());
            }

            $filename = 'speech_' . time() . '_' . uniqid() . '.mp3';
            Storage::disk('public')->put($filename, $response->body());

            // Generate the full URL for the audio file
            $url = Storage::disk('public')->url($filename);

            return response()->json([
                'url' => $url,
                'filename' => $filename
            ]);
        } catch (\Exception $e) {
            Log::error('TTS generation error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'An error occurred while generating speech',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
