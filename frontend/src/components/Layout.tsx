import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import Nav from './Nav';

export default function Layout() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      lerp: 0.07,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <Nav />
      <Outlet context={{ lenis: lenisRef }} />
    </>
  );
}
