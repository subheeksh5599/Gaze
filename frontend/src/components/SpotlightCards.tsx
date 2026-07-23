"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 } as const;

export interface SpotlightItem {
  label: string;
  detail: string;
}

interface SpotCardProps {
  item: SpotlightItem;
  dimmed: boolean;
  index: number;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function SpotCard({ item, dimmed, index, onHoverStart, onHoverEnd }: SpotCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => onHoverStart();
  const handleMouseLeave = () => {
    normX.set(0.5);
    normY.set(0.5);
    onHoverEnd();
  };

  return (
    <motion.div
      animate={{
        scale: dimmed ? 0.97 : 1,
        opacity: dimmed ? 0.45 : 1,
      }}
      className={cn(
        "group relative flex flex-col gap-5 border border-ash/20 bg-surface p-6",
        "transition-[border-color] duration-300",
        "hover:border-ash/40",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash/50">
        {String(index).padStart(2, "0")}
      </span>

      <div className="relative z-10 flex flex-col gap-2">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-flame">
          {item.label}
        </h3>
        <p className="font-mono text-xs text-ash leading-relaxed">
          {item.detail}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-0 transition-all duration-500 group-hover:w-full bg-flame"
      />
    </motion.div>
  );
}

SpotCard.displayName = "SpotCard";

export interface SpotlightCardsProps {
  items?: SpotlightItem[];
  heading?: string;
  className?: string;
}

export default function SpotlightCards({
  items = [],
  heading = "How it works",
  className,
}: SpotlightCardsProps) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "relative w-full px-8 pt-9 pb-10 md:px-16 lg:px-24",
        className,
      )}
    >
      <div className="relative mb-8 flex flex-col gap-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ash">
          {heading}
        </p>
        <div className="w-16 h-px bg-flame mt-4" />
      </div>

      <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <SpotCard
            dimmed={hoveredLabel !== null && hoveredLabel !== item.label}
            index={i + 1}
            item={item}
            key={item.label}
            onHoverEnd={() => setHoveredLabel(null)}
            onHoverStart={() => setHoveredLabel(item.label)}
          />
        ))}
      </div>
    </div>
  );
}
