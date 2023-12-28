import Widget from "enketo-core/src/js/widget";

/**
 * @class TableWidget
 * @description Since this class has no static selector getter, there will be no attempt to instantiate it.
 */
export default class TableWidget extends Widget {
  static get selector() {
    return '.or-appearance-list-nolabel input[type="number"]';
  }

  _init() {
    const legend = document.createElement("legend");
    legend.append(
      this.question.querySelector(".question-label"),
      this.question.querySelector(".required")
    );
    this.question.prepend(legend);
  }
}
