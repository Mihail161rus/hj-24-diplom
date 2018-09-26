'use strict';

const urlApi = 'https://neto-api.herokuapp.com',
    currentImage = document.querySelector('.current-image'),
    imgLoader = document.querySelector('.image-loader'),
    appWrap = document.querySelector('.wrap.app'),
    menu = document.querySelector('.menu'),
    btnAddImg = document.querySelector('.new'),
    errorWrap = document.querySelector('.error'),
    errorText = document.querySelector('.error__message'),
    burger = document.querySelector('.burger'),
    commentsForm = document.querySelector('.comments__form');

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
 * Показывает текст ошибки и скрывает через заданный промежуток времени
 * @param text
 * @param delay
 */
function showError(text, delay = 4) {
    errorText.innerText = text;
    showElement(errorWrap);

    setTimeout(function() {
        hideElement(errorWrap);
    }, delay * 1000);
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
        header
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
    sendRequest(`${urlApi}/pic`, 'POST', getBodyForRequest(files))
        .then((result) => {
            //Получаем данные о картинке
            sendRequest(`${urlApi}/pic/${result.id}`, 'GET')
                .then((result) => {
                    imgId = result.id;
                    localStorage.imgId = result.id;
                    localStorage.imgLink = `${window.location.origin}${window.location.pathname}?id=${localStorage.imgId}`;
                    currentImage.src = result.url;
                    hideElement(imgLoader);
                    delComments();
                    currentImage.classList.add('is-loaded');
                });
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

    input.addEventListener('change', event => {
        const files = Array.from(event.currentTarget.files);

        currentImage.src = '';
        showElement(imgLoader);

        sendFile(files);
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
    let urlImgId = url.searchParams.get('id');

    /**
     * Сохраняем id картинки в хранилище
     */
    function saveIdImgFromUrl() {
        if (!urlImgId) {
            return;
        }

        localStorage.imgId = urlImgId;
    }

    saveIdImgFromUrl();

    currentImage.src = '';
    menu.dataset.state = 'initial';
    hideElement(burger);

    if (commentsForm) {
        appWrap.removeChild(commentsForm);
    }

    menu.style.left = localStorage.menuPosLeft;
    menu.style.top = localStorage.menuPosTop;

    if (localStorage.imgId) {
        sendRequest(`${urlApi}/pic/${localStorage.imgId}`, 'GET')
            .then((result) => {
                imgId = result.id;
                localStorage.imgId = result.id;
                localStorage.imgLink = `${window.location.origin}${window.location.pathname}?id=${localStorage.imgId}`;

                hideElement(imgLoader);
                currentImage.src = result.url;
                delComments();
                currentImage.classList.add('is-loaded');
            })
    }
}
//localStorage.clear();
initApp();