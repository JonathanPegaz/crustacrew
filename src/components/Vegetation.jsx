import React, { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import alea from "alea";

// Composant pour générer des éléments de végétation
export function Vegetation({
  heightmap,
  size,
  resolution,
  waterLevel,
  height,
  count = 50,
  seed = 123,
}) {
  const palmRef = useRef();

  // Chargement des modèles (vous devrez fournir ces modèles)
  // Note: Si vous n'avez pas ces modèles, vous pourriez utiliser des primitives simples comme des cônes et des cylindres
  const palm = useGLTF("/models/palm.glb", true);
  const rock = useGLTF("/models/rock.glb", true);

  // Utiliser une fonction pour positionner la végétation selon la heightmap
  const vegetationInstances = useMemo(() => {
    // Si nous n'avons pas de heightmap, retourner un tableau vide
    if (!heightmap) return [];

    // Créer un générateur de nombres pseudo-aléatoires avec une graine
    const noise2D = createNoise2D(alea(seed));
    const instances = [];

    // Nombre d'essais pour placer la végétation
    const maxAttempts = count * 3;

    // Créer la végétation
    for (let i = 0; i < maxAttempts && instances.length < count; i++) {
      // Position aléatoire sur la grille
      const gridX = Math.floor(Math.random() * (resolution - 1));
      const gridZ = Math.floor(Math.random() * (resolution - 1));

      // Convertir en coordonnées 3D
      const x = (gridX / (resolution - 1) - 0.5) * size;
      const z = (gridZ / (resolution - 1) - 0.5) * size;

      // Obtenir la hauteur à cette position
      const index = gridZ * resolution + gridX;
      const y = heightmap[index] * height;

      // Ne placer la végétation que sur la terre (pas sous l'eau)
      if (y <= waterLevel * height) continue;

      // Utiliser un bruit pour déterminer le type de végétation
      const noiseValue = noise2D(x * 0.05, z * 0.05);

      // Distance par rapport au centre pour favoriser les palmiers sur les bords
      const distance = Math.sqrt(x * x + z * z) / (size * 0.5);
      const distanceFactor = Math.min(1, Math.max(0, (distance - 0.6) * 2.5));

      // Déterminer le type de végétation à placer
      let type, scale, rotation;

      if (
        noiseValue > 0.7 &&
        distanceFactor > 0.7 &&
        y < waterLevel * height + 3
      ) {
        // Palmier sur les bords près de l'eau
        type = "palm";
        scale = 0.2 + Math.random() * 0.3;
        rotation = Math.random() * Math.PI * 2;
      } else if (noiseValue < -0.5) {
        // Rocher
        type = "rock";
        scale = 0.1 + Math.random() * 0.3;
        rotation = Math.random() * Math.PI * 2;
      } else {
        // Pas de végétation ici
        continue;
      }

      // Éviter les superpositions en vérifiant la distance avec les instances existantes
      let tooClose = false;
      for (const instance of instances) {
        const dx = x - instance.position[0];
        const dz = z - instance.position[2];
        const minDistance = type === "palm" ? 5 : 3;

        if (dx * dx + dz * dz < minDistance * minDistance) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        instances.push({
          type,
          position: [x, y, z],
          scale: [scale, scale, scale],
          rotation: [0, rotation, 0],
        });
      }
    }

    return instances;
  }, [heightmap, size, resolution, waterLevel, height, count, seed]);

  // Rendu des instances de végétation
  const vegetationElements = useMemo(() => {
    return vegetationInstances.map((instance, index) => {
      // Sélectionner le bon modèle
      const model =
        instance.type === "palm" ? palm.scene.clone() : rock.scene.clone();

      return (
        <primitive
          key={index}
          object={model}
          position={instance.position}
          scale={instance.scale}
          rotation={instance.rotation}
          castShadow
        />
      );
    });
  }, [vegetationInstances, palm, rock]);

  // Fallback si les modèles ne sont pas disponibles
  const fallbackElements = useMemo(() => {
    return vegetationInstances.map((instance, index) => {
      if (instance.type === "palm") {
        return (
          <group
            key={index}
            position={instance.position}
            rotation={instance.rotation}
            scale={instance.scale}
          >
            {/* Tronc */}
            <mesh castShadow>
              <cylinderGeometry args={[0.2, 0.4, 4, 8]} />
              <meshStandardMaterial color="#8B4513" roughness={0.8} />
            </mesh>

            {/* Feuilles */}
            <group position={[0, 4, 0]}>
              {[...Array(6)].map((_, i) => (
                <mesh
                  key={i}
                  castShadow
                  rotation={[0.3, (i / 6) * Math.PI * 2, 0]}
                >
                  <coneGeometry args={[2, 3, 4, 1, false, Math.PI / 6]} />
                  <meshStandardMaterial
                    color="#228B22"
                    roughness={0.7}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              ))}
            </group>
          </group>
        );
      } else {
        // Rocher
        return (
          <mesh
            key={index}
            position={instance.position}
            rotation={instance.rotation}
            scale={instance.scale}
            castShadow
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#808080" roughness={0.9} />
          </mesh>
        );
      }
    });
  }, [vegetationInstances]);

  return (
    <group>
      {palm.scene && rock.scene ? vegetationElements : fallbackElements}
    </group>
  );
}

// Nous utilisons ces lignes uniquement si vous avez les modèles
useGLTF.preload("/models/palm.glb");
useGLTF.preload("/models/rock.glb");
