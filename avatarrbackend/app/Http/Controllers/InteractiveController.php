<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InteractiveController extends Controller
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
     * Process user input and return appropriate response
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function respond(Request $request)
    {
        // Handle CORS preflight
        if ($request->isMethod('OPTIONS')) {
            return response()->json([], 200)
                ->header('Access-Control-Allow-Origin', '*')
                ->header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type');
        }

        $request->validate([
            'text' => 'required|string|max:1000'
        ]);

        $userInput = strtolower(trim($request->input('text')));
        
        // Check for specific responses
        $response = $this->getPredefinedResponse($userInput);
        
        if ($response) {
            return $this->addCorsHeaders(response()->json([
                'success' => true,
                'text' => $response,
                'type' => 'predefined'
            ]));
        }

        // For other questions, tell frontend to search
        return $this->addCorsHeaders(response()->json([
            'success' => true,
            'text' => $this->searchWeb($userInput),
            'type' => 'search'
        ]));
    }

    /**
     * Get predefined response for specific questions
     * 
     * @param string $input
     * @return string|null
     */
    private function getPredefinedResponse($input)
    {
        // Remove punctuation and extra spaces for better matching
        $input = preg_replace('/[^\w\s]/', '', $input);
        $input = preg_replace('/\s+/', ' ', $input);
        
        // Check for "hello" variations
        if (preg_match('/\b(hello|hi|hey|greetings)\b/i', $input)) {
            return "Hello!";
        }

        // Check for name questions
        if (preg_match('/\b(what.*your.*name|who.*are.*you|what.*you.*called)\b/i', $input)) {
            return "My name is Bojo.";
        }

        // Check for age questions
        if (preg_match('/\b(how.*old.*are.*you|what.*your.*age|age)\b/i', $input)) {
            return "I am 20 years old.";
        }

        return null;
    }

    /**
     * Search the web for answers
     * This will be handled by the frontend using Puter.js
     * 
     * @param string $query
     * @return string
     */
    private function searchWeb($query)
    {
        // Return a placeholder - actual search will be done on frontend with Puter.js
        $formattedQuery = ucfirst(trim($query, '?'));
        return "Let me search for information about: " . $formattedQuery;
    }
}

