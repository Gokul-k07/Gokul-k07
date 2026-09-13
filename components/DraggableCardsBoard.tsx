"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styles from "./DraggableCardsBoard.module.css";

export type DraggableBoardPoint = { x: number; y: number };
export type DraggableBoardPositions = Record<string, DraggableBoardPoint>;

export type DraggableBoardCard = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  accent: string;
  initial: DraggableBoardPoint;
  rotation?: number;
  zIndex?: number;
};

export type DraggableCardsBoardProps = {
  cards: DraggableBoardCard[];
  sectionId?: string;
  kicker?: string;
  title?: string;
  boardLabel?: string;
  boardTitle?: string;
  boardHint?: string;
  storageKey?: string;
  onDragStart?: (cardId: string) => void;
  onDragMove?: (cardId: string, position: DraggableBoardPoint) => void;
  onDragEnd?: (cardId: string, position: DraggableBoardPoint) => void;
};

export type DraggableCardsBoardHandle = {
  getPositions: () => DraggableBoardPositions;
  setPositions: (positions: DraggableBoardPositions) => void;
};

const KEYBOARD_STEP = 10;
const KEYBOARD_SHIFT_STEP = 50;
const MAX_THROW_SPEED = 1200;
const SAFE_EDGE_INSET = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function clampVelocity(velocity: DraggableBoardPoint, maximum = MAX_THROW_SPEED) {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= maximum || speed === 0) return velocity;
  const scale = maximum / speed;
  return { x: velocity.x * scale, y: velocity.y * scale };
}

function positionStyle(position: DraggableBoardPoint, rotation = 0, scale = 1) {
  return {
    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotateZ(${rotation}deg)`,
  };
}

function readStoredPositions(storageKey: string, cardDefinitions: DraggableBoardCard[]): DraggableBoardPositions | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as DraggableBoardPositions;
    if (!parsed || typeof parsed !== "object") return null;

    return Object.fromEntries(
      cardDefinitions.map((card) => {
        const candidate = parsed[card.id];
        return [
          card.id,
          candidate && Number.isFinite(candidate.x) && Number.isFinite(candidate.y)
            ? { x: candidate.x, y: candidate.y }
            : card.initial,
        ];
      }),
    );
  } catch {
    return null;
  }
}

function persistPositions(storageKey: string, positions: DraggableBoardPositions) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(positions));
  } catch {
    // Persistence is best effort when storage is unavailable.
  }
}

function createResponsivePositions(
  board: HTMLDivElement,
  cardDefinitions: DraggableBoardCard[],
  getCardBounds: (cardId: string) => { min: DraggableBoardPoint; max: DraggableBoardPoint } | null,
): DraggableBoardPositions {
  const boardWidth = board.clientWidth;
  const isCompact = boardWidth < 760;
  const horizontalRatios = isCompact ? [0.02, 0.16, 0.04, 0.2, 0.08, 0.15] : [0.03, 0.3, 0.61, 0.12, 0.43, 0.76];
  const verticalRatios = isCompact ? [0, 0.17, 0.34, 0.51, 0.68, 0.85] : [0.1, 0.2, 0.04, 0.57, 0.64, 0.48];
  return Object.fromEntries(
    cardDefinitions.map((card, index) => {
      const bounds = getCardBounds(card.id);
      if (!bounds) return [card.id, card.initial];
      const availableX = Math.max(bounds.max.x - bounds.min.x, 0);
      const position = {
        x: bounds.min.x + availableX * horizontalRatios[index % horizontalRatios.length],
        y: bounds.min.y + Math.max(bounds.max.y - bounds.min.y, 0) * verticalRatios[index % verticalRatios.length],
      };
      return [card.id, {
        x: clamp(position.x, bounds.min.x, bounds.max.x),
        y: clamp(position.y, bounds.min.y, bounds.max.y),
      }];
    }),
  );
}

export const DraggableCardsBoard = forwardRef<DraggableCardsBoardHandle, DraggableCardsBoardProps>(function DraggableCardsBoard(
  {
    cards,
    sectionId = "testimonials",
    kicker = "Interaction lab / 001",
    title = "Draggable Cards Board",
    boardLabel = "Freeform canvas",
    boardTitle = "Arrange the signal",
    boardHint = "Drag cards freely. Focus one and press Space for keyboard move.",
    storageKey = "draggableCards.positions.v1",
    onDragStart,
    onDragMove,
    onDragEnd,
  },
  ref,
) {
  const initialPositions = Object.fromEntries(cards.map((card) => [card.id, card.initial]));
  const boardRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const shellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initialZOrders = Object.fromEntries(cards.map((card, index) => [card.id, card.zIndex ?? index + 1]));
  const zIndexRef = useRef<Record<string, number>>(initialZOrders);
  const nextZIndexRef = useRef(Math.max(...Object.values(initialZOrders), 0));
  const positionsRef = useRef<DraggableBoardPositions>(initialPositions);
  const activePointerRef = useRef<{
    id: string;
    pointerId: number;
    card: HTMLButtonElement;
    startPointer: DraggableBoardPoint;
    startPosition: DraggableBoardPoint;
    currentPosition: DraggableBoardPoint;
    min: DraggableBoardPoint;
    max: DraggableBoardPoint;
    lastPointer: DraggableBoardPoint;
    lastTime: number;
    velocity: DraggableBoardPoint;
  } | null>(null);
  const pendingPointerRef = useRef<DraggableBoardPoint | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const inertiaRef = useRef<{
    id: string;
    position: DraggableBoardPoint;
    velocity: DraggableBoardPoint;
    min: DraggableBoardPoint;
    max: DraggableBoardPoint;
    lastTime: number;
  } | null>(null);
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [positions, setPositions] = useState<DraggableBoardPositions>(initialPositions);
  const [zOrders, setZOrders] = useState<Record<string, number>>(initialZOrders);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [keyboardCardId, setKeyboardCardId] = useState<string | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [floating, setFloating] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [announcement, setAnnouncement] = useState("Six cards are ready to move.");

  const updatePositions = (next: DraggableBoardPositions) => {
    positionsRef.current = next;
    setPositions(next);
  };

  const getCardRotation = (cardId: string) => {
    const rotation = cards.find((card) => card.id === cardId)?.rotation ?? 0;
    return compactLayout ? rotation * 0.45 : rotation;
  };

  const getBounds = (cardId: string) => {
    const board = boardRef.current;
    const card = cardRefs.current[cardId];
    if (!board || !card) return null;

    const boardRect = board.getBoundingClientRect();
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    const boardStyles = getComputedStyle(board);
    const paddingLeft = Number.parseFloat(boardStyles.paddingLeft) || 0;
    const paddingTop = Number.parseFloat(boardStyles.paddingTop) || 0;
    const paddingRight = Number.parseFloat(boardStyles.paddingRight) || 0;
    const paddingBottom = Number.parseFloat(boardStyles.paddingBottom) || 0;
    const edgeInset = board.clientWidth < 380 ? 0 : SAFE_EDGE_INSET;

    return {
      min: { x: paddingLeft + edgeInset, y: paddingTop + edgeInset },
      max: {
        x: boardRect.width - paddingRight - cardWidth - edgeInset,
        y: boardRect.height - paddingBottom - cardHeight - edgeInset,
      },
    };
  };

  const applyCardTransform = (cardId: string, position: DraggableBoardPoint, rotation = 0, scale = 1) => {
    const shell = shellRefs.current[cardId];
    if (shell) shell.style.transform = positionStyle(position, rotation, scale).transform;
  };

  const flushDrag = (frameTime: number) => {
    animationFrameRef.current = null;
    const active = activePointerRef.current;
    const pointer = pendingPointerRef.current;
    if (!active || !pointer) return;

    const elapsed = Math.max(frameTime - active.lastTime, 1);
    const measuredVelocity = {
      x: ((pointer.x - active.lastPointer.x) / elapsed) * 1000,
      y: ((pointer.y - active.lastPointer.y) / elapsed) * 1000,
    };
    const velocity = clampVelocity({
      x: active.velocity.x * 0.72 + measuredVelocity.x * 0.28,
      y: active.velocity.y * 0.72 + measuredVelocity.y * 0.28,
    });
    const rawPosition = {
      x: active.startPosition.x + pointer.x - active.startPointer.x,
      y: active.startPosition.y + pointer.y - active.startPointer.y,
    };
    const nextPosition = {
      x: clamp(rawPosition.x, active.min.x, active.max.x),
      y: clamp(rawPosition.y, active.min.y, active.max.y),
    };
    const rotation = clamp(velocity.x * 0.0025, -4, 4);

    active.currentPosition = nextPosition;
    active.lastPointer = pointer;
    active.lastTime = frameTime;
    active.velocity = velocity;
    applyCardTransform(active.id, nextPosition, rotation, 1.03);
    onDragMove?.(active.id, nextPosition);
  };

  const finishInertia = (id: string, position: DraggableBoardPoint) => {
    const shell = shellRefs.current[id];
    const rotation = getCardRotation(id);
    if (shell) {
      shell.style.transition = "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)";
      shell.style.transform = positionStyle(position, rotation).transform;
    }
    inertiaRef.current = null;
    setDraggingId(null);
    setDroppingId(id);
    const nextPositions = { ...positionsRef.current, [id]: position };
    updatePositions(nextPositions);
    persistPositions(storageKey, nextPositions);
    onDragEnd?.(id, position);
    setAnnouncement(`${id} landed at ${Math.round(position.x)}, ${Math.round(position.y)}.`);
    dropTimerRef.current = setTimeout(() => {
      if (shell) shell.style.transition = "";
      setDroppingId(null);
    }, 200);
  };

  const runInertia = (frameTime: number) => {
    inertiaFrameRef.current = null;
    const inertia = inertiaRef.current;
    if (!inertia) return;

    const deltaTime = Math.min(Math.max(frameTime - inertia.lastTime, 1), 32);
    inertia.lastTime = frameTime;
    const decay = Math.pow(0.92, deltaTime / 16.67);
    const velocity = {
      x: inertia.velocity.x * decay,
      y: inertia.velocity.y * decay,
    };
    const nextPosition = {
      x: clamp(inertia.position.x + velocity.x * deltaTime / 1000, inertia.min.x, inertia.max.x),
      y: clamp(inertia.position.y + velocity.y * deltaTime / 1000, inertia.min.y, inertia.max.y),
    };
    const hitEdge = nextPosition.x === inertia.min.x || nextPosition.x === inertia.max.x || nextPosition.y === inertia.min.y || nextPosition.y === inertia.max.y;
    inertia.position = nextPosition;
    inertia.velocity = { x: hitEdge ? 0 : velocity.x, y: hitEdge ? 0 : velocity.y };
    applyCardTransform(inertia.id, nextPosition, clamp(velocity.x * 0.002, -4, 4), 1.03);
    onDragMove?.(inertia.id, nextPosition);

    if (hitEdge || Math.hypot(inertia.velocity.x, inertia.velocity.y) < 18) {
      finishInertia(inertia.id, nextPosition);
      return;
    }
    inertiaFrameRef.current = requestAnimationFrame(runInertia);
  };

  const scheduleDrag = (point: DraggableBoardPoint) => {
    pendingPointerRef.current = point;
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(flushDrag);
    }
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      flushDrag(active.lastTime + 1);
    }

    const finalPosition = active.currentPosition;
    const releaseVelocity = active.velocity;
    const shell = shellRefs.current[active.id];
    active.card.releasePointerCapture(event.pointerId);
    active.card.classList.remove(styles.dragging);
    if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current);
    const speed = Math.hypot(releaseVelocity.x, releaseVelocity.y);
    const shouldThrow = speed > 140;
    if (shouldThrow) {
      const inertia = {
        id: active.id,
        position: finalPosition,
        velocity: clampVelocity({ x: releaseVelocity.x * 0.72, y: releaseVelocity.y * 0.72 }),
        min: active.min,
        max: active.max,
        lastTime: active.lastTime,
      };
      inertiaRef.current = inertia;
      setDraggingId(active.id);
      inertiaFrameRef.current = requestAnimationFrame(runInertia);
    } else {
      if (shell) shell.style.transition = "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)";
      applyCardTransform(active.id, finalPosition, getCardRotation(active.id));
      setDroppingId(active.id);
      setDraggingId(null);
    }
    activePointerRef.current = null;
    pendingPointerRef.current = null;

    const nextPositions = { ...positionsRef.current, [active.id]: finalPosition };
    if (!shouldThrow) {
      updatePositions(nextPositions);
      persistPositions(storageKey, nextPositions);
      onDragEnd?.(active.id, finalPosition);
      setAnnouncement(`${active.id} dropped at ${Math.round(finalPosition.x)}, ${Math.round(finalPosition.y)}.`);
    }

    if (!shouldThrow) {
      dropTimerRef.current = setTimeout(() => {
        if (shell) {
          shell.style.transition = "";
          shell.style.transform = positionStyle(
            finalPosition,
            getCardRotation(active.id),
          ).transform;
        }
        setDroppingId(null);
      }, 400);
    }
  };

  const startPointerDrag = (cardId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current || inertiaRef.current || keyboardCardId) return;

    const bounds = getBounds(cardId);
    const card = cardRefs.current[cardId];
    if (!bounds || !card) return;

    event.preventDefault();
    card.setPointerCapture(event.pointerId);
    card.classList.add(styles.dragging);
    const shell = shellRefs.current[cardId];
    nextZIndexRef.current += 1;
    zIndexRef.current[cardId] = nextZIndexRef.current;
    setZOrders({ ...zIndexRef.current });
    if (shell) shell.style.zIndex = String(nextZIndexRef.current);

    const startPosition = positionsRef.current[cardId];
    activePointerRef.current = {
      id: cardId,
      pointerId: event.pointerId,
      card,
      startPointer: { x: event.clientX, y: event.clientY },
      startPosition,
      currentPosition: startPosition,
      min: bounds.min,
      max: bounds.max,
      lastPointer: { x: event.clientX, y: event.clientY },
      lastTime: event.timeStamp,
      velocity: { x: 0, y: 0 },
    };
    setDraggingId(cardId);
    setDroppingId(null);
    onDragStart?.(cardId);
    setAnnouncement(`${cardId} lifted. Use the pointer to move it inside the board.`);
  };

  const moveWithKeyboard = (cardId: string, event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const isActivation = event.key === " " || event.key === "Enter";
    if (isActivation) {
      event.preventDefault();
      if (keyboardCardId === cardId) {
        setKeyboardCardId(null);
        setAnnouncement(`${cardId} dropped.`);
      } else if (!activePointerRef.current && !keyboardCardId) {
        setKeyboardCardId(cardId);
        setAnnouncement(`${cardId} lifted. Use arrow keys to move it, then press Space to drop.`);
      }
      return;
    }

    if (!keyboardCardId || keyboardCardId !== cardId || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const bounds = getBounds(cardId);
    if (!bounds) return;

    const step = event.shiftKey ? KEYBOARD_SHIFT_STEP : KEYBOARD_STEP;
    const current = positionsRef.current[cardId];
    const nextPosition = {
      x: clamp(current.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), bounds.min.x, bounds.max.x),
      y: clamp(current.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0), bounds.min.y, bounds.max.y),
    };
    const nextPositions = { ...positionsRef.current, [cardId]: nextPosition };
    updatePositions(nextPositions);
    persistPositions(storageKey, nextPositions);
    setAnnouncement(`${cardId} at ${Math.round(nextPosition.x)}, ${Math.round(nextPosition.y)}.`);
  };

  const reshuffleCards = () => {
    if (activePointerRef.current || inertiaRef.current || keyboardCardId) return;
    const board = boardRef.current;
    if (!board) return;
    const nextPositions = createResponsivePositions(board, cards, getBounds);
    cards.forEach((card) => {
      const shell = shellRefs.current[card.id];
      if (shell) shell.style.transition = "transform 620ms cubic-bezier(0.22, 1, 0.36, 1)";
    });
    updatePositions(nextPositions);
    persistPositions(storageKey, nextPositions);
    setDroppingId(null);
    setAnnouncement("Testimonials reshuffled to the default arrangement.");
  };

  useImperativeHandle(ref, () => ({
    getPositions: () => ({ ...positionsRef.current }),
    setPositions: (nextPositions) => {
      updatePositions(nextPositions);
      persistPositions(storageKey, nextPositions);
    },
  }), [storageKey]);

  useEffect(() => {
    const stored = readStoredPositions(storageKey, cards);

    const board = boardRef.current;
    if (!board) return;

    const clampStoredPositions = () => {
      setCompactLayout(board.clientWidth < 760);
      const responsivePositions = createResponsivePositions(board, cards, getBounds);
      const hasOutOfBoundsPosition = cards.some((card) => {
        const bounds = getBounds(card.id);
        const current = positionsRef.current[card.id];
        return bounds && current && (
          current.x < bounds.min.x || current.x > bounds.max.x ||
          current.y < bounds.min.y || current.y > bounds.max.y
        );
      });
      if (hasOutOfBoundsPosition) {
        updatePositions(responsivePositions);
        persistPositions(storageKey, responsivePositions);
        return;
      }

      const nextPositions = Object.fromEntries(
        cards.map((card) => {
          const bounds = getBounds(card.id);
          const current = positionsRef.current[card.id] ?? card.initial;
          return [
            card.id,
            bounds
              ? { x: clamp(current.x, bounds.min.x, bounds.max.x), y: clamp(current.y, bounds.min.y, bounds.max.y) }
              : current,
          ];
        }),
      );
      updatePositions(nextPositions);
      persistPositions(storageKey, nextPositions);
    };

    const resizeObserver = new ResizeObserver(clampStoredPositions);
    resizeObserver.observe(board);
    const initialFrame = requestAnimationFrame(() => {
      if (stored) {
        const storedIsOutOfBounds = cards.some((card) => {
          const bounds = getBounds(card.id);
          const current = stored[card.id];
          return bounds && current && (
            current.x < bounds.min.x || current.x > bounds.max.x ||
            current.y < bounds.min.y || current.y > bounds.max.y
          );
        });
        updatePositions(storedIsOutOfBounds ? createResponsivePositions(board, cards, getBounds) : stored);
      }
      clampStoredPositions();
    });

    return () => {
      cancelAnimationFrame(initialFrame);
      resizeObserver.disconnect();
    };
  }, [cards, storageKey]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current);
      if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const revealObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || revealed) return;
      setRevealed(true);

      const boardRect = board.getBoundingClientRect();
      const revealCards = cards.map((card, index) => {
        const shell = shellRefs.current[card.id];
        const element = cardRefs.current[card.id];
        if (!shell || !element) return null;

          const center = {
            x: Math.max((boardRect.width - element.offsetWidth) / 2, 0),
            y: Math.max((boardRect.height - element.offsetHeight) / 2, 0),
          };
        const finalPosition = positionsRef.current[card.id] ?? card.initial;
        const direction = finalPosition.x < center.x ? -1 : 1;
        shell.style.transition = "none";
        shell.style.opacity = "0";
        shell.style.transform = positionStyle(center, direction * 8, 0.94).transform;

        return { shell, finalPosition, rotation: compactLayout ? (card.rotation ?? 0) * 0.45 : card.rotation ?? 0, index };
      });

      requestAnimationFrame(() => {
        revealCards.forEach((item) => {
          if (!item) return;
          const delay = item.index * 110;
          item.shell.style.transition = `transform 760ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 420ms ease ${delay}ms`;
          item.shell.style.opacity = "1";
          item.shell.style.transform = positionStyle(item.finalPosition, item.rotation).transform;
        });
      });

      window.setTimeout(() => {
        setFloating(true);
      }, cards.length * 110 + 760);
      revealObserver.disconnect();
    }, { threshold: 0.18 });

    revealObserver.observe(board);
    return () => revealObserver.disconnect();
  }, [cards, compactLayout, revealed]);

  return (
    <section id={sectionId} className={styles.page} aria-labelledby={`${sectionId}-heading`}>
      <div className={styles.topline}>
        <div>
          <p className={styles.kicker}>{kicker}</p>
          <h1 id={`${sectionId}-heading`}>{title}</h1>
        </div>
        <div className={styles.meta}>
          <span className={styles.liveDot} />
          <span>Pointer-ready</span>
          <span className={styles.metaDivider} />
          <span>1440 × 900</span>
        </div>
      </div>

      <div className={styles.boardFrame} aria-labelledby={`${sectionId}-board-heading`}>
        <div className={styles.boardHeader}>
          <div>
            <p className={styles.boardLabel}>{boardLabel}</p>
            <h2 id={`${sectionId}-board-heading`}>{boardTitle}</h2>
          </div>
          <p className={styles.boardHint}>{boardHint}</p>
          <button type="button" className={styles.reshuffleButton} onClick={reshuffleCards}>
            ↻ Reshuffle Cards
          </button>
        </div>

        <div ref={boardRef} className={styles.board} role="list" aria-label="Draggable cards board">
          {cards.map((card, index) => {
            const position = positions[card.id] ?? card.initial;
            const isActive = draggingId === card.id || keyboardCardId === card.id;
            const className = [
              styles.card,
              styles[card.accent],
              isActive ? styles.active : "",
              keyboardCardId === card.id ? styles.keyboardMoving : "",
              droppingId === card.id ? styles.dropping : "",
            ].filter(Boolean).join(" ");

            return (
              <div
                key={card.id}
                ref={(element) => { shellRefs.current[card.id] = element; }}
                className={`${styles.cardShell} ${floating ? styles.revealed : ""}`}
                style={{
                  ...positionStyle(position, getCardRotation(card.id)),
                  zIndex: zOrders[card.id] ?? index + 1,
                  ["--card-index" as string]: index,
                  ["--float-delay" as string]: `${index * 420}ms`,
                }}
              >
                <button
                  ref={(element) => { cardRefs.current[card.id] = element; }}
                  type="button"
                  role="listitem"
                  aria-label={`${card.title}. ${card.detail}`}
                  aria-grabbed={isActive}
                  tabIndex={0}
                  className={className}
                  onPointerDown={(event) => startPointerDrag(card.id, event)}
                  onPointerMove={(event) => {
                    if (activePointerRef.current?.pointerId === event.pointerId) {
                      scheduleDrag({ x: event.clientX, y: event.clientY });
                    }
                  }}
                  onPointerUp={finishPointerDrag}
                  onPointerCancel={finishPointerDrag}
                  onKeyDown={(event) => moveWithKeyboard(card.id, event)}
                >
                <span className={styles.cardTopline}>
                  <span>{card.eyebrow}</span>
                  <span className={styles.cardIndex}>0{index + 1}</span>
                </span>
                <span className={styles.stars} aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }, (_, starIndex) => (
                    <span key={starIndex} style={{ ["--star-index" as string]: starIndex }}>★</span>
                  ))}
                </span>
                <span className={styles.cardTitle}>{card.title}</span>
                <span className={styles.cardDetail}>{card.detail}</span>
                <span className={styles.cardFooter}>
                  <span className={styles.cardAccent} />
                  <span>{isActive ? "moving" : "ready"}</span>
                </span>
                </button>
              </div>
            );
          })}
          <span className={styles.boardMarker} aria-hidden="true">DROP ZONE / 06</span>
        </div>
      </div>

      <p className={styles.announcement} aria-live="polite">{announcement}</p>
    </section>
  );
});

export const draggableBoardMotionSpec = {
  lift: { duration: 120, easing: "cubic-bezier(0.2, 0.9, 0.2, 1)", scale: 1.03, maxRotation: 4 },
  drag: { easing: "none", transform: "translate3d(x, y, 0)", frameScheduler: "requestAnimationFrame" },
  drop: { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)", scale: 1, shadow: "0 6px 14px rgba(14,20,40,0.12)" },
  springRecommendation: { stiffness: 700, damping: 28 },
};
