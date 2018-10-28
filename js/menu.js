'use strict';

/*----------Функционал перетаскивания меню Drag&Drop----------*/
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