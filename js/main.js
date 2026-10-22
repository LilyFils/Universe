// Polina's Universe — логика трёх сцен и интерактивного неба.

const $ = (id) => document.getElementById(id);

let currentScene = 1;
let progress = 0;
let speechTimer;

// Переключение сцен (плавность задаётся в CSS).
function goToScene(number) {
  if (currentScene === number) return;

  $(`s${currentScene}`).classList.remove('active');
  currentScene = number;
  $(`s${number}`).classList.add('active');
}

$('sky').addEventListener('click', () => goToScene(2));
$('explore').addEventListener('click', () => goToScene(3));

// Секретная реплика собачки.
$('dog').addEventListener('click', (event) => {
  event.stopPropagation();
  $('speech').classList.add('show');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    $('speech').classList.remove('show');
  }, 2200);
});

// Падающие звёзды.
function launchShootingStar(hostId) {
  const host = $(hostId);
  if (!host) return;

  const star = document.createElement('i');
  star.className = 'shooting-star';
  star.style.left = `${70 + Math.random() * 26}%`;
  star.style.top = `${8 + Math.random() * 28}%`;
  star.style.animationDuration = `${3.8 + Math.random() * 2.8}s`;

  host.appendChild(star);
  star.addEventListener('animationend', () => star.remove());
}

['stars1', 'stars2', 'stars3'].forEach((id, index) => {
  const interval = index === 0 ? 4200 : index === 1 ? 5600 : 6500;
  setInterval(() => launchShootingStar(id), interval);
});

// Мерцающие звёзды создаются один раз, чтобы при возврате небо не менялось.
function scatterStars(containerId, count, seed) {
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const container = $(containerId);

  for (let i = 0; i < count; i++) {
    const star = document.createElement('i');
    const size = random() * 1.9 + 0.45;
    let className = 'spark';

    if (size > 1.7 || random() > 0.93) {
      className += ' bright';
    } else if (random() > 0.58) {
      className += ' soft';
    }

    star.className = className;
    star.style.left = `${random() * 100}%`;
    star.style.top = `${random() * 100}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.setProperty('--duration', `${2 + random() * 5.6}s`);
    star.style.setProperty('--drift', `${12 + random() * 18}s`);
    star.style.setProperty('--dx1', `${(random() * 12 - 6).toFixed(2)}px`);
    star.style.setProperty('--dy1', `${(random() * 10 - 5).toFixed(2)}px`);
    star.style.setProperty('--dx2', `${(random() * 14 - 7).toFixed(2)}px`);
    star.style.setProperty('--dy2', `${(random() * 12 - 6).toFixed(2)}px`);
    star.style.animationDelay = `${-random() * 8}s`;
    container.appendChild(star);
  }
}

scatterStars('stars1', 140, 42);
scatterStars('stars2', 220, 17);
scatterStars('stars3', 320, 190);

// Точки каждой буквы созвездия POLINA — специально немного неровные.
const letterPoints = [
  [[0, 90], [0, 0], [44, 0], [54, 20], [44, 44], [0, 44]], // P
  [[0, 20], [14, 0], [43, 0], [57, 20], [57, 71], [43, 90], [14, 90], [0, 71]], // O
  [[0, 0], [0, 90], [52, 90]], // L
  [[0, 0], [42, 0], [21, 0], [21, 90], [0, 90], [42, 90]], // I
  [[0, 90], [0, 0], [52, 90], [52, 0]], // N
  [[0, 90], [25, 0], [55, 90], [12, 56], [43, 56]], // A
];

const letterPositions = [36, 155, 267, 370, 467, 594];
const svg = $('constellation');
const svgNamespace = 'http://www.w3.org/2000/svg';

function createSvgNode(tag, attributes, parent = svg) {
  const element = document.createElementNS(svgNamespace, tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  parent.appendChild(element);
  return element;
}

const drawnLetters = createSvgNode('g', {});
const targets = createSvgNode('g', {});

// Keep the invisible touch target at least 44 CSS pixels wide on phones.
const mobileLayout = window.matchMedia('(max-width:600px)');
function resizeTouchTarget() {
  const hit = targets.querySelector('.target-hit');
  const matrix = svg.getScreenCTM();
  if (!hit || !matrix) return;
  const scale = Math.hypot(matrix.a, matrix.b);
  if (scale > 0) {
    hit.setAttribute('r', mobileLayout.matches ? Math.max(28, 22 / scale) : 28);
  }
}
new ResizeObserver(resizeTouchTarget).observe(svg);
mobileLayout.addEventListener('change', resizeTouchTarget);


const targetCenters = letterPoints.map((points, index) => ({
  x: letterPositions[index] + (index === 3 ? 21 : 26),
  y: 169 + (index % 2 === 0 ? -6 : 8),
}));

// Пока буква не активирована, видна только одна яркая звезда.
function renderTarget() {
  targets.innerHTML = '';
  if (progress >= 6) return;

  const index = progress;
  const center = targetCenters[index];
  const group = createSvgNode('g', {
    role: 'button',
    tabindex: '0',
    'aria-label': `Зажечь звезду ${index + 1}`,
  }, targets);

  createSvgNode('circle', {
    cx: center.x, cy: center.y, r: 25, class: 'target-halo',
  }, group);
  createSvgNode('circle', {
    cx: center.x, cy: center.y, r: 4.3, class: 'target-core',
  }, group);
  createSvgNode('circle', {
    cx: center.x, cy: center.y, r: 28, class: 'target-hit',
  }, group);

  resizeTouchTarget();
  group.addEventListener('click', lightNextLetter);
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      lightNextLetter();
    }
  });
}

// Добавляем линии и светящиеся точки очередной буквы.
function lightNextLetter() {
  if (progress >= 6) return;

  const index = progress;
  const points = letterPoints[index].map(([x, y]) => [
    letterPositions[index] + x,
    124 + y + (index % 2 ? 8 : -6),
  ]);

  const group = createSvgNode('g', { class: 'completed' }, drawnLetters);
  createSvgNode('polyline', {
    points: points.map((point) => point.join(',')).join(' '),
    class: 'letter-line',
  }, group);

  points.forEach(([x, y], pointIndex) => {
    createSvgNode('circle', {
      cx: x, cy: y, r: pointIndex % 3 === 0 ? 4 : 2.7,
      class: 'point-star',
    }, group);
    createSvgNode('circle', {
      cx: x, cy: y, r: 8, fill: '#f6bcf1', opacity: '.11',
    }, group);
  });

  progress++;
  $('progress').textContent = `${progress} / 6 созвездий`;
  renderTarget();

  if (progress === 6) {
    setTimeout(() => $('finish').classList.add('show'), 1900);
  }
}

renderTarget();

// Возврат к началу поздравления.
$('again').addEventListener('click', () => {
  $('finish').classList.remove('show');
  progress = 0;
  drawnLetters.innerHTML = '';
  $('progress').textContent = '0 / 6 созвездий';
  renderTarget();
  goToScene(1);
});
