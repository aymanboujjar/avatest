import { useFrame } from '@react-three/fiber'

export function useLipSync(headRef) {
  useFrame((_, delta) => {
    if (!headRef.current) return

    const mesh = headRef.current
    if (!mesh.morphTargetInfluences) return

    const dict = mesh.morphTargetDictionary
    const infl = mesh.morphTargetInfluences

    // Reset
    infl.fill(0)

    const t = Date.now() * 0.004
    const v = Math.abs(Math.sin(t))

    infl[dict.viseme_aa] = v
    infl[dict.viseme_oh] = 1 - v
  })
}
