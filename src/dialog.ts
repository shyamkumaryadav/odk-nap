/**
 * This placeholder module is meant to be overwritten with one that uses the app's own dialogs.
 *
 * @module dialog
 */

/**
 * @typedef DialogContentObj
 * @property {string} message
 * @property {string} heading
 */

interface DialogContentObj {
  message: string;
  msg?: string;
  heading: string;
}

/**
 * @static
 * @param {string | DialogContentObj} content - Dialog content
 */
function alert(content: string | DialogContentObj) {
  window.alert(content);

  return Promise.resolve();
}

/**
 * @static
 * @param {string | DialogContentObj} content - Dialog content
 */
function confirm(content: string | DialogContentObj) {
  if (typeof content === "object") {
    content = content.msg ?? content.message;
  }
  return Promise.resolve(window.confirm(content));
}

/**
 * @static
 * @param {string | DialogContentObj} content - Dialog content
 * @param {string} def - Default input value
 */
function prompt(content: string | DialogContentObj, def: string) {
  if (typeof content === "object") {
    content = content.message;
  }
  return Promise.resolve(window.prompt(content, def));
}

export default {
  alert,
  confirm,
  prompt,
};
