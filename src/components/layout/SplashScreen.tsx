import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap } from 'lucide-react';
import { preloadOcr, onPreloadStatusChange, getPreloadStatus } from '@/domain/ocr/preload';

interface SplashScreenProps {
  onReady: () => void;
}

const TIPS = [
  'Loading AI models…',
  'Setting up text detection…',
  'Warming up the recognition engine…',
  'Almost there…',
];

export function SplashScreen({ onReady }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const animFrameRef = useRef<number>(0);
  const modelReadyRef = useRef(false);

  const isExiting = progress >= 100;

  // Start preloading immediately
  useEffect(() => {
    preloadOcr();

    const unsub = onPreloadStatusChange((status) => {
      if (status === 'ready' || status === 'error') {
        modelReadyRef.current = true;
      }
    });

    // Also check if already ready (e.g. cached)
    const { status } = getPreloadStatus();
    if (status === 'ready' || status === 'error') {
      modelReadyRef.current = true;
    }

    return unsub;
  }, []);

  // Animated progress bar — fast to 70%, then slows, jumps to 100% when model ready
  useEffect(() => {
    let cancelled = false;
    let startTs: number | null = null;

    const tick = (ts: number) => {
      if (cancelled) return;
      if (startTs === null) startTs = ts;

      const elapsed = ts - startTs;

      if (modelReadyRef.current) {
        // Model is ready — quickly fill to 100%
        setProgress((prev) => {
          const next = prev + (100 - prev) * 0.15;
          if (next >= 99.5) {
            return 100;
          }
          return next;
        });
      } else {
        // Simulate progress: fast to ~70%, then crawl
        const target = Math.min(70, (elapsed / 3000) * 70);
        setProgress((prev) => {
          const ease = prev + (target - prev) * 0.08;
          return Math.min(ease, 85); // never exceed 85% without model
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Cycle through tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIdx((i) => (i + 1) % TIPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // When progress hits 100, start exit
  useEffect(() => {
    if (isExiting) {
      // Wait for exit animation to finish before calling onReady
      const timer = setTimeout(() => {
        onReady();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onReady]);

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: 'var(--background)' }}
        >
          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -left-1/4 -top-1/4 h-[60vh] w-[60vh] rounded-full opacity-20 blur-[100px]"
              style={{ background: 'var(--glow)' }}
            />
            <div
              className="absolute -bottom-1/4 -right-1/4 h-[50vh] w-[50vh] rounded-full opacity-15 blur-[100px]"
              style={{ background: 'var(--glow-2)' }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-8">
            {/* Animated logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative"
            >
              {/* Spinning ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-4 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, transparent, var(--glow), transparent, var(--glow-2), transparent)`,
                  opacity: 0.3,
                }}
              />
              {/* Pulsing glow behind icon */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px 0px var(--glow)',
                    '0 0 40px 10px var(--glow)',
                    '0 0 20px 0px var(--glow)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative grid h-20 w-20 place-items-center rounded-2xl"
                style={{ background: 'var(--gradient-text)' }}
              >
                <GraduationCap className="h-10 w-10 text-primary-foreground" />
              </motion.div>
            </motion.div>

            {/* App name */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                GradeSnap
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Private AI-Powered CGPA Calculator
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="w-64 sm:w-72"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--gradient-text)', width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              {/* Tip text */}
              <div className="mt-3 h-5 overflow-hidden text-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tipIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs text-muted-foreground"
                  >
                    {TIPS[tipIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
