/**
 * Catalogo de Google Fonts para el picker del builder.
 *
 * Con GOOGLE_FONTS_API_KEY devuelve el catalogo completo (ordenado por
 * popularidad). Sin la key, cae a una lista curada de respaldo para que el
 * picker siga funcionando. La respuesta se cachea 24h (revalidate).
 */

// Revalida el catalogo una vez al dia (config de segmento de ruta).
export const revalidate = 86400;

export type FontEntry = { family: string; category: string };

/** Respaldo amplio cuando no hay API key (fuentes populares de Google Fonts). */
const FALLBACK_FONTS: FontEntry[] = [
  // --- Sans-serif ---
  { family: "Inter", category: "sans-serif" },
  { family: "Roboto", category: "sans-serif" },
  { family: "Open Sans", category: "sans-serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "Lato", category: "sans-serif" },
  { family: "Work Sans", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Nunito Sans", category: "sans-serif" },
  { family: "Raleway", category: "sans-serif" },
  { family: "Space Grotesk", category: "sans-serif" },
  { family: "Sora", category: "sans-serif" },
  { family: "DM Sans", category: "sans-serif" },
  { family: "Manrope", category: "sans-serif" },
  { family: "Archivo", category: "sans-serif" },
  { family: "Rubik", category: "sans-serif" },
  { family: "Mulish", category: "sans-serif" },
  { family: "Karla", category: "sans-serif" },
  { family: "Oswald", category: "sans-serif" },
  { family: "Barlow", category: "sans-serif" },
  { family: "Barlow Condensed", category: "sans-serif" },
  { family: "Kanit", category: "sans-serif" },
  { family: "Josefin Sans", category: "sans-serif" },
  { family: "Quicksand", category: "sans-serif" },
  { family: "Cabin", category: "sans-serif" },
  { family: "Hind", category: "sans-serif" },
  { family: "PT Sans", category: "sans-serif" },
  { family: "Source Sans 3", category: "sans-serif" },
  { family: "Fira Sans", category: "sans-serif" },
  { family: "Titillium Web", category: "sans-serif" },
  { family: "Heebo", category: "sans-serif" },
  { family: "Assistant", category: "sans-serif" },
  { family: "Signika", category: "sans-serif" },
  { family: "Public Sans", category: "sans-serif" },
  { family: "Red Hat Display", category: "sans-serif" },
  { family: "Red Hat Text", category: "sans-serif" },
  { family: "Plus Jakarta Sans", category: "sans-serif" },
  { family: "Figtree", category: "sans-serif" },
  { family: "Onest", category: "sans-serif" },
  { family: "Outfit", category: "sans-serif" },
  { family: "Lexend", category: "sans-serif" },
  { family: "Albert Sans", category: "sans-serif" },
  { family: "Be Vietnam Pro", category: "sans-serif" },
  { family: "Epilogue", category: "sans-serif" },
  { family: "Urbanist", category: "sans-serif" },
  { family: "Hanken Grotesk", category: "sans-serif" },
  { family: "Bricolage Grotesque", category: "sans-serif" },
  { family: "Instrument Sans", category: "sans-serif" },
  { family: "Schibsted Grotesk", category: "sans-serif" },
  { family: "Jost", category: "sans-serif" },
  { family: "Sen", category: "sans-serif" },
  { family: "Chivo", category: "sans-serif" },
  { family: "Overpass", category: "sans-serif" },
  { family: "Saira", category: "sans-serif" },
  { family: "Saira Condensed", category: "sans-serif" },
  { family: "Prompt", category: "sans-serif" },
  { family: "Exo 2", category: "sans-serif" },
  { family: "Dosis", category: "sans-serif" },
  { family: "Comfortaa", category: "sans-serif" },
  { family: "League Spartan", category: "sans-serif" },
  { family: "Teko", category: "sans-serif" },
  { family: "Antonio", category: "sans-serif" },
  { family: "PT Sans Narrow", category: "sans-serif" },
  { family: "IBM Plex Sans", category: "sans-serif" },
  { family: "Noto Sans", category: "sans-serif" },
  { family: "Mukta", category: "sans-serif" },
  { family: "Maven Pro", category: "sans-serif" },
  { family: "Rajdhani", category: "sans-serif" },
  // --- Serif ---
  { family: "Playfair Display", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "Merriweather", category: "serif" },
  { family: "Fraunces", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "Cormorant", category: "serif" },
  { family: "EB Garamond", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "Source Serif 4", category: "serif" },
  { family: "PT Serif", category: "serif" },
  { family: "Noto Serif", category: "serif" },
  { family: "Bitter", category: "serif" },
  { family: "Crimson Text", category: "serif" },
  { family: "Crimson Pro", category: "serif" },
  { family: "Domine", category: "serif" },
  { family: "Zilla Slab", category: "serif" },
  { family: "Roboto Slab", category: "serif" },
  { family: "Slabo 27px", category: "serif" },
  { family: "Spectral", category: "serif" },
  { family: "Frank Ruhl Libre", category: "serif" },
  { family: "DM Serif Display", category: "serif" },
  { family: "DM Serif Text", category: "serif" },
  { family: "Cardo", category: "serif" },
  { family: "Vollkorn", category: "serif" },
  { family: "Alegreya", category: "serif" },
  { family: "Bodoni Moda", category: "serif" },
  { family: "Marcellus", category: "serif" },
  { family: "Prata", category: "serif" },
  { family: "Newsreader", category: "serif" },
  { family: "Instrument Serif", category: "serif" },
  { family: "Gilda Display", category: "serif" },
  { family: "Italiana", category: "serif" },
  { family: "Josefin Slab", category: "serif" },
  { family: "Libre Caslon Text", category: "serif" },
  { family: "IBM Plex Serif", category: "serif" },
  // --- Display ---
  { family: "Anton", category: "display" },
  { family: "Bebas Neue", category: "display" },
  { family: "Archivo Black", category: "display" },
  { family: "Abril Fatface", category: "display" },
  { family: "Righteous", category: "display" },
  { family: "Lobster", category: "display" },
  { family: "Fredoka", category: "display" },
  { family: "Baloo 2", category: "display" },
  { family: "Alfa Slab One", category: "display" },
  { family: "Staatliches", category: "display" },
  { family: "Bungee", category: "display" },
  { family: "Titan One", category: "display" },
  { family: "Lilita One", category: "display" },
  { family: "Bangers", category: "display" },
  { family: "Fjalla One", category: "display" },
  { family: "Passion One", category: "display" },
  { family: "Concert One", category: "display" },
  { family: "Monoton", category: "display" },
  { family: "Orbitron", category: "display" },
  { family: "Michroma", category: "display" },
  // --- Handwriting / script ---
  { family: "Caveat", category: "handwriting" },
  { family: "Pacifico", category: "handwriting" },
  { family: "Dancing Script", category: "handwriting" },
  { family: "Great Vibes", category: "handwriting" },
  { family: "Satisfy", category: "handwriting" },
  { family: "Sacramento", category: "handwriting" },
  { family: "Shadows Into Light", category: "handwriting" },
  { family: "Kalam", category: "handwriting" },
  { family: "Permanent Marker", category: "handwriting" },
  { family: "Amatic SC", category: "handwriting" },
  { family: "Indie Flower", category: "handwriting" },
  { family: "Courgette", category: "handwriting" },
  { family: "Patrick Hand", category: "handwriting" },
  { family: "Gloria Hallelujah", category: "handwriting" },
  { family: "Cookie", category: "handwriting" },
  { family: "Yellowtail", category: "handwriting" },
  // --- Monospace ---
  { family: "Space Mono", category: "monospace" },
  { family: "JetBrains Mono", category: "monospace" },
  { family: "IBM Plex Mono", category: "monospace" },
  { family: "Roboto Mono", category: "monospace" },
  { family: "Fira Code", category: "monospace" },
  { family: "Source Code Pro", category: "monospace" },
  { family: "Inconsolata", category: "monospace" },
  { family: "Ubuntu Mono", category: "monospace" },
  { family: "DM Mono", category: "monospace" },
  { family: "Overpass Mono", category: "monospace" },
  { family: "Red Hat Mono", category: "monospace" },
  { family: "Martian Mono", category: "monospace" },
];

type GoogleFontsResponse = {
  items?: { family: string; category: string }[];
};

export async function GET() {
  const key = process.env.GOOGLE_FONTS_API_KEY;
  if (!key) {
    return Response.json({ source: "fallback", fonts: FALLBACK_FONTS });
  }

  try {
    const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${key}&sort=popularity`;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) {
      return Response.json({ source: "fallback", fonts: FALLBACK_FONTS });
    }
    const data = (await res.json()) as GoogleFontsResponse;
    const fonts: FontEntry[] = (data.items ?? []).map((item) => ({
      family: item.family,
      category: item.category,
    }));
    return Response.json({ source: "google", fonts });
  } catch {
    return Response.json({ source: "fallback", fonts: FALLBACK_FONTS });
  }
}
