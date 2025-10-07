import Widget from "enketo-core/src/js/widget";

class RepeatCollapse extends Widget {
  /**
   * @type {string}
   */
  static get selector() {
    return ".or-appearance-page-only";
  }

  _init() {
    this.element.classList.add("or-repeat-info");
  }
}

export default RepeatCollapse;
