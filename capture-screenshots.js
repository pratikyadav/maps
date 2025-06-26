const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const SCREENSHOT_DIR = '.github/assets/screenshots';
const BASE_URL = 'http://localhost:8080';
const VIEWPORT = { width: 1200, height: 800 };
const WAIT_TIME = 5000; // Wait 5 seconds for maps to load

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshot(browser, pagePath, filename) {
  const page = await browser.newPage();
  
  try {
    console.log(`📸 Capturing: ${pagePath}`);
    
    // Set viewport
    await page.setViewport(VIEWPORT);
    
    // Navigate to page
    await page.goto(`${BASE_URL}/${pagePath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for maps to load
    await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
    
    // Try to wait for Mapbox to be ready (optional)
    try {
      await page.waitForFunction(() => {
        return typeof window.mapboxgl !== 'undefined' && 
               document.querySelector('.mapboxgl-canvas') !== null;
      }, { timeout: 5000 });
    } catch (e) {
      console.log(`   ⚠️  Mapbox not detected, capturing anyway`);
    }
    
    // Capture screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({
      path: screenshotPath,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height
      }
    });
    
    console.log(`   ✅ Saved: ${screenshotPath}`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function createCollage(screenshots, outputPath, title) {
  // This would require additional image processing libraries
  // For now, just log what would be created
  console.log(`🖼️  Collage plan: ${title}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Images: ${screenshots.join(', ')}`);
}

async function main() {
  console.log('🚀 Starting screenshot capture...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  // Define pages to capture
  const pages = [
    // Featured Maps
    { path: 'mapbox-standard/index.html', filename: 'mapbox-standard.png', category: 'featured' },
    { path: 'mapbox-streets/index.html', filename: 'mapbox-streets.png', category: 'featured' },
    { path: 'mapbox-satellite/index.html', filename: 'mapbox-satellite.png', category: 'featured' },
    
    // Globe & Terrain
    { path: '3d/index.html', filename: '3d-terrain.png', category: 'globe' },
    { path: 'mapbox-mars/index.html', filename: 'mars.png', category: 'globe' },
    { path: 'globe/ozone/index.html', filename: 'globe-ozone.png', category: 'globe' },
    { path: 'globe/mars/index.html', filename: 'globe-mars.png', category: 'globe' },
    
    // 3D Architecture
    { path: 'mapbox-3d-buildings/index.html', filename: '3d-buildings.png', category: 'architecture' },
    
    // Games & Interactive
    { path: '3d-helicoptor-game/index.html', filename: 'helicopter-game.png', category: 'games' },
    { path: 'golden-gate/index.html', filename: 'golden-gate.png', category: 'games' },
    { path: 'dragon-over-sf/index.html', filename: 'dragon-flight.png', category: 'games' },
    
    // Vehicles
    { path: 'cars/index.html', filename: '3d-cars.png', category: 'vehicles' },
    { path: 'bucks/index.html', filename: '3d-bucks.png', category: 'vehicles' },
    { path: 'spacex-launch/index.html', filename: 'spacex-launch.png', category: 'vehicles' },
    
    // Media & Events
    { path: 'lombard-st-video/index.html', filename: 'lombard-video.png', category: 'media' },
    { path: 'reflect/index.html', filename: 'reflect.png', category: 'media' },
    { path: 'suez_canel/index.html', filename: 'suez-canal.png', category: 'events' },
    { path: 'unstuck_rocket/index.html', filename: 'ship-rescue.png', category: 'events' },
    { path: 'uk-flood-imagery/index.html', filename: 'flood-imagery.png', category: 'events' }
  ];
  
  console.log(`📋 Found ${pages.length} pages to capture\n`);
  
  let successful = 0;
  let failed = 0;
  
  // Capture individual screenshots
  for (const page of pages) {
    const success = await captureScreenshot(browser, page.path, page.filename);
    if (success) successful++;
    else failed++;
  }
  
  await browser.close();
  
  // Plan collages (you can implement actual image processing later)
  console.log('\n🖼️  Collage plans:');
  await createCollage(
    ['mapbox-standard.png', 'mapbox-streets.png', 'mapbox-satellite.png'],
    'featured-maps-collage.png',
    'Featured Maps'
  );
  
  await createCollage(
    ['3d-terrain.png', 'mars.png', 'globe-ozone.png', 'globe-mars.png'],
    'globe-terrain-collage.png',
    'Globe & Terrain'
  );
  
  await createCollage(
    ['helicopter-game.png', 'golden-gate.png', 'dragon-flight.png'],
    'games-collage.png',
    'Games & Interactive'
  );
  
  await createCollage(
    ['3d-cars.png', '3d-bucks.png', 'spacex-launch.png'],
    'vehicles-collage.png',
    'Vehicle Simulations'
  );
  
  await createCollage(
    ['suez-canal.png', 'ship-rescue.png', 'flood-imagery.png'],
    'events-collage.png',
    'Historical Events'
  );
  
  // Summary
  console.log('\n📊 Screenshot Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📄 Total: ${pages.length}`);
  
  if (successful > 0) {
    console.log(`\n🎉 Screenshots saved to: ${SCREENSHOT_DIR}/`);
    console.log('\n💡 Next steps:');
    console.log('1. Review the captured screenshots');
    console.log('2. Use image editing software to create collages');
    console.log('3. Update README.md with actual image references');
    console.log('4. Consider using tools like ImageMagick for automated collages');
  }
}

// Usage instructions
if (require.main === module) {
  console.log('📸 Mapbox Demo Screenshot Capture Tool');
  console.log('');
  console.log('Prerequisites:');
  console.log('1. Start a local server: python3 -m http.server 8080');
  console.log('2. Install puppeteer: npm install puppeteer');
  console.log('3. Run this script: node capture-screenshots.js');
  console.log('');
  
  main().catch(console.error);
}