"use client";

import { motion } from "motion/react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface EvidenceDrawerProps {
  agent: string;
  rule: string;
  detail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

const drawerVariants = {
  hidden: {
    y: "100%",
    opacity: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.8 } },
};

export default function EvidenceDrawer({
  agent,
  rule,
  detail,
  open,
  onOpenChange,
  children,
}: EvidenceDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="text-flame/60 hover:text-flame font-mono text-[10px] uppercase tracking-[0.1em]">
          view evidence →
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-lg">
        <motion.div
          animate="visible"
          className="mx-auto w-full space-y-6 px-6 pb-8"
          initial="hidden"
          variants={drawerVariants}
        >
          <motion.div variants={itemVariants}>
            <DrawerHeader className="space-y-2.5 px-0">
              <DrawerTitle className="flex items-center gap-3">
                <motion.span
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-flame px-2 py-0.5 border border-flame/30"
                  variants={itemVariants}
                >
                  {rule}
                </motion.span>
                <motion.span
                  className="font-mono text-xs text-ash"
                  variants={itemVariants}
                >
                  {agent}
                </motion.span>
              </DrawerTitle>
              <motion.div variants={itemVariants}>
                <DrawerDescription>
                  {detail}
                </DrawerDescription>
              </motion.div>
            </DrawerHeader>
          </motion.div>

          {/* Evidence details */}
          <motion.div variants={itemVariants}>
            {children}
          </motion.div>

          <motion.div variants={itemVariants}>
            <DrawerFooter className="px-0">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </motion.div>
        </motion.div>
      </DrawerContent>
    </Drawer>
  );
}
