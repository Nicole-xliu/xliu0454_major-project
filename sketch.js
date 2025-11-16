let sourceImage;
let artCanvas; // define artCanvas
let ready = false; // track if art is ready

const baseWidth = 1920;// base canvas width
const baseHeight = 1080;// base canvas height

//  sampling parameters to control the size and ignore the imperfection of the map image
const SAMPLE_STEP = 25;
const UNIT_SIZE = 30;

// shadow movement
const SHADOW_MAX_OFFSET = 10; 
const SHADOW_SMOOTHING = 0.06; 
let currentShadowOffsetX = 0; 
let currentShadowOffsetY = 0; 

// Animation control parameters （time）
let startTime;  
let roadCells = [];
let showDelay = 3; // Hold for 3 seconds during the day 
let fadeDuration = 12; // The process of turning black
let nightBuildDuration = 5; // Time to draw the road

// Join the moving vehicle
let carLights = [];
const CAR_COLORS = ['#ad372b', '#314294', '#d6d7d2'];


// About big blocks
let bigBlocks = []; // Store the information of all the blocks
const BIGBLOCK_APPEAR_WINDOW = 10; // Large blocks appeared one after another within 10 seconds after the headlights appeared
const BIGBLOCK_COLOR_CHANGE_INTERVAL = 5; // Change the color every five seconds
const BIGBLOCK_DELAY_AFTER_CAR = 1;         
const BIGBLOCK_COLORS = ['#e1c927', '#ad372b', '#314294', '#d6d7d2'];

//cars
class CarLight {
  constructor(baseCell, allCells) {
    this.w = baseCell.w;
    this.h = baseCell.h;

    this.color = random(CAR_COLORS);

    // Cars direction (horizontal or vertical)
    this.dir = this.detectDirection(baseCell, allCells);

    // Generate movable paths (consecutive grids on the road) in the road list
    this.line = this.buildLine(baseCell, allCells, this.dir);
    if (!this.line || this.line.length === 0) this.line = [baseCell];

    this.index = this.line.findIndex(c => c === baseCell);
    if (this.index < 0) this.index = 0;

    this.x = this.line[this.index].x;
    this.y = this.line[this.index].y;

    this.stepInterval = floor(random(6, 16)); 
    this.frameCounter = floor(random(0, this.stepInterval));
  }

  detectDirection(cell, allCells) {
    let right = allCells.find(c => c.row === cell.row && c.col === cell.col + 1);
    let left  = allCells.find(c => c.row === cell.row && c.col === cell.col - 1);
    let up    = allCells.find(c => c.col === cell.col && c.row === cell.row - 1);
    let down  = allCells.find(c => c.col === cell.col && c.row === cell.row + 1);

    let horizontal = (right || left) ? 1 : 0;
    let vertical   = (up || down) ? 1 : 0;

    if (horizontal && !vertical) return 0;
    if (vertical && !horizontal) return 1;

    return random([0, 1]);
  }

  buildLine(baseCell, allCells, dir) {
    let line = [baseCell];
    let cur = baseCell;

    while (true) {
      let next;
      if (dir === 0) next = allCells.find(c => c.row === cur.row && c.col === cur.col - 1);
      else           next = allCells.find(c => c.col === cur.col && c.row === cur.row - 1);
      if (!next) break;
      line.unshift(next);
      cur = next;
    }

    cur = baseCell;
    while (true) {
      let next;
      if (dir === 0) next = allCells.find(c => c.row === cur.row && c.col === cur.col + 1);
      else           next = allCells.find(c => c.col === cur.col && c.row === cur.row + 1);
      if (!next) break;
      line.push(next);
      cur = next;
    }

    return line;
  }

  update() {
    if (!this.line || this.line.length === 0) return;

    this.frameCounter++;
    if (this.frameCounter >= this.stepInterval) {
      this.frameCounter = 0;
      this.index = (this.index + 1) % this.line.length;
    }

    let current = this.line[this.index];
    this.x = current.x;
    this.y = current.y;
  }

  draw(g) {
    feltifyRect(g, this.x, this.y, this.w, this.h, this.color, 1.2);
  }
}

function preload() {
  sourceImage = loadImage('Street.png'); 
  // load image https://p5js.org/reference/p5/preload/
}

function setup() {
  createCanvas(baseWidth, baseHeight); // create main canvas
  pixelDensity(1);

  //Content outside the element box is not shown https://www.w3schools.com/jsref/prop_style_overflow.asp
  document.body.style.overflow = 'hidden';

  // create graphics buffer for art generation
  artCanvas = createGraphics(600, 600);
  artCanvas.pixelDensity(1); // https://p5js.org/reference/p5/loadPixels/ // Get the pixel density.
  
  
  generateArt(); // Daytime version: Large color blocks + small color block roads
  extractDayRoadCells(); //Scan the map and save the road locations.
  createCarLights(); 

  initBigBlocks(); 
  setupBigBlocksAnimation(); // Assign "appearance time" and "next color change time" to each large color block

  startTime = millis(); 
  ready = true;
  scaleToWindow();// scale to window size
}


function draw() {

  // resizing and fitting
  background(255);
  let zoom = 1.25;
  let zoomAnchorY = height * 0.75;
  push(); 
  translate(width / 2, zoomAnchorY / 2); 
  scale(zoom); 
  translate(-width / 2, -zoomAnchorY / 2); 

  // calculate mouse position 
  let targetOffsetX = map(mouseX, 0, width, -SHADOW_MAX_OFFSET, SHADOW_MAX_OFFSET); 
  let targetOffsetY = map(mouseY, 0, height, -SHADOW_MAX_OFFSET, SHADOW_MAX_OFFSET);

  // smoothly transition https://p5js.org/reference/p5/lerp/
  currentShadowOffsetX = lerp(currentShadowOffsetX, targetOffsetX, SHADOW_SMOOTHING);
  currentShadowOffsetY = lerp(currentShadowOffsetY, targetOffsetY, SHADOW_SMOOTHING);

  // pass offsets to the background function
  drawBackground(currentShadowOffsetX, currentShadowOffsetY); 

  // display generated art
  if (ready) {
    let t = (millis() - startTime) / 1000; //Calculate how many seconds have passed since the animation started.
    renderScene(t);
    image(artCanvas, 656, 152, 600, 600);
  }
  pop();
}

// Click to regenerate artwork
function mousePressed() {
  generateArt();
  extractDayRoadCells();
  createCarLights();  

  initBigBlocks();
  setupBigBlocksAnimation(); 

  startTime = millis();
}

// Daytime → Gradually darkening → Gradually revealing yellow roads → car lights → big blocks

function renderScene(t) {

  if (t < showDelay) return; // Do nothing for the first 3 seconds (showing daytime footage).

  let fadeStart = showDelay;
  let fadeEnd = showDelay + fadeDuration;
  let roadStart = fadeStart + fadeDuration / 2; 
  let roadEnd = roadStart + nightBuildDuration;

  // The process of turning black
  if (t < fadeEnd) {

    let p = map(t, fadeStart, fadeEnd, 0, 1); //Calculate the transparency of black (from transparent to completely black). 
    let eased = p * p * (3 - 2 * p); //Make the transition more natural and less abrupt.          
    let alpha = eased * 255;                  

    // Draw a black rectangle with gradually increasing transparency on the artCanvas.
    artCanvas.fill(0, alpha);
    artCanvas.noStroke();
    artCanvas.rect(0, 0, artCanvas.width, artCanvas.height);

    // The road appears (it appears midway through the darkness).
    if (t > roadStart) {

      let rp = map(t, roadStart, roadEnd, 0, 1);
      rp = constrain(rp, 0, 1);

      // Draw the road line by line (from top to bottom).
      let maxRow = maxRoadRowIndex(); // Maximum number of lanes on a road (Y direction)
      let limit = floor(maxRow * rp); // The current number of rows to be drawn

      for (let cell of roadCells) {
        if (cell.row <= limit) {
          feltifyRect(artCanvas, cell.x, cell.y, cell.w, cell.h, colors.yellow, 1.2);
        }
      }
    }

    return;
  }

  // After it goes completely black (the screen remains black).
  artCanvas.background(0);

  // During the night phase, draw the "large color blocks" (city buildings) first, but the large color blocks have an appearance time and change color every 5 seconds
  for (let block of bigBlocks) {

    //It's not the time for this square to appear yet. Skip it
    if (t < block.appearTime) continue;

    // When it's time for the color change, update it multiple times at 5-second intervals
    while (t >= block.nextColorChange) {
      let newColor = block.currentColor;

      // Randomly find a color that is different from the current one
      for (let k = 0; k < 5; k++) {
        let candidate = random(BIGBLOCK_COLORS);
        if (candidate !== block.currentColor) {
          newColor = candidate;
          break;
        }
      }

      block.currentColor = newColor;
      block.nextColorChange += BIGBLOCK_COLOR_CHANGE_INTERVAL; // The time for the next color change +5 seconds
    }

    // Draw big block
    feltifyRect(
      artCanvas,
      block.x,
      block.y,
      block.w,
      block.h,
      block.currentColor,
      6
    );
  }

  // Yellow roads were paved（
  for (let cell of roadCells) {
    feltifyRect(artCanvas, cell.x, cell.y, cell.w, cell.h, colors.yellow, 1.2);
  }

  // Headlight movement + drawing (appearing at night)
  for (let car of carLights) {
    car.update(); // Mobile car
    car.draw(artCanvas);
  }
}

// Extract road data from the white area.
function extractDayRoadCells() {

  roadCells = [];

  sourceImage.loadPixels();
  const scaleX = artCanvas.width / sourceImage.width;
  const scaleY = artCanvas.height / sourceImage.height;
  const blockSize = UNIT_SIZE * Math.min(scaleX, scaleY);

  let rowIndex = 0;

  for (let y = 0; y < sourceImage.height; y += SAMPLE_STEP, rowIndex++) {

    let colIndex = 0;

    for (let x = 0; x < sourceImage.width; x += SAMPLE_STEP, colIndex++) {

      let idx = (y * sourceImage.width + x) * 4;
      let r = sourceImage.pixels[idx];
      let g = sourceImage.pixels[idx + 1];
      let b = sourceImage.pixels[idx + 2];

      if (r > 240 && g > 240 && b > 240) {

        roadCells.push({
          x: x * scaleX,
          y: y * scaleY,
          w: blockSize,
          h: blockSize,
          row: rowIndex,
          col: colIndex
        });
      }
    }
  }
}

// Calculate the maximum row value of the road
function maxRoadRowIndex() {
  let m = 0;
  for (let c of roadCells) if (c.row > m) m = c.row;
  return m;
}

//Generate car lights (one for every five road grids)
function createCarLights() {
  carLights = [];
  if (roadCells.length === 0) return;

  for (let i = 0; i < roadCells.length; i += 5) {
    carLights.push(new CarLight(roadCells[i], roadCells));
  }
}

// base color like mondrian
let colors = {
  gray: '#d6d7d2',
  yellow: '#e1c927',
  red: '#ad372b',
  blue: '#314294',
  bg: '#EBEAE6'
};

// Initialize the position and base color of bigBlocks
function initBigBlocks() {
  bigBlocks = [];

  const s = 1600 / 600; // Because the original coordinates are 1600x1600, they need to be scaled to 600x600

  function addBlock(x, y, w, h, c) {
    bigBlocks.push({
      x: Math.round(x / s),
      y: Math.round(y / s),
      w: Math.round(w / s),
      h: Math.round(h / s),
      baseColor: c, // Initial color (for daytime use)
      currentColor: c, // Current display color (changes at night)
      appearTime: 0, // The appearance time of this square at night (in seconds)
      nextColorChange: 0 // Time for the next color change (in seconds)
    });
  }

  // It's the same as in drawSVGBlocks, except that here it's "data" and there it's "daytime drawing".
  addBlock(910, 305, 275, 420, '#4267ba');
  addBlock(910, 390, 275, 230, '#ad372b');
  addBlock(960, 450, 160, 100, '#e1c927');
  addBlock(80, 1160, 160, 140, '#e1c927');
  addBlock(230, 960, 150, 130, "#4267ba");
  addBlock(1450, 1450, 165, 165, '#e1c927');
  addBlock(730, 280, 95, 95, '#e1c927');
  addBlock(385, 1300, 195, 310, '#ad372b');
  addBlock(450, 1360, 60, 60, '#d6d7d2');
  addBlock(1005, 1060, 175, 390, "#4267ba");
  addBlock(1025, 1295, 125, 100, '#e1c927');
  addBlock(150, 455, 225, 120, "#4267ba");
  addBlock(280, 160, 205, 85, '#ad372b');
  addBlock(1380, 70, 180, 120, "#4267ba");
  addBlock(1400, 625, 210, 210, '#ad372b');
  addBlock(1270, 865, 130, 190, '#e1c927');
  addBlock(610, 945, 215, 215, '#e1c927');
  addBlock(385, 740, 220, 90, '#ad372b');
  addBlock(830, 730, 155, 155, '#ad372b');
  addBlock(1470, 700, 80, 60, '#d6d7d2');
  addBlock(280, 1000, 50, 50, '#d6d7d2');
  addBlock(670, 1020, 80, 80, '#d6d7d2');
  addBlock(340, 160, 40, 85, '#d6d7d2');
  addBlock(1295, 915, 75, 75, '#d6d7d2');
  addBlock(750, 305, 45, 45, '#d6d7d2');
}

// Assign the appearance time and the next color change time to each large color block
function setupBigBlocksAnimation() {
  let fadeEnd = showDelay + fadeDuration; 

  bigBlocks.forEach(block => {
    // Appearance time: Within 0 to 10 seconds randomly after the headlights start
    block.appearTime = fadeEnd + BIGBLOCK_DELAY_AFTER_CAR + random(0, BIGBLOCK_APPEAR_WINDOW);

    // Initial color = daytime color
    block.currentColor = block.baseColor;

    // The first color change time = the appearance time + 5 seconds
    block.nextColorChange = block.appearTime + BIGBLOCK_COLOR_CHANGE_INTERVAL;
  });
}


function generateArt() {
  // setup artCanvas 
  artCanvas.push();
  artCanvas.clear();
  artCanvas.background(colors.bg);
  artCanvas.noStroke();

  // First draw the large square layer
  drawSVGBlocks();

  // Then draw the road sampling layer.
  
  // https://p5js.org/reference/p5/loadPixels/
  sourceImage.loadPixels();
  
  // scale & blocksize
  const scaleX = artCanvas.width / sourceImage.width;
  const scaleY = artCanvas.height / sourceImage.height;
  const blockSize = UNIT_SIZE * Math.min(scaleX, scaleY);
  
  // create grid for storing colors
  const rows = Math.ceil(sourceImage.height / SAMPLE_STEP);
  const cols = Math.ceil(sourceImage.width / SAMPLE_STEP);
  const grid = Array(rows).fill().map(function() {
    return Array(cols).fill(null);
  });
  
  // sample pixels and draw colored squares
  for (let y = 0, row = 0; y < sourceImage.height; y += SAMPLE_STEP, row++) {
    for (let x = 0, col = 0; x < sourceImage.width; x += SAMPLE_STEP, col++) {
      // Get pixel color
      const idx = (y * sourceImage.width + x) * 4;
      const r = sourceImage.pixels[idx];
      const g = sourceImage.pixels[idx + 1];
      const b = sourceImage.pixels[idx + 2];
      
      // Check if it's a road pixel (white color)
      if (r > 240 && g > 240 && b > 240) {
        grid[row][col] = chooseColor(grid, row, col);
      }
    }
  }
  
  // draw rectangles from grid
  for (let y = 0, row = 0; y < sourceImage.height; y += SAMPLE_STEP, row++) {
    for (let x = 0, col = 0; x < sourceImage.width; x += SAMPLE_STEP, col++) {
      if (grid[row][col]) {
        const bx = x * scaleX;
        const by = y * scaleY;
        const bw = blockSize;
        const bh = blockSize;
        feltifyRect(artCanvas, bx, by, bw, bh, grid[row][col], 1.2);
      }
    }
  }
  
  artCanvas.pop();
}

// Mondrian-style big blocks
function drawSVGBlocks() {
  const g = artCanvas;
  g.noStroke();

  const s = 1600 / 600; //cal canvas scale

  function R(x, y, w, h, c) {
    // ampScale = 0.6 for smoother edge // update：change to 6, since they are much bigger than the small ones.
    feltifyRect(
      g,
      Math.round(x / s),
      Math.round(y / s),
      Math.round(w / s),
      Math.round(h / s),
      c,
      6
    );
  }

  R(910, 305, 275, 420, '#4267ba');
  R(910, 390, 275, 230, '#ad372b');
  R(960, 450, 160, 100, '#e1c927');
  R(80, 1160, 160, 140, '#e1c927');
  R(230, 960, 150, 130, "#4267ba");
  R(1450, 1450, 165, 165, '#e1c927');
  R(730, 280, 95, 95, '#e1c927');
  R(385, 1300, 195, 310, '#ad372b');
  R(450, 1360, 60, 60, '#d6d7d2');
  R(1005, 1060, 175, 390, "#4267ba");
  R(1025, 1295, 125, 100, '#e1c927');
  R(150, 455, 225, 120, "#4267ba");
  R(280, 160, 205, 85, '#ad372b');
  R(1380, 70, 180, 120, "#4267ba");
  R(1400, 625, 210, 210, '#ad372b');
  R(1270, 865, 130, 190, '#e1c927');
  R(610, 945, 215, 215, '#e1c927');
  R(385, 740, 220, 90, '#ad372b');
  R(830, 730, 155, 155, '#ad372b');
  R(1470, 700, 80, 60, '#d6d7d2');
  R(280, 1000, 50, 50, '#d6d7d2');
  R(670, 1020, 80, 80, '#d6d7d2');
  R(340, 160, 40, 85, '#d6d7d2');
  R(1295, 915, 75, 75, '#d6d7d2');
  R(750, 305, 45, 45, '#d6d7d2');
}

// choose color with probability and neighbor checking （like in mondian’s work）
function chooseColor(grid, row, col) {
  const avoid = [];
  
  // Check top neighbor（&& is like and in python）
  if (row > 0 && grid[row - 1][col] && grid[row - 1][col] !== colors.yellow) {
    avoid.push(grid[row - 1][col]);
  }
  
  // Check left neighbor  
  if (col > 0 && grid[row][col - 1] && grid[row][col - 1] !== colors.yellow) {
    avoid.push(grid[row][col - 1]);
  }
  
  // color weights
  const weights = [
    { color: colors.gray, weight: 10 },
    { color: colors.yellow, weight: 60 },
    { color: colors.red, weight: 10 },
    { color: colors.blue, weight: 20 }
  ];
  
  // filter out avoided colors
  const available = weights.filter(function(w) {
    return !avoid.includes(w.color);
  });
  
  // default to yellow if no colors available（since the original work has lots of yellow）
  if (available.length === 0) return colors.yellow;
  
  // calculate total weight
  const total = available.reduce(function(sum, w) {
    return sum + w.weight;
  }, 0);
  
  // weighted random selection
  let rand = random(total);
  
  for (let i = 0; i < available.length; i++) {
    if (rand < available[i].weight) {
      return available[i].color;
    }
    rand -= available[i].weight;
  }
  
  return available[0].color;
}

// Background space drawing function
function drawBackground(shadowOffsetX = 0, shadowOffsetY = 0) {
  noStroke();

  // wall
  fill('#F5F4F0');
  rect(0, 2, 1920, 910);

  // floor line
  fill('#6C4D38');
  rect(0, 868, 1920, 8);

  // floor strips
  fill('#A88974');
  rect(0, 875, 1920, 8);
  fill('#DBBDA5');
  rect(0, 883, 1920, 12);
  fill('#CEB1A1');
  rect(0, 895, 1920, 20);
  fill('#DDC3AC');
  rect(0, 915, 1920, 30);
  fill('#DDBFA7');
  rect(0, 945, 1920, 40);
  fill('#E4C9B4');
  rect(0, 985, 1920, 50);

  // layered rectangles to create a shadow effect
  
  fill('#A88974'); // deepest shadow (move)
  rect(630 + shadowOffsetX * 0.6, 132 + shadowOffsetY * 0.6, 670, 677);
  
  fill('#E1E0DC'); // light edge of the frame
  rect(620, 120, 666, 664); 

  fill('#BFA89A'); // frame border (move)
  rect(658 + shadowOffsetX * 0.2, 153 + shadowOffsetY * 0.1, 606, 622); 

  fill('#A88974'); // shadow at the bottom of the frame (move)
  rect(658 + shadowOffsetX * 0.1, 153 + shadowOffsetY * 0.1, 604, 612);
}

// Hand-drawn style in visuals
function feltifyRect(g, x, y, w, h, c, ampScale = 1) {
  
  // Draw the main color block
  g.noStroke();
  g.fill(c);
  g.rect(x, y, w, h);

  // slight shaking
  const amp = 0.36 * ampScale;     
  const freq = 0.1;   
  const layers = 6;     

  for (let l = 0; l < layers; l++) {
    g.noFill();
    g.stroke(red(c), green(c), blue(c), map(l, 0, layers - 1, 100, 50));
    g.strokeWeight(map(l, 0, layers - 1, 2.2, 1));

    g.beginShape();

    // up
    for (let i = 0; i <= 1; i += 0.02) {
      const n = noise((x + i * w) * freq, (y + l * 50) * freq);
      const offset = map(n, 0, 1, -amp, amp);
      g.vertex(x + i * w, constrain(y + offset, y - amp, y + amp));
    }

    // right
    for (let i = 0; i <= 1; i += 0.02) {
      const n = noise((x + w + l * 20) * freq, (y + i * h) * freq);
      const offset = map(n, 0, 1, -amp, amp);
      g.vertex(constrain(x + w + offset, x + w - amp, x + w + amp), y + i * h);
    }

    // down
    for (let i = 1; i >= 0; i -= 0.02) {
      const n = noise((x + i * w) * freq, (y + h + l * 40) * freq);
      const offset = map(n, 0, 1, -amp, amp);
      g.vertex(x + i * w, constrain(y + h + offset, y + h - amp, y + h + amp));
    }

    // left
    for (let i = 1; i >= 0; i -= 0.02) {
      const n = noise((x + l * 30) * freq, (y + i * h) * freq);
      const offset = map(n, 0, 1, -amp, amp);
      g.vertex(constrain(x + offset, x - amp, x + amp), y + i * h);
    }

    g.endShape(CLOSE);
  }

  // soft glow outline
  g.stroke(red(c), green(c), blue(c), 40);
  g.strokeWeight(3);
  g.noFill();
  g.rect(x, y, w, h);
}

function scaleToWindow() {
  let scaleX = windowWidth / baseWidth;
  let scaleY = windowHeight / baseHeight;
  let scale = Math.max(scaleX, scaleY);
  
  let canvasElement = document.querySelector('canvas');
  canvasElement.style.position = "absolute";
  canvasElement.style.left = "50%";
  canvasElement.style.top = "50%";
  canvasElement.style.transformOrigin = "center center";
  canvasElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function windowResized() {
  scaleToWindow();
}