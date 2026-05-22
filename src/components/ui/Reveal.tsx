import { m, useReducedMotion, type Variants } from "framer-motion";
import type { JSX, ReactNode } from "react";
import { useIsInitialRender } from "@/lib/initial-render";

export const revealItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}

export const RevealGroup = ({
  children,
  className,
  delayChildren = 0,
  staggerChildren = 0.055,
}: RevealGroupProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const isInitialRender = useIsInitialRender();
  const skip = reduceMotion === true || isInitialRender;
  return (
    <m.div
      initial={skip ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { delayChildren, staggerChildren } },
      }}
      className={className}
    >
      {children}
    </m.div>
  );
};

export const RevealMain = ({
  children,
  className,
  delayChildren = 0,
  staggerChildren = 0.055,
}: RevealGroupProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const isInitialRender = useIsInitialRender();
  const skip = reduceMotion === true || isInitialRender;
  return (
    <m.main
      initial={skip ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { delayChildren, staggerChildren } },
      }}
      className={className}
    >
      {children}
    </m.main>
  );
};

interface RevealBlockProps {
  children: ReactNode;
  className?: string;
}

export const RevealBlock = ({ children, className }: RevealBlockProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const isInitialRender = useIsInitialRender();
  const skip = reduceMotion === true || isInitialRender;
  return (
    <m.div
      variants={revealItemVariants}
      {...(skip ? { initial: false as const } : {})}
      className={className}
    >
      {children}
    </m.div>
  );
};
