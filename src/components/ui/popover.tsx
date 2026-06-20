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
  /** Full-screen centered sheet — used on mobile */
  modal?: boolean;
  title?: string;
}

export function Popover({
  isOpen,
  onClose,
  anchorRef,
  children,
  className,
  align = "center",
  modal = false,
  title,
}: PopoverProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!modal && anchorRef.current?.contains(target)) return;
      onClose();
    };

    const id = window.setTimeout(() => window.addEventListener("click", handleClick), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", handleClick);
    };
  }, [isOpen, onClose, anchorRef, modal]);

  if (typeof document === "undefined") return null;

  if (modal) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={cn(
                "relative z-[9999] w-full max-w-[17.5rem] overflow-visible rounded-2xl border border-border bg-card shadow-2xl",
                className,
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {title && (
                <p className="border-b border-border px-4 py-3 text-center text-sm font-semibold text-foreground">
                  {title}
                </p>
              )}
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  return createPortal(
    <AnchoredPopover isOpen={isOpen} anchorRef={anchorRef} align={align} className={className}>
      {children}
    </AnchoredPopover>,
    document.body,
  );
}

function AnchoredPopover({
  isOpen,
  anchorRef,
  align,
  className,
  children,
}: {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  align: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
}) {
  const coords = useAnchorCoords(isOpen, anchorRef, align);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform:
              align === "center"
                ? "translateX(-50%)"
                : align === "end"
                  ? "translateX(-100%)"
                  : undefined,
            zIndex: 9999,
          }}
          className={cn(
            "glass-strong max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-border shadow-2xl",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useAnchorCoords(
  isOpen: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  align: "start" | "center" | "end",
) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const el = anchorRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      let left = rect.left;
      if (align === "center") left = rect.left + rect.width / 2;
      else if (align === "end") left = rect.right;

      const popoverHeight = 220;
      const below = rect.bottom + 8;
      const top =
        below + popoverHeight > window.innerHeight && rect.top > popoverHeight + 16
          ? rect.top - popoverHeight - 8
          : below;

      setCoords({ top, left });
    };

    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef, align]);

  return coords;
}
