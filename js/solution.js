'use strict';

const URL_API = 'https://neto-api.herokuapp.com/pic',
  URL_WSS = 'wss://neto-api.herokuapp.com/pic',
  MSG_TYPE_COMMENT = 'comment',
  MSG_TYPE_MASK = 'mask',
  MSG_TYPE_PIC = 'pic',
  BRUSH_THICKNESS = 4,
  COLOR_VARIANTS = {red: '#ea5d56', yellow: '#f3d135', green: '#6cbe47', blue: '#53a7f5', purple: '#b36ade'},
  ADD_OFFSET_X = 20;

const currentImage = document.querySelector('.current-image'),
  imgLoader = document.querySelector('.image-loader'),
  appWrap = document.querySelector('.wrap.app'),
  menu = document.querySelector('.menu'),
  btnAddImg = document.querySelector('.new'),
  errorWrap = document.querySelector('.error'),
  errorText = document.querySelector('.error__message'),
  burger = document.querySelector('.burger'),
  menuItems = menu.querySelectorAll('.mode'),
  shareLinkInput = document.querySelector('.menu__url'),
  shareBtn = document.querySelector('.share'),
  copyUrlBtn = document.querySelector('.menu_copy'),
  commentsBtn = document.querySelector('.comments'),
  commentsToggle = document.querySelectorAll('.menu__toggle'),
  commentsRadioOn = document.querySelector('#comments-on'),
  commentsRadioOff = document.querySelector('#comments-off'),
  drawBtn = document.querySelector('.draw'),
  colorControls = document.querySelectorAll('.menu__color');

let canvasWrap,
  canvas = null,
  ctx,
  currentColor = null,
  drawMode = false,
  curves = [],
  needToRedraw = false,
  wssConnection,
  urlImg;

//Переменные нужны для Drag&Drop
let movedPiece = null,
  minY,
  minX,
  maxX,
  maxY,
  shiftX = 0,
  shiftY = 0;

//id картинки, нужен для ссылки "поделиться"
let imgId = null;

/**
 * Скрывает элемент с показа
 * @param el
 */
function hideElement(el) {
  el.style.display = 'none';
}

/**
 * Показывает элемент
 * @param el
 */
function showElement(el) {
  el.style.display = '';
}

/**
 * Показывает текст ошибки
 * @param text
 */
function showError(text) {
  errorText.innerText = text;
  showElement(errorWrap);
}

/**
 * Скрывает блок с ошибкой
 */
function hideError() {
  errorText.innerText = '';
  hideElement(errorWrap);
}

/*----------Начало функционала перетаскивания меню Drag&Drop----------*/
function dragStart(event) {
  if (!event.target.classList.contains('drag')) {
    return;
  }

  movedPiece = event.target.parentElement;
  minX = appWrap.offsetLeft;
  minY = appWrap.offsetTop;
  maxX = appWrap.offsetWidth - (movedPiece.offsetWidth + 1);
  maxY = appWrap.offsetHeight - (movedPiece.offsetHeight + 1);
  shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
  shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
}

function drag(event) {
  if (!movedPiece) {
    return;
  }

  let x = event.pageX - shiftX;
  let y = event.pageY - shiftY;
  x = Math.min(x, maxX);
  y = Math.min(y, maxY);
  x = Math.max(x, minX);
  y = Math.max(y, minY);
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function drop() {
  if (movedPiece) {
    movedPiece = null;

    localStorage.menuPosLeft = menu.style.left;
    localStorage.menuPosTop = menu.style.top;
  }
}

/**
 * Функция "тормозилка"
 * @param func
 * @param delay
 * @returns {Function}
 */
function throttle(func, delay = 0) {
  let isWaiting = false;
  return function () {
    if (!isWaiting) {
      func.apply(this, arguments);
      isWaiting = true;
      setTimeout(() => {
        func.apply(this, arguments);
        isWaiting = false;
      }, delay);
    }
  }
}

document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', throttle(drag));
document.addEventListener('mouseup', drop);

/**
 * Сдвигаем блок меню левее, если он не помещается целиком на экране
 */
function autoMoveMenu() {
  while (menu.offsetHeight > 66) {
    menu.style.left = (appWrap.offsetWidth - menu.offsetWidth) - 1 + 'px';
  }
}

/*----------Режим публикации изображения----------*/
/**
 * Отправляет запрос к API Нетологии
 * @param url
 * @param method
 * @param body
 * @param header
 * @returns {Promise<Response>}
 */
function sendRequest(url, method, body = null, header = {}) {
  const requestParams = {
    credentials: 'same-origin',
    method,
    body,
    headers: header
  };

  return fetch(url, requestParams).then(
    (result) => result.json(),
    (error) => {
      throw new Error(error);
    }
  );
}

/**
 * Удаляет расширение у загружаемого файла
 * @param file
 * @returns {void | string | *}
 */
function delFileExtension(file) {
  const regExp = new RegExp(/\.[^.]+$/gi);

  return file.replace(regExp, '');
}

/**
 * Формирует тело запроса для дальнейшей отправки
 * @param files
 * @returns {FormData}
 */
function getBodyForRequest(files) {
  const formData = new FormData();

  files.forEach(file => {
    const fileName = delFileExtension(file.name);
    formData.append('title', fileName);
    formData.append('image', file);
  });
  return formData;
}

/**
 * Отправляет файл на сервер
 * @param files
 */
function sendFile(files) {
  sendRequest(`${URL_API}`, 'POST', getBodyForRequest(files))
    .then((result) => {
      //Получаем данные о картинке
      sendRequest(`${URL_API}/${result.id}`, 'GET')
        .then((result) => {
          imgId = result.id;
          urlImg = `${window.location.origin}${window.location.pathname}?id=${imgId}`;
          currentImage.src = result.url;

          currentImage.addEventListener('load', () => {
            hideElement(imgLoader);
            delComments();
            currentImage.classList.add('is-loaded');
          });
        })
        .then(initReviewMode);
    });
}

/**
 * Удаляем все комментарии на холсте
 */
function delComments() {
  const comments = document.querySelectorAll('.comments__form');

  if (comments) {
    comments.forEach(comment => {
      appWrap.removeChild(comment);
    })
  }
}

/**
 * Загружаем картинку по нажатию кнопки
 * @param event
 */
function loadImgByBtn(event) {
  event.preventDefault();

  const input = document.createElement('input');
  input.setAttribute('id', 'fileInput');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/jpeg, image/png');
  input.click();
  hideError();
  delComments();

  input.addEventListener('change', (event) => {
    const files = Array.from(event.currentTarget.files);


    files.forEach(file => {
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        if (canvas) {
          canvas.style.background = '';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        currentImage.src = '';
        showElement(imgLoader);

        sendFile(files);
      } else {
        showError('Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png');
      }
    });
  });
}

btnAddImg.addEventListener('click', loadImgByBtn);

/**
 * Загружаем картинку по перетаскиванию на холст
 * @param event
 */
function loadImgByDrag(event) {
  event.preventDefault();

  const files = Array.from(event.dataTransfer.files);

  if (currentImage.classList.contains('is-loaded')) {
    showError('Чтобы загрузить новое изображение используйте пункт "Загрузить новое"');
    return;
  }

  files.forEach(file => {
    if (file.type === 'image/jpeg' || file.type === 'image/png') {
      showElement(imgLoader);
      sendFile(files);
    } else {
      showError('Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png');
    }
  });
}

appWrap.addEventListener('dragover', event => event.preventDefault());
appWrap.addEventListener('drop', loadImgByDrag);

/**
 * Инициализация приложения при старте
 */
function initApp() {
  let currentUrl = `${window.location.href}`;
  let url = new URL(currentUrl);
  imgId = url.searchParams.get('id');

  currentImage.src = '';
  menu.dataset.state = 'initial';
  hideElement(burger);
  delComments();

  menu.style.left = localStorage.menuPosLeft;
  menu.style.top = localStorage.menuPosTop;

  //Если в текущей ссылке есть GET параметр id, то подгружаем соответствующую картинку
  if (imgId) {
    showElement(imgLoader);

    sendRequest(`${URL_API}/${imgId}`, 'GET')
      .then((result) => {
        urlImg = `${window.location.origin}${window.location.pathname}?id=${imgId}`;
        currentImage.src = result.url;

        currentImage.addEventListener('load', () => {
          hideElement(imgLoader);
          delComments();
          currentImage.classList.add('is-loaded');
        });

        return result;
      })
      .then((result) => {
        initReviewMode(result);
      });
  }
}

/*----------Режим рецензирования----------*/
/**
 * Инициализирует режим "Поделиться"
 */
function initShareMode() {
  hideError();

  menuItems.forEach(item => {
    item.dataset.state = '';
    hideElement(item);
  });

  shareLinkInput.value = urlImg;
  shareBtn.dataset.state = 'selected';
  showElement(shareBtn);
  autoMoveMenu();
}

shareBtn.addEventListener('click', initShareMode);

/**
 * Выполняет копирование ссылки из поля "поделиться"
 */
function copyUrl() {
  shareLinkInput.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.log('Ошибка копирования');
  }
  window.getSelection().removeAllRanges();
}

copyUrlBtn.addEventListener('click', copyUrl);

/**
 * Инициализирует режим рецензирования
 * @param data
 */
function initReviewMode(data) {
  let currentUrl = new URL(`${window.location.href}`);
  let urlImgId = currentUrl.searchParams.get('id');

  menu.dataset.state = '';
  showElement(burger);

  if (urlImgId === null) {
    initShareMode(data);
  } else {
    initCommentsMode();
  }

  currentImage.addEventListener('load', () => {
    createCanvasWrap();
    createCanvas();
    createMsg(data);
    wss();
    toggleShowComments(isCommentsActive());
  });
}

/**
 * Открывает все элементы меню по кнопке "бургер"
 */
function showAllItemsMenu() {
  hideError();
  delEmptyChats();

  menuItems.forEach(item => {
    item.dataset.state = '';
    showElement(item);
  });

  autoMoveMenu();
}

burger.addEventListener('click', showAllItemsMenu);

/**
 * Проверяет положение переключателя "показать/скрыть комментарии"
 * @returns {boolean}
 */
function isCommentsActive() {
  if (commentsBtn.dataset.state !== 'selected') {
    return false
  }

  commentsToggle.forEach(input => {
    if (input.value === 'off' && input.checked) {
      return false;
    }
  });
  return true;
}

//Переключатель "показать/скрыть" комментарии на холсте
commentsToggle.forEach(input => {
  delEmptyChats();
  input.addEventListener('click', (event) => {
    hideError();

    const radioValue = event.target.value,
      comments = document.querySelectorAll('.comments__form');

    if (radioValue === 'off') {
      commentsRadioOn.checked = false;
      commentsRadioOff.checked = true;

      comments.forEach(comment => {
        hideElement(comment);
      });
    } else {
      commentsRadioOn.checked = true;
      commentsRadioOff.checked = false;

      comments.forEach(comment => {
        showElement(comment);
      })
    }
  })
});

/**
 * Инициализация режима комментирования
 */
function initCommentsMode() {
  delEmptyChats();

  menuItems.forEach(item => {
    item.dataset.state = '';
    hideElement(item);
  });
  commentsBtn.dataset.state = 'selected';
  showElement(commentsBtn);
  toggleShowComments(isCommentsActive());
  autoMoveMenu();
}

/**
 * Показывает/скрывает комментарии на холсте
 * @param bool
 */
function toggleShowComments(bool) {
  hideError();
  delEmptyChats();

  const comments = document.querySelectorAll('.comments__form');

  if (bool) {
    comments.forEach(comment => {
      showElement(comment);
    });
  } else {
    comments.forEach(comment => {
      hideElement(comment);
    })
  }
}

commentsBtn.addEventListener('click', initCommentsMode);

/**
 * Инициализация режима рисования
 */
function initDrawMode() {
  hideError();

  menuItems.forEach(item => {
    item.dataset.state = '';
    hideElement(item);
  });
  drawBtn.dataset.state = 'selected';
  showElement(drawBtn);
  toggleShowComments(isCommentsActive());
}

drawBtn.addEventListener('click', initDrawMode);

/**
 * Удаляет конкретный чат (если указан аргументом) или все пустые чаты на холсте
 * @param form
 */
function delEmptyChats(form = null) {
  if (form && !form.classList.contains('containsMsg')) {
    canvasWrap.removeChild(form);
    return;
  }

  const comments = document.querySelectorAll('.comments__form');

  if (!comments) {
    return;
  }

  comments.forEach(comment => {
    if (!comment.classList.contains('containsMsg')) {
      comment.parentElement.removeChild(comment);
    }
  });
}

/**
 * Сворачивает открытые комментарии при клике на другой комментарий
 */
function hideAllComments() {
  const commentsList = document.querySelectorAll('.comments__marker-checkbox');

  if (commentsList) {
    commentsList.forEach(comment => {
      comment.checked = false;
    });
  }
}

/*----------Секция с функциями по созданию HTML с нуля----------*/
/**
 * Возвращает структуру формы чата
 * @param posX положение чата по X
 * @param posY положение чата по Y
 * @returns {Object}
 */
function chatFormTemplate(posX, posY) {
  return {
    tag: 'form',
    class: 'comments__form',
    attrs: {
      'data-coordinates': `${posX}_${posY}`,
      style: `top: ${posY}px; left: ${posX}px; z-index: 2`
    },
    content: [
      {
        tag: 'span',
        class: 'comments__marker'
      },
      {
        tag: 'input',
        class: 'comments__marker-checkbox',
        attrs: {
          type: 'checkbox'
        }
      },
      {
        tag: 'div',
        class: 'comments__body',
        content: [
          {
            tag: 'div',
            class: 'comment',
            attrs: {
              style: "display: none"
            },
            content: {
              tag: 'div',
              class: 'loader',
              content: [
                {tag: 'span'},
                {tag: 'span'},
                {tag: 'span'},
                {tag: 'span'},
                {tag: 'span'}
              ]
            }
          },
          {
            tag: 'textarea',
            class: 'comments__input',
            attrs: {
              type: 'text',
              placeholder: 'Напишите ответ...'
            }
          },
          {
            tag: 'input',
            class: 'comments__close',
            attrs: {
              type: 'button',
              value: 'Закрыть'
            }
          },
          {
            tag: 'input',
            class: 'comments__submit',
            attrs: {
              type: 'submit',
              value: 'Отправить'
            }
          }
        ]
      }
    ]
  }
}

/**
 * Возвращает структуру одного сообщения
 * @param msgObj
 * @returns {Object}
 */
function msgTemplate(msgObj) {
  /**
   * Конвертирует дату в читаемый формат из timestamp
   * @param timestamp
   * @returns {string}
   */
  function getFormatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU');
  }

  let msgElTemplate = {
    tag: 'div',
    class: 'comment',
    attrs: {
      'data-timestamp': msgObj.timestamp
    },
    content: [
      {
        tag: 'p',
        class: 'comment__time',
        content: getFormatDate(msgObj.timestamp)
      }
    ]
  };

  msgObj.message.split('\n').forEach(msg => {
    if (!msg) {
      msgElTemplate.content.push({tag: 'br'});
    }
    msgElTemplate.content.push({
      tag: 'p',
      class: 'comment__message',
      content: msg
    });
  });

  return msgElTemplate;
}

/**
 * Возвращает структуру элемента canvas
 * @param width
 * @param height
 * @returns {Object}
 */
function canvasTemplate(width, height) {
  return {
    tag: 'canvas',
    attrs: {
      'width': width,
      'height': height,
      style: 'position: absolute; top: 0px; left: 0px; z-index: 1; display: block; width: 100%; height: 100%;'
    }
  }
}

/**
 * Возвращает структуру обертки canvas
 * @param width
 * @param height
 * @returns {Object}
 */
function canvasWrapTemplate(width, height) {
  return {
    tag: 'div',
    attrs: {
      style: `position: absolute; top: 50%; left: 50%; display: block; width: ${width}; height: ${height}; transform: translate(-50%, -50%);`
    }
  }
}

/**
 * Создает HTML элемент на основе шаблона
 * @param objTemplate
 * @returns {*} html node
 */
function createElementFromTemplate(objTemplate) {
  if ((objTemplate === undefined) || (objTemplate === null) || (objTemplate === false)) {
    return document.createTextNode('');
  }

  if ((typeof objTemplate === 'string') || (typeof objTemplate === 'number') || (typeof objTemplate === true)) {
    return document.createTextNode(objTemplate);
  }

  if (Array.isArray(objTemplate)) {
    return objTemplate.reduce(function (fragment, currentItem) {
      fragment.appendChild(createElementFromTemplate(currentItem));
      return fragment;
    }, document.createDocumentFragment());
  }

  const element = document.createElement(objTemplate.tag);
  element.classList.add(...[].concat(objTemplate.class || []));

  if (objTemplate.attrs) {
    Object.keys(objTemplate.attrs).forEach(key => {
      element.setAttribute(key, objTemplate.attrs[key]);
    });
  }

  if (objTemplate.content) {
    element.appendChild(createElementFromTemplate(objTemplate.content));
  }

  return element;
}
/*----------Конец секции с функциями по созданию HTML с нуля----------*/


/**
 * Создает новую форму чата
 * @param posX
 * @param posY
 * @returns {*}
 */
function createNewChatForm(posX, posY) {
  delEmptyChats();
  const newChatForm = createElementFromTemplate(chatFormTemplate(posX, posY));
  const newFormCheckbox = newChatForm.querySelector('.comments__marker-checkbox');

  //Открываем/закрываем окно чата по клику
  newFormCheckbox.addEventListener('click', () => {
    delEmptyChats();
    const isChecked = newFormCheckbox.checked;
    hideAllComments();
    newFormCheckbox.checked = isChecked;
  });

  //Отправляем сообщение по клику на кнопку "отправить"
  const btnSubmit = newChatForm.querySelector('.comments__submit');

  btnSubmit.addEventListener('click', (event) => {
    event.preventDefault();

    const newFormTextArea = newChatForm.querySelector('.comments__input'),
      newFormLoader = newChatForm.querySelector('.loader'),
      msgText = newFormTextArea.value,
      msgParams = `message=${msgText}&left=${posX}&top=${posY}`;

    if (!msgText) {
      return;
    }

    showElement(newFormLoader.parentNode);
    newFormTextArea.value = '';

    const headerForSendMsg = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    sendRequest(`${URL_API}/${imgId}/comments`, 'POST', msgParams, headerForSendMsg)
      .then((result) => {
        hideElement(newFormLoader.parentNode);
        addMsgToChat(newChatForm, result);
      })
  });

  //Сворачиваем чат с сообщениями по кнопке "закрыть"
  const btnClose = newChatForm.querySelector('.comments__close');

  btnClose.addEventListener('click', (event) => {
    event.preventDefault();

    newFormCheckbox.checked = false;
    delEmptyChats(newChatForm);
  });

  return newChatForm;
}

/**
 * Добавляет новый комментарий в форму чата
 * @param form
 * @param msgList
 */
function addMsgToChat(form, msgList) {
  const formCoordinates = form.dataset.coordinates;
  let msgIdList = [];

  //Получаем для каждого сообщения timestamp
  form.querySelectorAll('.comment').forEach(comment => {
    if (comment.dataset.timestamp) {
      msgIdList.push(Number(comment.dataset.timestamp));
    }
  });

  let commentsList = msgList['comments'],
    msgObjectList = {};

  for (let i in commentsList) {
    const comment = commentsList[i],
      key = `${comment.left}_${comment.top}`;

    if (msgObjectList[key]) {
      msgObjectList[key].push(comment);
    } else {
      msgObjectList[key] = [comment];
    }
  }

  for (let key in msgObjectList) {
    if (key === formCoordinates) {
      for (let msg in msgObjectList[key]) {
        const timeStamp = msgObjectList[key][msg].timestamp;

        if (msgIdList.indexOf(timeStamp) === -1) {
          const tempMsg = msgTemplate(msgObjectList[key][msg]),
            msgNode = createElementFromTemplate(tempMsg),
            lastChild = form.querySelector('.comments__body .loader').parentNode;

          form.querySelector('.comments__body').insertBefore(msgNode, lastChild);
          form.classList.add('containsMsg');
        }
      }
    }
  }
}

/**
 * Создает сообщение из словаря данных полученного от API
 * @param data
 */
function createMsg(data) {
  if (!data) {
    return;
  }

  let commentsList = data['comments'],
    msgObjectList = {};

  for (let i in commentsList) {
    const comment = commentsList[i],
      key = `${comment.left}_${comment.top}`;

    if (msgObjectList[key]) {
      msgObjectList[key].push(comment);
    } else {
      msgObjectList[key] = [comment];
    }
  }

  for (let key in msgObjectList) {
    const {left, top} = msgObjectList[key][0],
      formTemp = createNewChatForm(left, top);

    for (let msg in msgObjectList[key]) {
      const tempMsg = msgTemplate(msgObjectList[key][msg]),
        msgNode = createElementFromTemplate(tempMsg),
        lastChild = formTemp.querySelector('.comments__body .loader').parentNode;

      formTemp.querySelector('.comments__body').insertBefore(msgNode, lastChild);
      formTemp.classList.add('containsMsg');
    }
    canvasWrap.appendChild(formTemp);
  }
  toggleShowComments(isCommentsActive());
}

/**
 * Создает веб сокет соединение
 */
function wss() {
  wssConnection = new WebSocket(`${URL_WSS}/${imgId}`);

  wssConnection.addEventListener('message', (event) => {
    let msgData = JSON.parse(event.data),
      msgType = msgData.event;

    const {comment, pic, url} = msgData;

    switch (msgType) {
      case MSG_TYPE_COMMENT: {
        const {left, top} = comment,
          commentForms = document.querySelectorAll('.comments__form'),
          formName = `${left}_${top}`;

        let formWork = null,
          needNewForm = true;

        if (commentForms.length) {
          commentForms.forEach(form => {
            if (formName === form.dataset.coordinates) {
              needNewForm = false;
              formWork = form;
            }
          });
        }

        if (needNewForm) {
          formWork = createNewChatForm(left, top);
          canvasWrap.appendChild(formWork);
        }

        //Приводим к единому шаблону данных
        let msgTemplate = {'comments': {'comment': comment}};

        addMsgToChat(formWork, msgTemplate);
        toggleShowComments(isCommentsActive());
        break;
      }
      case MSG_TYPE_MASK: {
        canvas.style.background = `url(${url})`;
        break;
      }
      case MSG_TYPE_PIC: {
        canvas.style.background = pic.mask ? `url(${pic.mask})` : '';
        break;
      }
    }
  });
}

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
    if (drawBtn.dataset.state !== 'selected'){
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

document.addEventListener('DOMContentLoaded', initApp);