const url = 'https://clearoutside.com/forecast/37.57/126.98';

fetch(url)
  .then(res => res.text())
  .then(html => {
    console.log('HTML Length:', html.length);
    // Find strings containing "bortle" or "sqm" (case insensitive)
    const lines = html.split('\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes('bortle') || line.toLowerCase().includes('sqm') || line.toLowerCase().includes('light pollution')) {
        console.log(`Line ${idx + 1}:`, line.trim());
      }
    });
  })
  .catch(err => console.error(err));
