'use strict';

const urlApi = 'https://neto-api.herokuapp.com',
    currentImage = document.querySelector('.current-image'),
    imgLoader = document.querySelector('.image-loader'),
    appWrap = document.querySelector('.wrap.app'),
    menu = document.querySelector('.menu');

//Переменные нужны для Drag&Drop
let movedPiece = null,
    minY,
    minX,
    maxX,
    maxY,
    shiftX = 0,
    shiftY = 0;

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