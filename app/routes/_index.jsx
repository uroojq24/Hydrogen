import {Await, useLoaderData, Link} from 'react-router';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {HeroSlider} from '~/components/HeroSlider';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Hydrogen | Home'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}) {
  const [{collections}, featuredProducts, heroCollections] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTIONS_QUERY),
    context.storefront.query(FEATURED_PRODUCTS_QUERY),
    context.storefront.query(HERO_SLIDES_QUERY),
  ]);

  return {
    featuredCollection: collections.nodes[0] ?? null,
    featuredCollectionProducts:
      collections.nodes[0]?.products?.nodes?.slice(0, 3) ?? [],
    collections: collections.nodes.slice(0, 6),
    featuredProducts: featuredProducts.products.nodes.slice(0, 4),
    heroSlides: (heroCollections.collections.nodes || []).slice(0, 3),
  };
}

function loadDeferredData({context}) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  return {recommendedProducts};
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const data = useLoaderData();

  const heroSlides = (data.heroSlides || [])
    .filter((c) => Boolean(c?.handle))
    .map((c) => ({
      id: c.id,
      title: c.title,
      subtitle:
        c.description?.trim() ||
        'Design-forward essentials, chosen for everyday use.',
      image: c.image,
      ctaLabel: `Shop ${c.title}`,
      ctaTo: `/collections/${c.handle}`,
      secondaryCtaLabel: 'Explore all products',
      secondaryCtaTo: '/collections/all',
    }));

  return (
    <>
      {/* Hero Slider */}
      <HeroSlider slides={heroSlides} />

      {/* Featured Collection */}
      {data.featuredCollection && (
        <section className="section">
          <div className="container">
            <h2 className="section-heading">Featured Collection</h2>
            <FeaturedCollection
              collection={data.featuredCollection}
              products={data.featuredCollectionProducts}
            />
          </div>
        </section>
      )}

      {/* Featured Products */}
      {data.featuredProducts?.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <h2 className="section-heading">Bestsellers</h2>
            <div className="products-grid">
              {data.featuredProducts.map((product) => (
                <ProductItem key={product.id} product={product} loading="eager" />
              ))}
            </div>
            <div className="section-cta">
              <Link to="/collections/all" className="btn btn--outline-dark">
                View all products
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recommended Products (deferred) */}
      <section className="section">
        <div className="container">
          <h2 className="section-heading">New Arrivals</h2>
          <Suspense
            fallback={
              <div className="products-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: 1,
                      background: 'var(--color-border)',
                      borderRadius: '4px',
                    }}
                  />
                ))}
              </div>
            }
          >
            <Await resolve={data.recommendedProducts}>
              {(response) => (
                <div className="products-grid">
                  {response?.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))}
                </div>
              )}
            </Await>
          </Suspense>
        </div>
      </section>

      {/* Collections Grid */}
      {data.collections?.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <h2 className="section-heading">Shop by Category</h2>
            <div className="collections-grid">
              {data.collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust Bar */}
      <section className="trust-bar">
        <div className="trust-item">
          <div className="trust-item__icon">✓</div>
          <div className="trust-item__title">Free Shipping</div>
          <div className="trust-item__desc">
            On orders over $50
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-item__icon">↺</div>
          <div className="trust-item__title">Easy Returns</div>
          <div className="trust-item__desc">
            30-day return policy
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-item__icon">★</div>
          <div className="trust-item__title">Quality Guarantee</div>
          <div className="trust-item__desc">
            Curated with care
          </div>
        </div>
      </section>
    </>
  );
}

function FeaturedCollection({collection, products}) {
  const image = collection?.image;
  const description =
    collection?.description?.trim() ||
    'A focused edit of pieces that look great, feel great, and work hard in real life.';

  return (
    <div className="featured-feature">
      <Link
        className="featured-feature__media"
        to={`/collections/${collection.handle}`}
        aria-label={`Shop ${collection.title}`}
      >
        {image ? (
          <Image data={image} sizes="100vw" aspectRatio="16/9" />
        ) : (
          <div className="featured-feature__fallback" />
        )}
        <div className="featured-feature__media-scrim" />
        <div className="featured-feature__media-title">
          <h3>{collection.title}</h3>
        </div>
      </Link>

      <div className="featured-feature__content">
        <p className="featured-feature__eyebrow">Editor’s pick</p>
        <h3 className="featured-feature__headline">{collection.title}</h3>
        <p className="featured-feature__copy">{description}</p>
        {products?.length ? (
          <div className="featured-feature__products" aria-label="Top picks">
            {products.map((p, idx) => (
              <div key={p.id} className="featured-feature__product">
                <ProductItem product={p} loading={idx === 0 ? 'eager' : 'lazy'} />
              </div>
            ))}
          </div>
        ) : null}
        <div className="featured-feature__ctas">
          <Link
            to={`/collections/${collection.handle}`}
            className="btn btn--primary"
          >
            Shop the edit
          </Link>
          <Link to="/collections/all" className="btn btn--outline">
            Browse everything
          </Link>
        </div>
      </div>
    </div>
  );
}

function CollectionCard({collection}) {
  const image = collection?.image;
  return (
    <Link
      className="collection-card"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <Image data={image} sizes="(min-width: 640px) 33vw, 50vw" aspectRatio="4/5" />
      )}
      <div className="collection-card__overlay">
        <h4 className="collection-card__title">{collection.title}</h4>
      </div>
    </Link>
  );
}

const FEATURED_COLLECTIONS_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
    description
    products(first: 3, sortKey: BEST_SELLING) {
      nodes {
        id
        title
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        featuredImage {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
  query FeaturedCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 6, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
`;

const HERO_SLIDES_QUERY = `#graphql
  query HeroSlides($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 3, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        description
        image {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
`;

const FEATURED_PRODUCTS_QUERY = `#graphql
  fragment FeaturedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query FeaturedProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: BEST_SELLING, reverse: true) {
      nodes {
        ...FeaturedProduct
      }
    }
  }
`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
`;

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
