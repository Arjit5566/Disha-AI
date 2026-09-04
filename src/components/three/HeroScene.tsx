import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Sparkles } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import { Shape, Path, Group, Mesh } from "three";

function PulseRings() {
  const ring1Ref = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (ring1Ref.current && ring1Ref.current.material) {
      const p = (t * 0.45) % 1.0;
      const s = 0.5 + p * 1.5;
      ring1Ref.current.scale.set(s, s, 1);
      const mat = ring1Ref.current.material as any;
      mat.opacity = (1.0 - p) * 0.6;
    }

    if (ring2Ref.current && ring2Ref.current.material) {
      const p = ((t * 0.45) + 0.5) % 1.0;
      const s = 0.5 + p * 1.5;
      ring2Ref.current.scale.set(s, s, 1);
      const mat = ring2Ref.current.material as any;
      mat.opacity = (1.0 - p) * 0.45;
    }
  });

  return (
    <group position={[0, 0, 0.08]}>
      <mesh ref={ring1Ref}>
        <ringGeometry args={[0.3, 0.33, 48]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref}>
        <ringGeometry args={[0.2, 0.22, 48]} />
        <meshBasicMaterial color="#2563EB" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

function OrbitRings() {
  const ringRef = useRef<Group>(null);
  const ringRef2 = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2.6;
      ringRef.current.rotation.y = t * 0.2;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.x = -Math.PI / 3.2;
      ringRef2.current.rotation.y = -t * 0.15;
    }
  });

  return (
    <group>
      {/* Outer purple ring */}
      <group ref={ringRef}>
        <mesh>
          <torusGeometry args={[2.2, 0.015, 16, 100]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.25} />
        </mesh>
        {/* Orbiting particle */}
        <mesh position={[2.2, 0, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#c084fc" toneMapped={false} />
        </mesh>
      </group>

      {/* Inner cyan ring */}
      <group ref={ringRef2}>
        <mesh>
          <torusGeometry args={[2.7, 0.012, 16, 100]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.15} />
        </mesh>
        {/* Orbiting particle */}
        <mesh position={[-2.7, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Core() {
  const groupRef = useRef<Group>(null);
  const starRef = useRef<Mesh>(null);

  // Mouse tilt tracking & Floating animation
  useFrame((state, dt) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      
      // Floating motion
      groupRef.current.position.y = Math.sin(t * 1.4) * 0.12;
      groupRef.current.position.x = Math.cos(t * 0.7) * 0.04;

      // Mouse interactive tilt + continuous gentle rotation
      const targetX = -state.pointer.y * 0.4; // Pitch
      const targetY = state.pointer.x * 0.4 + (t * 0.1); // Yaw
      
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.08;
      groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.08;
    }
    
    if (starRef.current) {
      const t = state.clock.getElapsedTime();
      starRef.current.rotation.z = -t * 0.35;
      const s = 1.0 + Math.sin(t * 2.5) * 0.08;
      starRef.current.scale.set(s, s, s);
    }
  });

  const { logoShape, starShape } = useMemo(() => {
    const scale = 0.032;
    const cx = 63;
    const cy = 60;

    // 1. Main outer shape
    const logo = new Shape();
    logo.moveTo((22 - cx) * scale, (cy - 14) * scale);
    logo.lineTo((22 - cx) * scale, (cy - 106) * scale);
    logo.lineTo((58 - cx) * scale, (cy - 106) * scale);
    logo.bezierCurveTo(
      (88 - cx) * scale, (cy - 106) * scale,
      (104 - cx) * scale, (cy - 87) * scale,
      (104 - cx) * scale, (cy - 60) * scale
    );
    logo.bezierCurveTo(
      (104 - cx) * scale, (cy - 33) * scale,
      (88 - cx) * scale, (cy - 14) * scale,
      (58 - cx) * scale, (cy - 14) * scale
    );
    logo.closePath();

    // 2. Inner cutout hole
    const hole = new Path();
    hole.moveTo((36 - cx) * scale, (cy - 28) * scale);
    hole.lineTo((36 - cx) * scale, (cy - 92) * scale);
    hole.lineTo((57 - cx) * scale, (cy - 92) * scale);
    hole.bezierCurveTo(
      (78 - cx) * scale, (cy - 92) * scale,
      (90 - cx) * scale, (cy - 78) * scale,
      (90 - cx) * scale, (cy - 60) * scale
    );
    hole.bezierCurveTo(
      (90 - cx) * scale, (cy - 42) * scale,
      (78 - cx) * scale, (cy - 28) * scale,
      (57 - cx) * scale, (cy - 28) * scale
    );
    hole.closePath();

    logo.holes.push(hole);

    // 3. Star shape
    const star = new Shape();
    star.moveTo(0 * scale, 15 * scale);
    star.lineTo(3.5 * scale, 2.5 * scale);
    star.lineTo(16 * scale, 0 * scale);
    star.lineTo(3.5 * scale, -2.5 * scale);
    star.lineTo(0 * scale, -15 * scale);
    star.lineTo(-3.5 * scale, -2.5 * scale);
    star.lineTo(-16 * scale, 0 * scale);
    star.lineTo(-3.5 * scale, 2.5 * scale);
    star.closePath();

    return { logoShape: logo, starShape: star };
  }, []);

  const extrudeSettings = {
    depth: 0.15,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  };

  const starExtrudeSettings = {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  };

  const dotScale = 0.032;
  const d1Pos: [number, number, number] = [-35 * dotScale, -46 * dotScale, 0.075];
  const d1Size: [number, number, number] = [12 * dotScale, 12 * dotScale, 0.15];

  const d2Pos: [number, number, number] = [-21.5 * dotScale, -46.5 * dotScale, 0.075];
  const d2Size: [number, number, number] = [9 * dotScale, 9 * dotScale, 0.12];

  const d3Pos: [number, number, number] = [-10 * dotScale, -47 * dotScale, 0.075];
  const d3Size: [number, number, number] = [6 * dotScale, 6 * dotScale, 0.09];

  return (
    <group ref={groupRef}>
      {/* Outer D Extruded Mesh */}
      <mesh position={[0, 0, -0.075]}>
        <extrudeGeometry args={[logoShape, extrudeSettings]} />
        <meshPhysicalMaterial
          color="#6D28D9"
          emissive="#2563EB"
          emissiveIntensity={0.25}
          roughness={0.12}
          metalness={0.88}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </mesh>

      {/* Central Star Sparkle */}
      <mesh ref={starRef} position={[0, 0, 0.06]}>
        <extrudeGeometry args={[starShape, starExtrudeSettings]} />
        <meshPhysicalMaterial
          color="#ffffff"
          emissive="#a78bfa"
          emissiveIntensity={1.8}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1.0}
        />
      </mesh>

      {/* Pulse Rings around the Star */}
      <PulseRings />

      {/* Pixel Dots */}
      <mesh position={d1Pos}>
        <boxGeometry args={d1Size} />
        <meshPhysicalMaterial
          color="#6D28D9"
          emissive="#2563EB"
          emissiveIntensity={0.25}
          roughness={0.12}
          metalness={0.88}
          clearcoat={1.0}
        />
      </mesh>

      <mesh position={d2Pos}>
        <boxGeometry args={d2Size} />
        <meshPhysicalMaterial
          color="#6D28D9"
          emissive="#2563EB"
          emissiveIntensity={0.25}
          roughness={0.12}
          metalness={0.88}
          clearcoat={1.0}
        />
      </mesh>

      <mesh position={d3Pos}>
        <boxGeometry args={d3Size} />
        <meshPhysicalMaterial
          color="#6D28D9"
          emissive="#2563EB"
          emissiveIntensity={0.25}
          roughness={0.12}
          metalness={0.88}
          clearcoat={1.0}
        />
      </mesh>
    </group>
  );
}

export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={3.5} color="#7C3AED" />
        <pointLight position={[-5, 5, 3]} intensity={3} color="#2563EB" />
        <pointLight position={[0, -5, 2]} intensity={2} color="#06B6D4" />
        <directionalLight position={[0, 4, 3]} intensity={1.5} color="#ffffff" />
        
        <Core />
        <OrbitRings />
        
        <Sparkles count={90} scale={6} size={3} speed={0.4} color="#a78bfa" />
        <Stars radius={50} depth={50} count={2000} factor={4} fade speed={1} />
      </Suspense>
    </Canvas>
  );
}
