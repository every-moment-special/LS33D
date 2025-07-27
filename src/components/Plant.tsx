import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const SPATIAL_TREE_RULES = {
  axiom: 'X',
  rules: {
    'X': 'F+[[X]-X]-F[-FX]+X+F[+X]-X+F[+X]+X',
    'F': 'FF'
  } as Record<string, string>,
  angle: Math.PI / 6,
  length: 0.08,
  iterations: 4,
  lengthVariation: 0.1,
  angleVariation: 0.05
};

interface TurtleState {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  angle: number;
  color: THREE.Color;
  radius: number;
  depth: number;
}

class TurtleStack {
  private stack: TurtleState[] = [];

  push(state: TurtleState) {
    this.stack.push({
      position: state.position.clone(),
      direction: state.direction.clone(),
      length: state.length,
      angle: state.angle,
      color: state.color.clone(),
      radius: state.radius,
      depth: state.depth
    });
  }

  pop(): TurtleState | null {
    const state = this.stack.pop();
    if (!state) return null;
    return {
      position: state.position.clone(),
      direction: state.direction.clone(),
      length: state.length,
      angle: state.angle,
      color: state.color.clone(),
      radius: state.radius,
      depth: state.depth
    };
  }
}

function getPlantColor(depth: number, time: number): THREE.Color {
  const trunkColor = new THREE.Color(0x8B4513);
  const branchColor = new THREE.Color(0xCD853F);
  const twigColor = new THREE.Color(0xD2691E);
  
  const t = Math.min(depth / 5, 1);
  const color = new THREE.Color();
  
  if (t < 0.3) {
    color.lerpColors(trunkColor, branchColor, t / 0.3);
  } else {
    color.lerpColors(branchColor, twigColor, (t - 0.3) / 0.7);
  }
  
  const variation = Math.sin(time * 0.1 + depth) * 0.05;
  color.offsetHSL(0, 0, variation);
  
  return color;
}

function generatePlantGeometry(time: number) {
  const branches: THREE.Mesh[] = [];
  
  let turtle: TurtleState = {
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 1, 0),
    length: SPATIAL_TREE_RULES.length,
    angle: SPATIAL_TREE_RULES.angle,
    color: new THREE.Color(0x8B4513),
    radius: 0.02,
    depth: 0
  };

  const stack = new TurtleStack();

  let currentString = SPATIAL_TREE_RULES.axiom;
  for (let i = 0; i < SPATIAL_TREE_RULES.iterations; i++) {
    let newString = '';
    for (const char of currentString) {
      if (SPATIAL_TREE_RULES.rules[char]) {
        newString += SPATIAL_TREE_RULES.rules[char];
      } else {
        newString += char;
      }
    }
    currentString = newString;
  }

  for (const char of currentString) {
    switch (char) {
      case 'F':
        const startPos = turtle.position.clone();
        
        const lengthVariation = 1 + (Math.random() - 0.5) * SPATIAL_TREE_RULES.lengthVariation;
        const actualLength = turtle.length * lengthVariation;
        
        turtle.position.add(turtle.direction.clone().multiplyScalar(actualLength));
        
        const branchGeometry = new THREE.CylinderGeometry(
          turtle.radius * 0.8,
          turtle.radius,
          actualLength,
          6,
          1,
          false
        );
        
        const branch = new THREE.Mesh(branchGeometry);
        branch.position.copy(startPos);
        branch.position.add(turtle.direction.clone().multiplyScalar(actualLength * 0.5));
        
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3();
        axis.crossVectors(up, turtle.direction).normalize();
        const angle = Math.acos(up.dot(turtle.direction));
        branch.quaternion.setFromAxisAngle(axis, angle);
        
        turtle.color = getPlantColor(turtle.depth, time);
        const branchMaterial = new THREE.MeshPhongMaterial({
          color: turtle.color,
          shininess: 20
        });
        branch.material = branchMaterial;
        
        branches.push(branch);
        break;

      case '+':
        const angleVariation = (Math.random() - 0.5) * SPATIAL_TREE_RULES.angleVariation;
        const actualAngle = turtle.angle + angleVariation;

        const rotationAxis = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        
        turtle.direction.applyAxisAngle(rotationAxis, actualAngle);
        turtle.depth += 0.1;
        break;

      case '-':
        const angleVariation2 = (Math.random() - 0.5) * SPATIAL_TREE_RULES.angleVariation;
        const actualAngle2 = turtle.angle + angleVariation2;
        
        const rotationAxis2 = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        
        turtle.direction.applyAxisAngle(rotationAxis2, -actualAngle2);
        turtle.depth += 0.1;
        break;

      case '[':
        stack.push(turtle);
        turtle.length *= 0.7;
        turtle.radius *= 0.7;
        turtle.depth += 0.2;
        
        const spatialVariation = new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        turtle.direction.add(spatialVariation).normalize();
        break;

      case ']':
        const restored = stack.pop();
        if (restored) {
          turtle = restored;
        }
        turtle.depth -= 0.2;
        break;
    }
  }

  return branches;
}

const PlantGeometry: React.FC = () => {
  const treeRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const { branches } = useMemo(() => {
    return {
      branches: generatePlantGeometry(0),
    };
  }, []);

//   useFrame((state) => {
//     timeRef.current = state.clock.elapsedTime;
    
//     if (treeRef.current) {
//       const windEffect = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
//       treeRef.current.rotation.y = windEffect;
//       treeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.01;
      
//       treeRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.005;
//     }
//   });

  return (
    <group>
      <group ref={treeRef}>
        {branches.map((branch, index) => (
          <primitive key={`branch-${index}`} object={branch} />
        ))}
      </group>
    </group>
  );
};

const Plant: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', userSelect: 'none' }}>
      <Canvas
        camera={{ position: [4, 2, 2], fov: 75 }}
        style={{ 
          background: '#000',
        }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.2} 
          color={0xFFF8DC}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.4} color={0x87CEEB} />
        <pointLight position={[5, -5, 5]} intensity={0.3} color={0xFFFACD} />

        <PlantGeometry />

        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          rotateSpeed={0.2}
          maxPolarAngle={Math.PI / 2}
          autoRotate={false}
          autoRotateSpeed={0}
        />
      </Canvas>
    </div>
  );
};

export default Plant;
