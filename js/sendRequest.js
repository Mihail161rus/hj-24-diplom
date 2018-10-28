'use strict';

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