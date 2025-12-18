import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import Avatar from './components/Avatar'
import { speak } from './utils/speak'
import './App.css'

export default function App() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)

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
      const url = await speak(text.trim())
      setAudioUrl(url)

      const audio = document.createElement('audio')
      audio.src = url
      audio.crossOrigin = 'anonymous'
      audio.controls = true

      // Remove previous audio element if exists
      const prevAudio = document.querySelector('.generated-audio')
      if (prevAudio) {
        prevAudio.remove()
      }

      audio.className = 'generated-audio'
      document.body.appendChild(audio)

      try {
        await audio.play()
        console.log('Audio playing')
      } catch (err) {
        console.error('Audio play blocked:', err)
        setError('Audio generated but autoplay was blocked. Use the audio controls to play.')
      }
    } catch (err) {
      console.error('TTS Error:', err)
      setError(err.message || 'Failed to generate speech. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* UI LAYER */}
      <div className="tts-controls">
        <form onSubmit={handleSpeak}>
          <div className="form-group">
            <label htmlFor="text-input">Enter text to convert to speech:</label>
            <textarea
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text here..."
              rows={4}
              maxLength={1000}
              disabled={loading}
            />
            <div className="char-count">{text.length}/1000</div>
          </div>
          
          <button type="submit" disabled={loading || !text.trim()}>
            {loading ? 'Generating...' : 'Generate Speech'}
          </button>

          {error && <div className="error-message">{error}</div>}
          
          {audioUrl && !error && (
            <div className="success-message">
              Audio generated successfully! Check the audio player below.
            </div>
          )}
        </form>
      </div>

      {/* 3D CANVAS */}
      <Canvas camera={{ position: [0, 1.6, 3], fov: 35 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <Avatar />

        <OrbitControls />
        <Environment preset="studio" />
      </Canvas>
    </>
  )
}
