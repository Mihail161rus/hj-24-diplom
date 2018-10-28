'use strict';

/*----------Режим рисования----------*/
//Осуществляем выбор цвета для рисования
colorControls.forEach(color => {
  if (color.checked) {
    currentColor = COLOR_VARIANTS[color.value];
  }

  color.addEventListener('click', (event) => {
    currentColor = COLOR_VARIANTS[event.target.value];
  });
});

/**
 * Создаем обертку для канваса
 */
function createCanvasWrap() {
  let currentCanvas = document.querySelector('canvas');

  if (currentCanvas) {
    currentCanvas.parentElement.removeChild(currentCanvas);
  }

  const {width, height} = getComputedStyle(currentImage);

  canvasWrap = createElementFromTemplate(canvasWrapTemplate(width, height));
  appWrap.appendChild(canvasWrap);
}

/**
 * Создаем холст канваса
 */
function createCanvas() {
  let currentCanvas = document.querySelector('canvas');

  if (currentCanvas) {
    currentCanvas.parentElement.removeChild(currentCanvas);
  }

  const {width, height} = getComputedStyle(currentImage);
  curves = [];

  canvas = createElementFromTemplate(canvasTemplate(width, height));
  ctx = canvas.getContext('2d');
  canvasWrap.appendChild(canvas);

  //Нажали на кнопку мыши
  canvas.addEventListener("mousedown", (event) => {
    if (drawBtn.dataset.state !== 'selected') {
      return;
    }

    event.preventDefault();
    drawMode = true;

    const curve = [];
    curve.color = currentColor;
    curve.push([event.offsetX, event.offsetY]);
    curves.push(curve);
    needToRedraw = true;
  });

  //Отпустили кнопку мыши
  canvas.addEventListener("mouseup", () => {
    ctx.closePath();
    drawMode = false;
  });

  //Вышли за границы холста канваса
  canvas.addEventListener("mouseleave", () => {
    drawMode = false;
  });

  //Потянули мышь с нажатой клавишей
  canvas.addEventListener("mousemove", (event) => {
    if (drawBtn.dataset.state !== 'selected' || !drawMode) {
      return;
    }

    const point = [event.offsetX, event.offsetY];
    curves[curves.length - 1].push(point);
    needToRedraw = true;
    debounceSendMask();
  });

  //Добавили новую форму комментария по клику
  canvas.addEventListener('click', (event) => {
    if (isCommentsActive()) {
      let {offsetX, offsetY} = event,
        newForm = canvasWrap.appendChild(createNewChatForm(offsetX - ADD_OFFSET_X, offsetY));

      hideAllComments();
      newForm.querySelector('.comments__marker-checkbox').checked = true;
    }
  });
}

/*Начало секции - функции для правильной отрисовки сплошной линии на канвасе*/
function circle(point) {
  ctx.beginPath();
  ctx.arc(...point, BRUSH_THICKNESS / 2, 0, 2 * Math.PI);
  ctx.fill();
}

function smoothCurveBetween(p1, p2) {
  const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
  ctx.quadraticCurveTo(...p1, ...cp);
}

function smoothCurve(points) {
  ctx.beginPath();
  ctx.lineWidth = BRUSH_THICKNESS;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.moveTo(...points[0]);

  for (let i = 1; i < points.length - 1; i++) {
    smoothCurveBetween(points[i], points[i + 1]);
  }

  ctx.stroke();
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  curves.forEach((curve) => {
    ctx.strokeStyle = curve.color;
    ctx.fillStyle = curve.color;
    circle(curve[0]);
    smoothCurve(curve);
  });
}

function tick() {
  if (needToRedraw) {
    redraw();
    needToRedraw = false;
  }

  window.requestAnimationFrame(tick);
}

/*Конец секции - функции для правильной отрисовки сплошной линии на канвасе*/

/**
 * Отправляем маску канваса на сервер через wss
 */
function sendMaskToServer() {
  canvas.toBlob((blob) => wssConnection.send(blob));
}

/**
 * Задержка запуска функции
 * @param functionName
 * @param delay
 * @returns {Function}
 */
function debounce(functionName, delay = 0) {
  let timeout;

  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      functionName();
    }, delay);
  };
}

const debounceSendMask = debounce(sendMaskToServer, 2000);

tick();