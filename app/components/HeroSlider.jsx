import {useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

/**
 * @param {{
 *  slides: Array<{
 *    id: string;
 *    title: string;
 *    subtitle?: string | null;
 *    image?: {id?: string; url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
 *    ctaLabel: string;
 *    ctaTo: string;
 *    secondaryCtaLabel?: string;
 *    secondaryCtaTo?: string;
 *  }>;
 *  intervalMs?: number;
 * }}
 */
export function HeroSlider({slides, intervalMs = 5500}) {
  const safeSlides = slides?.filter(Boolean) ?? [];
  const [index, setIndex] = useState(0);
  const isPausedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const normalizedSlides = useMemo(() => {
    // ensure at least 1 slide so UI doesn't explode
    return safeSlides.length ? safeSlides : [];
  }, [safeSlides]);

  useEffect(() => {
    if (normalizedSlides.length <= 1) return;

    const id = setInterval(() => {
      if (isPausedRef.current || !isPlaying) return;
      setIndex((i) => (i + 1) % normalizedSlides.length);
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, isPlaying, normalizedSlides.length]);

  if (!normalizedSlides.length) return null;

  const active = normalizedSlides[index];

  return (
    <section
      className="hero-slider"
      onMouseEnter={() => {
        isPausedRef.current = true;
      }}
      onMouseLeave={() => {
        isPausedRef.current = false;
      }}
    >
      <div className="hero-slider__stage">
        {normalizedSlides.map((slide, i) => {
          const isActive = i === index;
          const hasImage = Boolean(slide.image?.url);
          return (
            <div
              key={slide.id}
              className={`hero-slide${isActive ? ' is-active' : ''}`}
              aria-hidden={!isActive}
            >
              <div className="hero-slide__media">
                {hasImage ? (
                  <Image
                    data={slide.image}
                    sizes="100vw"
                    aspectRatio="16/9"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                ) : (
                  <div className="hero-slide__fallback" />
                )}
                <div className="hero-slide__scrim" />
              </div>

              <div className="hero-slide__content">
                <div className="hero-slide__kicker">Featured</div>
                <h1 className="hero-slide__title">{slide.title}</h1>
                {slide.subtitle ? (
                  <p className="hero-slide__subtitle">{slide.subtitle}</p>
                ) : null}

                <div className="hero-slide__ctas">
                  <Link to={slide.ctaTo} className="btn btn--primary">
                    {slide.ctaLabel}
                  </Link>
                  {slide.secondaryCtaLabel && slide.secondaryCtaTo ? (
                    <Link to={slide.secondaryCtaTo} className="btn btn--ghost">
                      {slide.secondaryCtaLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        <div className="hero-slider__controls">
          <button
            type="button"
            className="hero-slider__arrow"
            aria-label="Previous slide"
            onClick={() =>
              setIndex((i) =>
                (i - 1 + normalizedSlides.length) % normalizedSlides.length,
              )
            }
          >
            <span aria-hidden>‹</span>
          </button>

          <button
            type="button"
            className="hero-slider__play"
            aria-label={isPlaying ? 'Pause autoplay' : 'Play autoplay'}
            aria-pressed={isPlaying ? 'true' : 'false'}
            onClick={() => setIsPlaying((v) => !v)}
          >
            {isPlaying ? (
              <span aria-hidden>❚❚</span>
            ) : (
              <span aria-hidden>▶</span>
            )}
          </button>

          <div className="hero-slider__dots" role="tablist" aria-label="Hero">
            {normalizedSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`hero-slider__dot${i === index ? ' is-active' : ''}`}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'true' : 'false'}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="hero-slider__arrow"
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % normalizedSlides.length)}
          >
            <span aria-hidden>›</span>
          </button>
        </div>

        {/* for quick a11y context */}
        <p className="sr-only" aria-live="polite">
          {`Showing slide ${index + 1} of ${normalizedSlides.length}: ${active.title}`}
        </p>
      </div>
    </section>
  );
}

