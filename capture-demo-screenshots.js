const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const SCREENSHOT_DIR = '.github/assets/screenshots';
const BASE_URL = 'http://localhost:8080';
const VIEWPORT = { width: 1200, height: 800 };

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshot(browser, demo, index, total) {
  const page = await browser.newPage();
  
  try {
    console.log(`📸 [${index}/${total}] Capturing: ${demo.name}`);
    
    // Set viewport
    await page.setViewport(VIEWPORT);
    
    // Navigate to page
    const url = `${BASE_URL}/${demo.path}`;
    console.log(`   🌐 Loading: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    // Wait for basic DOM
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for Mapbox to load if it's a map demo
    if (demo.waitForMapbox) {
      try {
        console.log(`   ⏳ Waiting for Mapbox to load...`);
        await page.waitForFunction(() => {
          return typeof window.mapboxgl !== 'undefined' && 
                 document.querySelector('.mapboxgl-canvas') !== null;
        }, { timeout: 10000 });
        
        // Extra wait for map to render
        await new Promise(resolve => setTimeout(resolve, demo.extraWait || 5000));
        
        // Try to wait for map to be loaded
        await page.waitForFunction(() => {
          const canvas = document.querySelector('.mapboxgl-canvas');
          return canvas && canvas.width > 0 && canvas.height > 0;
        }, { timeout: 5000 });
        
        console.log(`   ✅ Mapbox loaded successfully`);
      } catch (e) {
        console.log(`   ⚠️  Mapbox timeout, capturing anyway: ${e.message}`);
      }
    }
    
    // Additional wait for specific demos
    if (demo.customWait) {
      console.log(`   ⏳ Custom wait: ${demo.customWait}ms`);
      await new Promise(resolve => setTimeout(resolve, demo.customWait));
    }
    
    // Capture screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, demo.filename);
    await page.screenshot({
      path: screenshotPath,
      type: 'png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height
      }
    });
    
    console.log(`   💾 Saved: ${screenshotPath}`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Failed to capture ${demo.name}: ${error.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 Starting Mapbox Demo Screenshot Capture...');
  console.log(`📂 Screenshots will be saved to: ${SCREENSHOT_DIR}/`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });
  
  // Define demos to capture with specific settings
  const demos = [
    // Featured Maps & Styles
    { 
      name: 'Mapbox Standard', 
      path: 'mapbox-standard/', 
      filename: 'mapbox-standard.png',
      waitForMapbox: true,
      extraWait: 6000,
      category: 'featured'
    },
    { 
      name: 'Mapbox Streets', 
      path: 'mapbox-streets/', 
      filename: 'mapbox-streets.png',
      waitForMapbox: true,
      extraWait: 5000,
      category: 'featured'
    },
    { 
      name: 'Mapbox Satellite', 
      path: 'mapbox-satellite/', 
      filename: 'mapbox-satellite.png',
      waitForMapbox: true,
      extraWait: 5000,
      category: 'featured'
    },
    
    // Globe & Terrain
    { 
      name: '3D Terrain', 
      path: '3d/', 
      filename: '3d-terrain.png',
      waitForMapbox: true,
      extraWait: 7000,
      category: 'terrain'
    },
    { 
      name: 'Mars Surface', 
      path: 'mapbox-mars/', 
      filename: 'mars.png',
      waitForMapbox: true,
      extraWait: 5000,
      category: 'terrain'
    },
    { 
      name: 'Globe Ozone', 
      path: 'globe/ozone/', 
      filename: 'globe-ozone.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'terrain'
    },
    { 
      name: 'Globe Mars', 
      path: 'globe/mars/', 
      filename: 'globe-mars.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'terrain'
    },
    
    // 3D Architecture
    { 
      name: '3D Buildings', 
      path: 'mapbox-3d-buildings/', 
      filename: '3d-buildings.png',
      waitForMapbox: true,
      extraWait: 6000,
      category: 'architecture'
    },
    
    // Games & Interactive
    { 
      name: 'Helicopter Game', 
      path: '3d-helicoptor-game/', 
      filename: 'helicopter-game.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'games'
    },
    { 
      name: 'Golden Gate Bridge', 
      path: 'golden-gate/', 
      filename: 'golden-gate.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'games'
    },
    { 
      name: 'Dragon Flight', 
      path: 'dragon-over-sf/', 
      filename: 'dragon-flight.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'games'
    },
    
    // Vehicle Simulations
    { 
      name: '3D Cars', 
      path: 'cars/', 
      filename: '3d-cars.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'vehicles'
    },
    { 
      name: '3D Bucks', 
      path: 'bucks/', 
      filename: '3d-bucks.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'vehicles'
    },
    { 
      name: 'SpaceX Launch', 
      path: 'spacex-launch/', 
      filename: 'spacex-launch.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'vehicles'
    },
    
    // Media & Events
    { 
      name: 'Lombard Street Video', 
      path: 'lombard-st-video/', 
      filename: 'lombard-video.png',
      waitForMapbox: true,
      extraWait: 6000,
      category: 'media'
    },
    { 
      name: 'Reflect Demo', 
      path: 'reflect/', 
      filename: 'reflect.png',
      waitForMapbox: true,
      extraWait: 5000,
      category: 'media'
    },
    { 
      name: 'Suez Canal Ship', 
      path: 'suez_canel/', 
      filename: 'suez-canal.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'events'
    },
    { 
      name: 'Ship Rescue', 
      path: 'unstuck_rocket/', 
      filename: 'ship-rescue.png',
      waitForMapbox: true,
      extraWait: 8000,
      category: 'events'
    },
    { 
      name: 'Uttarakhand Flood', 
      path: 'uk-flood-imagery/', 
      filename: 'flood-imagery.png',
      waitForMapbox: true,
      extraWait: 5000,
      category: 'events'
    }
  ];
  
  console.log(`\n📋 Capturing ${demos.length} Mapbox demos...\n`);
  
  let successful = 0;
  let failed = 0;
  const results = [];
  
  // Capture screenshots one by one
  for (let i = 0; i < demos.length; i++) {
    const demo = demos[i];
    const success = await captureScreenshot(browser, demo, i + 1, demos.length);
    
    results.push({ demo, success });
    if (success) successful++;
    else failed++;
    
    // Small delay between captures
    if (i < demos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  await browser.close();
  
  // Summary
  console.log('\n📊 Screenshot Capture Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📄 Total: ${demos.length}`);
  
  if (successful > 0) {
    console.log(`\n🎉 Screenshots saved to: ${SCREENSHOT_DIR}/`);
    
    // Group by category for collage info
    const categories = {};
    results.filter(r => r.success).forEach(r => {
      const cat = r.demo.category;
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(r.demo.filename);
    });
    
    console.log('\n🖼️  Ready for collages:');
    Object.entries(categories).forEach(([category, files]) => {
      console.log(`  ${category}: ${files.join(', ')}`);
    });
    
    console.log('\n💡 Next steps:');
    console.log('1. Review the captured screenshots');
    console.log('2. Create collages using your preferred image editor');
    console.log('3. Or use the provided HTML template for easy collage creation');
  }
  
  if (failed > 0) {
    console.log('\n❌ Failed captures:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.demo.name}`);
    });
  }
}

if (require.main === module) {
  main().catch(console.error);
}