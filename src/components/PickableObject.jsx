import React, { useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

// Composant pour les objets que le crabe peut ramasser
export function PickableObject({
  position,
  scale = 1,
  color = "coral",
  shape = "shell",
  isPickedUp = false,
  onPickupRange = () => {},
  id,
}) {
  const rigidBodyRef = useRef();
  const objRef = useRef();
  const [isInRange, setIsInRange] = useState(false);

  // On pourrait charger des modèles 3D avec useGLTF ici
  // Pour l'instant, on utilise des formes géométriques simples

  let geometry;
  switch (shape) {
    case "shell":
      geometry = <torusGeometry args={[0.5, 0.2, 16, 32]} />;
      break;
    case "stone":
      geometry = <dodecahedronGeometry args={[0.5, 0]} />;
      break;
    case "starfish":
      geometry = <cylinderGeometry args={[0, 0.6, 0.2, 5]} />;
      break;
    case "treasure":
      geometry = <boxGeometry args={[0.7, 0.5, 0.7]} />;
      break;
    default:
      geometry = <sphereGeometry args={[0.5, 16, 16]} />;
  }

  // Effet de surbrillance/highlight quand l'objet est à portée de ramassage
  const handleHighlight = (inRange) => {
    setIsInRange(inRange);
    if (inRange) {
      onPickupRange(id);
    }
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders="hull"
      type={isPickedUp ? "kinematicPosition" : "dynamic"}
      position={position}
      restitution={0.2}
      friction={0.7}
      scale={scale}
      userData={{ type: "pickable", id }}
    >
      <mesh
        ref={objRef}
        castShadow
        receiveShadow
        scale={isInRange && !isPickedUp ? 1.1 : 1}
      >
        {geometry}
        <meshStandardMaterial
          color={isInRange && !isPickedUp ? "#ffff00" : color}
          roughness={0.7}
          metalness={shape === "treasure" ? 0.6 : 0.1}
        />
      </mesh>
    </RigidBody>
  );
}

// On peut précharger des modèles 3D ici si nécessaire
// useGLTF.preload("/models/shell.glb");
