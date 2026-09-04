import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Torus } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import { Shape, Group, Mesh } from "three";

function Document() {
  const groupRef = useRef<Group>(null);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;
    if (groupRef.current) {
      // Premium floating and rotating effect
      groupRef.current.rotation.y = Math.sin(timeRef.current * 0.4) * 0.2;
      groupRef.current.rotation.x = Math.cos(timeRef.current * 0.3) * 0.08;
      groupRef.current.position.y = Math.sin(timeRef.current * 1.2) * 0.1;
    }
  });

  const [docGeometry, foldGeometry] = useMemo(() => {
    const w = 1.0; // half-width
    const h = 1.4; // half-height
    const r = 0.12; // corner radius
    const cut = 0.4; // cut corner size

    // Custom shape for rounded-corner card with top-right folder cut
    const doc = new Shape();
    doc.moveTo(-w + r, h);
    doc.lineTo(w - cut, h);
    doc.lineTo(w, h - cut);
    doc.lineTo(w, -h + r);
    doc.quadraticCurveTo(w, -h, w - r, -h);
    doc.lineTo(-w + r, -h);
    doc.quadraticCurveTo(-w, -h, -w, -h + r);
    doc.lineTo(-w, h - r);
    doc.quadraticCurveTo(-w, h, -w + r, h);

    // Shape for the folded corner flap
    const fold = new Shape();
    fold.moveTo(0, 0);
    fold.lineTo(-cut, 0);
    fold.lineTo(0, -cut);
    fold.lineTo(0, 0);

    return [doc, fold];
  }, []);

  const extrudeSettings = {
    depth: 0.05,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  };

  return (
    <group ref={groupRef}>
      {/* 3D Glass Document Base */}
      <mesh position={[-0.05, -0.05, -0.025]}>
        <extrudeGeometry args={[docGeometry, extrudeSettings]} />
        <meshPhysicalMaterial
          color="#1e1b4b" // Dark indigo
          emissive="#7c3aed"
          emissiveIntensity={0.25}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.7}
          transmission={0.65}
          thickness={0.5}
          clearcoat={1.0}
        />
      </mesh>

      {/* Folded Corner flap */}
      <mesh position={[1.0 - 0.45, 1.4 - 0.45, 0.02]} rotation={[0, 0, 0]}>
        <extrudeGeometry args={[foldGeometry, { ...extrudeSettings, depth: 0.02 }]} />
        <meshPhysicalMaterial
          color="#a78bfa"
          emissive="#c084fc"
          emissiveIntensity={0.5}
          roughness={0.15}
          metalness={0.2}
          transparent
          opacity={0.85}
          clearcoat={1.0}
        />
      </mesh>

      {/* Avatar Profile Circle */}
      <mesh position={[0, 0.4, 0.045]}>
        <ringGeometry args={[0.22, 0.26, 32]} />
        <meshBasicMaterial color="#c084fc" toneMapped={false} />
      </mesh>
      
      {/* Avatar Head */}
      <mesh position={[0, 0.44, 0.045]}>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshBasicMaterial color="#c084fc" toneMapped={false} />
      </mesh>

      {/* Avatar Shoulders */}
      <mesh position={[0, 0.26, 0.045]}>
        <ringGeometry args={[0, 0.16, 32, 1, 0, Math.PI]} />
        <meshBasicMaterial color="#c084fc" toneMapped={false} />
      </mesh>

      {/* Dotted lines / Text lines */}
      <mesh position={[0, -0.1, 0.045]}>
        <boxGeometry args={[1.2, 0.06, 0.01]} />
        <meshBasicMaterial color="#d8b4fe" opacity={0.7} transparent />
      </mesh>
      <mesh position={[0, -0.3, 0.045]}>
        <boxGeometry args={[1.2, 0.06, 0.01]} />
        <meshBasicMaterial color="#d8b4fe" opacity={0.7} transparent />
      </mesh>
      <mesh position={[-0.15, -0.5, 0.045]}>
        <boxGeometry args={[0.9, 0.06, 0.01]} />
        <meshBasicMaterial color="#d8b4fe" opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

function OrbitRings() {
  const ring1Ref = useRef<Group>(null);
  const ring2Ref = useRef<Group>(null);
  const particle1Ref = useRef<Mesh>(null);
  const particle2Ref = useRef<Mesh>(null);
  const particle3Ref = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Rotate ring containers
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 2.6;
      ring1Ref.current.rotation.y = Math.sin(t * 0.1) * 0.15;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 1.8;
      ring2Ref.current.rotation.y = Math.cos(t * 0.1) * 0.15 + Math.PI / 3;
    }

    // Move particles dynamically along the circular path
    const r1 = 1.9;
    const theta1 = t * 0.7;
    if (particle1Ref.current) {
      particle1Ref.current.position.set(r1 * Math.cos(theta1), r1 * Math.sin(theta1), 0);
    }
    if (particle2Ref.current) {
      const theta2 = t * 0.7 + Math.PI;
      particle2Ref.current.position.set(r1 * Math.cos(theta2), r1 * Math.sin(theta2), 0);
    }

    const r2 = 2.3;
    const theta3 = -t * 0.5;
    if (particle3Ref.current) {
      particle3Ref.current.position.set(r2 * Math.cos(theta3), r2 * Math.sin(theta3), 0);
    }
  });

  return (
    <group>
      {/* Ring 1 */}
      <group ref={ring1Ref}>
        <Torus args={[1.9, 0.012, 16, 100]}>
          <meshBasicMaterial color="#a78bfa" opacity={0.2} transparent />
        </Torus>
        <mesh ref={particle1Ref}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#c084fc" toneMapped={false} />
        </mesh>
        <mesh ref={particle2Ref}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#c084fc" toneMapped={false} />
        </mesh>
      </group>

      {/* Ring 2 */}
      <group ref={ring2Ref}>
        <Torus args={[2.3, 0.008, 16, 100]}>
          <meshBasicMaterial color="#06B6D4" opacity={0.15} transparent />
        </Torus>
        <mesh ref={particle3Ref}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#22d3ee" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function ProcessingOrb() {
  return (
    <Canvas camera={{ position: [0, 0, 4.8], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} className="!absolute inset-0">
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <pointLight position={[4, 4, 4]} intensity={2} color="#a78bfa" />
        <pointLight position={[-4, -3, -4]} intensity={1.5} color="#06b6d4" />
        <directionalLight position={[0, 4, 2]} intensity={1} color="#ffffff" />
        <Document />
        <OrbitRings />
        <Sparkles count={80} scale={4.5} size={3} speed={0.4} color="#d8b4fe" />
      </Suspense>
    </Canvas>
  );
}
