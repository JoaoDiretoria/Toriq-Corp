interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distanceKm: number;
  distanceText: string;
}

// Chaves para localStorage
const GEOCODE_CACHE_KEY = 'vertical_sst_geocode_cache';
const DISTANCE_CACHE_KEY = 'vertical_sst_distance_cache';
const CACHE_VERSION = 'v1';
const CACHE_EXPIRY_DAYS = 30; // Cache válido por 30 dias

// Interface para cache com timestamp
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Função para verificar se o cache expirou
function isCacheExpired(timestamp: number): boolean {
  const now = Date.now();
  const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return (now - timestamp) > expiryMs;
}

// Função para carregar cache do localStorage
function loadCacheFromStorage<T>(key: string): Map<string, T> {
  try {
    const stored = localStorage.getItem(`${key}_${CACHE_VERSION}`);
    if (stored) {
      const parsed: Record<string, CacheEntry<T>> = JSON.parse(stored);
      const map = new Map<string, T>();
      
      // Filtrar entradas expiradas
      Object.entries(parsed).forEach(([k, entry]) => {
        if (!isCacheExpired(entry.timestamp)) {
          map.set(k, entry.data);
        }
      });
      
      return map;
    }
  } catch (error) {
    console.warn('[Cache] Erro ao carregar cache do localStorage:', error);
  }
  return new Map();
}

// Função para salvar cache no localStorage
function saveCacheToStorage<T>(key: string, cache: Map<string, T>): void {
  try {
    const obj: Record<string, CacheEntry<T>> = {};
    cache.forEach((value, k) => {
      obj[k] = { data: value, timestamp: Date.now() };
    });
    localStorage.setItem(`${key}_${CACHE_VERSION}`, JSON.stringify(obj));
  } catch (error) {
    console.warn('[Cache] Erro ao salvar cache no localStorage:', error);
    // Se localStorage estiver cheio, limpar caches antigos
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCaches();
    }
  }
}

// Função para limpar caches antigos
function clearOldCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vertical_sst_') && !key.includes(CACHE_VERSION)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('[Cache] Erro ao limpar caches antigos:', error);
  }
}

// Cache para coordenadas de cidades (carregado do localStorage)
let geocodeCache: Map<string, Coordinates> = loadCacheFromStorage<Coordinates>(GEOCODE_CACHE_KEY);

// Cache para distâncias calculadas (carregado do localStorage)
let distanceCache: Map<string, number> = loadCacheFromStorage<number>(DISTANCE_CACHE_KEY);

// Função para salvar geocode cache
function saveGeocodeCache(): void {
  saveCacheToStorage(GEOCODE_CACHE_KEY, geocodeCache);
}

// Função para salvar distance cache
function saveDistanceCache(): void {
  saveCacheToStorage(DISTANCE_CACHE_KEY, distanceCache);
}

// Exportar função para limpar cache manualmente se necessário
export function clearDistanceCache(): void {
  geocodeCache = new Map();
  distanceCache = new Map();
  localStorage.removeItem(`${GEOCODE_CACHE_KEY}_${CACHE_VERSION}`);
  localStorage.removeItem(`${DISTANCE_CACHE_KEY}_${CACHE_VERSION}`);
  console.log('[Cache] Cache de distâncias limpo');
}

// Exportar função para obter estatísticas do cache
export function getCacheStats(): { geocodeEntries: number; distanceEntries: number } {
  return {
    geocodeEntries: geocodeCache.size,
    distanceEntries: distanceCache.size
  };
}

// Função para obter coordenadas usando Nominatim (OpenStreetMap) - gratuito e sem API key
async function getCoordinates(city: string, state: string): Promise<Coordinates | null> {
  const cacheKey = `${city}, ${state}, Brasil`.toLowerCase();
  
  // Verificar cache
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // Usar Nominatim (OpenStreetMap) - gratuito
    const query = encodeURIComponent(`${city}, ${state}, Brazil`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VerticalSST/1.0'
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`[Geocode] Erro HTTP: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords: Coordinates = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      geocodeCache.set(cacheKey, coords);
      saveGeocodeCache(); // Persistir no localStorage
      return coords;
    } else {
      return null;
    }
  } catch (error) {
    console.error('[Geocode] Erro ao obter coordenadas:', error);
    return null;
  }
}

// Fórmula de Haversine para calcular distância entre dois pontos geográficos
// Retorna distância em linha reta (geodésica)
function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Raio da Terra em km
  
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const straightLineDistance = R * c; // Distância em linha reta
  
  // Fator de correção para aproximar distância por estrada
  // Estudos mostram que a distância por estrada é tipicamente 1.2x a 1.4x a linha reta
  // Usamos 1.3 como fator médio para o Brasil (considerando terreno e malha viária)
  const ROAD_DISTANCE_FACTOR = 1.3;
  
  return straightLineDistance * ROAD_DISTANCE_FACTOR;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Função para calcular distância entre duas cidades
export async function calculateDistance(
  originCity: string,
  originState: string,
  destinationCity: string,
  destinationState: string
): Promise<DistanceResult | null> {
  const cacheKey = `${originCity},${originState}|${destinationCity},${destinationState}`.toLowerCase();
  
  // Verificar cache de distância
  if (distanceCache.has(cacheKey)) {
    const km = distanceCache.get(cacheKey)!;
    return {
      distanceKm: km,
      distanceText: formatDistance(km)
    };
  }

  try {
    const [originCoords, destCoords] = await Promise.all([
      getCoordinates(originCity, originState),
      getCoordinates(destinationCity, destinationState)
    ]);

    if (!originCoords || !destCoords) {
      return null;
    }

    const distanceKm = haversineDistance(originCoords, destCoords);
    
    // Salvar no cache (memória e localStorage)
    distanceCache.set(cacheKey, distanceKm);
    saveDistanceCache();

    return {
      distanceKm,
      distanceText: formatDistance(distanceKm)
    };
  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    return null;
  }
}

// Callback type para progresso
export type DistanceProgressCallback = (instructorId: string, result: DistanceResult) => void;

// Função para calcular distâncias de múltiplos instrutores para um destino
// Versão otimizada com cache e callback progressivo
export async function calculateDistancesFromInstructors(
  instructors: Array<{ id: string; nome?: string; cidade: string | null; uf: string | null }>,
  destinationCity: string,
  destinationState: string,
  onProgress?: DistanceProgressCallback
): Promise<Map<string, DistanceResult>> {
  const results = new Map<string, DistanceResult>();
  
  // Filtrar instrutores que têm cidade e UF
  const validInstructors = instructors.filter(i => i.cidade && i.uf);
  
  if (validInstructors.length === 0) {
    return results;
  }
  
  // Primeiro, verificar quais já estão em cache
  const instructorsToFetch: typeof validInstructors = [];
  
  for (const instructor of validInstructors) {
    const cacheKey = `${instructor.cidade},${instructor.uf}|${destinationCity},${destinationState}`.toLowerCase();
    
    if (distanceCache.has(cacheKey)) {
      const km = distanceCache.get(cacheKey)!;
      const result: DistanceResult = {
        distanceKm: km,
        distanceText: formatDistance(km)
      };
      results.set(instructor.id, result);
      
      // Notificar progresso imediatamente para itens em cache
      if (onProgress) {
        onProgress(instructor.id, result);
      }
    } else {
      instructorsToFetch.push(instructor);
    }
  }
  
  // Se todos estavam em cache, retornar
  if (instructorsToFetch.length === 0) {
    return results;
  }
  
  // Obter coordenadas do destino
  const destCoords = await getCoordinates(destinationCity, destinationState);
  if (!destCoords) {
    return results;
  }

  // Processar instrutores restantes sequencialmente para evitar rate limiting
  // e permitir exibição progressiva
  for (const instructor of instructorsToFetch) {
    try {
      const originCoords = await getCoordinates(instructor.cidade!, instructor.uf!);
      
      if (originCoords) {
        const distanceKm = haversineDistance(originCoords, destCoords);
        const result: DistanceResult = {
          distanceKm,
          distanceText: formatDistance(distanceKm)
        };
        
        // Salvar no cache
        const cacheKey = `${instructor.cidade},${instructor.uf}|${destinationCity},${destinationState}`.toLowerCase();
        distanceCache.set(cacheKey, distanceKm);
        
        results.set(instructor.id, result);
        
        // Notificar progresso
        if (onProgress) {
          onProgress(instructor.id, result);
        }
      }
      
      // Pequeno delay para evitar rate limiting do Nominatim (1 req/sec)
      if (instructorsToFetch.indexOf(instructor) < instructorsToFetch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`[Distance] Erro ao calcular distância para ${instructor.nome}:`, error);
    }
  }
  
  // Salvar cache no localStorage após processar todos
  saveDistanceCache();
  
  return results;
}

// Função para formatar distância em km
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}
