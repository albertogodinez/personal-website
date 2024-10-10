import { useCallback, useEffect, useState } from 'react';

import './gradient-background.css';

export const GradientBackground: React.FC = () => {
  const [interBubble, setInterBubble] = useState<HTMLDivElement | null>(null);

  const interactiveRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setInterBubble(node);
    }
  }, []);

  useEffect(() => {
    if (!interBubble) return;

    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;

    function move() {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      if (interBubble) {
        interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      }
      requestAnimationFrame(move);
    }

    const handleMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    move();

    // Cleanup function to remove event listener
    return () => {
      console.log('cleanup');
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [interBubble]);

  return (
    <div className="gradient-bg">
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="gradients-container">
        <div className="g1"></div>
        <div className="g2"></div>
        <div className="g3"></div>
        <div className="g4"></div>
        <div className="g5"></div>
        <div className="interactive" ref={interactiveRef}></div>
      </div>
    </div>
  );
};

export default GradientBackground;
