import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars, Float } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh } from "three";

function FloatingBadgeShape({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame((state, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.25;
      ref.current.rotation.z += dt * 0.1;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.4} floatIntensity={1}>
      <mesh ref={ref} position={position}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </mesh>
    </Float>
  );
}

export function ProfileScene() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={1.5} color="#8B5CF6" />
          <pointLight position={[-5, -5, -5]} intensity={1} color="#06B6D4" />
          
          <FloatingBadgeShape position={[3, 2, -2]} color="#eab308" />
          <FloatingBadgeShape position={[-3.5, 1, -1]} color="#8B5CF6" />
          <FloatingBadgeShape position={[2, -2, 0]} color="#06B6D4" />
          
          <Sparkles count={50} scale={6} size={3} speed={0.4} color="#eab308" />
          <Stars radius={50} depth={35} count={500} factor={3} fade speed={0.6} />
        </Suspense>
      </Canvas>
    </div>
  );
}
