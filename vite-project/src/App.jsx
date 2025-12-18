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
  const [answerText, setAnswerText] = useState(null) // Always show the answer
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
    setAnswerText(null)

    let responseText = null

    try {
      // STEP 1: ALWAYS GET THE ANSWER FIRST (this should never fail)
      const userQuery = text.trim()
      
      // Check for predefined responses first
      const predefined = getPredefinedResponse(userQuery)
      if (predefined) {
        responseText = predefined
      } else {
        // Get interactive response (searches web if needed)
        try {
          responseText = await getInteractiveResponse(userQuery)
        } catch (interactiveError) {
          console.warn('Interactive response failed, using original text:', interactiveError)
          responseText = userQuery // Always have something
        }
      }
      
      // Ensure we have text
      if (!responseText || !responseText.trim()) {
        responseText = userQuery || "I'm sorry, I couldn't process that request."
      }
      
      // STEP 2: DISPLAY ANSWER IMMEDIATELY (user always gets their answer)
      setAnswerText(responseText)
      console.log('Answer ready:', responseText.substring(0, 100))
      
      // STEP 3: TRY TO GENERATE SPEECH (optional - doesn't block answer display)
      let audio = null
      try {
        console.log('Attempting TTS generation...')
        audio = await speak(responseText)
      
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
          setAudioUrl('playing')
        } catch (err) {
          console.error('Audio play blocked:', err)
          setError('Audio generated but autoplay was blocked. Use the audio controls to play.')
          setAudioUrl('ready')
        }
      } catch (ttsError) {
        // TTS failed but answer is already displayed!
        console.warn('TTS generation failed, but answer is ready:', ttsError)
        setError('Speech generation failed, but your answer is shown below.')
        setAudioUrl('failed')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      // Even if everything fails, show something
      if (!answerText) {
        setAnswerText(text.trim() || "I encountered an error processing your request.")
      }
      setError('There was an issue, but I tried to provide an answer below.')
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

            {/* ALWAYS SHOW THE ANSWER - most important */}
            {answerText && (
              <div className="answer-display" style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#f0f9ff',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                fontSize: '16px',
                lineHeight: '1.6',
                color: '#1e40af',
                fontWeight: '500'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#1e3a8a' }}>
                  Answer:
                </div>
                <div>{answerText}</div>
                {/* Browser TTS button if Puter.js TTS failed */}
                {audioUrl === 'failed' && 'speechSynthesis' in window && (
                  <button
                    type="button"
                    onClick={() => {
                      window.speechSynthesis.cancel()
                      const utterance = new SpeechSynthesisUtterance(answerText)
                      utterance.rate = 0.9
                      utterance.pitch = 1
                      window.speechSynthesis.speak(utterance)
                    }}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🔊 Play with Browser TTS
                  </button>
                )}
              </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
            
            {audioUrl === 'playing' && (
              <div className="success-message">
                ✓ Audio generated and playing!
              </div>
            )}
            
            {audioUrl === 'ready' && (
              <div className="success-message">
                ✓ Audio generated! Use the controls above to play.
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
