'use strict';

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
    class: 'wrap__canvas',
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