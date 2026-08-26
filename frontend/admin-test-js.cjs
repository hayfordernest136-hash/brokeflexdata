const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', err => {
    console.log('  [PAGE ERROR]', err.message);
    errors.push(err.message);
  });
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('TypeError') || text.includes('429') || text.includes('warn')) {
      console.log('  [CONSOLE]', text.substring(0, 300));
    }
  });

  console.log('1. Login...');
  await page.goto('https://brokeflexdata-backend.onrender.com/admin.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.type('input[type="email"]', 'hayfordernest136@gmail.com');
  await page.type('input[type="password"]', 'Commonsense$5');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 8000));
  console.log('  Logged in at:', page.url());

  // List all sidebar links
  const links = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return [];
    const anchors = nav.querySelectorAll('a');
    return Array.from(anchors).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim(),
      class: a.className,
      id: a.id
    }));
  });
  console.log('\n  Sidebar links:', JSON.stringify(links, null, 2));

  // Try clicking using JavaScript
  console.log('\n2. Clicking Orders via JS...');
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin/orders"]');
    if (link) {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await new Promise(r => setTimeout(r, 5000));

  console.log('  URL:', page.url());
  const content = await page.content();
  console.log('  Content length:', content.length);
  console.log('  Has orders table:', content.includes('table'));
  console.log('  Has error:', content.includes('Something went wrong'));

  await page.screenshot({ path: 'C:\\temp\\js-click-orders.png', fullPage: true });

  // Try clicking Checkers
  console.log('\n3. Clicking Checkers via JS...');
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin/checkers"]');
    if (link) {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await new Promise(r => setTimeout(r, 5000));

  console.log('  URL:', page.url());
  const content2 = await page.content();
  console.log('  Content length:', content2.length);
  console.log('  Has checkers table:', content2.includes('table'));
  console.log('  Has error:', content2.includes('Something went wrong'));

  await page.screenshot({ path: 'C:\\temp\\js-click-checkers.png', fullPage: true });

  console.log('\n=== Summary ===');
  console.log('Page errors:', errors.length);
  if (errors.length === 0) console.log('ALL ADMIN PAGES WORKING!');

  await browser.close();
})().catch(e => console.error('Browser error:', e.message));
