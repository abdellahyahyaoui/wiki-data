export async function loadJSON(lang = "es", countrySlug = "palestine", filename = "description.json") {
  const base = `/data/${lang}/${countrySlug}/${filename}`
  try {
    const res = await fetch(base, { cache: "no-store" })
    if (!res.ok) {
      console.log(`[v0] File not found: ${base}, trying fallback language`)
      if (lang !== "es") {
        return loadJSON("es", countrySlug, filename)
      }
      return null
    }
    const json = await res.json()
    return json
  } catch (err) {
    console.error("Error loading JSON", base, err)
    if (lang !== "es") {
      return loadJSON("es", countrySlug, filename)
    }
    return null
  }
}

// helpers para índices concretos
export const loadDescription = (lang, slug) => loadJSON(lang, slug, "description.json")
export const loadTestimoniesIndex = (lang, slug) => loadJSON(lang, slug, "testimonies.index.json")
export const loadAnalystsIndex = (lang, slug) => loadJSON(lang, slug, "analysts.index.json")
export const loadGenocidesIndex = (lang, slug) => loadJSON(lang, slug, "genocides.index.json")
export const loadTerminologyLetters = (lang, slug) => loadJSON(lang, slug, "terminology.index.json")
