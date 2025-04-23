import React, { useRef, useState } from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export function TreasureChest({ position = [0, 0, 0], scale = 1 }) {
  const meshRef = useRef();

  // Un coffre au trésor simple pour déposer les objets collectés
  return (
    <RigidBody type="fixed" colliders="hull" position={position}>
      <group ref={meshRef} scale={scale}>
        {/* Base du coffre */}
        <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[1.4, 0.6, 0.8]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>

        {/* Couvercle du coffre */}
        <mesh castShadow receiveShadow position={[0, 0.65, 0]}>
          <boxGeometry args={[1.5, 0.2, 0.9]} />
          <meshStandardMaterial color="#A0522D" roughness={0.8} />
        </mesh>

        {/* Serrure */}
        <mesh castShadow receiveShadow position={[0, 0.65, 0.45]}>
          <boxGeometry args={[0.2, 0.1, 0.1]} />
          <meshStandardMaterial
            color="#DAA520"
            roughness={0.6}
            metalness={0.6}
          />
        </mesh>

        {/* Panneau d'instructions */}
        <mesh
          castShadow
          receiveShadow
          position={[0, 1.2, 0]}
          rotation={[0, 0, 0]}
        >
          <boxGeometry args={[1.2, 0.8, 0.05]} />
          <meshStandardMaterial color="#DEB887" roughness={0.8} />
        </mesh>

        {/* Texte "Collection" */}
        <mesh castShadow receiveShadow position={[0, 1.2, 0.03]}>
          <planeGeometry args={[1, 0.6]} />
          <meshBasicMaterial transparent opacity={0.9}>
            <canvasTexture
              attach="map"
              image={createTextTexture("COLLECTION", "2em Arial", "#000000")}
            />
          </meshBasicMaterial>
        </mesh>
      </group>
    </RigidBody>
  );
}

// Fonction utilitaire pour créer une texture avec du texte
function createTextTexture(text, font, color) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 256;
  canvas.height = 128;

  context.fillStyle = "#EED8AE";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = font;
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  return canvas;
}
