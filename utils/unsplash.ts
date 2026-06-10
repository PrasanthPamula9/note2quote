const appJson = require('../app.json') as {
  unsplash_access_key?: string;
};
const {
  getCachedUnsplashSearch,
  saveUnsplashSearchCache,
} = require('../database/quotesDb') as typeof import('../database/quotesDb');

export type UnsplashPhoto = {
  id: string;
  description?: string | null;
  alt_description?: string | null;
  width?: number;
  height?: number;
  color?: string | null;
  blur_hash?: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
    download_location: string;
  };
};

export type UnsplashSearchOrientation = 'landscape' | 'portrait' | 'squarish';

type SearchPhotosResult = {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
};

export const UNSPLASH_CLIENT_ID = String(appJson.unsplash_access_key ?? '').trim();

const UNSPLASH_API_ROOT = 'https://api.unsplash.com';
const UNSPLASH_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const buildHeaders = () => {
  if (!UNSPLASH_CLIENT_ID) {
    throw new Error('Missing Unsplash access key.');
  }

  return {
    Authorization: `Client-ID ${UNSPLASH_CLIENT_ID}`,
    'Accept-Version': 'v1',
  };
};

const toQueryString = (params: Record<string, string | number | undefined>) => {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
};

export const getUnsplashPhotoSourceUrl = (photo: UnsplashPhoto, width = 1600) => {
  const separator = photo.urls.raw.includes('?') ? '&' : '?';
  return `${photo.urls.raw}${separator}w=${Math.max(320, Math.round(width))}&fit=max&q=85&fm=jpg`;
};

export const searchUnsplashPhotos = async ({
  query,
  orientation,
}: {
  query: string;
  orientation?: UnsplashSearchOrientation;
}): Promise<SearchPhotosResult> => {
  const searchText = query.trim() || 'background';
  const cacheKey = `${searchText.toLowerCase()}::${orientation || 'any'}`;
  const cached = await getCachedUnsplashSearch(cacheKey, UNSPLASH_CACHE_TTL_MS);

  if (cached?.isFresh && Array.isArray(cached.photos) && cached.photos.length > 0) {
    return {
      results: cached.photos.slice(0, 30),
      total: cached.photos.length,
      total_pages: 1,
    };
  }

  const queryString = toQueryString({
    query: searchText,
    page: 1,
    per_page: 30,
    orientation,
  });

  const response = await fetch(`${UNSPLASH_API_ROOT}/search/photos?${queryString}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    if (cached?.photos?.length) {
      return {
        results: cached.photos.slice(0, 30),
        total: cached.photos.length,
        total_pages: 1,
      };
    }
    throw new Error(body || `Unsplash search failed with status ${response.status}`);
  }

  const payload = (await response.json()) as SearchPhotosResult;
  const results = Array.isArray(payload.results) ? payload.results.slice(0, 30) : [];
  await saveUnsplashSearchCache({
    cacheKey,
    searchQuery: searchText,
    orientation: orientation || null,
    photos: results,
  });

  return {
    ...payload,
    results,
    total: typeof payload.total === 'number' ? payload.total : results.length,
    total_pages: 1,
  };
};

export const trackUnsplashDownload = async (downloadLocation: string) => {
  const response = await fetch(downloadLocation, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Unsplash download tracking failed with status ${response.status}`);
  }

  return response.json().catch(() => null);
};
