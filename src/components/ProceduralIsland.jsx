import React, { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { Vegetation } from "./Vegetation";

export const ProceduralIsland = ({ ...props }) => {
  const meshRef = useRef();
  const waterRef = useRef();

  // Controls for island generation
  const {
    size,
    resolution,
    height,
    smoothing,
    waterLevel,
    seed,
    beachThreshold,
    mountainThreshold,
    beachColor,
    grassColor,
    mountainColor,
    enableVegetation,
    vegetationDensity,
  } = useControls("Island Generator", {
    size: { value: 100, min: 50, max: 300, step: 10 },
    resolution: { value: 128, min: 32, max: 256, step: 8 },
    height: { value: 2, min: 0.1, max: 10, step: 1 },
    smoothing: { value: 0.12, min: 0.01, max: 0.5, step: 0.01 },
    waterLevel: { value: 0.1, min: 0, max: 1, step: 0.01 },
    seed: { value: 42, min: 1, max: 100, step: 1 },
    beachThreshold: { value: 0.15, min: 0, max: 1, step: 0.01 },
    mountainThreshold: { value: 0.6, min: 0, max: 1, step: 0.01 },
    beachColor: "#e0c080",
    grassColor: "#3a9d23",
    mountainColor: "#706f6f",
    enableVegetation: true,
    vegetationDensity: { value: 50, min: 0, max: 200, step: 5 },
  });

  // State pour stocker la heightmap pour la réutiliser avec la végétation
  const [heightmapData, setHeightmapData] = useState(null);

  // Generate heightmap using Simplex noise
  const generateHeightmap = (
    width,
    height,
    scale,
    octaves,
    persistence,
    seed
  ) => {
    const noise2D = createNoise2D(alea(seed));
    const data = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Normalize coordinates to [-1, 1]
        const nx = (x / width - 0.5) * 2;
        const ny = (y / height - 0.5) * 2;

        // Calculate distance from center for island shape
        const distance = Math.sqrt(nx * nx + ny * ny);

        // Island mask - decreases height as we move away from center
        const islandMask = Math.max(0, 1 - distance);

        // Generate fractal Brownian motion (multiple octaves of noise)
        let elevation = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxAmplitude = 0;

        for (let i = 0; i < octaves; i++) {
          const sampleX = (x * frequency) / width;
          const sampleY = (y * frequency) / height;

          elevation += noise2D(sampleX, sampleY) * amplitude;

          maxAmplitude += amplitude;
          amplitude *= persistence;
          frequency *= 2;
        }

        // Normalize elevation
        elevation /= maxAmplitude;

        // Apply island mask for circular falloff
        elevation = elevation * Math.pow(islandMask, 3);

        // Store in heightmap
        data[y * width + x] = elevation;
      }
    }

    return data;
  };

  // Create the terrain geometry from heightmap
  const { positions, normals, indices, colors, uvs } = useMemo(() => {
    const heightmap = generateHeightmap(
      resolution,
      resolution,
      smoothing * 100,
      5, // octaves
      0.5, // persistence
      seed
    );

    // Stocker la heightmap pour la réutiliser avec la végétation
    setHeightmapData(heightmap);

    const geometry = {
      positions: new Float32Array(resolution * resolution * 3),
      normals: new Float32Array(resolution * resolution * 3),
      colors: new Float32Array(resolution * resolution * 3),
      uvs: new Float32Array(resolution * resolution * 2),
      indices: [],
    };

    // Create vertices
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const i = z * resolution + x;

        // Position
        const posIndex = i * 3;
        geometry.positions[posIndex + 0] = (x / (resolution - 1) - 0.5) * size;

        // Get height from heightmap
        const heightValue = heightmap[i];
        geometry.positions[posIndex + 1] = heightValue * height;

        geometry.positions[posIndex + 2] = (z / (resolution - 1) - 0.5) * size;

        // UV coordinates
        const uvIndex = i * 2;
        geometry.uvs[uvIndex + 0] = x / (resolution - 1);
        geometry.uvs[uvIndex + 1] = z / (resolution - 1);

        // Colors - assign based on height thresholds
        const colorIndex = i * 3;
        if (heightValue < beachThreshold) {
          // Beach color
          const c = new THREE.Color(beachColor);
          geometry.colors[colorIndex + 0] = c.r;
          geometry.colors[colorIndex + 1] = c.g;
          geometry.colors[colorIndex + 2] = c.b;
        } else if (heightValue < mountainThreshold) {
          // Grass color
          const c = new THREE.Color(grassColor);
          geometry.colors[colorIndex + 0] = c.r;
          geometry.colors[colorIndex + 1] = c.g;
          geometry.colors[colorIndex + 2] = c.b;
        } else {
          // Mountain color
          const c = new THREE.Color(mountainColor);
          geometry.colors[colorIndex + 0] = c.r;
          geometry.colors[colorIndex + 1] = c.g;
          geometry.colors[colorIndex + 2] = c.b;
        }
      }
    }

    // Create faces (two triangles per grid cell)
    for (let z = 0; z < resolution - 1; z++) {
      for (let x = 0; x < resolution - 1; x++) {
        const i = z * resolution + x;

        // First triangle
        geometry.indices.push(i);
        geometry.indices.push(i + 1);
        geometry.indices.push(i + resolution);

        // Second triangle
        geometry.indices.push(i + 1);
        geometry.indices.push(i + resolution + 1);
        geometry.indices.push(i + resolution);
      }
    }

    // Compute normals
    const positionArray = geometry.positions;
    const normalArray = geometry.normals;
    const indexArray = geometry.indices;

    // Initialize normals to zero
    for (let i = 0; i < normalArray.length; i++) {
      normalArray[i] = 0;
    }

    // Calculate face normals and accumulate them on vertices
    for (let i = 0; i < indexArray.length; i += 3) {
      const i1 = indexArray[i] * 3;
      const i2 = indexArray[i + 1] * 3;
      const i3 = indexArray[i + 2] * 3;

      const v1 = new THREE.Vector3(
        positionArray[i1],
        positionArray[i1 + 1],
        positionArray[i1 + 2]
      );

      const v2 = new THREE.Vector3(
        positionArray[i2],
        positionArray[i2 + 1],
        positionArray[i2 + 2]
      );

      const v3 = new THREE.Vector3(
        positionArray[i3],
        positionArray[i3 + 1],
        positionArray[i3 + 2]
      );

      // Calculate face normal
      const edge1 = new THREE.Vector3().subVectors(v2, v1);
      const edge2 = new THREE.Vector3().subVectors(v3, v1);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      // Add to each vertex
      normalArray[i1] += normal.x;
      normalArray[i1 + 1] += normal.y;
      normalArray[i1 + 2] += normal.z;

      normalArray[i2] += normal.x;
      normalArray[i2 + 1] += normal.y;
      normalArray[i2 + 2] += normal.z;

      normalArray[i3] += normal.x;
      normalArray[i3 + 1] += normal.y;
      normalArray[i3 + 2] += normal.z;
    }

    // Normalize vertex normals
    for (let i = 0; i < normalArray.length; i += 3) {
      const nx = normalArray[i];
      const ny = normalArray[i + 1];
      const nz = normalArray[i + 2];

      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

      if (length > 0) {
        normalArray[i] = nx / length;
        normalArray[i + 1] = ny / length;
        normalArray[i + 2] = nz / length;
      }
    }

    return geometry;
  }, [
    resolution,
    size,
    height,
    smoothing,
    seed,
    beachThreshold,
    mountainThreshold,
    beachColor,
    grassColor,
    mountainColor,
  ]);

  // Create a buffer geometry from our calculated data
  const bufferGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    geometry.setIndex(indices);

    return geometry;
  }, [positions, normals, colors, uvs, indices]);

  return (
    <group {...props}>
      <RigidBody type="fixed" colliders="trimesh">
        <mesh ref={meshRef} geometry={bufferGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            roughness={0.8}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </RigidBody>

      {/* Végétation */}
      {enableVegetation && heightmapData && (
        <Vegetation
          heightmap={heightmapData}
          size={size}
          resolution={resolution}
          waterLevel={0} // On utilise 0 comme niveau de l'eau puisqu'il n'y a plus d'eau
          height={height}
          count={vegetationDensity}
          seed={seed}
        />
      )}
    </group>
  );
};
