"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import styles from "./PortfolioPreloader.module.css";

export function PortfolioPreloader() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = 2000;
    const start = performance.now();

    let frame: number;
    let timer: ReturnType<typeof setTimeout>;

    const update = (time: number) => {
      const value = Math.min(
        100,
        Math.round(((time - start) / duration) * 100)
      );

      setProgress(value);

      if (value < 100) {
        frame = requestAnimationFrame(update);
      } else {
        timer = setTimeout(() => setVisible(false), 150);
      }
    };

    frame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.preloader}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.85, 0, 0.15, 1] }}
        >
          <div className={styles.content}>
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.08, y: -20 }}
              transition={{ duration: 0.8 }}
            >
              <Image
                src="/logo/logo_only.png"
                alt="Loading"
                width={1024}
                height={1024}
                priority
                className={styles.logo}
              />
            </motion.div>

            <div className={styles.progressArea}>
              <div
                className={styles.track}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <motion.div
                  className={styles.bar}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className={styles.meta}>
                <span>Loading Experience</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
// "use client";

// import { motion, useReducedMotion } from "framer-motion";
// import { useEffect, useRef, useState } from "react";
// import styles from "./PortfolioPreloader.module.css";

// const MINIMUM_DISPLAY_MS = 1800;
// const REDUCED_MINIMUM_DISPLAY_MS = 900;
// const LOGO_SRC = "/logo/logo_only.png";

// export function PortfolioPreloader() {
//   const reducedMotion = useReducedMotion();
//   const [shouldShow, setShouldShow] = useState(true);
//   const [visible, setVisible] = useState(true);
//   const [ready, setReady] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const initializedRef = useRef(false);

//   useEffect(() => {
//     if (initializedRef.current) return;
//     initializedRef.current = true;
//     let cancelled = false;
//     let revealTimer: ReturnType<typeof setTimeout> | undefined;
//     let progressFrame: number | undefined;
//     const startedAt = performance.now();
//     let pageLoaded = document.readyState === "complete";
//     const duration = reducedMotion ? REDUCED_MINIMUM_DISPLAY_MS : MINIMUM_DISPLAY_MS;

//     const finish = (skipAnimation = false) => {
//       if (cancelled) return;
//       setReady(true);
//       setProgress(100);
//       revealTimer = setTimeout(() => {
//         if (!cancelled) {
//           setVisible(false);
//           setShouldShow(false);
//           document.body.classList.remove(styles.preloaderLock);
//         }
//       }, skipAnimation ? 120 : 520);
//     };

//     document.body.classList.add(styles.preloaderLock);

//     const onLoad = () => {
//       pageLoaded = true;
//     };
//     window.addEventListener("load", onLoad, { once: true });

//     const updateProgress = (timestamp: number) => {
//       if (cancelled) return;
//       const elapsed = timestamp - startedAt;
//       const simulatedProgress = Math.min((elapsed / duration) * 88, 88);
//       const nextProgress = pageLoaded
//         ? Math.min(99, Math.round(simulatedProgress + Math.max(0, elapsed - duration) / 20))
//         : Math.round(simulatedProgress);
//       setProgress(nextProgress);

//       if (!(pageLoaded && elapsed >= duration)) {
//         progressFrame = requestAnimationFrame(updateProgress);
//       } else {
//         finish(false);
//       }
//     };
//     progressFrame = requestAnimationFrame(updateProgress);

//     return () => {
//       cancelled = true;
//       if (revealTimer) clearTimeout(revealTimer);
//       if (progressFrame) cancelAnimationFrame(progressFrame);
//       window.removeEventListener("load", onLoad);
//       document.body.classList.remove(styles.preloaderLock);
//     };
//   }, [reducedMotion]);

//   if (!shouldShow || !visible) return null;

//   return (
//     <motion.div
//       className={styles.overlay}
//       initial={{ opacity: 1, clipPath: "inset(0 0 0 0 round 0px)" }}
//       animate={ready ? { y: "-100%", opacity: 1 } : undefined}
//       transition={{ duration: 0.56, ease: [0.76, 0, 0.24, 1] }}
//       style={{ pointerEvents: ready ? "none" : "auto" }}
//       aria-label="Loading portfolio"
//       role="status"
//     >
//       <motion.div
//         className={styles.logoStage}
//         initial={{ scale: 0.82, opacity: 0 }}
//         animate={{ scale: 1, opacity: 1 }}
//         transition={{ duration: 1.62, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
//       >
//         <motion.img
//           className={`${styles.logo} ${styles.logoOuter}`}
//           src={LOGO_SRC}
//           alt=""
//           aria-hidden="true"
//           initial={{ opacity: 0, scale: 0.88, rotate: -8 }}
//           animate={{ opacity: 1, scale: 1, rotate: 0 }}
//           transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
//         />
//         <motion.img
//           className={`${styles.logo} ${styles.logoInner}`}
//           src={LOGO_SRC}
//           alt=""
//           aria-hidden="true"
//           initial={{ opacity: 0, scale: 0.76, rotate: 7 }}
//           animate={{ opacity: 1, scale: 1, rotate: 0 }}
//           transition={{ duration: 0.56, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
//         />
//         <motion.img
//           className={`${styles.logo} ${styles.logoAccent}`}
//           src={LOGO_SRC}
//           alt=""
//           aria-hidden="true"
//           initial={{ opacity: 0, scale: 1.12, rotate: -4 }}
//           animate={{ opacity: 0.9, scale: 1, rotate: 0 }}
//           transition={{ duration: 0.46, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
//         />
//         <motion.div
//           className={styles.logoGlow}
//           initial={{ opacity: 0, scale: 0.72 }}
//           animate={{ opacity: [0, 0.65, 0.34], scale: [0.72, 1.04, 1] }}
//           transition={{ duration: 1.05, delay: 0.16, ease: "easeOut" }}
//           aria-hidden="true"
//         />
//       </motion.div>
//       <p className={styles.loadingPhrase}>BUILDING DIGITAL EXPERIENCES</p>
//         <motion.div
//           className={styles.progressRegion}
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: progress >= 85 ? 1 : 0, y: progress >= 85 ? 0 : 8 }}
//           transition={{ duration: 0.3, ease: "easeOut" }}
//           aria-live="polite"
//         >
//           <span className={styles.progressLabel}>LOADING {progress}%</span>
//           <span className={styles.progressTrack} aria-hidden="true">
//             <motion.span className={styles.progressFill} animate={{ width: `${progress}%` }} />
//           </span>
//         </motion.div>
//     </motion.div>
//   );
// }
