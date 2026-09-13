"use client";

import { DraggableCardsBoard, type DraggableBoardCard } from "@/components/DraggableCardsBoard";

const testimonialCards: DraggableBoardCard[] = [
  {
    id: "julian",
    eyebrow: "01 / product manager",
    title: "Julian",
    detail: "Working with Gokul was seamless. He transformed complex requirements into an intuitive, scalable solution.",
    accent: "cyan",
    initial: { x: 48, y: 54 },
    rotation: -8,
    zIndex: 2,
  },
  {
    id: "madhusudhanan",
    eyebrow: "02 / cto",
    title: "Madhusudhanan",
    detail: "His clean code architecture and modern UI sense helped us launch our product two months ahead of schedule.",
    accent: "lime",
    initial: { x: 374, y: 112 },
    rotation: 6,
    zIndex: 5,
  },
  {
    id: "jegathish",
    eyebrow: "03 / founder",
    title: "Jegathish",
    detail: "From concept to deployment, Gokul understood our business needs and translated them into elegant solutions.",
    accent: "orange",
    initial: { x: 766, y: 48 },
    rotation: -4,
    zIndex: 3,
  },
  {
    id: "kavinkumar",
    eyebrow: "04 / engineering lead",
    title: "KavinKumar",
    detail: "His AI integration and full-stack expertise helped us build a cutting-edge analytics platform with production-ready code.",
    accent: "pink",
    initial: { x: 164, y: 332 },
    rotation: 2,
    zIndex: 6,
  },
  {
    id: "yogeshwaran",
    eyebrow: "05 / ux designer",
    title: "Yogeshwaran",
    detail: "He has an incredible eye for design and user experience, enhancing our specifications with smart technical solutions.",
    accent: "blue",
    initial: { x: 546, y: 386 },
    rotation: -5,
    zIndex: 7,
  },
  {
    id: "akash-james",
    eyebrow: "06 / ceo",
    title: "Akash james",
    detail: "Gokul brought our vision to life with precision and creativity, improving engagement across our mobile and web platform.",
    accent: "violet",
    initial: { x: 1000, y: 316 },
    rotation: 5,
    zIndex: 4,
  },
];

export function TestimonialsSection() {
  return (
    <DraggableCardsBoard
      cards={testimonialCards}
      sectionId="testimonials"
      kicker="Client voices / 001"
      title="What People Say"
      boardLabel="Testimonial canvas"
      boardTitle="Arrange the feedback"
      boardHint="Drag testimonials freely. Focus one and press Space for keyboard move."
      storageKey="testimonials.positions.v1"
    />
  );
}
