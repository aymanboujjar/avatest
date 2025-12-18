import { useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useLipSync } from '../hooks/useLipSync'



export default function Avatar() {
    const { scene } = useGLTF('/models/avatar.glb')
    const headRef = useRef()

    useEffect(() => {
        scene.traverse((obj) => {
            if (obj.name === 'Wolf3D_Head') {
                headRef.current = obj
            }
        })
    }, [scene])

    useLipSync(headRef)

    return (
        <>

            <primitive
                object={scene}
                scale={1.5}
                position={[0, -1.5, 0]}
            />


        </>
    )
}

useGLTF.preload('/models/avatar.glb')
