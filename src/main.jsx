import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { listings as fallbackListings } from './data/listings';
import { databaseConfigured, supabase } from './lib/supabase';

const storageKeys = {
  route: 'umich-subleases:route',
};

const defaultFilters = {
  search: '',
  maxPrice: 1500,
  bedrooms: 'all',
  location: 'all',
  sort: 'newest',
};

const placeholderImage =
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80';

const numberFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function isUmichEmail(email = '') {
  return /@umich\.edu$/i.test(String(email).trim());
}

function getAppBasePath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (!segments.length) return '/';
  return `/${segments[0]}/`;
}

function toAppPath(path = '') {
  const basePath = getAppBasePath();
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${basePath}${cleanPath}` : basePath;
}

function parseRoute(pathname = window.location.pathname) {
  const basePath = getAppBasePath();
  const path = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname.replace(/^\/+/, '');
  const cleanPath = path.replace(/^\/+|\/+$/g, '');

  if (!cleanPath || cleanPath === 'index.html') return { page: 'home' };
  if (cleanPath === 'submit') return { page: 'submit' };

  const listingMatch = cleanPath.match(/^listing\/([^/]+)$/);
  if (listingMatch) {
    return { page: 'listing', listingId: decodeURIComponent(listingMatch[1]) };
  }

  return { page: 'home' };
}

function normalizeListing(listing, source = 'feed') {
  return {
    ...listing,
    price: Number(listing.price),
    bedrooms: Number(listing.bedrooms),
    bathrooms: Number(listing.bathrooms),
    neighborhood: listing.neighborhood || listing.location,
    images: Array.isArray(listing.images) && listing.images.length ? listing.images : [placeholderImage],
    contact: listing.contact || { type: 'email', value: '' },
    gender_preference: listing.gender_preference || 'No preference',
    created_at: listing.created_at || new Date().toISOString(),
    good_deal: Boolean(listing.good_deal),
    source,
  };
}

function mergeListings(...groups) {
  const byId = new Map();

  groups.flat().forEach((listing) => {
    if (!listing?.id) return;
    byId.set(listing.id, normalizeListing(listing, listing.source || 'feed'));
  });

  return [...byId.values()].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
}

function bedroomLabel(bedrooms) {
  if (bedrooms === 0) return 'Studio';
  if (bedrooms === 1) return '1BR';
  return `${bedrooms}BR`;
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function getContactHref(listing) {
  const contact = listing?.contact || { type: 'email', value: '' };
  const value = String(contact.value || '').trim();

  if (contact.type === 'email') {
    return value.startsWith('mailto:') ? value : `mailto:${value}`;
  }

  if (contact.type === 'phone') {
    return value.startsWith('tel:') ? value : `tel:${value.replace(/[^\d+]/g, '')}`;
  }

  return value;
}

function loadRouteFromSession() {
  try {
    return window.sessionStorage.getItem(storageKeys.route);
  } catch {
    return null;
  }
}

function clearSavedRoute() {
  try {
    window.sessionStorage.removeItem(storageKeys.route);
  } catch {
    // Ignore storage failures.
  }
}

function ListingCard({ listing, index, onNavigate }) {
  const route = `/listing/${listing.id}`;

  return (
    <article className="listing-card reveal" style={{ '--delay': `${index * 70}ms` }}>
      <button className="listing-card__media" type="button" aria-label={`Open ${listing.title}`} onClick={() => onNavigate(route)}>
        <img src={listing.images[0]} alt={listing.title} loading="lazy" />
        {listing.is_demo ? <span className="badge badge--demo">DEMO LISTING</span> : null}
        {listing.good_deal ? <span className="badge badge--deal">Good deal</span> : null}
      </button>
      <div className="listing-card__body">
        <div className="listing-card__topline">
          <h3>{listing.title}</h3>
          <div className="listing-card__price">{numberFormatter.format(listing.price)}</div>
        </div>
        <div className="listing-card__meta">
          <span>{bedroomLabel(listing.bedrooms)}</span>
          <span>{listing.bathrooms} bath</span>
          <span>{listing.location}</span>
        </div>
        <p>{listing.description}</p>
        <div className="listing-card__footer">
          <span>
            Available {formatDate(listing.available_from)} - {formatDate(listing.available_to)}
          </span>
          <button className="button button--ghost" type="button" onClick={() => onNavigate(route)}>
            View details
          </button>
        </div>
      </div>
    </article>
  );
}

function AuthCard({ authEmail, setAuthEmail, authCode, setAuthCode, authMessage, authLoading, codeSent, onSendCode, onVerifyCode }) {
  return (
    <section className="surface auth-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Account required</p>
          <h2>Sign in to create a listing</h2>
        </div>
        <p>Enter the 8-digit code Supabase emails to you</p>
      </div>
      <div className="auth-grid">
        <form className="submit-form" onSubmit={codeSent ? onVerifyCode : onSendCode}>
          <label>
            Email address
            <input
              type="email"
              name="email"
              required
              placeholder="you@umich.edu"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
            />
          </label>
          {codeSent ? (
            <label>
              Verification code
              <input
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={8}
                required
                placeholder="12345678"
                value={authCode}
                onChange={(event) => setAuthCode(event.target.value)}
              />
            </label>
          ) : null}
          <div className="submit-form__actions">
            <button className="button button--primary" type="submit" disabled={authLoading}>
              {authLoading ? (codeSent ? 'Verifying code...' : 'Sending code...') : codeSent ? 'Verify code' : 'Send verification code'}
            </button>
            {codeSent ? (
              <button className="button button--secondary" type="button" onClick={onSendCode} disabled={authLoading}>
                Resend code
              </button>
            ) : null}
          </div>
        </form>
        <aside className="submit-side__panel submit-side__panel--accent">
          <p className="eyebrow">Security</p>
          <ul>
            <li>Only @umich.edu accounts can request publishing access.</li>
            <li>Use the Supabase anon key only in the browser.</li>
            <li>Row-level security limits writes to authenticated owners.</li>
            <li>Shareable listing routes stay public, but publishing still requires the emailed code.</li>
          </ul>
        </aside>
      </div>
      {authMessage ? <p className="form-hint">{authMessage}</p> : null}
    </section>
  );
}

function App() {
  const [route, setRoute] = useState(() => parseRoute());
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [feedListings, setFeedListings] = useState([]);
  const [ownListings, setOwnListings] = useState([]);
  const [session, setSession] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [flash, setFlash] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const flashTimerRef = useRef(null);

  const listings = useMemo(() => mergeListings(feedListings, ownListings), [feedListings, ownListings]);
  const liveListingsCount = useMemo(() => listings.filter((l) => !l.is_demo).length, [listings]);
  const currentUser = session?.user || null;

  const visibleListings = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const maxPrice = Number(filters.maxPrice);

    return listings
      .filter((listing) => {
        const matchesSearch =
          !query ||
          [listing.title, listing.description, listing.location, listing.neighborhood]
            .join(' ')
            .toLowerCase()
            .includes(query);
        const matchesPrice = listing.price <= maxPrice;
        const matchesBedrooms = filters.bedrooms === 'all' || listing.bedrooms === Number(filters.bedrooms);
        const matchesLocation = filters.location === 'all' || listing.location === filters.location;
        return matchesSearch && matchesPrice && matchesBedrooms && matchesLocation;
      })
      .sort((left, right) => {
        if (filters.sort === 'price-asc') return left.price - right.price;
        if (filters.sort === 'price-desc') return right.price - left.price;
        return new Date(right.created_at) - new Date(left.created_at);
      });
  }, [filters, listings]);

  const recentListings = useMemo(() => listings.slice(0, 3), [listings]);
  const averagePrice = useMemo(() => {
    if (!listings.length) return 0;
    return Math.round(listings.reduce((sum, listing) => sum + listing.price, 0) / listings.length);
  }, [listings]);

  const currentListing = useMemo(() => {
    if (route.page !== 'listing') return null;
    return listings.find((listing) => listing.id === route.listingId) || null;
  }, [listings, route]);

  const locations = useMemo(() => uniqueSorted(listings.map((listing) => listing.location)), [listings]);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        if (!databaseConfigured || !supabase) {
          if (!cancelled) {
            setFeedListings(fallbackListings.map((listing) => normalizeListing(listing, 'fallback')));
            setLoadingListings(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (cancelled) return;

        if (error) {
          setFlash({ type: 'error', message: 'Database unavailable. Showing fallback listings.' });
          setFeedListings(fallbackListings.map((listing) => normalizeListing(listing, 'fallback')));
        } else {
          const nextListings = Array.isArray(data) && data.length ? data : fallbackListings;
          setFeedListings(nextListings.map((listing) => normalizeListing(listing, 'db')));
        }

        setLoadingListings(false);
      } catch {
        if (!cancelled) {
          setFeedListings(fallbackListings.map((listing) => normalizeListing(listing, 'fallback')));
          setLoadingListings(false);
        }
      }
    }

    loadListings();
    document.body.classList.add('is-ready');

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!databaseConfigured || !supabase) {
        if (!cancelled) {
          setLoadingAuth(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!cancelled) {
        if (error) {
          setFlash({ type: 'error', message: 'Unable to read your Supabase session.' });
        }
        setSession(data.session || null);
        setLoadingAuth(false);
      }
    }

    loadSession();

    let subscription = null;
    if (databaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!cancelled) {
          setSession(nextSession);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!databaseConfigured || !supabase || !currentUser?.id) {
      setOwnListings([]);
      return undefined;
    }

    let cancelled = false;

    async function loadOwnListings() {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (!error && Array.isArray(data)) {
          setOwnListings(data.map((listing) => normalizeListing(listing, 'own')));
        }
      }
    }

    loadOwnListings();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const canonicalHref = window.location.href;
    document.title =
      route.page === 'listing' && currentListing
        ? `${currentListing.title} | UMich Subleases`
        : route.page === 'submit'
          ? 'Submit a Listing | UMich Subleases'
          : route.page === 'listing'
            ? 'Listing not found | UMich Subleases'
            : 'UMich Subleases';

    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        route.page === 'listing' && currentListing
          ? `${currentListing.title} in ${currentListing.location}. ${currentListing.description}`
          : 'Browse and submit UMich subleases in Ann Arbor.',
      );
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalHref);
  }, [currentListing, route.page]);

  useEffect(() => {
    const restoredRoute = loadRouteFromSession();
    if (!restoredRoute) return;

    clearSavedRoute();
    if (restoredRoute !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState({}, '', restoredRoute);
      setRoute(parseRoute(restoredRoute));
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute());
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && route.page === 'listing') {
        navigate('');
      }
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [route.page]);

  useEffect(() => {
    if (!flash) return undefined;

    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 2400);

    return () => window.clearTimeout(flashTimerRef.current);
  }, [flash]);

  function navigate(nextRoute = '', options = {}) {
    const nextPath = toAppPath(nextRoute);
    if (options.replace) {
      window.history.replaceState({}, '', nextPath);
    } else {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setRoute(parseRoute(nextPath));
  }

  function copyToClipboard(value, message = 'Copied to clipboard') {
    window.navigator.clipboard.writeText(value).then(
      () => setFlash({ type: 'success', message }),
      () => setFlash({ type: 'error', message: 'Unable to copy link.' }),
    );
  }

  async function sendCode(event) {
    event.preventDefault();

    if (!databaseConfigured || !supabase) {
      setFlash({ type: 'error', message: 'Connect Supabase to enable accounts and submissions.' });
      return;
    }

    if (!authEmail.trim()) {
      setAuthMessage('Enter a valid email address.');
      return;
    }

    if (!isUmichEmail(authEmail)) {
      setAuthMessage('Only @umich.edu email addresses are allowed.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setCodeSent(true);
      setAuthCode('');
      setAuthMessage('Verification code sent. Check your inbox and enter the 8-digit code here.');
      setFlash({ type: 'success', message: 'Verification code sent.' });
    }

    setAuthLoading(false);
  }

  async function verifyCode(event) {
    event.preventDefault();

    if (!databaseConfigured || !supabase) {
      setFlash({ type: 'error', message: 'Connect Supabase to enable accounts and submissions.' });
      return;
    }

    if (!authEmail.trim() || !isUmichEmail(authEmail)) {
      setAuthMessage('Enter a valid @umich.edu email address first.');
      return;
    }

    const code = authCode.trim();
    if (!code) {
      setAuthMessage('Enter the 8-digit verification code.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    const { error } = await supabase.auth.verifyOtp({
      email: authEmail.trim(),
      token: code,
      type: 'email',
    });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage('Email verified. You are now signed in.');
      setFlash({ type: 'success', message: 'Email verified.' });

      // Ensure app state reflects the freshly issued session immediately
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session || null);
      } catch (err) {
        // ignore; onAuthStateChange will handle session updates
      }

      // Clear the verification UI
      setCodeSent(false);
      setAuthCode('');
    }

    setAuthLoading(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!databaseConfigured || !supabase) {
      setFlash({ type: 'error', message: 'Connect Supabase before publishing listings.' });
      return;
    }

    if (!currentUser?.id) {
      setFlash({ type: 'error', message: 'Sign in first to publish a listing.' });
      navigate('submit');
      return;
    }

    if (!isUmichEmail(currentUser.email || '')) {
      setFlash({ type: 'error', message: 'Only verified @umich.edu accounts can publish listings.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') || '').trim();
    const price = Number(formData.get('price'));
    const bedrooms = Number(formData.get('bedrooms'));
    const bathrooms = Number(formData.get('bathrooms'));
    const availableFrom = String(formData.get('available_from') || '').trim();
    const availableTo = String(formData.get('available_to') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const neighborhood = String(formData.get('neighborhood') || location).trim();
    const description = String(formData.get('description') || '').trim();
    const images = String(formData.get('images') || '')
      .split(',')
      .map((image) => image.trim())
      .filter(Boolean);
    const contactType = String(formData.get('contact_type') || 'email');
    const contactValue = String(formData.get('contact_value') || '').trim();
    const genderPreference = String(formData.get('gender_preference') || 'No preference');

    if (!title || !Number.isFinite(price) || !availableFrom || !availableTo || !location || !description || !contactValue) {
      setFlash({ type: 'error', message: 'Please fill in the required fields to submit a listing.' });
      return;
    }

    const payload = {
      user_id: currentUser.id,
      title,
      price,
      bedrooms: Number.isFinite(bedrooms) ? bedrooms : 0,
      bathrooms: Number.isFinite(bathrooms) ? bathrooms : 1,
      available_from: availableFrom,
      available_to: availableTo,
      location,
      neighborhood,
      description,
      images: images.length ? images : [placeholderImage],
      contact_type: contactType,
      contact_value: contactValue,
      gender_preference: genderPreference,
      status: 'published',
    };

    const { data, error } = await supabase.from('listings').insert(payload).select('*').single();

    if (error || !data) {
      setFlash({ type: 'error', message: error?.message || 'Unable to publish listing.' });
      return;
    }

    const nextListing = normalizeListing(data, 'own');
    setFeedListings((current) => [nextListing, ...current.filter((listing) => listing.id !== nextListing.id)]);
    setOwnListings((current) => [nextListing, ...current.filter((listing) => listing.id !== nextListing.id)]);
    setFlash({ type: 'success', message: 'Listing published and assigned a shareable route.' });
    navigate(`listing/${nextListing.id}`, { replace: true });
  }

  async function deleteListing(listingId) {
    if (!databaseConfigured || !supabase) {
      setFlash({ type: 'error', message: 'Unable to delete listing.' });
      return;
    }

    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
      return;
    }

    const { error } = await supabase.from('listings').delete().eq('id', listingId);

    if (error) {
      setFlash({ type: 'error', message: error.message || 'Unable to delete listing.' });
    } else {
      setFeedListings((current) => current.filter((listing) => listing.id !== listingId));
      setOwnListings((current) => current.filter((listing) => listing.id !== listingId));
      setFlash({ type: 'success', message: 'Listing deleted.' });
      navigate('');
    }
  }

  const renderHome = () => (
    <main className="view view--home">
      <section className="hero hero--home surface">
        <div className="hero__glow hero__glow--gold" />
        <div className="hero__glow hero__glow--blue" />
        <div className="hero__copy reveal">
          <p className="eyebrow">GitHub Pages MVP</p>
          <h1>The easiest way for UMich students to find and list subleases.</h1>
          <p className="hero__text">
            Search Ann Arbor subleases with structured filters, premium motion, and account-gated publishing backed by Supabase.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#listings">
              Explore listings
            </a>
            <button className="button button--primary" type="button" onClick={() => navigate('submit')}>
              Submit a listing
            </button>
          </div>
        </div>
        <aside className="hero__stats reveal" style={{ '--stagger': '90ms' }}>
          <div>
            <strong>{liveListingsCount}</strong>
            <span>Live listings</span>
          </div>
          <div>
            <strong>{currentUser ? 'Signed in' : 'Guest'}</strong>
            <span>Account status</span>
          </div>
          <div>
            <strong>{averagePrice ? numberFormatter.format(averagePrice) : '$0'}</strong>
            <span>Average monthly price</span>
          </div>
        </aside>
      </section>

      <section className="surface surface--filters" id="listings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Browse</p>
            <h2>Filter and sort subleases</h2>
          </div>
          <p>{visibleListings.length} listing{visibleListings.length === 1 ? '' : 's'} found</p>
        </div>

        <form className="filters">
          <label>
            Search
            <input
              name="search"
              type="search"
              placeholder="Title, neighborhood, or description"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </label>
          <label>
            Max price: <span className="range-value">{numberFormatter.format(filters.maxPrice)}</span>
            <input
              name="maxPrice"
              type="range"
              min="400"
              max="2200"
              step="25"
              value={filters.maxPrice}
              onChange={(event) => setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))}
            />
          </label>
          <label>
            Bedrooms
            <select
              name="bedrooms"
              value={filters.bedrooms}
              onChange={(event) => setFilters((current) => ({ ...current, bedrooms: event.target.value }))}
            >
              <option value="all">Any</option>
              <option value="0">Studio</option>
              <option value="1">1BR</option>
              <option value="2">2BR</option>
              <option value="3">3BR</option>
              <option value="4">4BR+</option>
            </select>
          </label>
          <label>
            Location
            <select
              name="location"
              value={filters.location}
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
            >
              <option value="all">Any</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select
              name="sort"
              value={filters.sort}
              onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
            </select>
          </label>
        </form>
      </section>

      <section className="listings-grid">
        {visibleListings.length ? (
          visibleListings.slice(0, 6).map((listing, index) => (
            <ListingCard key={listing.id} listing={listing} index={index} onNavigate={navigate} />
          ))
        ) : (
          <div className="empty-state">
            <h3>No listings match your filters.</h3>
            <p>Try widening your price range or clearing a search term.</p>
          </div>
        )}
      </section>

      <section className="surface info-band">
        <div>
          <p className="eyebrow">Recently added</p>
          <h2>Fresh inventory, fast to browse</h2>
          <p>{recentListings.length} newly surfaced listings are at the top of the feed for quick scanning.</p>
        </div>
        <div className="info-band__actions">
          <button className="button button--primary" type="button" onClick={() => navigate('submit')}>
            Open submission form
          </button>
          {visibleListings[0] ? (
            <button className="button button--secondary" type="button" onClick={() => navigate(`listing/${visibleListings[0].id}`)}>
              View top listing
            </button>
          ) : null}
        </div>
      </section>

      <section className="surface preview-band">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Preview</p>
            <h2>Listings that are ready now</h2>
          </div>
          <p>Showing the strongest matches first</p>
        </div>
        <div className="listings-grid listings-grid--compact">
          {visibleListings.length ? (
            visibleListings.slice(0, 3).map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} index={index + 6} onNavigate={navigate} />
            ))
          ) : (
            <div className="empty-state">
              <h3>No listings match your filters.</h3>
              <p>Try widening your price range or clearing a search term.</p>
            </div>
          )}
        </div>
      </section>

      {currentUser ? (
        <section className="surface submissions-band">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your account</p>
              <h2>Your published listings</h2>
            </div>
            <p>{ownListings.length} listing{ownListings.length === 1 ? '' : 's'}</p>
          </div>
          <div className="submissions-list">
            {ownListings.slice(0, 2).map((listing) => (
              <article className="submission-chip" key={listing.id}>
                <div>
                  <strong>{listing.title}</strong>
                  <span>
                    {listing.location} · {numberFormatter.format(listing.price)}
                  </span>
                </div>
                <button className="button button--ghost" type="button" onClick={() => navigate(`listing/${listing.id}`)}>
                  Open
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );

  const renderListingPage = () => {
    if (!currentListing) {
      return (
        <main className="view">
          <section className="surface empty-state empty-state--route">
            <h1>Listing not found</h1>
            <p>The route exists, but that listing is no longer in the feed.</p>
            <button className="button button--primary" type="button" onClick={() => navigate('')}>
              Back to listings
            </button>
          </section>
        </main>
      );
    }

    const relatedListings = visibleListings.filter((candidate) => candidate.id !== currentListing.id).slice(0, 3);

    return (
      <main className="view view--listing">
        <section className="surface detail-page">
          <div className="breadcrumb">
            <button className="button button--ghost" type="button" onClick={() => navigate('')}>
              Home
            </button>
            <span>/</span>
            <button className="button button--ghost" type="button" onClick={() => navigate('')}>
              Listings
            </button>
            <span>/</span>
            <strong>{currentListing.title}</strong>
          </div>
          <div className="detail-hero">
            <div className="detail-hero__media reveal">
              <img src={currentListing.images[0]} alt={currentListing.title} />
            </div>
            <div className="detail-hero__content reveal" style={{ '--stagger': '70ms' }}>
              <p className="eyebrow">Shareable route</p>
              <h1>{currentListing.title}</h1>
              <p className="hero__text">{currentListing.description}</p>
              <div className="detail-hero__price">{numberFormatter.format(currentListing.price)} / month</div>
              <div className="detail-hero__actions">
                <a className="button button--primary" href={getContactHref(currentListing)} target="_blank" rel="noreferrer">
                  Contact
                </a>
                <button className="button button--secondary" type="button" onClick={() => copyToClipboard(window.location.href, 'Link copied')}>
                  Share
                </button>
                <button className="button button--ghost" type="button" onClick={() => copyToClipboard(window.location.href)}>
                  Copy link
                </button>
                {currentUser?.id === currentListing.user_id ? (
                  <button className="button button--danger" type="button" onClick={() => deleteListing(currentListing.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <section className="detail-card reveal" style={{ '--delay': '80ms' }}>
              <h2>Details</h2>
              <dl className="detail-facts">
                <div>
                  <dt>Bedrooms</dt>
                  <dd>{bedroomLabel(currentListing.bedrooms)}</dd>
                </div>
                <div>
                  <dt>Bathrooms</dt>
                  <dd>{currentListing.bathrooms}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{currentListing.location}</dd>
                </div>
                <div>
                  <dt>Neighborhood</dt>
                  <dd>{currentListing.neighborhood}</dd>
                </div>
                <div>
                  <dt>Available from</dt>
                  <dd>{formatDate(currentListing.available_from)}</dd>
                </div>
                <div>
                  <dt>Available to</dt>
                  <dd>{formatDate(currentListing.available_to)}</dd>
                </div>
                <div>
                  <dt>Gender preference</dt>
                  <dd>{currentListing.gender_preference}</dd>
                </div>
                <div>
                  <dt>Posted</dt>
                  <dd>{formatDate(currentListing.created_at.slice(0, 10))}</dd>
                </div>
              </dl>
            </section>
            <section className="detail-card detail-card--wide reveal" style={{ '--delay': '140ms' }}>
              <h2>Photos</h2>
              <div className="detail-gallery">
                {currentListing.images.map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt={`${currentListing.title} photo ${index + 1}`} loading="lazy" />
                ))}
              </div>
            </section>
          </div>

          <section className="detail-card detail-card--wide reveal" style={{ '--delay': '200ms' }}>
            <h2>Listing notes</h2>
            <p>{currentListing.description}</p>
            <div className="detail-hero__actions">
              <a className="button button--primary" href={getContactHref(currentListing)} target="_blank" rel="noreferrer">
                Contact now
              </a>
              <button className="button button--secondary" type="button" onClick={() => navigate('submit')}>
                Submit your own listing
              </button>
              <button className="button button--ghost" type="button" onClick={() => copyToClipboard(window.location.href, 'Link copied')}>
                Copy route
              </button>
            </div>
          </section>

          {relatedListings.length ? (
            <section className="related-band reveal" style={{ '--delay': '260ms' }}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Related</p>
                  <h2>Similar listings</h2>
                </div>
                <p>Good matches near the same budget band</p>
              </div>
              <div className="listings-grid listings-grid--compact">
                {relatedListings.map((listing, index) => (
                  <ListingCard key={listing.id} listing={listing} index={index + 10} onNavigate={navigate} />
                ))}
              </div>
            </section>
          ) : null}
        </section>
      </main>
    );
  };

  const renderSubmitPage = () => (
    <main className="view view--submit">
      <section className="surface submit-page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Submission flow</p>
            <h1>Post a sublease</h1>
          </div>
          <p>{databaseConfigured ? 'Database-backed and account-gated' : 'Connect Supabase to enable accounts and publishing'}</p>
        </div>

        {loadingAuth ? (
          <section className="surface loading-surface">
            <div className="loading-hero" />
          </section>
        ) : !databaseConfigured ? (
          <section className="surface auth-panel">
            <p className="eyebrow">Setup required</p>
            <h2>Connect Supabase to enable account creation and publishing</h2>
            <p>
              Add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> in your environment, then run the SQL in{' '}
              <strong>supabase/schema.sql</strong>.
            </p>
            <p className="form-hint">
              The app still renders public listings, but secure publishing is disabled until the backend is configured.
            </p>
          </section>
        ) : !currentUser ? (
          <AuthCard
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authCode={authCode}
            setAuthCode={setAuthCode}
            authMessage={authMessage}
            authLoading={authLoading}
            codeSent={codeSent}
            onSendCode={sendCode}
            onVerifyCode={verifyCode}
          />
        ) : (
          <div className="submit-layout">
            <form className="submit-form reveal" id="submission-form" onSubmit={handleSubmit}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Signed in</p>
                  <h2>Publish as {currentUser.email}</h2>
                </div>
                <button className="button button--secondary" type="button" onClick={() => supabase?.auth.signOut()}>
                  Sign out
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Title *
                  <input name="title" type="text" required placeholder="2BR near North Campus - Summer" />
                </label>
                <label>
                  Rent / month *
                  <input name="price" type="number" min="0" step="25" required placeholder="950" />
                </label>
                <label>
                  Bedrooms *
                  <input name="bedrooms" type="number" min="0" step="1" required placeholder="2" />
                </label>
                <label>
                  Bathrooms *
                  <input name="bathrooms" type="number" min="1" step="1" required placeholder="1" />
                </label>
                <label>
                  Available from *
                  <input name="available_from" type="date" required />
                </label>
                <label>
                  Available to *
                  <input name="available_to" type="date" required />
                </label>
                <label>
                  Location *
                  <input name="location" type="text" required placeholder="Central Campus" />
                </label>
                <label>
                  Neighborhood
                  <input name="neighborhood" type="text" placeholder="South University" />
                </label>
                <label>
                  Contact type *
                  <select name="contact_type" required>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="link">Link</option>
                  </select>
                </label>
                <label>
                  Contact value *
                  <input name="contact_value" type="text" required placeholder="name@example.com" />
                </label>
                <label>
                  Gender preference
                  <select name="gender_preference">
                    <option value="No preference">No preference</option>
                    <option value="Male preferred">Male preferred</option>
                    <option value="Female preferred">Female preferred</option>
                    <option value="Open to all">Open to all</option>
                  </select>
                </label>
                <label>
                  Photos
                  <input name="images" type="text" placeholder="Image URL 1, Image URL 2" />
                </label>
              </div>
              <label className="form-grid__full">
                Description *
                <textarea
                  name="description"
                  rows="7"
                  required
                  placeholder="Include the important details: furnishings, utilities, dates, and anything unique."
                />
              </label>
              <div className="submit-form__actions">
                <button className="button button--primary" type="submit">
                  Publish to database
                </button>
                <button className="button button--secondary" type="button" onClick={() => navigate('')}>
                  Back to listings
                </button>
              </div>
              <p className="form-hint">Publishing is protected by Supabase RLS, and only authenticated users can insert rows.</p>
            </form>

            <aside className="submit-side reveal" style={{ '--stagger': '90ms' }}>
              <div className="submit-side__panel">
                <h2>What happens on submit</h2>
                <ul>
                  <li>Your listing is stored in Supabase with your user ID.</li>
                  <li>The route becomes shareable immediately after insert.</li>
                  <li>Row-level security keeps write access limited to the authenticated owner.</li>
                </ul>
              </div>
              <div className="submit-side__panel submit-side__panel--accent">
                <p className="eyebrow">Security notes</p>
                <ul>
                  <li>Use only the public anon key in the browser.</li>
                  <li>Keep the service role key on the server only, if you add one later.</li>
                  <li>Add moderation or approval later if you want to gate publication.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );

  const renderFlash = () => {
    if (!flash) return null;
    const className = flash.type === 'error' ? 'flash flash--error' : 'flash flash--success';
    return (
      <div className={className} role="status" aria-live="polite">
        {flash.message}
      </div>
    );
  };

  const renderContent = () => {
    if (loadingListings) {
      return (
        <main className="view view--loading">
          <section className="surface loading-surface">
            <div className="loading-hero" />
            <div className="loading-grid">
              <div className="loading-card" />
              <div className="loading-card" />
              <div className="loading-card" />
            </div>
          </section>
        </main>
      );
    }

    if (route.page === 'listing') return renderListingPage();
    if (route.page === 'submit') return renderSubmitPage();
    return renderHome();
  };

  return (
    <div className={`page-shell page-shell--${route.page}`}>
      <header className="nav nav--page">
        <button className="brand button button--ghost" type="button" onClick={() => navigate('')}>
          <div className="brand__mark">U</div>
          <div>
            <p>UMich Subleases</p>
            <span>Student-first housing for Ann Arbor</span>
          </div>
        </button>
        <div className="nav__actions">
          <button className="button button--secondary" type="button" onClick={() => navigate('')}>
            Browse
          </button>
          <button className="button button--secondary" type="button" onClick={() => navigate('submit')}>
            Submit
          </button>
          {currentUser ? (
            <button className="button button--secondary" type="button" onClick={() => supabase?.auth.signOut()}>
              Sign out
            </button>
          ) : null}
        </div>
      </header>
      {renderContent()}
      <footer className="footer">
        <p>Built for UMich students in Ann Arbor.</p>
        <p>Supabase powers listings and account-gated publishing.</p>
      </footer>
      {renderFlash()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
