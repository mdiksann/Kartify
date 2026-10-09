'use client';

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';

export function RevealSection(props: ComponentPropsWithoutRef<'section'>) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = section.current;
    if (!element || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.classList.add('scroll-reveal');
        observer.disconnect();
      },
      { rootMargin: '0px 0px -48px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <section {...props} ref={section} />;
}
