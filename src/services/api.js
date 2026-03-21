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
    const res = await fetch(`https://api.scryfall.com/cards/search?q=+"${encodeURIComponent(safeName)}"`);
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
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
    if (!res.ok) return text; // fallback to original if API fails
    const data = await res.json();
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};
