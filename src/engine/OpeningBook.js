/**
 * Comprehensive Chess Opening Book & ECO Classifier
 * Identifies standard theoretical opening lines, ECO codes, and variations
 * matching Chess.com's Book Move (📖) detection.
 */

export const OPENINGS_DATABASE = [
  // --- 1. e4 e5 (Open Game) ---
  { eco: 'C50', name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], desc: 'Salah satu pembukaan tertua dan paling dihormati dalam catur, berfokus pada perkembangan cepat dan tekanan pada petak f7.' },
  { eco: 'C53', name: 'Italian Game: Giuoco Piano', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3'], desc: 'Giuoco Piano ("Permainan Tenang") bertujuan membangun pusat pion yang kuat dengan c3 dan d4.' },
  { eco: 'C54', name: 'Italian Game: Giuoco Pianissimo', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'], desc: 'Pendekatan modern yang sangat solid dan fleksibel, sering dimainkan di level Kejuaraan Dunia.' },
  { eco: 'C51', name: 'Italian Game: Evans Gambit', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'], desc: 'Gambit agresif yang mengorbankan pion sayap untuk tempo dan dominasi petak pusat.' },
  { eco: 'C55', name: 'Italian Game: Two Knights Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], desc: 'Tanggapan dinamis Hitam yang langsung menyerang pion e4 Putih.' },
  { eco: 'C57', name: 'Two Knights Defense: Fried Liver Attack', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'], desc: 'Serangan taktis spektakuler dengan pengorbanan kuda di f7 untuk membongkar raja Hitam.' },
  
  // Ruy Lopez (Spanish Opening)
  { eco: 'C60', name: 'Ruy Lopez (Pembukaan Spanyol)', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], desc: 'Pembukaan klasik paling prestisius, menekan kuda c6 pembela pion pusat e5.' },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'], desc: '"The Berlin Wall", benteng kokoh yang dipopulerkan Vladimir Kramnik saat mengalahkan Garry Kasparov.' },
  { eco: 'C70', name: 'Ruy Lopez: Morphy Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], desc: 'Langkah paling populer Hitam untuk langsung menguji niat gajah putih.' },
  { eco: 'C78', name: 'Ruy Lopez: Closed Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'], desc: 'Pertahanan klasik dengan manuver mendalam dan pertarungan posisional jangka panjang.' },
  { eco: 'C89', name: 'Ruy Lopez: Marshall Attack', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'c3', 'd5'], desc: 'Serangan balik tajam Frank Marshall dengan pengorbanan pion untuk inisiatif mematikan di sayap raja.' },

  // Scotch, Petrov, Philidor, Vienna, King's Gambit
  { eco: 'C45', name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], desc: 'Langsung membuka pusat papan pada langkah ke-3 untuk permainan terbuka dan aktif.' },
  { eco: 'C42', name: 'Petrov Defense (Pertahanan Rusia)', moves: ['e4', 'e5', 'Nf3', 'Nf6'], desc: 'Pendekatan simetris yang sangat ulet dan sulit ditembus.' },
  { eco: 'C41', name: 'Philidor Defense', moves: ['e4', 'e5', 'Nf3', 'd6'], desc: 'Pertahanan solid dengan memperkokoh pion e5, meskipun membatasi gerak gajah hitam c8.' },
  { eco: 'C25', name: 'Vienna Game', moves: ['e4', 'e5', 'Nc3'], desc: 'Pendekatan tenang namun fleksibel yang menyimpan opsi f4 di langkah berikutnya.' },
  { eco: 'C30', name: "King's Gambit", moves: ['e4', 'e5', 'f4'], desc: 'Gambit era Romantik yang berani mengorbankan pion sayap raja demi jalur terbuka dan serangan cepat.' },
  { eco: 'C47', name: 'Four Knights Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'], desc: 'Struktur harmonis dengan keempat kuda dikembangkan pada empat langkah awal.' },

  // --- 1. e4 c5 (Sicilian Defense) ---
  { eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'], desc: 'Respons paling populer dan tajam melawan 1.e4, memperjuangkan kendali petak d4 dari sayap.' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], desc: 'Variasi legendaris favorit Bobby Fischer dan Garry Kasparov, menawarkan pertempuran taktis tingkat tinggi.' },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'], desc: 'Variasi Naga dengan fianchetto gajah di g7 seperti napas api naga mengincar sayap menteri.' },
  { eco: 'B80', name: 'Sicilian Defense: Scheveningen Variation', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6'], desc: 'Struktur "pion kecil" e6/d6 yang fleksibel dan mengendalikan petak-petak penting pusat.' },
  { eco: 'B33', name: 'Sicilian Defense: Sveshnikov Variation', moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5'], desc: 'Langkah agresif e5 yang menerima kelemahan petak d5 demi aktivitas perwira yang luar biasa.' },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', moves: ['e4', 'c5', 'c3'], desc: 'Persiapan c3 untuk membangun pusat pion penuh d4 tanpa mengorbankan tempo.' },
  { eco: 'B23', name: 'Sicilian Defense: Closed Variation', moves: ['e4', 'c5', 'Nc3'], desc: 'Pendekatan posisional tanpa membuka jalur d lebih awal, sering dilanjutkan dengan g3 dan Bg2.' },

  // --- 1. e4 e6 (French Defense) ---
  { eco: 'C00', name: 'French Defense', moves: ['e4', 'e6'], desc: 'Pertahanan kuat dengan struktur rantai pion kokoh di sayap raja dan serangan balik di sayap menteri.' },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: ['e4', 'e6', 'd4', 'd5', 'e5'], desc: 'Putih segera merebut ruang di sayap raja dan menutup pusat papan.' },
  { eco: 'C10', name: 'French Defense: Paulsen / Classical', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'], desc: 'Pertarungan langsung antara kekuatan sayap dan tekanan di pusat.' },
  { eco: 'C15', name: 'French Defense: Winawer Variation', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'], desc: 'Memin pin kuda Putih dan menciptakan ketidakseimbangan struktural yang kompleks.' },

  // --- 1. e4 c6 (Caro-Kann Defense) ---
  { eco: 'B10', name: 'Caro-Kann Defense', moves: ['e4', 'c6'], desc: 'Pertahanan solid dengan persiapan d5 tanpa mengurung gajah terang c8.' },
  { eco: 'B12', name: 'Caro-Kann: Advance Variation', moves: ['e4', 'c6', 'd4', 'd5', 'e5'], desc: 'Garis modern paling kritis melawan Caro-Kann, mengunci ruang di pusat.' },
  { eco: 'B18', name: 'Caro-Kann: Classical Variation', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'], desc: 'Hitam mengembangkan gajah aktif sebelum menutup rantai pion dengan e6.' },

  // --- Other 1. e4 Responses ---
  { eco: 'B01', name: 'Scandinavian Defense', moves: ['e4', 'd5'], desc: 'Langsung menantang pion e4 Putih pada langkah pertama.' },
  { eco: 'B02', name: "Alekhine's Defense", moves: ['e4', 'Nf6'], desc: 'Memancing pion Putih maju ke depan untuk kemudian dijadikan target serangan balik.' },
  { eco: 'B07', name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'], desc: 'Pertahanan hipermodern yang membiarkan Putih membangun pusat lebar untuk diruntuhkan nanti.' },

  // --- 1. d4 d5 (Closed Games) ---
  { eco: 'D06', name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'], desc: 'Tawaran pion c4 untuk mengalihkan pion pusat d5 Hitam dan merebut kendali e4.' },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: ['d4', 'd5', 'c4', 'dxc4'], desc: 'Hitam menerima pion gambit dengan rencana mengembalikan pion demi perkembangan perwira lancar.' },
  { eco: 'D30', name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e6'], desc: 'Pilihan paling kokoh Hitam untuk mempertahankan benteng d5.' },
  { eco: 'D10', name: 'Slav Defense', moves: ['d4', 'd5', 'c4', 'c6'], desc: 'Mempertahankan d5 dengan pion c6 tanpa menutup jalur gerak gajah terang c8.' },
  { eco: 'D43', name: 'Semi-Slav Defense', moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6'], desc: 'Kombinasi kekuatan Slav dan Queen\'s Gambit Declined dengan potensi komplikasi taktis tajam.' },
  { eco: 'D00', name: 'London System', moves: ['d4', 'd5', 'Bf4'], desc: 'Sistem pembukaan universal yang sangat solid, harmonis, dan mudah dipelajari.' },
  { eco: 'D02', name: 'London System (Classical)', moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3'], desc: 'Formasi piramida pion klasik yang memberikan keamanan raja maksimal bagi Putih.' },

  // --- 1. d4 Nf6 (Indian Defenses) ---
  { eco: 'E60', name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'], desc: 'Pertahanan dinamis favorit Kasparov dan Fischer, menyiapkan serangan badai di sayap raja.' },
  { eco: 'E97', name: "King's Indian: Mar del Plata Variation", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'], desc: 'Pertarungan hidup-mati legendaris: Putih menyerang di sayap menteri, Hitam menyerang raja Putih!' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], desc: 'Karya agung Aron Nimzowitsch, memin kuda c3 untuk mengontrol petak e4 tanpa mengorbankan tempo.' },
  { eco: 'E00', name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'], desc: 'Kombinasi elegan Queen\'s Gambit dan gajah fianchetto g7 yang memancarkan kekuatan di diagonal panjang.' },
  { eco: 'D70', name: 'Grünfeld Defense', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'], desc: 'Hitam membiarkan Putih menguasai pusat lebar untuk langsung dihancurkan dengan c5 dan Bg7.' },
  { eco: 'A56', name: 'Benoni Defense', moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6'], desc: 'Struktur asimetris tajam yang menghasilkan mayoritas pion sayap menteri bagi Hitam.' },
  { eco: 'A80', name: 'Dutch Defense', moves: ['d4', 'f5'], desc: 'Pendekatan asimetris langsung memperebutkan kendali petak e4 dari sayap raja.' },

  // --- Flank Openings (1. c4, 1. Nf3, dll) ---
  { eco: 'A10', name: 'English Opening', moves: ['c4'], desc: 'Mengontrol petak d5 dari sayap dan sering bertransformasi ke berbagai struktur dinamis.' },
  { eco: 'A04', name: 'Réti Opening', moves: ['Nf3'], desc: 'Pembukaan hipermodern fleksibel yang mengendalikan pusat dengan perwira sebelum memajukan pion.' },
  { eco: 'A02', name: "Bird's Opening", moves: ['f4'], desc: 'Langkah awal unik yang menguasai e5 dan mirip pertahanan Dutch dengan warna terbalik.' }
];

/**
 * Identify the opening from a SAN move list
 * @param {Array<string>} sanMoves - e.g. ['e4', 'c5', 'Nf3', 'd6']
 * @returns {Object} Best matched opening or default
 */
export function identifyOpening(sanMoves) {
  if (!sanMoves || sanMoves.length === 0) {
    return {
      eco: 'A00',
      name: 'Pembukaan Standar',
      desc: 'Langkah awal permainan.',
      matchedLength: 0,
    };
  }

  let bestMatch = null;
  let maxMatched = 0;

  for (const op of OPENINGS_DATABASE) {
    let match = true;
    for (let i = 0; i < op.moves.length; i++) {
      if (i >= sanMoves.length || sanMoves[i] !== op.moves[i]) {
        match = false;
        break;
      }
    }

    if (match && op.moves.length > maxMatched) {
      maxMatched = op.moves.length;
      bestMatch = op;
    }
  }

  if (bestMatch) {
    return {
      eco: bestMatch.eco,
      name: bestMatch.name,
      desc: bestMatch.desc,
      matchedLength: maxMatched,
    };
  }

  // Base opening if moves diverged after move 1
  if (sanMoves[0] === 'e4') {
    return {
      eco: 'B00',
      name: "King's Pawn Opening",
      desc: 'Pembukaan pion raja 1. e4 mengontrol petak pusat d5 dan f5 serta membuka jalur menteri dan gajah.',
      matchedLength: 1,
    };
  }

  if (sanMoves[0] === 'd4') {
    return {
      eco: 'A40',
      name: "Queen's Pawn Opening",
      desc: 'Pembukaan pion menteri 1. d4 membangun dominasi posisional kokoh di pusat.',
      matchedLength: 1,
    };
  }

  return {
    eco: 'A00',
    name: 'Pembukaan Umum',
    desc: 'Permainan catur dimulai dengan perebutan petak pusat.',
    matchedLength: 0,
  };
}

/**
 * Check if a specific move at index is considered a "Book Move"
 * @param {Array<string>} sanMoves - Full SAN moves played in the match
 * @param {number} moveIndex - 0-based move index
 * @returns {boolean}
 */
export function isBookMove(sanMoves, moveIndex) {
  if (!sanMoves || moveIndex < 0 || moveIndex >= sanMoves.length) return false;

  // Check if the sequence up to this move matches any known opening line
  for (const op of OPENINGS_DATABASE) {
    if (moveIndex < op.moves.length) {
      let match = true;
      for (let i = 0; i <= moveIndex; i++) {
        if (sanMoves[i] !== op.moves[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }

  return false;
}
