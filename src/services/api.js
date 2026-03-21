export const searchAutocomplete = async (term) => {
  if (!term || term.trim().length === 0) return [];
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(term)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data; // array of string names
  } catch (error) {
    console.error("Scryfall autocomplete error:", error);
    return [];
  }
};

export const fetchCardByName = async (name) => {
  try {
    const safeName = name.replace(/"/g, '');
    const query = `lang:any "${safeName}"`;
    const searchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
    
    const res = await fetch(searchUrl);
    if (!res.ok) {
      const fuzzyRes = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
      if (fuzzyRes.ok) return await fuzzyRes.json();
      return null;
    }
    const data = await res.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error("Scryfall search error:", error);
    return null;
  }
};

export const translateText = async (text, targetLang = 'pt') => {
  if (!text) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(s => s[0]).join('');
    }
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

export const fetchCardRulings = async (rulingsUri) => {
  if (!rulingsUri) return [];
  try {
    const res = await fetch(rulingsUri);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Scryfall rulings fetch error:", error);
    return [];
  }
};
