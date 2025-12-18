<?php

use App\Http\Controllers\TtsController;
use App\Http\Controllers\LipSyncController;
use App\Http\Controllers\InteractiveController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::post('/tts', [TtsController::class, 'speak']);
Route::post('/lipsync', [LipSyncController::class, 'process']);
Route::post('/lipsync-file', [LipSyncController::class, 'processFile']);
Route::post('/interactive', [InteractiveController::class, 'respond']);
