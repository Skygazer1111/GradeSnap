import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}

export function Popover({ isOpen, onClose, anchorRef, children, className, align = "center" }: PopoverProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const updatePosition = () => {
        const rect = anchorRef.current!.getBoundingClientRect();
        let left = rect.left;
        if (align === "center") {
          left = rect.left + rect.width / 2;
        } else if (align === "end") {
          left = rect.right;
        }
        setCoords({ top: rect.bottom + 8, left });
      };
      
      updatePosition();
      
      const handleScrollOrResize = () => {
        updatePosition();
      };
      
      window.addEventListener("resize", handleScrollOrResize);
      window.addEventListener("scroll", handleScrollOrResize, true);
      
      return () => {
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, true);
      };
    }
  }, [isOpen, anchorRef, align]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      // Allow clicking inside the popover
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    // small timeout to prevent immediate close on trigger click
    setTimeout(() => window.addEventListener("click", handleClick), 0);
    return () => window.removeEventListener("click", handleClick);
  }, [isOpen, onClose, anchorRef]);

  if (typeof document === "undefined") return null;

  const xAlign = align === "center" ? "-50%" : align === "end" ? "-100%" : "0%";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.95, x: xAlign }}
          animate={{ opacity: 1, y: 0, scale: 1, x: xAlign }}
          exit={{ opacity: 0, y: -4, scale: 0.95, x: xAlign }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999 }}
          className={cn("glass-strong rounded-xl border border-border shadow-2xl overflow-hidden", className)}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
