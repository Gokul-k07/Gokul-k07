# Draggable Cards Board

Surface: the homepage `#testimonials` section

The board is implemented in `components/DraggableCardsBoard.tsx` and used by `components/sections/TestimonialsSection.tsx`. It is designed for a 1440px desktop viewport. Six testimonial cards start at varied deterministic positions, so server and client HTML remain stable while the saved position map is restored after mount.

## API

The React implementation exposes the equivalent of the requested imperative API through a ref:

```tsx
const boardRef = useRef<DraggableCardsBoardHandle>(null);

<DraggableCardsBoard
  ref={boardRef}
  onDragStart={(cardId) => console.log("start", cardId)}
  onDragMove={(cardId, position) => console.log("move", cardId, position)}
  onDragEnd={(cardId, position) => console.log("end", cardId, position)}
/>

boardRef.current?.getPositions();
boardRef.current?.setPositions({
  signal: { x: 48, y: 54 },
});
```

Positions are stored relative to the board origin under `draggableCards.positions.v1`. Invalid or out-of-bounds values are clamped after layout and on every board resize.

## Motion Spec

- Lift: 120ms, `cubic-bezier(0.2, 0.9, 0.2, 1)`, scale `1.03`, velocity tilt capped at `+/-4deg`, elevated shadow.
- Drag: direct `translate3d(x, y, 0)` writes scheduled by `requestAnimationFrame`; no layout properties change during movement.
- Drop: 380ms, `cubic-bezier(0.22, 1, 0.36, 1)`, scale returns to `1`, rotation returns to `0deg`, shadow settles to `0 6px 14px rgba(14,20,40,0.12)`.
- Spring reference for a physics implementation: stiffness `700`, damping `28`.

## Pointer Loop

```ts
function onPointerMove(event: PointerEvent) {
  pendingPointer = { x: event.clientX, y: event.clientY };
  if (frameId === null) frameId = requestAnimationFrame(flushDrag);
}

function flushDrag(frameTime: number) {
  frameId = null;
  const next = clamp(startPosition + pendingPointer - startPointer, bounds);
  card.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(1.03)`;
}
```

The real component uses React Pointer Events with pointer capture, one active pointer at a time, a precomputed board/card bound snapshot, and a ResizeObserver for re-clamping.

## QA Checklist

- Drag to all four edges and corners; the full card remains inside the board.
- Rapid pointer movement remains smooth and never escapes the viewport.
- A second pointerdown is ignored while one card is active.
- Resize the browser; all saved cards remain inside the new board bounds.
- Focus a card, press Space or Enter, move with arrows by 10px or Shift + arrows by 50px, then press Space to commit.
- Confirm `aria-grabbed`, visible focus treatment, and the live announcement update.
- Drop a card, reload, and verify its position is restored.
- Test high-DPI rendering and confirm the card uses transform-only movement.
- Confirm `will-change` is limited to the card interaction surface and no layout thrash occurs during drag.
