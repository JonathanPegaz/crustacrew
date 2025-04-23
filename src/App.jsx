import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { KeyboardControls } from "@react-three/drei";
import { useState, useEffect } from "react";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "run", keys: ["Shift"] },
  { name: "pickup", keys: ["KeyE"] }, // Ajout de la touche E pour ramasser/déposer des objets
];

function App() {
  const [nearbyObjectId, setNearbyObjectId] = useState(null);
  const [heldObjectId, setHeldObjectId] = useState(null);

  // Fonction pour recevoir les mises à jour depuis Experience
  const handleGameStateUpdate = (event) => {
    const { detail } = event;
    if (detail.type === "NEARBY_OBJECT") {
      setNearbyObjectId(detail.id);
    } else if (detail.type === "HELD_OBJECT") {
      setHeldObjectId(detail.id);
    }
  };

  useEffect(() => {
    // Écouter les événements personnalisés depuis Experience
    window.addEventListener("game-state-update", handleGameStateUpdate);
    return () => {
      window.removeEventListener("game-state-update", handleGameStateUpdate);
    };
  }, []);

  return (
    <>
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          camera={{ position: [3, 3, 3], near: 0.1, fov: 40 }}
          style={{
            touchAction: "none",
          }}
        >
          <color attach="background" args={["#ececec"]} />
          <Experience />
        </Canvas>
      </KeyboardControls>

      {/* Interface utilisateur pour indiquer qu'un objet peut être ramassé */}
      {nearbyObjectId && !heldObjectId && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            fontFamily: "Arial",
            fontSize: "14px",
            pointerEvents: "none",
          }}
        >
          Appuyez sur E pour ramasser
        </div>
      )}

      {/* Interface utilisateur pour indiquer qu'un objet peut être déposé */}
      {heldObjectId && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            fontFamily: "Arial",
            fontSize: "14px",
            pointerEvents: "none",
          }}
        >
          Appuyez sur E pour déposer
        </div>
      )}

      {/* Instructions de contrôle */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          backgroundColor: "rgba(0,0,0,0.5)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          fontFamily: "Arial",
          fontSize: "14px",
          pointerEvents: "none",
        }}
      >
        <p>WASD / Flèches : Déplacer</p>
        <p>Shift : Courir</p>
        <p>E : Ramasser/Déposer</p>
      </div>
    </>
  );
}

export default App;
