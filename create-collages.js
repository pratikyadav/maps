const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '.github/assets/screenshots';
const OUTPUT_DIR = '.github/assets';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function resizeImage(imagePath, width, height) {
  return await sharp(imagePath)
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    })
    .png()
    .toBuffer();
}

async function createCollage(images, outputPath, title, cols = 3) {
  console.log(`🖼️  Creating ${title} collage...`);
  
  // Check which images exist
  const existingImages = images.filter(img => {
    const fullPath = path.join(SCREENSHOT_DIR, img);
    return fs.existsSync(fullPath);
  });
  
  if (existingImages.length === 0) {
    console.log(`   ⚠️  No images found for ${title}`);
    return false;
  }
  
  console.log(`   📸 Found ${existingImages.length}/${images.length} images`);
  
  // Calculate dimensions
  const imageWidth = 380;
  const imageHeight = 240;
  const padding = 10;
  const rows = Math.ceil(existingImages.length / cols);
  
  const canvasWidth = (cols * imageWidth) + ((cols - 1) * padding);
  const canvasHeight = (rows * imageHeight) + ((rows - 1) * padding);
  
  // Create base canvas
  const canvas = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  }).png();
  
  // Prepare composite operations
  const composite = [];
  
  for (let i = 0; i < existingImages.length; i++) {
    const imagePath = path.join(SCREENSHOT_DIR, existingImages[i]);
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const left = col * (imageWidth + padding);
    const top = row * (imageHeight + padding);
    
    try {
      const resizedBuffer = await resizeImage(imagePath, imageWidth, imageHeight);
      composite.push({
        input: resizedBuffer,
        left: left,
        top: top
      });
      
      console.log(`   ✅ Added ${existingImages[i]} at (${left}, ${top})`);
    } catch (error) {
      console.log(`   ❌ Failed to process ${existingImages[i]}: ${error.message}`);
    }
  }
  
  if (composite.length === 0) {
    console.log(`   ❌ No images could be processed for ${title}`);
    return false;
  }
  
  // Create the collage
  try {
    await canvas
      .composite(composite)
      .png()
      .toFile(outputPath);
      
    console.log(`   💾 Saved: ${outputPath}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to create collage: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎨 Creating screenshot collages...\n');
  
  const collages = [
    {
      title: 'Featured Maps & Styles',
      images: ['mapbox-standard.png', 'mapbox-streets.png', 'mapbox-satellite.png'],
      output: path.join(OUTPUT_DIR, 'featured-maps-collage.png'),
      cols: 3
    },
    {
      title: 'Globe & Terrain Views',
      images: ['3d-terrain.png', 'mars.png', 'globe-ozone.png', 'globe-mars.png'],
      output: path.join(OUTPUT_DIR, 'globe-terrain-collage.png'),
      cols: 2
    },
    {
      title: '3D Architecture',
      images: ['3d-buildings.png'],
      output: path.join(OUTPUT_DIR, '3d-architecture-collage.png'),
      cols: 1
    },
    {
      title: 'Games & Interactive Experiences',
      images: ['helicopter-game.png', 'golden-gate.png', 'dragon-flight.png'],
      output: path.join(OUTPUT_DIR, 'games-interactive-collage.png'),
      cols: 3
    },
    {
      title: 'Vehicle Simulations',
      images: ['3d-cars.png', '3d-bucks.png', 'spacex-launch.png'],
      output: path.join(OUTPUT_DIR, 'vehicle-simulations-collage.png'),
      cols: 3
    },
    {
      title: 'All Available Screenshots',
      images: [
        'mapbox-standard.png', 'mapbox-streets.png', 'mapbox-satellite.png',
        '3d-terrain.png', 'mars.png', 'globe-ozone.png',
        '3d-buildings.png', 'helicopter-game.png', 'golden-gate.png',
        'dragon-flight.png', '3d-cars.png', 'mars.png'
      ],
      output: path.join(OUTPUT_DIR, 'all-demos-collage.png'),
      cols: 3
    }
  ];
  
  let successful = 0;
  let failed = 0;
  
  for (const collage of collages) {
    const success = await createCollage(
      collage.images, 
      collage.output, 
      collage.title, 
      collage.cols
    );
    
    if (success) successful++;
    else failed++;
    
    console.log(''); // Empty line for spacing
  }
  
  console.log('📊 Collage Creation Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📄 Total: ${collages.length}`);
  
  if (successful > 0) {
    console.log(`\n🎉 Collages saved to: ${OUTPUT_DIR}/`);
    console.log('\nGenerated collages:');
    const outputFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('-collage.png'));
    outputFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
  }
}

if (require.main === module) {
  main().catch(console.error);
}