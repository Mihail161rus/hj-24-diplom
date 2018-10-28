'use strict';

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