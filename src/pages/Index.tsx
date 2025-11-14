import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState("Ready");
  const [syncPercentage, setSyncPercentage] = useState(100);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const isPressingRef = useRef(false);
  const pressStartTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // Breathing cycle times (in seconds)
  const CYCLE = {
    inhale: 4,
    hold: 2,
    exhale: 6,
    rest: 2,
  };
  const TOTAL_CYCLE = CYCLE.inhale + CYCLE.hold + CYCLE.exhale + CYCLE.rest;

  // Easing functions
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const easeOutQuad = (t: number): number => {
    return 1 - (1 - t) * (1 - t);
  };

  // Initialize particles
  const initParticles = (canvas: HTMLCanvasElement) => {
    const particles: Particle[] = [];
    const colors = ["#5FD4D6", "#A78BFA", "#F9A8D4"];
    
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.3 + 0.1,
      });
    }
    particlesRef.current = particles;
  };

  // Draw particles
  const drawParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    particlesRef.current.forEach((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around screen
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;

      // Draw particle
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas);
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const animate = (timestamp: number) => {
      if (!isActive) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const cycleTime = elapsed % TOTAL_CYCLE;

      // Determine phase
      let currentPhase = "Rest";
      let phaseProgress = 0;
      let bubbleScale = 1;
      let glowIntensity = 0.5;

      if (cycleTime < CYCLE.inhale) {
        currentPhase = "Inhale";
        phaseProgress = cycleTime / CYCLE.inhale;
        const eased = easeInOutCubic(phaseProgress);
        bubbleScale = 1 + eased * 0.5;
        glowIntensity = 0.5 + eased * 0.5;
      } else if (cycleTime < CYCLE.inhale + CYCLE.hold) {
        currentPhase = "Hold";
        phaseProgress = (cycleTime - CYCLE.inhale) / CYCLE.hold;
        bubbleScale = 1.5;
        glowIntensity = 1;
      } else if (cycleTime < CYCLE.inhale + CYCLE.hold + CYCLE.exhale) {
        currentPhase = "Exhale";
        phaseProgress = (cycleTime - CYCLE.inhale - CYCLE.hold) / CYCLE.exhale;
        const eased = easeOutQuad(phaseProgress);
        bubbleScale = 1.5 - eased * 0.5;
        glowIntensity = 1 - eased * 0.5;
      } else {
        currentPhase = "Rest";
        phaseProgress = (cycleTime - CYCLE.inhale - CYCLE.hold - CYCLE.exhale) / CYCLE.rest;
        bubbleScale = 1;
        glowIntensity = 0.5;
      }

      setPhase(currentPhase);

      // Calculate sync percentage
      if (isPressingRef.current) {
        const pressDuration = (timestamp - pressStartTimeRef.current) / 1000;
        let targetPhase = "";
        
        if (currentPhase === "Inhale") targetPhase = "Inhale";
        else if (currentPhase === "Hold") targetPhase = "Hold";
        else targetPhase = "None";

        const isCorrectPhase = targetPhase === "Inhale" || targetPhase === "Hold";
        setSyncPercentage((prev) => {
          const adjustment = isCorrectPhase ? 1 : -2;
          return Math.max(0, Math.min(100, prev + adjustment * 0.1));
        });
      }

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#1a2744");
      gradient.addColorStop(0.5, "#2b4a5e");
      gradient.addColorStop(1, "#3f2a5a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw particles
      drawParticles(ctx, canvas);

      // Draw bubble
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) / 8;
      const radius = baseRadius * bubbleScale;

      // Outer glow
      const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.8);
      glowGradient.addColorStop(0, `rgba(95, 212, 214, ${glowIntensity * 0.3})`);
      glowGradient.addColorStop(0.5, `rgba(95, 212, 214, ${glowIntensity * 0.15})`);
      glowGradient.addColorStop(1, "rgba(95, 212, 214, 0)");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Main bubble
      const bubbleGradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      );
      bubbleGradient.addColorStop(0, `rgba(139, 233, 253, ${0.8 + glowIntensity * 0.2})`);
      bubbleGradient.addColorStop(0.5, `rgba(95, 212, 214, ${0.7 + glowIntensity * 0.3})`);
      bubbleGradient.addColorStop(1, `rgba(67, 191, 196, ${0.6 + glowIntensity * 0.4})`);
      
      ctx.fillStyle = bubbleGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - radius * 0.4,
        centerY - radius * 0.4,
        0,
        centerX - radius * 0.4,
        centerY - radius * 0.4,
        radius * 0.6
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
      highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isActive, TOTAL_CYCLE, CYCLE.inhale, CYCLE.hold, CYCLE.exhale, CYCLE.rest]);

  const handleStart = () => {
    setIsActive(true);
    startTimeRef.current = 0;
    setSyncPercentage(100);
  };

  const handleReset = () => {
    setIsActive(false);
    startTimeRef.current = 0;
    setPhase("Ready");
    setSyncPercentage(100);
    isPressingRef.current = false;
  };

  const handleMouseDown = () => {
    isPressingRef.current = true;
    pressStartTimeRef.current = performance.now();
  };

  const handleMouseUp = () => {
    isPressingRef.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleMouseDown);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleMouseDown);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Title */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-4xl md:text-5xl font-light text-foreground drop-shadow-lg tracking-wide">
            Breathing Bubble
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 drop-shadow">
            Follow the bubble's breath to find calm
          </p>
        </div>

        {/* Phase indicator */}
        {isActive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32 md:mt-40">
            <div className="text-3xl md:text-4xl font-light text-foreground drop-shadow-lg animate-pulse">
              {phase}
            </div>
          </div>
        )}

        {/* Sync percentage */}
        {isActive && (
          <div className="absolute top-8 right-8 text-right">
            <div className="text-xs text-muted-foreground drop-shadow mb-1">Sync</div>
            <div className="text-2xl font-light text-accent drop-shadow-lg">
              {Math.round(syncPercentage)}%
            </div>
          </div>
        )}

        {/* Instructions */}
        {isActive && (
          <div className="absolute bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 text-center">
            <p className="text-xs md:text-sm text-muted-foreground drop-shadow max-w-md px-4">
              Press and hold during Inhale and Hold phases.<br />
              Release during Exhale and Rest.
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto">
          {!isActive ? (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-primary/80 hover:bg-primary text-primary-foreground backdrop-blur-sm shadow-lg px-8"
            >
              Start Breathing
            </Button>
          ) : (
            <Button
              onClick={handleReset}
              size="lg"
              variant="outline"
              className="bg-card/30 hover:bg-card/50 text-foreground backdrop-blur-sm border-border/50 shadow-lg"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
