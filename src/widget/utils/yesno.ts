import Widget from "enketo-core/src/js/widget";
/**
 * @class CYWidget
 * @description Since this class has no static selector getter, there will be no attempt to instantiate it.
 */
export default class CYWidget extends Widget {
  static get selector() {
    return '.or-appearance-calculate input[type="number"]';
  }

  _init() {
    this.question.classList.add("hidden");
    // get hint text
    const hintText = this.question.querySelector(".or-hint").innerText;
    this.element.setAttribute("data-calculate", hintText);
  }
}
