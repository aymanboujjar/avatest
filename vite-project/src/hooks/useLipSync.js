import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { useLipSyncContext } from '../contexts/LipSyncContext'
import { RHUBARB_TO_VISEME } from '../utils/lipSync'
import { AudioAnalyzer } from '../utils/audioAnalyzer'
import { mapPhonemeToVisemes } from '../utils/phonemeMapper'

export function useLipSync(headRef) {
  const { lipSyncData, audioElement } = useLipSyncContext()
  const currentTimeRef = useRef(0)
  const mouthCuesRef = useRef([])
  const isPlayingRef = useRef(false)
  const previousVisemeRef = useRef(null)
  const transitionProgressRef = useRef(0)
  const animationPhaseRef = useRef(0)
  const audioAnalyzerRef = useRef(null)
  const audioDataRef = useRef({ 
    volume: 0, 
    frequency: 0, 
    intensity: 0,
    formants: { f1: 0, f2: 0, f3: 0 },
    phonemeType: 'silence',
    spectralCentroid: 0
  })
  const volumeHistoryRef = useRef([])
  const previousPhonemeRef = useRef('silence')
  const transitionBlendRef = useRef(0)

  useEffect(() => {
    if (lipSyncData && lipSyncData.mouthCues) {
      mouthCuesRef.current = lipSyncData.mouthCues
    } else {
      mouthCuesRef.current = []
    }
  }, [lipSyncData])

  useEffect(() => {
    if (!audioElement) {
      currentTimeRef.current = 0
      isPlayingRef.current = false
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.stop()
        audioAnalyzerRef.current = null
      }
      return
    }

    // Initialize audio analyzer for realistic lip sync
    const analyzer = new AudioAnalyzer(audioElement)
    audioAnalyzerRef.current = analyzer

    const updateTime = () => {
      if (audioElement && !audioElement.paused) {
        currentTimeRef.current = audioElement.currentTime
        isPlayingRef.current = true
      } else {
        isPlayingRef.current = false
      }
    }
    
    // Update audio analysis continuously for ultra-responsive lip sync
    let animationFrameId = null
    const updateAudioAnalysis = () => {
      if (analyzer.isAnalyzing && audioElement && !audioElement.paused) {
        const newAudioData = analyzer.getAudioData()
        
        // Smooth phoneme transitions
        if (newAudioData.phonemeType !== previousPhonemeRef.current) {
          transitionBlendRef.current = 0
        } else {
          transitionBlendRef.current = Math.min(1, transitionBlendRef.current + 0.15)
        }
        previousPhonemeRef.current = newAudioData.phonemeType
        
        audioDataRef.current = newAudioData
        
        // Keep volume history for smoother transitions
        volumeHistoryRef.current.push(audioDataRef.current.volume)
        if (volumeHistoryRef.current.length > 20) {
          volumeHistoryRef.current.shift()
        }
      }
      
      if (isPlayingRef.current) {
        animationFrameId = requestAnimationFrame(updateAudioAnalysis)
      }
    }

    const handlePlay = async () => {
      isPlayingRef.current = true
      updateTime()
      // Start audio analysis
      await analyzer.start()
      // Start continuous audio analysis
      updateAudioAnalysis()
    }

    const handlePause = () => {
      isPlayingRef.current = false
      updateTime()
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }

    const handleEnded = () => {
      currentTimeRef.current = 0
      isPlayingRef.current = false
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      analyzer.stop()
    }

    audioElement.addEventListener('timeupdate', updateTime)
    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('playing', handlePlay)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handleEnded)

    // Check initial state
    isPlayingRef.current = !audioElement.paused && !audioElement.ended
    if (isPlayingRef.current) {
      analyzer.start().then(() => {
        updateAudioAnalysis()
      })
    }

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('playing', handlePlay)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handleEnded)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      analyzer.stop()
    }
  }, [audioElement])

  useFrame(() => {
    if (!headRef.current) return

    const mesh = headRef.current
    if (!mesh.morphTargetInfluences) return

    const dict = mesh.morphTargetDictionary
    const infl = mesh.morphTargetInfluences

    // Reset all visemes
    infl.fill(0)

    // Check if audio is playing
    const isAudioPlaying = isPlayingRef.current && audioElement && !audioElement.paused && !audioElement.ended
    const hasLipSyncData = mouthCuesRef.current && mouthCuesRef.current.length > 0

    // If no audio playing, keep mouth closed
    if (!isAudioPlaying) {
      // Set to closed mouth (silence) - viseme_sil or viseme_X
      const silenceVisemes = ['viseme_sil', 'viseme_X', 'viseme_oh']
      for (const viseme of silenceVisemes) {
        if (dict[viseme] !== undefined) {
          infl[dict[viseme]] = 1.0
          break
        }
      }
      return
    }

    // Advanced smooth animation system
    const audioTime = currentTimeRef.current || 0
    const delta = 0.016 // ~60fps
    
    // Use Rhubarb data if available with smooth transitions
    if (hasLipSyncData) {
      const currentTime = currentTimeRef.current
      let currentCue = null
      let nextCue = null

      // Find current and next cues for smooth transitions
      for (let i = 0; i < mouthCuesRef.current.length; i++) {
        const cue = mouthCuesRef.current[i]
        if (currentTime >= cue.start && currentTime <= cue.end) {
          currentCue = cue
          if (i < mouthCuesRef.current.length - 1) {
            nextCue = mouthCuesRef.current[i + 1]
          }
          break
        }
      }

      if (currentCue) {
        const mouthShape = currentCue.value
        const visemeName = RHUBARB_TO_VISEME[mouthShape] || 'viseme_sil'
        
        // Smooth transition to next viseme
        if (nextCue && currentTime > currentCue.end - 0.1) {
          const timeUntilNext = nextCue.start - currentTime
          const transitionDuration = 0.1
          const blendFactor = Math.max(0, Math.min(1, (transitionDuration - timeUntilNext) / transitionDuration))
          
          const nextVisemeName = RHUBARB_TO_VISEME[nextCue.value] || 'viseme_sil'
          
          if (dict[visemeName] !== undefined) {
            infl[dict[visemeName]] = 1.0 - blendFactor
          }
          if (dict[nextVisemeName] !== undefined) {
            infl[dict[nextVisemeName]] = blendFactor
          }
        } else if (dict[visemeName] !== undefined) {
          infl[dict[visemeName]] = 1.0
        }
        return
      }
    }
    
    // ULTRA-REALISTIC AUDIO-DRIVEN LIP SYNC
    // Uses advanced formant analysis and phoneme detection
    const audioData = audioDataRef.current
    
    // Use phoneme mapper for ultra-realistic lip sync
    mapPhonemeToVisemes(
      audioData.phonemeType || 'silence',
      audioData.formants || { f1: 0, f2: 0, f3: 0 },
      audioData.volume || 0,
      audioData.spectralCentroid || 0,
      dict,
      infl
    )
    
    // Add micro-movements based on zero-crossing rate for natural speech
    const zcr = audioData.zeroCrossingRate || 0
    if (zcr > 0.1 && audioData.volume > 0.1) {
      // High zero-crossing rate = consonants, add subtle movement
      const microMovement = Math.sin(audioTime * 20) * 0.15 * zcr
      for (let i = 0; i < infl.length; i++) {
        if (infl[i] > 0.1) {
          infl[i] = Math.max(0, Math.min(1, infl[i] + microMovement))
        }
      }
    }
    
    // Smooth volume-based adjustments
    const avgVolume = volumeHistoryRef.current.length > 0
      ? volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length
      : audioData.volume
    
    // Enhance openness on volume peaks for teeth visibility
    if (audioData.volume > avgVolume * 1.3 && audioData.volume > 0.3) {
      if (dict.viseme_aa !== undefined) {
        infl[dict.viseme_aa] = Math.max(infl[dict.viseme_aa] || 0, audioData.volume * 0.9)
      }
    }
    
    return

  })
}
