import {
  Environment,
  OrbitControls,
  OrthographicCamera,
} from "@react-three/drei";
import { useControls } from "leva";
import { useRef, useState, useEffect } from "react";
import { Character } from "./Character";
import { Map } from "./Map";
import { Physics } from "@react-three/rapier";
import { CharacterController } from "./CharacterController";
import { ProceduralIsland } from "./ProceduralIsland";
import { PickableObject } from "./PickableObject";
import { TreasureChest } from "./TreasureChest";
import { Vector3 } from "three";
import { useFrame } from "@react-three/fiber";

const maps = {
  procedural_island: {
    isCustom: true, // Indique que c'est un terrain personnalisé et non un modèle GLB
    position: [0, -4, 0],
  },
  castle_on_hills: {
    scale: 3,
    position: [-6, -7, 0],
  },
  animal_crossing_map: {
    scale: 20,
    position: [-15, -1, 10],
  },
  city_scene_tokyo: {
    scale: 0.72,
    position: [0, -1, -3.5],
  },
  de_dust_2_with_real_light: {
    scale: 0.3,
    position: [-5, -3, 13],
  },
  medieval_fantasy_book: {
    scale: 0.4,
    position: [-4, 0, -6],
  },
};

// Objets ramassables pour le joueur
const pickableItems = [
  {
    id: "shell1",
    position: [4, 0.5, 4],
    color: "coral",
    shape: "shell",
    scale: 0.6,
  },
  {
    id: "stone1",
    position: [-3, 0.5, 3],
    color: "gray",
    shape: "stone",
    scale: 0.7,
  },
  {
    id: "starfish1",
    position: [6, 0.5, -2],
    color: "#ff7700",
    shape: "starfish",
    scale: 0.8,
  },
  {
    id: "treasure1",
    position: [0, 0.5, 8],
    color: "gold",
    shape: "treasure",
    scale: 0.5,
  },
  {
    id: "shell2",
    position: [-5, 0.5, -5],
    color: "#ffccaa",
    shape: "shell",
    scale: 0.55,
  },
];

export const Experience = () => {
  const shadowCameraRef = useRef();
  const characterRef = useRef();
  const [heldObjectId, setHeldObjectId] = useState(null);
  const [nearbyObjectId, setNearbyObjectId] = useState(null);

  // État pour suivre les objets et leur état (ramassé ou non)
  const [objects, setObjects] = useState(
    pickableItems.map((item) => ({ ...item, isPickedUp: false }))
  );

  const { map } = useControls("Map", {
    map: {
      value: "procedural_island", // Par défaut, utilise l'île procédurale
      options: Object.keys(maps),
    },
  });
  const { debugPhysics } = useControls("Physics", {
    debugPhysics: false,
  });

  // Ajustements pour l'éclairage avec l'île
  const lightSettings =
    map === "procedural_island"
      ? { position: [-20, 30, 20], intensity: 1.2 }
      : { position: [-15, 10, 15], intensity: 0.65 };

  // Surveille si un objet est tenu par le crabe
  useFrame((state) => {
    const scene = state.scene;

    // Recherche l'ancre de l'objet tenu
    const anchor = scene.getObjectByName("heldObjectAnchor");

    if (anchor && anchor.userData.heldObjectId) {
      // Met à jour l'objet tenu
      const newHeldId = anchor.userData.heldObjectId;

      if (newHeldId !== heldObjectId) {
        setHeldObjectId(newHeldId);

        // Met à jour l'état des objets
        setObjects((prevObjects) =>
          prevObjects.map((obj) =>
            obj.id === newHeldId
              ? { ...obj, isPickedUp: true }
              : obj.id === heldObjectId
              ? { ...obj, isPickedUp: false }
              : obj
          )
        );
      }

      // Si un objet est tenu, mettre à jour sa position
      if (heldObjectId) {
        const object = scene.getObjectByProperty("userData", heldObjectId);
        if (object && anchor.userData.position) {
          // Positionner l'objet devant le crabe
          const worldPos = anchor.getWorldPosition(new Vector3());
          object.position.copy(worldPos);
        }
      }
    } else if (heldObjectId) {
      // Si l'ancre n'existe plus mais qu'un objet était tenu, le relâcher
      setObjects((prevObjects) =>
        prevObjects.map((obj) =>
          obj.id === heldObjectId ? { ...obj, isPickedUp: false } : obj
        )
      );
      setHeldObjectId(null);
    }
  });

  // Fonction pour mettre à jour l'objet à proximité
  const handleObjectInRange = (id) => {
    setNearbyObjectId(id);
  };

  return (
    <>
      {/* <OrbitControls /> */}
      <Environment preset="sunset" />
      <directionalLight
        intensity={lightSettings.intensity}
        castShadow
        position={lightSettings.position}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00005}
      >
        <OrthographicCamera
          left={-22}
          right={15}
          top={10}
          bottom={-20}
          ref={shadowCameraRef}
          attach={"shadow-camera"}
        />
      </directionalLight>
      <Physics key={map} debug={debugPhysics}>
        {map === "procedural_island" ? (
          // Rendu de l'île procédurale
          <ProceduralIsland position={maps[map].position} />
        ) : (
          // Rendu des modèles 3D existants
          <Map
            scale={maps[map].scale}
            position={maps[map].position}
            model={`models/${map}.glb`}
          />
        )}

        {/* Coffre au trésor pour la collection */}
        <TreasureChest position={[10, 0.3, 10]} scale={1.2} />

        {/* Objets ramassables */}
        {objects.map((item) => (
          <PickableObject
            key={item.id}
            id={item.id}
            position={item.isPickedUp ? [0, -100, 0] : item.position} // Cache les objets ramassés sous le terrain
            color={item.color}
            shape={item.shape}
            scale={item.scale}
            isPickedUp={item.isPickedUp}
            onPickupRange={handleObjectInRange}
          />
        ))}

        <CharacterController ref={characterRef} />
      </Physics>

      {/* Nous n'avons pas besoin d'interface utilisateur ici car elle sera gérée en dehors du canvas */}
    </>
  );
};
