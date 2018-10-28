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

/**
 * Удаляем все комментарии на холсте
 */
function delComments() {
  const comments = document.querySelectorAll('.comments__form');

  if (comments) {
    comments.forEach(comment => {
      comment.parentElement.removeChild(comment);
    })
  }
}

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

document.addEventListener('DOMContentLoaded', initApp);