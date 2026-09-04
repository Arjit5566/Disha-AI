import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars, Float, Torus } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh, Group } from "three";

function FloatingBook({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2 + position[0];
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[1, 1.3, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
    </Float>
  );
}

function OrbitingQuestionMarkRing() {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = -state.clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Floating abstract ring */}
      <Torus args={[3, 0.03, 16, 100]} rotation={[Math.PI / 2.5, 0, 0]}>
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.15} />
      </Torus>
    </group>
  );
}

export function QuizScene() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#8B5CF6" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#06B6D4" />
          
          <FloatingBook position={[3, 1.5, -2]} color="#8B5CF6" />
          <FloatingBook position={[-3.5, -1, -1]} color="#06B6D4" />
          <FloatingBook position={[1.5, -2, 0]} color="#ec4899" />
          
          <OrbitingQuestionMarkRing />
          <Sparkles count={60} scale={7} size={2.5} speed={0.4} color="#a78bfa" />
          <Stars radius={50} depth={40} count={600} factor={4} fade speed={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}
