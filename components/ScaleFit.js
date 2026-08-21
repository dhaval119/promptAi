import { useEffect, useRef, useState } from 'react';

export default function ScaleFit({ baseWidth = 1920, children }) {
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(4200); // default = container height
  const innerRef = useRef(null);

  useEffect(() => {
    function update() {
      const s = Math.min(1, window.innerWidth / baseWidth);
      setScale(s);

      // Measure actual content height after scale settles
      if (innerRef.current) {
        const h = innerRef.current.scrollHeight || innerRef.current.offsetHeight || 4200;
        setContentHeight(h);
      }
    }

    update();
    window.addEventListener('resize', update);

    // Re-measure after a short delay (ScaleFit + images load)
    const t1 = setTimeout(update, 100);
    const t2 = setTimeout(update, 400);
    const t3 = setTimeout(update, 800);

    return () => {
      window.removeEventListener('resize', update);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [baseWidth]);

  return (
    <div
      style={{
        width: '100%',
        height: contentHeight * scale, // ← yeh critical hai – extra black space khatam
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: baseWidth,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}