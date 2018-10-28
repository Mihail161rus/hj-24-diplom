'use strict';

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
          history.pushState(null, null, urlImg);

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