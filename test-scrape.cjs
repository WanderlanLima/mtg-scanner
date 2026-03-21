const fs = require('fs');
async function scrape() {
  try {
    const url = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.ligamagic.com.br/?view=cards/card&card=Sol+Ring');
    const res = await fetch(url);
    const data = await res.json();
    const html = data.contents;
    fs.writeFileSync('liga_magic.html', html || "EMPTY");
    console.log("Written!");
  } catch(e) { console.error(e); }
}
scrape();
