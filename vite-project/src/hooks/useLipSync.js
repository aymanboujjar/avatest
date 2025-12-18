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

    // If audio is playing but no Rhubarb data, use fallback animation
    if (!hasLipSyncData) {
      // Create animated lip movement based on audio time
      const audioTime = currentTimeRef.current || 0
      // Use audio time to create natural-looking lip movement
      const frequency = 5.0 // Speed of lip movement
      const v1 = Math.abs(Math.sin(audioTime * frequency))
      const v2 = Math.abs(Math.sin(audioTime * frequency + Math.PI / 3))
      const v3 = Math.abs(Math.sin(audioTime * frequency + Math.PI * 2 / 3))
      
      // Map to different visemes for natural movement
      if (dict.viseme_aa !== undefined) infl[dict.viseme_aa] = v1 * 0.8
      if (dict.viseme_oh !== undefined) infl[dict.viseme_oh] = v2 * 0.6
      if (dict.viseme_ee !== undefined) infl[dict.viseme_ee] = v3 * 0.4
      if (dict.viseme_ou !== undefined) infl[dict.viseme_ou] = (1 - v1) * 0.5
      
      return
    }

    // Find current mouth cue based on audio time
    const currentTime = currentTimeRef.current
    let currentCue = null

    for (const cue of mouthCuesRef.current) {
      if (currentTime >= cue.start && currentTime <= cue.end) {
        currentCue = cue
        break
      }
    }

    // If no cue found, use silence (X)
    const mouthShape = currentCue ? currentCue.value : 'X'
    const visemeName = RHUBARB_TO_VISEME[mouthShape] || 'viseme_sil'

    // Apply viseme
    if (dict[visemeName] !== undefined) {
      infl[dict[visemeName]] = 1.0
    } else {
      // Fallback: try common viseme names
      const fallbackMap = {
        'A': ['viseme_aa', 'viseme_A'],
        'B': ['viseme_oh', 'viseme_B'],
        'C': ['viseme_ou', 'viseme_C'],
        'D': ['viseme_ee', 'viseme_D'],
        'E': ['viseme_ih', 'viseme_E'],
        'F': ['viseme_ff', 'viseme_F'],
        'G': ['viseme_th', 'viseme_G'],
        'H': ['viseme_kk', 'viseme_H'],
        'X': ['viseme_sil', 'viseme_X'],
      }

      const fallbacks = fallbackMap[mouthShape] || []
      for (const fallback of fallbacks) {
        if (dict[fallback] !== undefined) {
          infl[dict[fallback]] = 1.0
          break
        }
      }
    }
  })
}
