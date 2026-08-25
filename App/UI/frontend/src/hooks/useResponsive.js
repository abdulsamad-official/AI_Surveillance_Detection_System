import { useState, useEffect } from 'react';

export default function useResponsive() {
  const [size, setSize] = useState({
    width:    window.innerWidth,
    height:   window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop:window.innerWidth >= 1024,
    isLarge:  window.innerWidth >= 1920
  });

  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      setSize({
        width:     w,
        height:    window.innerHeight,
        isMobile:  w < 768,
        isTablet:  w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        isLarge:   w >= 1920
      });
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  return size;
}