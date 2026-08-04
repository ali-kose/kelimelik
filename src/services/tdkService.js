import { FALLBACK_DICTIONARY, toTurkishUpper } from '../data/turkishDictionary';

// In-memory cache for TDK responses
const tdkCache = new Map();

/**
 * Fetch definition of a word from TDK API with strict validation.
 * @param {string} rawWord - Word to search
 * @returns {Promise<{ word: string, isValid: boolean, meanings: string[], type?: string, source: 'TDK' | 'Yerel' }>}
 */
export async function fetchWordMeaning(rawWord) {
  if (!rawWord || typeof rawWord !== 'string') {
    return { word: '', isValid: false, meanings: ['Geçersiz kelime'] };
  }

  const cleanWordUpper = toTurkishUpper(rawWord.trim());
  const cleanWordLower = cleanWordUpper.toLocaleLowerCase('tr-TR');

  if (tdkCache.has(cleanWordUpper)) {
    return tdkCache.get(cleanWordUpper);
  }

  try {
    // Attempt fetching directly from official TDK API (sozluk.gov.tr)
    const response = await fetch(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(cleanWordLower)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Check if TDK returned a valid entry (not an error response)
      if (Array.isArray(data) && data.length > 0 && data[0].madde) {
        const item = data[0];
        const meanings = [];
        let wordType = 'isim';

        if (item.anlamlarListe && Array.isArray(item.anlamlarListe)) {
          item.anlamlarListe.forEach(anlamObj => {
            if (anlamObj.anlam) {
              meanings.push(anlamObj.anlam.trim());
            }
            if (anlamObj.fiil === '1') {
              wordType = 'fiil';
            }
          });
        }

        if (meanings.length === 0) {
          meanings.push('TDK sözlüğünde kayıtlı kelime.');
        }

        const result = {
          word: cleanWordUpper,
          isValid: true,
          meanings,
          type: wordType,
          source: 'TDK'
        };

        tdkCache.set(cleanWordUpper, result);
        return result;
      }
      
      // If TDK explicitly returns error object like { error: "Sonuç bulunamadı" }
      if (data && data.error) {
        const invalidResult = {
          word: cleanWordUpper,
          isValid: false,
          meanings: ['Bu kelime TDK sözlüğünde bulunamadı.'],
          type: 'geçersiz',
          source: 'TDK'
        };
        tdkCache.set(cleanWordUpper, invalidResult);
        return invalidResult;
      }
    }
  } catch (err) {
    console.warn(`TDK API direct fetch unreachable for '${cleanWordUpper}', checking fallback dictionary.`, err);
  }

  // Check embedded local dictionary as fallback when TDK API is unreachable or CORS blocked
  if (FALLBACK_DICTIONARY[cleanWordUpper]) {
    const result = {
      word: cleanWordUpper,
      isValid: true,
      meanings: [FALLBACK_DICTIONARY[cleanWordUpper]],
      type: cleanWordUpper.endsWith('MAK') || cleanWordUpper.endsWith('MEK') ? 'fiil' : 'isim',
      source: 'Yerel'
    };
    tdkCache.set(cleanWordUpper, result);
    return result;
  }

  // Strict Rejection: Word is NOT found in TDK API and NOT in local dictionary
  const invalidResult = {
    word: cleanWordUpper,
    isValid: false,
    meanings: [`"${cleanWordUpper}" kelimesi TDK sözlüğünde yer almamaktadır.`],
    type: 'geçersiz',
    source: 'TDK'
  };

  tdkCache.set(cleanWordUpper, invalidResult);
  return invalidResult;
}

/**
 * Validate word against TDK / Local Dictionary
 */
export async function validateWord(word) {
  const result = await fetchWordMeaning(word);
  return result.isValid;
}
