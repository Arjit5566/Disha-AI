import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";

function NeuralNetwork() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  // Generate node positions for the neural network
  const count = 40;
  const [positions, velocities, linesGeometry] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;     // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6; // z

      v[i * 3] = (Math.random() - 0.5) * 0.01;
      v[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      v[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    const linesGeom = new THREE.BufferGeometry();
    return [pos, v, linesGeom];
  }, []);

  useFrame(() => {
    if (!pointsRef.current || !linesRef.current) return;

    // Update positions
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      array[i * 3] += velocities[i * 3];
      array[i * 3 + 1] += velocities[i * 3 + 1];
      array[i * 3 + 2] += velocities[i * 3 + 2];

      // Boundary check
      if (Math.abs(array[i * 3]) > 4) velocities[i * 3] *= -1;
      if (Math.abs(array[i * 3 + 1]) > 3) velocities[i * 3 + 1] *= -1;
      if (Math.abs(array[i * 3 + 2]) > 3) velocities[i * 3 + 2] *= -1;
    }
    posAttr.needsUpdate = true;

    // Generate connecting lines between close nodes
    const linePositions: number[] = [];
    const maxDist = 2.0;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = array[i * 3] - array[j * 3];
        const dy = array[i * 3 + 1] - array[j * 3 + 1];
        const dz = array[i * 3 + 2] - array[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < maxDist) {
          linePositions.push(array[i * 3], array[i * 3 + 1], array[i * 3 + 2]);
          linePositions.push(array[j * 3], array[j * 3 + 1], array[j * 3 + 2]);
        }
      }
    }

    linesRef.current.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3)
    );
    linesRef.current.geometry.attributes.position.needsUpdate = true;

    // Slow rotation
    pointsRef.current.rotation.y += 0.001;
    linesRef.current.rotation.y += 0.001;
  });

  return (
    <group>
      {/* Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#a78bfa" size={0.15} transparent opacity={0.8} />
      </points>

      {/* Connection Lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#6366f1" transparent opacity={0.25} linewidth={1} />
      </lineSegments>
    </group>
  );
}

function OrbitingDots() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Dot 1 */}
      <mesh position={[4, 1.5, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#06B6D4" />
      </mesh>
      {/* Dot 2 */}
      <mesh position={[-4, -1.5, 2]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#8B5CF6" />
      </mesh>
      {/* Dot 3 */}
      <mesh position={[0, -2.5, -3]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#ec4899" />
      </mesh>
    </group>
  );
}

export function DashboardScene() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <NeuralNetwork />
          <OrbitingDots />
          <Sparkles count={50} scale={6} size={2} speed={0.3} color="#a78bfa" />
          <Stars radius={60} depth={30} count={500} factor={3} fade speed={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}
