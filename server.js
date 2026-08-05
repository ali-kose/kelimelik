import { FALLBACK_DICTIONARY, toTurkishUpper } from '../data/turkishDictionary';

// In-memory cache for TDK responses
const tdkCache = new Map();

/**
 * TDK sorgusunu kendi server'ımız üzerinden yapar.
 * Böylece tarayıcı CORS problemi yaşamaz.
 */
async function fetchFromTdkProxy(word) {
  const hostname = window.location.hostname || 'localhost';

  // Electron / Render / lokal kullanım için
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const port = window.location.port === '3001' ? ':3001' : '';

  const url = `${protocol}//${hostname}${port}/tdk-proxy?word=${encodeURIComponent(word)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TDK proxy HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch definition of a word from TDK API.
 */
export async function fetchWordMeaning(rawWord) {
  if (!rawWord || typeof rawWord !== 'string') {
    return {
      word: '',
      isValid: false,
      meanings: ['Geçersiz kelime']
    };
  }

  const cleanWordUpper = toTurkishUpper(rawWord.trim());
  const cleanWordLower = cleanWordUpper.toLocaleLowerCase('tr-TR');

  if (tdkCache.has(cleanWordUpper)) {
    return tdkCache.get(cleanWordUpper);
  }

  try {
    // TDK'ya doğrudan değil, kendi server'ımız üzerinden bağlan
    const data = await fetchFromTdkProxy(cleanWordLower);

    // TDK geçerli kelime döndürdüyse
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      data[0].madde
    ) {
      const item = data[0];
      const meanings = [];
      let wordType = 'isim';

      if (
        item.anlamlarListe &&
        Array.isArray(item.anlamlarListe)
      ) {
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

    // TDK "Sonuç bulunamadı" döndürdüyse
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

  } catch (err) {
    console.warn(
      `TDK proxy erişilemedi: '${cleanWordUpper}'. Yerel sözlük kontrol ediliyor.`,
      err
    );
  }

  // TDK'ya ulaşılamazsa yerel sözlüğü kullan
  if (FALLBACK_DICTIONARY[cleanWordUpper]) {
    const result = {
      word: cleanWordUpper,
      isValid: true,
      meanings: [FALLBACK_DICTIONARY[cleanWordUpper]],
      type:
        cleanWordUpper.endsWith('MAK') ||
        cleanWordUpper.endsWith('MEK')
          ? 'fiil'
          : 'isim',
      source: 'Yerel'
    };

    tdkCache.set(cleanWordUpper, result);
    return result;
  }

  // Kelime bulunamadı
  const invalidResult = {
    word: cleanWordUpper,
    isValid: false,
    meanings: [
      `"${cleanWordUpper}" kelimesi TDK sözlüğünde yer almamaktadır.`
    ],
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