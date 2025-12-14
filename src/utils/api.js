// src/utils/api.js
import API_BASE from './apiBase';

export async function fetchFromApi(endpoint, fallbackPath = null) {
  try {
    const res = await fetch(`${API_BASE}/api/public${endpoint}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error.message);
  }

  if (fallbackPath) {
    try {
      const res = await fetch(fallbackPath);
      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error(`Fallback fetch error for ${fallbackPath}:`, error.message);
    }
  }

  return null;
}


export async function getCountries(lang = 'es') {
  const data = await fetchFromApi(`/countries?lang=${lang}`, `/data/${lang}/countries.json`);
  return data?.countries || data || [];
}

export async function getCountryMeta(code, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/meta?lang=${lang}`, `/data/${lang}/${code}/meta.json`);
  return data;
}

export async function getDescription(code, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/description?lang=${lang}`, `/data/${lang}/${code}/description.json`);
  return data || { title: '', chapters: [] };
}

export async function getTimeline(code, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/timeline?lang=${lang}`, `/data/${lang}/${code}/timeline/timeline.index.json`);
  return data?.items || [];
}

export async function getTimelineEvent(code, eventId, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/timeline/${eventId}?lang=${lang}`, `/data/${lang}/${code}/timeline/${eventId}.json`);
  return data;
}

export async function getTestimonies(code, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/testimonies?lang=${lang}`, `/data/${lang}/${code}/testimonies.index.json`);
  return data?.items || [];
}

export async function getWitness(code, witnessId, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/testimonies/${witnessId}?lang=${lang}`, `/data/${lang}/${code}/testimonies/${witnessId}.json`);
  return data;
}

export async function getResistance(code, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/resistance?lang=${lang}`, `/data/${lang}/${code}/resistance/resistance.index.json`);
  return data?.items || [];
}

export async function getResistor(code, resistorId, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/resistance/${resistorId}?lang=${lang}`, `/data/${lang}/${code}/resistance/${resistorId}.json`);
  return data;
}

export async function getFototeca(code, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/fototeca?lang=${lang}`, `/data/${lang}/${code}/fototeca/fototeca.index.json`);
  return data?.items || [];
}

export async function getAnalysts(code, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/analysts?lang=${lang}`, `/data/${lang}/${code}/analysts.index.json`);
  return data?.items || [];
}

export async function getAnalyst(code, analystId, lang = 'es') {
  const data = await fetchFromApi(`/countries/${code}/analysts/${analystId}?lang=${lang}`, `/data/${lang}/${code}/analysts/${analystId}.json`);
  return data;
}

export async function getVelumArticles(lang = 'es') {
  const data = await fetchFromApi(`/velum?lang=${lang}`, `/data/${lang}/velum/velum.index.json`);
  return data?.items || [];
}

export async function getVelumArticle(articleId, lang = 'es') {
  const data = await fetchFromApi(`/velum/${articleId}?lang=${lang}`, `/data/${lang}/velum/${articleId}.json`);
  return data;
}

export async function getTerminology(lang = 'es') {
  const data = await fetchFromApi(`/terminology?lang=${lang}`, `/data/${lang}/terminology.json`);
  return data?.items || [];
}

export async function getTerm(termId, lang = 'es') {
  const data = await fetchFromApi(`/terminology/${termId}?lang=${lang}`);
  return data;
}

export async function getTerminologyIndex(lang = 'es') {
  const data = await fetchFromApi(`/terminology/index?lang=${lang}`, `/data/${lang}/terminology.index.json`);
  return data;
}

export async function getTerminologyByCategory(category, letter, lang = 'es') {
  const data = await fetchFromApi(`/terminology/category/${category}/${letter}?lang=${lang}`, `/data/${lang}/terminology/${category}/${letter}.json`);
  return data?.items || [];
}
