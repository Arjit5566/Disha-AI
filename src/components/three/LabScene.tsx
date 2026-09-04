import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars, Float } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh, Group } from "three";

function RotatingCube({ position, size, color }: { position: [number, number, number]; size: number; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame((state, dt) => {
    if (ref.current) {
      ref.current.rotation.x += dt * 0.3;
      ref.current.rotation.y += dt * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={ref} position={position}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color={color} wireframe transparent opacity={0.3} />
      </mesh>
    </Float>
  );
}

function ParticleStream() {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <group ref={ref}>
      <Sparkles count={80} scale={8} size={3} speed={0.5} color="#06B6D4" />
    </group>
  );
}

export function LabScene() {
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
          <pointLight position={[5, 5, 5]} intensity={1.5} color="#06B6D4" />
          <pointLight position={[-5, -5, -5]} intensity={1.2} color="#8B5CF6" />
          
          <RotatingCube position={[-2.5, 1.5, -2]} size={1.2} color="#06B6D4" />
          <RotatingCube position={[3, -1, -1]} size={1.5} color="#8B5CF6" />
          <RotatingCube position={[-1.5, -2, 0]} size={0.8} color="#ec4899" />
          
          <ParticleStream />
          <Stars radius={50} depth={40} count={500} factor={3} fade speed={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}
