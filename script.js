const audioPlayer = document.getElementById('audioPlayer');
const songTitle = document.getElementById('song-title');
const playlist = document.getElementById('playlist');
const languageSelect = document.getElementById('language-select');
const backgroundVideo = document.getElementById('background-video');
const backgroundSvg = document.getElementById('background-svg');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.querySelector('.close-modal');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const customColorInput = document.getElementById('custom-color');

const songs = [
  { title: 'APT', src: '/APT.mp3' },
  { title: 'Sigma Boy', src: '/Sigma Boy.mp3' },
  { title: 'Funk Do Bounce', src: '/Funk Do Bounce.mp3' },
  { title: 'Squid Game Mingle', src: '/squid-game-mingle-game-made-with-Voicemod.mp3' },
  { title: 'Worth Nothing', src: '/WORTH NOTHING (Fast _ Furious_ Drift Tape_Phonk Vol 1)(M4A_128K).m4a' },
  { title: 'Attack of the Killer Beast', src: '/Attack of the Killer Beast (Phonk Remix)(M4A_128K).m4a' },
  { title: 'Dubidubidu', src: '/Christell - Dubidubidu (Letra_Lyrics) chipi chipi chapa chapa dubi dubi daba daba(M4A_128K).m4a' },
  { title: 'Houdini', src: '/Eminem - Houdini (Lyrics)(M4A_128K).m4a' },
  { title: 'Crystals', src: '/Crystals(M4A_128K).m4a' },
  { title: 'Neon Blade', src: '/NEON BLADE (Sped Up)(M4A_128K).m4a' },
  { title: 'Murder In My Mind', src: '/Murder In My Mind (Sped Up)(M4A_128K).m4a' },
  { title: 'Flowers', src: '/Miley Cyrus - Flowers (Lyrics)(M4A_128K).m4a' },
  { title: 'Cradles', src: '/Sub Urban - Cradles (Lyrics)(M4A_128K).m4a' }
];

const spotifyAds = [
  {
    title: "Try Spotify Premium",
    src: "https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUsuxWHRQd"
  },
  {
    title: "Discover More Music",
    src: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M"
  },
  {
    title: "Upgrade Your Music Experience", 
    src: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4JAvHpjipBk"
  }
];

// Spotify configuration
const SPOTIFY_CLIENT_ID = '8ef0e53aa1a6493eaf2d1cbc7a221abb'; // Replace with your Spotify Client ID
const SPOTIFY_REDIRECT_URI = 'https://0p_md3i_ee8hzii_3edf.c.websim.ai/?v=39&__websim_origin=https%3A%2F%2Fwebsim.ai';

let currentSongIndex = -1;
let voiceoverAudio = null;
let bpm = 120;
let lastBeat = 0;
let beatInterval = 0;
let beatCount = 0;
const bpmHistory = [];
let particleSystem;
let adPlaying = false;
let songsSinceLastAd = 0;
const SONGS_BETWEEN_ADS = 3;

function nextSong() {
  songsSinceLastAd++;
  if (songsSinceLastAd >= SONGS_BETWEEN_ADS) {
    showSpotifyAd();
    songsSinceLastAd = 0;
  } else {
    loadSong(getRandomSongIndex());
    playSong();
  }
}

const vertexShaderSource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
    gl_PointSize = 2.0;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform float u_time;
  uniform float u_bass;
  uniform vec2 u_resolution;
  
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float t = u_time * 0.5;
    
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = uv - center;
    float r = length(pos);
    float angle = atan(pos.y, pos.x);
    
    float wave = sin(r * 20.0 - t * 3.0) * 0.5 + 0.5;
    wave *= sin(angle * 8.0 + t * 2.0) * 0.5 + 0.5;
    wave *= smoothstep(1.0, 0.0, r);
    
    float hue = fract(t * 0.1 + r + u_bass * 0.2);
    float sat = 0.8;
    float val = wave * (1.0 + u_bass);
    
    vec3 color = hsv2rgb(vec3(hue, sat, val));
    color += vec3(0.1, 0.2, 0.3) * u_bass;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

let gl, shaderProgram;
let timeUniform, bpmUniform, resolutionUniform;
let lastTime = 0;

function initWebGL() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-2';
  document.body.appendChild(canvas);

  gl = canvas.getContext('webgl');
  if (!gl) return;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  shaderProgram = createProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(shaderProgram);

  const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  timeUniform = gl.getUniformLocation(shaderProgram, "u_time");
  const bassUniform = gl.getUniformLocation(shaderProgram, "u_bass");
  resolutionUniform = gl.getUniformLocation(shaderProgram, "u_resolution");

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolutionUniform, width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  function animate(time) {
    time *= 0.001; // Convert to seconds

    // Get audio data for visualization
    analyserNode.getByteFrequencyData(dataArray);
    const bassValue = dataArray[0] / 255.0; // Normalize to 0-1

    gl.uniform1f(timeUniform, time);
    gl.uniform1f(bassUniform, bassValue);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function getRandomSongIndex() {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * songs.length);
  } while (newIndex === currentSongIndex);
  return newIndex;
}

function loadSong(index) {
  currentSongIndex = index;
  const song = songs[index];
  audioPlayer.src = song.src;
  songTitle.textContent = song.title;
  audioPlayer.load();

  // Update active class in the playlist
  const playlistItems = document.querySelectorAll('#playlist li');
  playlistItems.forEach(item => item.classList.remove('active'));
  playlistItems[index].classList.add('active');

  if(song.title === 'APT') {
    backgroundVideo.style.display = 'block';
    backgroundVideo.src = '/02_Black-Lightning.webm';
    backgroundVideo.play();
    backgroundSvg.style.display = 'none';
    document.body.style.backgroundColor = '#000';
  } 
  else if (song.title === 'Squid Game Mingle') {
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawCarouselSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Funk Do Bounce') {
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawTriangleSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Sigma Boy'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawCircleSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Worth Nothing'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawSquareSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Attack of the Killer Beast'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawDiamondSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Dubidubidu'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawStarSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Houdini'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawHexagonSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Crystals'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawPentagonSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Neon Blade'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawOctagonSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Murder In My Mind'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawCrossSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Flowers'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawHeartSVG();
    document.body.style.backgroundColor = '#000';
  }
  else if (song.title === 'Cradles'){
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'block';
    drawSpiralSVG();
    document.body.style.backgroundColor = '#000';
  }
  else {
    backgroundVideo.style.display = 'none';
    backgroundVideo.pause();
    backgroundVideo.currentTime = 0;
    backgroundSvg.style.display = 'none';
    document.body.style.backgroundColor = '#000';
  }
  
  playVoiceover(song.title);
}

function playSong() {
  audioPlayer.play();
}

function pauseSong() {
  audioPlayer.pause();
}

function showSpotifyAd() {
  if (adPlaying) return;
  
  adPlaying = true;
  const ad = spotifyAds[Math.floor(Math.random() * spotifyAds.length)];
  
  pauseSong();
  
  const adContainer = document.createElement('div');
  adContainer.className = 'spotify-ad animate__animated animate__fadeIn';
  adContainer.innerHTML = `
    <div class="ad-header">
      <h3>${ad.title}</h3>
      <button class="skip-ad">Skip Ad in 5s</button>
    </div>
    <iframe 
      src="${ad.src}" 
      width="100%" 
      height="152" 
      frameBorder="0" 
      allowfullscreen="" 
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
      loading="lazy">
    </iframe>
  `;
  
  document.querySelector('.container').appendChild(adContainer);
  
  let countdown = 5;
  const skipBtn = adContainer.querySelector('.skip-ad');
  const countdownInterval = setInterval(() => {
    countdown--;
    skipBtn.textContent = `Skip Ad in ${countdown}s`;
    if (countdown <= 0) {
      skipBtn.textContent = 'Skip Ad';
      skipBtn.onclick = () => {
        adContainer.remove();
        adPlaying = false;
        nextSong();
      };
      clearInterval(countdownInterval);
    }
  }, 1000);
  
  setTimeout(() => {
    if (adContainer.parentNode) {
      adContainer.remove();
      adPlaying = false;
      nextSong();
    }
  }, 30000);
}

function prevSong() {
  nextSong();
}

songs.forEach((song, index) => {
  const listItem = document.createElement('li');
  listItem.textContent = song.title;
  listItem.addEventListener('click', () => {
    loadSong(index);
    playSong();
  });
  playlist.appendChild(listItem);
});

function playVoiceover(songTitleText) {
  if (voiceoverAudio && voiceoverAudio.onend) {
    window.speechSynthesis.cancel();
    voiceoverAudio = null; 
  }

  const selectedLanguage = languageSelect.value;
  let text = "";
  if (selectedLanguage === 'es') {
    text = `Ahora estás escuchando ${songTitleText}`;
  } else {
    text = `Now playing ${songTitleText}`;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selectedLanguage === 'es' ? 'es-ES' : 'en-US';
  voiceoverAudio = utterance;

  window.speechSynthesis.speak(voiceoverAudio);

  voiceoverAudio.onend = () => {
    voiceoverAudio = null;
    playSong();
  };
}

// initial random song
loadSong(getRandomSongIndex());

audioPlayer.addEventListener('ended', () => {
  songsSinceLastAd++;
  if (songsSinceLastAd >= SONGS_BETWEEN_ADS) {
    showSpotifyAd();
    songsSinceLastAd = 0;
  } else {
    nextSong();
  }
});

audioPlayer.addEventListener('play', () => {
  console.log("Audio Play Event");
});
document.addEventListener('keydown', function(event) {
  if (event.code === 'Space') {
    if (audioPlayer.paused) {
      playSong();
    } else {
      pauseSong();
    }
  }
  if (event.code === 'ArrowRight') {
    nextSong();
  }
  if (event.code === 'ArrowLeft') {
    prevSong();
  }
});

const analyser = new AudioContext();
const source = analyser.createMediaElementSource(audioPlayer);
const analyserNode = analyser.createAnalyser();

source.connect(analyserNode);
analyserNode.connect(analyser.destination);

analyserNode.fftSize = 256;
const bufferLength = analyserNode.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
analyserNode.smoothingTimeConstant = 0.8;

function detectBPM() {
  const now = Date.now();
  
  analyserNode.getByteFrequencyData(dataArray);
  const sum = dataArray.reduce((a, b) => a + b);
  
  if (sum > 180 && now - lastBeat > 100) {
    if (lastBeat !== 0) {
      beatInterval = now - lastBeat;
      bpm = Math.round(60000 / beatInterval);
      bpmHistory.push(bpm);
      
      if (bpmHistory.length > 5) {
        bpmHistory.shift();
        bpm = Math.round(bpmHistory.reduce((a, b) => a + b) / bpmHistory.length);
      }
    }
    lastBeat = now;
    beatCount++;
    
    requestAnimationFrame(animateVisuals);
  }
  
  requestAnimationFrame(detectBPM);
}

function animateVisuals() {
  const intensity = dataArray[0] / 255;
  const frequency = bpm / 60;
  
  const baseHue = (Date.now() / 1000) * frequency * 10;
  const hue = (baseHue + intensity * 360) % 360;
  
  const bgColor = `hsl(${hue}, 100%, ${50 + intensity * 25}%)`;
  const pulseScale = 1 + intensity * 0.2;
  
  const svg = document.getElementById('background-svg');
  if (svg) {
    svg.style.transform = `scale(${pulseScale})`;
    svg.style.filter = `hue-rotate(${hue}deg)`;
  }
}

audioPlayer.addEventListener('play', () => {
  analyser.resume();
  detectBPM();
});

audioPlayer.addEventListener('pause', () => {
  analyser.suspend();
});

initWebGL();

function drawCarouselSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';
  svg.style.backgroundImage = 'url(https://img-new.cgtrader.com/items/5760460/5a42ce1f45/large/squid-game-mingle-carousel-map-3d-model-5a42ce1f45.jpg)';
  svg.style.backgroundSize = 'cover';
  svg.style.backgroundPosition = 'center';
  svg.style.opacity = '0.3';

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const numRects = colors.length;
  const rectWidth = 10;
  const rectHeight = 30;
  const spacing = 5;
  const startX = 10;
  const startY = 35;

  for (let i = 0; i < numRects; i++) {
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', startX + i * (rectWidth + spacing));
    rect.setAttribute('y', startY);
    rect.setAttribute('width', rectWidth);
    rect.setAttribute('height', rectHeight);
    rect.setAttribute('fill', colors[i]);
    svg.appendChild(rect);

    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', startX + i * (rectWidth + spacing) + rectWidth / 2);
    text.setAttribute('y', startY + rectHeight + 15);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '8');
    text.setAttribute('fill', 'white');
    text.textContent = `Player ${i+1}`;
    svg.appendChild(text);
  }

  const anim = document.createElementNS(svgNS, 'animateTransform');
  anim.setAttribute('attributeName', 'transform');
  anim.setAttribute('type', 'translate');
  anim.setAttribute('from', '0 0');
  anim.setAttribute('to', `-${(rectWidth + spacing) * (numRects -1)} 0`);
  anim.setAttribute('dur', '15s');
  anim.setAttribute('repeatCount', 'indefinite');
  svg.childNodes.forEach(node => {
    if (node.nodeName === 'rect' || node.nodeName === 'text') {
      node.appendChild(anim.cloneNode(true));
    }
  });

  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawCircleSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const circle = document.createElementNS(svgNS, 'circle');
  circle.setAttribute('cx', '50');
  circle.setAttribute('cy', '50');
  circle.setAttribute('r', '30');
  circle.setAttribute('fill', '#3498db');

  const anim = document.createElementNS(svgNS, 'animate');
  anim.setAttribute('attributeName', 'r');
  anim.setAttribute('from', '30');
  anim.setAttribute('to', '40');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');
  anim.setAttribute('direction', 'alternate');
  circle.appendChild(anim);

  svg.appendChild(circle);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawTriangleSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';
  svg.style.backgroundImage = 'url(https://i.ytimg.com/vi/8uKG7A6U7PY/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBy5_RAAT0yCNEvC2f3Hst5ys4q6g)';
  svg.style.backgroundSize = 'cover';
  svg.style.backgroundPosition = 'center';
  svg.style.opacity = '0.3';

  const triangle = document.createElementNS(svgNS, 'polygon');
  triangle.setAttribute('points', '50,20 20,80 80,80');
  triangle.setAttribute('fill', '#2ecc71');

  const anim = document.createElementNS(svgNS, 'animateTransform');
  anim.setAttribute('attributeName', 'transform');
  anim.setAttribute('type', 'rotate');
  anim.setAttribute('from', '0 50 50');
  anim.setAttribute('to', '360 50 50');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');

  triangle.appendChild(anim);
  svg.appendChild(triangle);

  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawSquareSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%'");
  svg.setAttribute("height", "100%'");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const square = document.createElementNS(svgNS, 'rect');
  square.setAttribute('x', '30');
  square.setAttribute('y', '30');
  square.setAttribute('width', '40');
  square.setAttribute('height', '40');
  square.setAttribute('fill', '#f1c40f');
  const anim = document.createElementNS(svgNS, 'animate');
  anim.setAttribute('attributeName', 'fill');
  anim.setAttribute('values', '#f1c40f;#e67e22;#f1c40f');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');

  square.appendChild(anim);

  svg.appendChild(square);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawDiamondSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const diamond = document.createElementNS(svgNS, 'polygon');
  diamond.setAttribute('points', '50,20 80,50 50,80 20,50');
  diamond.setAttribute('fill', '#9b59b6');

  const anim = document.createElementNS(svgNS, 'animateTransform');
  anim.setAttribute('attributeName', 'fill');
  anim.setAttribute('type', 'scale');
  anim.setAttribute('from', '1');
  anim.setAttribute('to', '1.1');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');
  anim.setAttribute('direction', 'alternate');

  diamond.appendChild(anim);

  svg.appendChild(diamond);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawStarSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const star = document.createElementNS(svgNS, 'polygon');
  star.setAttribute('points', '50,5 20,95 95,35 5,35 80,95');
  star.setAttribute('fill', '#e74c3c');

  const anim = document.createElementNS(svgNS, 'animateTransform');
  anim.setAttribute('attributeName', 'transform');
  anim.setAttribute('type', 'rotate');
  anim.setAttribute('from', '0 50 50');
  anim.setAttribute('to', '-360 50 50');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');

  star.appendChild(anim);

  svg.appendChild(star);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawHexagonSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const hexagon = document.createElementNS(svgNS, 'polygon');
  hexagon.setAttribute('points', '50,15 80,30 80,70 50,85 20,70 20,30');
  hexagon.setAttribute('fill', '#1abc9c');
  const anim = document.createElementNS(svgNS, 'animateTransform');
  anim.setAttribute('attributeName', 'transform');
  anim.setAttribute('type', 'rotate');
  anim.setAttribute('from', '0 50 50');
  anim.setAttribute('to', '360 50 50');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');
  hexagon.appendChild(anim);

  svg.appendChild(hexagon);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawPentagonSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const pentagon = document.createElementNS(svgNS, 'polygon');
  pentagon.setAttribute('points', '50,10 90,40 80,90 20,90 10,40');
  pentagon.setAttribute('fill', '#34495e');

  const anim = document.createElementNS(svgNS, 'animate');
  anim.setAttribute('attributeName', 'fill');
  anim.setAttribute('values', '#34495e;#e67e22;#34495e');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');

  pentagon.appendChild(anim);

  svg.appendChild(pentagon);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawOctagonSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const octagon = document.createElementNS(svgNS, 'polygon');
  octagon.setAttribute('points', '30,10 70,10 90,30 90,70 70,90 30,90 10,70 10,30');
  octagon.setAttribute('fill', '#8e44ad');

  const anim = document.createElementNS(svgNS, 'animateTransform');
  anim.setAttribute('attributeName', 'transform');
  anim.setAttribute('type', 'rotate');
  anim.setAttribute('from', '0 50 50');
  anim.setAttribute('to', '-360 50 50');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');

  octagon.appendChild(anim);

  svg.appendChild(octagon);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawCrossSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const cross = document.createElementNS(svgNS, 'polygon');
  cross.setAttribute('points', '40,20 60,20 60,40 80,40 80,60 60,60 60,80 40,80 40,60 20,60 20,40 40,40');
  cross.setAttribute('fill', '#2c3e50');

  const anim = document.createElementNS(svgNS, 'animate');
  anim.setAttribute('attributeName', 'fill');
  anim.setAttribute('values', '#2c3e50;#95a5a6;#2c3e50');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');

  cross.appendChild(anim);

  svg.appendChild(cross);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawHeartSVG() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const heart = document.createElementNS(svgNS, 'path');
  heart.setAttribute('d', 'M50 20 C 70 0, 90 30, 50 70 C 10 30, 30 0, 50 20');
  heart.setAttribute('fill', '#e74c3c');

  const anim = document.createElementNS(svgNS, 'animateTransform');
  anim.setAttribute('attributeName', 'transform');
  anim.setAttribute('type', 'scale');
  anim.setAttribute('from', '1');
  anim.setAttribute('to', '1.2');
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');
  anim.setAttribute('direction', 'alternate');

  heart.appendChild(anim);

  svg.appendChild(heart);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

function drawSpiralSVG() {
  if (isNaN(bpm)) bpm = 120; 
  
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.style.position = 'absolute';

  const spiral = document.createElementNS(svgNS, 'path');
  spiral.setAttribute('d', 'M50 50 m 0 -40 a 40 40 0 1 0 0 80 a 40 40 0 1 0 0 -80');
  spiral.setAttribute('fill', 'none');
  spiral.setAttribute('stroke', 'rgb(52, 152, 219)');
  spiral.setAttribute('stroke-width', '4');
  spiral.setAttribute('stroke-linecap', 'round');
  spiral.setAttribute('stroke-dasharray', 200);
  spiral.setAttribute('stroke-dashoffset', 200);

  const anim = document.createElementNS(svgNS, 'animate');
  anim.setAttribute('attributeName', 'stroke-dashoffset');
  anim.setAttribute('from', 200);
  anim.setAttribute('to', 0);
  anim.setAttribute('dur', `${60/bpm}s`);
  anim.setAttribute('repeatCount', 'indefinite');

  spiral.appendChild(anim);
  svg.appendChild(spiral);
  backgroundSvg.innerHTML = '';
  backgroundSvg.appendChild(svg);
}

// Load the Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
  const spotifyToken = getSpotifyToken();
  if (spotifyToken) {
    initSpotifyPlayer(spotifyToken);
  }
};

// Initialize Spotify player
function initSpotifyPlayer(token) {
  const player = new Spotify.Player({
    name: 'The Radio Show Player',
    getOAuthToken: cb => { cb(token); }
  });

  player.addListener('ready', ({ device_id }) => {
    console.log('Spotify Player Ready with Device ID:', device_id);
  });

  player.connect();
}

// Get Spotify access token from URL if present
function getSpotifyToken() {
  const params = new URLSearchParams(window.location.hash.substring(1));
  return params.get('access_token');
}

// Add Spotify login button if needed
function loginWithSpotify() {
  const scopes = 'streaming user-read-email user-read-private';
  window.location.href = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=token`;
}

settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

function applyTheme(theme, customColor) {
    let bgColor = '#000';
    let textColor = '#fff';
    let borderColor = '#fff';

    if (theme === 'light') {
        bgColor = '#fff';
        textColor = '#000';
        borderColor = '#000';
    } else if(theme === 'custom' && customColor){
      bgColor = customColor;
      textColor = '#fff';
      borderColor = '#fff';
    }

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = textColor;
    const container = document.querySelector('.container');
    container.style.borderColor = borderColor;

    const playlistContainer = document.querySelector('.playlist-container');
     playlistContainer.style.borderColor = borderColor;

    const playlistItems = document.querySelectorAll('#playlist li');
    playlistItems.forEach(item => {
      item.style.borderColor = borderColor;
    })

    const languageSelect = document.querySelector('.language-selector select');
    languageSelect.style.backgroundColor = bgColor === '#fff' ? '#eee' : '#333';
    languageSelect.style.color = textColor;
    languageSelect.style.borderColor = borderColor;
}

themeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
    const customColor = customColorInput.value;
    applyTheme(selectedTheme, customColor);
  });
});

customColorInput.addEventListener('input', () => {
  const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
  const customColor = customColorInput.value;
    if(selectedTheme === 'custom'){
      applyTheme(selectedTheme, customColor);
    }
});

// Load the Spotify Web Playback SDK
const script = document.createElement('script');
script.src = 'https://sdk.scdn.co/spotify-player.js';
document.head.appendChild(script);