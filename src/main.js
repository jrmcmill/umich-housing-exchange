import './styles.css';
import { listings } from './data/listings';

const app = document.querySelector('#app');

const state = {
  search: '',
  maxPrice: 1500,
  bedrooms: 'all',
  location: 'all',
  sort: 'newest',
  activeListingId: null,
};

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const bedroomLabel = (bedrooms) => {
  if (bedrooms === 0) return 'Studio';
  if (bedrooms === 1) return '1BR';
  return `${bedrooms}BR`;
};

const formatDate = (dateString) =>
  new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

const locations = uniqueSorted(listings.map((listing) => listing.location));

const getFilteredListings = () => {
  const query = state.search.trim().toLowerCase();

  return listings
    .filter((listing) => {
      const matchesSearch =
        !query ||
        [listing.title, listing.description, listing.location, listing.neighborhood]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesPrice = listing.price <= state.maxPrice;
      const matchesBedrooms =
        state.bedrooms === 'all' || Number(state.bedrooms) === listing.bedrooms;
      const matchesLocation =
        state.location === 'all' || listing.location === state.location;

      return matchesSearch && matchesPrice && matchesBedrooms && matchesLocation;
    })
    .sort((a, b) => {
      if (state.sort === 'price-asc') return a.price - b.price;
      if (state.sort === 'price-desc') return b.price - a.price;
      return new Date(b.created_at) - new Date(a.created_at);
    });
};

const getActiveListing = () => listings.find((listing) => listing.id === state.activeListingId) || null;

const setActiveListing = (listingId) => {
  state.activeListingId = listingId;
  render();
};

const renderListingCard = (listing) => `
  <article class="listing-card" data-listing-id="${listing.id}">
    <button class="listing-card__media" type="button" data-listing-open="${listing.id}" aria-label="Open ${listing.title}">
      <img src="${listing.images[0]}" alt="${listing.title}" loading="lazy" />
      ${listing.good_deal ? '<span class="badge badge--deal">Good deal</span>' : ''}
    </button>
    <div class="listing-card__body">
      <div class="listing-card__topline">
        <h3>${listing.title}</h3>
        <div class="listing-card__price">${priceFormatter.format(listing.price)}</div>
      </div>
      <div class="listing-card__meta">
        <span>${bedroomLabel(listing.bedrooms)}</span>
        <span>${listing.bathrooms} bath</span>
        <span>${listing.location}</span>
      </div>
      <p>${listing.description}</p>
      <div class="listing-card__footer">
        <span>Available ${formatDate(listing.available_from)} - ${formatDate(listing.available_to)}</span>
        <button class="button button--ghost" type="button" data-listing-open="${listing.id}">View details</button>
      </div>
    </div>
  </article>
`;

const renderDetail = (listing) => {
  if (!listing) return '';

  return `
    <section class="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button class="detail-panel__backdrop" type="button" data-close-detail aria-label="Close details"></button>
      <div class="detail-panel__sheet">
        <div class="detail-panel__hero">
          <img src="${listing.images[0]}" alt="${listing.title}" />
          <button class="detail-panel__close" type="button" data-close-detail aria-label="Close details">Close</button>
        </div>
        <div class="detail-panel__content">
          <div class="detail-panel__header">
            <div>
              <p class="eyebrow">Listing detail</p>
              <h2 id="detail-title">${listing.title}</h2>
            </div>
            <div class="detail-panel__price">${priceFormatter.format(listing.price)}</div>
          </div>
          <div class="detail-panel__facts">
            <span>${bedroomLabel(listing.bedrooms)}</span>
            <span>${listing.bathrooms} bath</span>
            <span>${listing.neighborhood}</span>
            <span>${listing.gender_preference}</span>
          </div>
          <p class="detail-panel__description">${listing.description}</p>
          <dl class="detail-panel__grid">
            <div>
              <dt>Available from</dt>
              <dd>${formatDate(listing.available_from)}</dd>
            </div>
            <div>
              <dt>Available to</dt>
              <dd>${formatDate(listing.available_to)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>${listing.location}</dd>
            </div>
            <div>
              <dt>Posted</dt>
              <dd>${new Date(listing.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}</dd>
            </div>
          </dl>
          <div class="detail-panel__actions">
            <a class="button button--primary" href="${listing.contact.value}" target="_blank" rel="noreferrer">Contact</a>
            <button class="button button--secondary" type="button" data-copy-contact="${listing.contact.value}">Copy contact</button>
          </div>
          <div class="detail-panel__gallery">
            ${listing.images
              .map(
                (image, index) => `
                  <img src="${image}" alt="${listing.title} photo ${index + 1}" loading="lazy" />
                `,
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>
  `;
};

const render = () => {
  const filteredListings = getFilteredListings();
  const activeListing = getActiveListing();
  const newestCount = listings.filter(
    (listing) => new Date(listing.created_at) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  ).length;

  app.innerHTML = `
    <div class="page-shell">
      <header class="hero">
        <nav class="nav">
          <div class="brand">
            <div class="brand__mark">U</div>
            <div>
              <p>UMich Subleases</p>
              <span>Student-first housing for Ann Arbor</span>
            </div>
          </div>
          <a class="button button--ghost" href="#listings">Browse listings</a>
        </nav>

        <section class="hero__content">
          <div class="hero__copy">
            <p class="eyebrow">GitHub Pages MVP</p>
            <h1>The easiest way for UMich students to find and list subleases.</h1>
            <p class="hero__text">
              Search Ann Arbor subleases with filters for price, dates, location, and bedrooms.
              Start with static listings, then plug in forms or a spreadsheet later.
            </p>
            <div class="hero__actions">
              <a class="button button--primary" href="#listings">Explore listings</a>
              <a class="button button--secondary" href="#submit">Submit a listing</a>
            </div>
          </div>
          <aside class="hero__stats" aria-label="Platform stats">
            <div>
              <strong>${listings.length}</strong>
              <span>Active listings</span>
            </div>
            <div>
              <strong>${newestCount}</strong>
              <span>Recently added</span>
            </div>
            <div>
              <strong>$${Math.round(listings.reduce((sum, listing) => sum + listing.price, 0) / listings.length)}</strong>
              <span>Average monthly price</span>
            </div>
          </aside>
        </section>
      </header>

      <main>
        <section class="surface surface--filters" id="listings">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Browse</p>
              <h2>Filter and sort subleases</h2>
            </div>
            <p>${filteredListings.length} listing${filteredListings.length === 1 ? '' : 's'} found</p>
          </div>

          <form class="filters" id="filters">
            <label>
              Search
              <input name="search" type="search" placeholder="Title, neighborhood, or description" value="${state.search}" />
            </label>
            <label>
              Max price: <span class="range-value">${priceFormatter.format(state.maxPrice)}</span>
              <input name="maxPrice" type="range" min="400" max="2000" step="25" value="${state.maxPrice}" />
            </label>
            <label>
              Bedrooms
              <select name="bedrooms">
                <option value="all" ${state.bedrooms === 'all' ? 'selected' : ''}>Any</option>
                <option value="0" ${state.bedrooms === '0' ? 'selected' : ''}>Studio</option>
                <option value="1" ${state.bedrooms === '1' ? 'selected' : ''}>1BR</option>
                <option value="2" ${state.bedrooms === '2' ? 'selected' : ''}>2BR</option>
                <option value="3" ${state.bedrooms === '3' ? 'selected' : ''}>3BR</option>
                <option value="4" ${state.bedrooms === '4' ? 'selected' : ''}>4BR+</option>
              </select>
            </label>
            <label>
              Location
              <select name="location">
                <option value="all" ${state.location === 'all' ? 'selected' : ''}>Any</option>
                ${locations.map((location) => `<option value="${location}" ${state.location === location ? 'selected' : ''}>${location}</option>`).join('')}
              </select>
            </label>
            <label>
              Sort
              <select name="sort">
                <option value="newest" ${state.sort === 'newest' ? 'selected' : ''}>Newest first</option>
                <option value="price-asc" ${state.sort === 'price-asc' ? 'selected' : ''}>Price low to high</option>
                <option value="price-desc" ${state.sort === 'price-desc' ? 'selected' : ''}>Price high to low</option>
              </select>
            </label>
          </form>
        </section>

        <section class="listings-grid">
          ${
            filteredListings.length
              ? filteredListings.map((listing) => renderListingCard(listing)).join('')
              : '<div class="empty-state"><h3>No listings match your filters.</h3><p>Try widening your price range or clearing a search term.</p></div>'
          }
        </section>

        <section class="surface info-band" id="submit">
          <div>
            <p class="eyebrow">Submit</p>
            <h2>No-backend posting flow</h2>
            <p>
              Use a Google Form, Typeform, or GitHub pull request workflow to collect new listings.
              The site is structured so you can swap in live data without changing the UI.
            </p>
          </div>
          <div class="info-band__actions">
            <a class="button button--primary" href="https://forms.google.com" target="_blank" rel="noreferrer">Open form template</a>
            <a class="button button--secondary" href="#top">Back to top</a>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p>Built for UMich students in Ann Arbor.</p>
        <p>Maize #FFCB05 and Blue #00274C define the visual system.</p>
      </footer>
    </div>
    ${activeListing ? renderDetail(activeListing) : ''}
  `;

  const filtersForm = document.querySelector('#filters');
  filtersForm.addEventListener('input', (event) => {
    const formData = new FormData(filtersForm);
    state.search = String(formData.get('search') || '');
    state.maxPrice = Number(formData.get('maxPrice'));
    state.bedrooms = String(formData.get('bedrooms'));
    state.location = String(formData.get('location'));
    state.sort = String(formData.get('sort'));
    render();
  });

  document.querySelectorAll('[data-listing-open]').forEach((element) => {
    element.addEventListener('click', () => setActiveListing(element.getAttribute('data-listing-open')));
  });

  document.querySelectorAll('[data-close-detail]').forEach((element) => {
    element.addEventListener('click', () => setActiveListing(null));
  });

  document.querySelectorAll('[data-copy-contact]').forEach((element) => {
    element.addEventListener('click', async () => {
      const contact = element.getAttribute('data-copy-contact');
      if (!contact) return;
      try {
        await navigator.clipboard.writeText(contact);
        element.textContent = 'Copied';
        window.setTimeout(() => {
          if (state.activeListingId) render();
        }, 1000);
      } catch {
        element.textContent = 'Copy failed';
      }
    });
  });

  if (state.activeListingId) {
    document.addEventListener('keydown', function escapeHandler(event) {
      if (event.key === 'Escape') {
        setActiveListing(null);
        document.removeEventListener('keydown', escapeHandler);
      }
    });
  }
};

render();
