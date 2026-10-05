import { useEffect } from "react";
import { useStore } from "@/store";
import { enterFullscreen, exitFullscreen } from "./helpers";
import styles from "./HideUi.module.css";

// Petit œil tout seul, en haut à gauche, discret : un clic CACHE toute l'interface (barre, fiches, options, temps…) et passe en plein écran (comme F11) ; un second clic (ou Échap) la remet.
export const HideUi = () => {
  const hidden = useStore((s) => s.uiHidden);
  const setUiHidden = useStore((s) => s.setUiHidden);
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && useStore.getState().uiHidden)
        setUiHidden(false); // sortie du plein écran (Échap, F11) : l'interface revient
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [setUiHidden]);
  const toggle = () => {
    if (hidden) {
      setUiHidden(false);
      exitFullscreen();
    } else {
      setUiHidden(true);
      enterFullscreen();
    }
  };
  return (
    <button
      type="button"
      className={`${styles.eye} ${hidden ? styles.hidden : ""}`}
      aria-label={hidden ? "Afficher l’interface" : "Cacher l’interface"}
      title={
        hidden ? "Afficher l’interface" : "Cacher l’interface (plein écran)"
      }
      onClick={toggle}
    >
      {hidden ? "👁‍🗨" : "👁"}
    </button>
  );
};
