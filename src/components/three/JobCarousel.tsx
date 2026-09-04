import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Text, OrbitControls, Environment, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { JobRecommendation } from '@/lib/analysis.functions';

interface JobCarouselProps {
  jobs: JobRecommendation[];
}

function Card({ job, index, total }: { job: JobRecommendation, index: number, total: number }) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  
  // Calculate position in a semi-circle/carousel
  const angle = (index - (total - 1) / 2) * 0.8;
  const radius = 6;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius - radius;

  // Animation for hovering
  useFrame((state, delta) => {
    if (meshRef.current) {
      const targetY = hovered ? 0.5 : 0;
      const targetZ = hovered ? z + 1 : z;
      const targetScale = hovered ? 1.1 : 1;
      
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 5);
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, delta * 5);
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * 5));
    }
  });

  return (
    <Float floatIntensity={1.5} rotationIntensity={0.5} speed={2}>
      <group 
        ref={meshRef} 
        position={[x, 0, z]} 
        rotation={[0, -angle * 0.5, 0]}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <mesh>
          <planeGeometry args={[3.5, 4.5]} />
          <meshPhysicalMaterial 
            color={job.type === 'job' ? '#2e1065' : '#0f172a'} 
            metalness={0.8} 
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.2}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Glow border */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[3.6, 4.6]} />
          <meshBasicMaterial color={job.type === 'job' ? '#8B5CF6' : '#06B6D4'} transparent opacity={hovered ? 0.6 : 0.2} />
        </mesh>

        {/* HTML Overlay for crisp text and interaction */}
        <Html transform position={[0, 0, 0.01]} distanceFactor={4} zIndexRange={[100, 0]}>
          <div className="w-[300px] h-[380px] rounded-2xl glass-dark border border-white/20 p-6 flex flex-col justify-between"
               style={{ 
                 background: hovered ? 'rgba(20,22,50,0.8)' : 'rgba(20,22,50,0.5)',
                 transition: 'all 0.3s ease'
               }}>
            
            <div>
              <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${job.type === 'job' ? 'bg-primary/20 text-primary' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {job.type.toUpperCase()}
              </div>
              
              <h3 className="mt-4 text-xl font-bold text-white line-clamp-2">{job.title}</h3>
              <div className="mt-2 text-sm text-white/70">{job.companyType}</div>
              
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-white">
                <span className="text-white/50">💰</span> {job.salary}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60">Match Score</span>
                <span className="text-sm font-bold text-primary">{job.matchScore}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full" style={{ width: `${job.matchScore}%` }} />
              </div>
              <p className="mt-3 text-xs text-white/60 line-clamp-2">{job.matchReason}</p>
            </div>

            <a 
              href={job.searchUrl} 
              target="_blank" 
              rel="noreferrer"
              className="mt-4 block w-full rounded-xl bg-gradient-to-r from-primary to-secondary py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              Apply on Naukri →
            </a>
          </div>
        </Html>
      </group>
    </Float>
  );
}

export function JobCarousel({ jobs }: { jobs: JobRecommendation[] }) {
  if (!jobs || jobs.length === 0) return null;

  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
      
      <Canvas camera={{ position: [0, 1, 10], fov: 45 }}>
        <color attach="background" args={['#050814']} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Sparkles count={150} scale={12} size={2} speed={0.4} opacity={0.5} color="#8B5CF6" />
        
        <group position={[0, -0.5, 0]}>
          {jobs.map((job, i) => (
            <Card key={i} job={job} index={i} total={jobs.length} />
          ))}
        </group>
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
        <Environment preset="city" />
      </Canvas>
      
      {/* Overlay Instructions */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-xs font-medium text-white/70 backdrop-blur-md border border-white/10">
          <span className="animate-pulse">👈</span> Drag to rotate <span className="animate-pulse">👉</span>
        </span>
      </div>
    </div>
  );
}
