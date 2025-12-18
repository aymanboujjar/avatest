import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import Avatar from './components/Avatar'
import { speak } from './utils/speak'
import { processLipSync } from './utils/lipSync'
import { getInteractiveResponse, getPredefinedResponse } from './utils/interactive'
import { LipSyncProvider, useLipSyncContext } from './contexts/LipSyncContext'
import './App.css'

function AppContent() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const { setLipSyncData, setAudioElement, setIsProcessing } = useLipSyncContext()

  async function handleSpeak(e) {
    e.preventDefault()
    
    if (!text.trim()) {
      setError('Please enter some text')
      return
    }

    setLoading(true)
    setError(null)
    setAudioUrl(null)

    try {
      // Get interactive response
      let responseText = text.trim()
      
      // Check for predefined responses first
      const predefined = getPredefinedResponse(responseText)
      if (predefined) {
        responseText = predefined
      } else {
        // Get interactive response (searches web if needed)
        try {
          responseText = await getInteractiveResponse(responseText)
        } catch (interactiveError) {
          console.warn('Interactive response failed, using original text:', interactiveError)
          // Use original text if interactive fails
        }
      }
      
      console.log('Speaking:', responseText)
      
      // Puter.js returns an audio element directly
      const audio = await speak(responseText)
      
      // Remove previous audio element if exists
      const prevAudio = document.querySelector('.generated-audio')
      if (prevAudio) {
        prevAudio.remove()
      }

      // Add controls and styling to the audio element
      audio.className = 'generated-audio'
      audio.controls = true
      audio.style.width = '100%'
      audio.style.marginTop = '12px'
      
      // Create or find audio container
      let audioContainer = document.querySelector('.audio-container')
      if (!audioContainer) {
        audioContainer = document.createElement('div')
        audioContainer.className = 'audio-container'
        const form = e.target
        form.appendChild(audioContainer)
      }
      audioContainer.innerHTML = ''
      audioContainer.appendChild(audio)

      // Store audio element for lip sync
      setAudioElement(audio)

      // Process lip sync (non-blocking - always succeeds)
      setIsProcessing(true)
      try {
        console.log('Processing lip sync...')
        const lipSyncResult = await processLipSync(audio)
        setLipSyncData(lipSyncResult)
        console.log('Lip sync data loaded:', lipSyncResult)
      } catch (lipSyncError) {
        console.warn('Lip sync processing failed, using fallback animation:', lipSyncError)
        // Set empty data so fallback animation is used
        setLipSyncData({
          metadata: { duration: 0 },
          mouthCues: []
        })
      } finally {
        setIsProcessing(false)
      }

      // Try to play the audio
      try {
        await audio.play()
        console.log('Audio playing')
        setAudioUrl('playing') // Set a flag to show success
      } catch (err) {
        console.error('Audio play blocked:', err)
        setError('Audio generated but autoplay was blocked. Use the audio controls to play.')
        setAudioUrl('ready') // Audio is ready but not playing
      }
    } catch (err) {
      console.error('TTS Error:', err)
      setError(err.message || 'Failed to generate speech. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      {/* 3D AVATAR CANVAS */}
      <div className="avatar-section">
        <Canvas camera={{ position: [0, 1.6, 3], fov: 35 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          <Avatar />

          <OrbitControls />
          <Environment preset="studio" />
        </Canvas>
      </div>

      {/* TEXT INPUT SECTION */}
      <div className="tts-section">
        <div className="tts-container">
          <h2 className="section-title">Text to Speech</h2>
          <form onSubmit={handleSpeak} className="tts-form">
            <div className="form-group">
              <label htmlFor="text-input">Enter text to convert to speech:</label>
              <textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your text here... The avatar will speak your words!"
                rows={6}
                maxLength={1000}
                disabled={loading}
              />
              <div className="char-count">{text.length}/1000</div>
            </div>
            
            <button type="submit" disabled={loading || !text.trim()} className="generate-button">
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating Speech & Lip Sync...
                </>
              ) : (
                'Generate Speech'
              )}
            </button>

            {error && <div className="error-message">{error}</div>}
            
            {audioUrl && !error && (
              <div className="success-message">
                ✓ Audio generated successfully!
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LipSyncProvider>
      <AppContent />
    </LipSyncProvider>
  )
}
