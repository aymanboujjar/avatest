import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { useLipSyncContext } from '../contexts/LipSyncContext'
import { RHUBARB_TO_VISEME } from '../utils/lipSync'

export function useLipSync(headRef) {
  const { lipSyncData, audioElement } = useLipSyncContext()
  const currentTimeRef = useRef(0)
  const mouthCuesRef = useRef([])
  const isPlayingRef = useRef(false)

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
      return
    }

    const updateTime = () => {
      if (audioElement && !audioElement.paused) {
        currentTimeRef.current = audioElement.currentTime
        isPlayingRef.current = true
      } else {
        isPlayingRef.current = false
      }
    }

    const handlePlay = () => {
      isPlayingRef.current = true
      updateTime()
    }

    const handlePause = () => {
      isPlayingRef.current = false
      updateTime()
    }

    const handleEnded = () => {
      currentTimeRef.current = 0
      isPlayingRef.current = false
    }

    audioElement.addEventListener('timeupdate', updateTime)
    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('playing', handlePlay)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handleEnded)

    // Check initial state
    isPlayingRef.current = !audioElement.paused && !audioElement.ended

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('playing', handlePlay)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handleEnded)
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

    // Always use simple animation when audio is playing (don't wait for Rhubarb)
    // Simple, smooth lip movement synchronized with audio
    const audioTime = currentTimeRef.current || 0
    const frequency = 4.5 // Speed of lip movement - adjust for natural feel
    const v1 = Math.abs(Math.sin(audioTime * frequency))
    const v2 = Math.abs(Math.sin(audioTime * frequency + Math.PI / 2))
    
    // Use Rhubarb data if available, otherwise use simple animation
    if (hasLipSyncData) {
      // Try to use Rhubarb data, but fall back to animation if no cue matches
      const currentTime = currentTimeRef.current
      let currentCue = null

      for (const cue of mouthCuesRef.current) {
        if (currentTime >= cue.start && currentTime <= cue.end) {
          currentCue = cue
          break
        }
      }

      if (currentCue) {
        // Use Rhubarb mouth shape
        const mouthShape = currentCue.value
        const visemeName = RHUBARB_TO_VISEME[mouthShape] || 'viseme_sil'

        if (dict[visemeName] !== undefined) {
          infl[dict[visemeName]] = 1.0
          return
        }
      }
      // If Rhubarb cue not found, fall through to animation
    }
    
    // Simple animated lip movement (always works)
    if (dict.viseme_aa !== undefined) infl[dict.viseme_aa] = v1 * 0.7
    if (dict.viseme_oh !== undefined) infl[dict.viseme_oh] = v2 * 0.5
    if (dict.viseme_ee !== undefined) infl[dict.viseme_ee] = (1 - v1) * 0.4
    if (dict.viseme_ou !== undefined) infl[dict.viseme_ou] = (1 - v2) * 0.3
    
    return

  })
}
