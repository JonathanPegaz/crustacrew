import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { Character } from "./Character";
import { Crab_2 } from "./Crab_2";

const normalizeAngle = (angle) => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};

const lerpAngle = (start, end, t) => {
  start = normalizeAngle(start);
  end = normalizeAngle(end);

  if (Math.abs(end - start) > Math.PI) {
    if (end > start) {
      start += 2 * Math.PI;
    } else {
      end += 2 * Math.PI;
    }
  }

  return normalizeAngle(start + (end - start) * t);
};

export const CharacterController = () => {
  const { WALK_SPEED, RUN_SPEED, ROTATION_SPEED, PICKUP_DISTANCE } =
    useControls("Character Control", {
      WALK_SPEED: { value: 0.8, min: 0.1, max: 4, step: 0.1 },
      RUN_SPEED: { value: 1.6, min: 0.2, max: 12, step: 0.1 },
      ROTATION_SPEED: {
        value: degToRad(0.5),
        min: degToRad(0.1),
        max: degToRad(5),
        step: degToRad(0.1),
      },
      PICKUP_DISTANCE: { value: 1.5, min: 0.5, max: 5, step: 0.1 },
    });

  const rb = useRef();
  const container = useRef();
  const character = useRef();
  const { rapier, world } = useRapier();

  const [animation, setAnimation] = useState("idle");
  const [heldObject, setHeldObject] = useState(null);
  const [nearbyObjectId, setNearbyObjectId] = useState(null);
  const [pickupCooldown, setPickupCooldown] = useState(false);

  const characterRotationTarget = useRef(0);
  const rotationTarget = useRef(0);
  const cameraTarget = useRef();
  const cameraPosition = useRef();
  const cameraWorldPosition = useRef(new Vector3());
  const cameraLookAtWorldPosition = useRef(new Vector3());
  const cameraLookAt = useRef(new Vector3());
  const [, get] = useKeyboardControls();
  const isClicking = useRef(false);

  // Position de l'objet tenu relative au crabe (devant et légèrement au-dessus)
  const heldObjectOffset = new Vector3(0, 0.5, 0.6);

  useEffect(() => {
    const onMouseDown = (e) => {
      isClicking.current = true;
    };
    const onMouseUp = (e) => {
      isClicking.current = false;
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    // touch
    document.addEventListener("touchstart", onMouseDown);
    document.addEventListener("touchend", onMouseUp);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchstart", onMouseDown);
      document.removeEventListener("touchend", onMouseUp);
    };
  }, []);

  // Fonction pour détecter les objets à proximité
  const checkForPickableObjects = () => {
    if (!rb.current) return;

    const origin = rb.current.translation();
    const direction = { x: 0, y: 0, z: 0 };

    // On recherche les objets dans toutes les directions autour du crabe
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      direction.x = Math.cos(angle);
      direction.z = Math.sin(angle);

      const ray = new rapier.Ray(origin, direction);
      const hit = world.castRay(
        ray,
        PICKUP_DISTANCE,
        true,
        null,
        null,
        null,
        rb.current
      );

      if (hit && hit.collider) {
        const hitObject = hit.collider.parent();
        const userData = hitObject?.userData;

        if (userData && userData.type === "pickable") {
          if (nearbyObjectId !== userData.id) {
            setNearbyObjectId(userData.id);
            // Émettre un événement pour informer l'interface utilisateur
            window.dispatchEvent(
              new CustomEvent("game-state-update", {
                detail: { type: "NEARBY_OBJECT", id: userData.id },
              })
            );
          }
          return;
        }
      }
    }

    if (nearbyObjectId) {
      setNearbyObjectId(null);
      // Informer l'UI qu'il n'y a plus d'objet à proximité
      window.dispatchEvent(
        new CustomEvent("game-state-update", {
          detail: { type: "NEARBY_OBJECT", id: null },
        })
      );
    }
  };

  // Fonction pour ramasser ou déposer un objet
  const handlePickupDrop = () => {
    if (pickupCooldown) return;

    // Si on tient déjà un objet, on le dépose
    if (heldObject) {
      setHeldObject(null);
      setPickupCooldown(true);

      // Émettre un événement pour informer l'interface utilisateur
      window.dispatchEvent(
        new CustomEvent("game-state-update", {
          detail: { type: "HELD_OBJECT", id: null },
        })
      );

      setTimeout(() => setPickupCooldown(false), 500); // Cooldown pour éviter les actions multiples
      return;
    }

    // Sinon, on essaie de ramasser un objet à proximité
    if (nearbyObjectId) {
      setHeldObject(nearbyObjectId);
      setPickupCooldown(true);

      // Émettre un événement pour informer l'interface utilisateur
      window.dispatchEvent(
        new CustomEvent("game-state-update", {
          detail: { type: "HELD_OBJECT", id: nearbyObjectId },
        })
      );

      setTimeout(() => setPickupCooldown(false), 500);
    }
  };

  useFrame(({ camera, mouse }) => {
    if (rb.current) {
      const vel = rb.current.linvel();

      const movement = {
        x: 0,
        z: 0,
      };

      if (get().forward) {
        movement.z = 1;
      }
      if (get().backward) {
        movement.z = -1;
      }

      let speed = get().run ? RUN_SPEED : WALK_SPEED;

      if (isClicking.current) {
        if (Math.abs(mouse.x) > 0.1) {
          movement.x = -mouse.x;
        }
        movement.z = mouse.y + 0.4;
        if (Math.abs(movement.x) > 0.5 || Math.abs(movement.z) > 0.5) {
          speed = RUN_SPEED;
        }
      }

      if (get().left) {
        movement.x = 1;
      }
      if (get().right) {
        movement.x = -1;
      }

      // Gestion de la touche E pour ramasser/déposer
      if (get().pickup && !pickupCooldown) {
        handlePickupDrop();
      }

      if (movement.x !== 0) {
        rotationTarget.current += ROTATION_SPEED * movement.x;
      }

      if (movement.x !== 0 || movement.z !== 0) {
        characterRotationTarget.current = Math.atan2(movement.x, movement.z);
        vel.x =
          Math.sin(rotationTarget.current + characterRotationTarget.current) *
          speed;
        vel.z =
          Math.cos(rotationTarget.current + characterRotationTarget.current) *
          speed;
        if (speed === RUN_SPEED) {
          setAnimation(heldObject ? "WalkFace" : "WalkSide");
        } else {
          setAnimation(heldObject ? "WalkFace" : "WalkFace");
        }
      } else {
        setAnimation(heldObject ? "Hiddle" : "Hiddle");
      }
      character.current.rotation.y = lerpAngle(
        character.current.rotation.y,
        characterRotationTarget.current,
        0.1
      );

      rb.current.setLinvel(vel, true);

      // Vérifier les objets à proximité tous les quelques frames
      if (Math.random() < 0.1) {
        // 10% de chance à chaque frame = environ 6 fois par seconde
        checkForPickableObjects();
      }
    }

    // CAMERA
    container.current.rotation.y = MathUtils.lerp(
      container.current.rotation.y,
      rotationTarget.current,
      0.1
    );

    cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
    camera.position.lerp(cameraWorldPosition.current, 0.1);

    if (cameraTarget.current) {
      cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
      cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, 0.1);

      camera.lookAt(cameraLookAt.current);
    }
  });

  return (
    <>
      <RigidBody colliders={false} lockRotations ref={rb}>
        <group ref={container}>
          <group ref={cameraTarget} position-z={1.5} />
          <group ref={cameraPosition} position-y={4} position-z={-4} />
          <group ref={character}>
            {/* <Character scale={0.18} position-y={-0.25} animation={animation} /> */}
            <Crab_2 scale={0.18} position-y={-0.25} animation={animation} />
          </group>
        </group>
        <CapsuleCollider args={[0.08, 0.15]} />
      </RigidBody>

      {/* Retourne l'ID de l'objet tenu et sa position pour que Experience.jsx puisse le positionner */}
      {heldObject && (
        <group
          name="heldObjectAnchor"
          userData={{
            heldObjectId: heldObject,
            position: container.current
              ? new Vector3()
                  .copy(container.current.position)
                  .add(heldObjectOffset)
              : null,
          }}
        />
      )}
    </>
  );
};
