import { useEffect, useRef, useState } from 'react';

/**
 * Wraps a fixed-pixel-width design (the original 1920px PHP mockup) and
 * scales it to fit whatever width is available - same pixels, just zoomed
 * up/down, so the design itself never changes, only its on-screen size.
 *
 * This is the same trick the original PHP files used (transform: scale(0.8))
 * except the factor is calculated live from the real container width, so it
 * looks correct on any monitor/laptop/tablet instead of only one fixed size.
 */
export default function ScaleFit({ baseWidth, children }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function recalc() {
      const parentWidth = outer.parentElement ? outer.parentElement.clientWidth : window.innerWidth;
      setScale(parentWidth / baseWidth);
      // offsetHeight is unaffected by CSS transform, so this is always the
      // true, un-scaled content height.
      setNaturalHeight(inner.offsetHeight);
    }

    recalc();
    const ro = new ResizeObserver(recalc);
    if (outer.parentElement) ro.observe(outer.parentElement);
    ro.observe(inner);
    window.addEventListener('resize', recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [baseWidth]);

  return (
    <div
      ref={outerRef}
      style={{
        width: '100%',
        height: naturalHeight ? naturalHeight * scale : 'auto',
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
        }}
      >
        {children}
      </div>
    </div>
  );
}
