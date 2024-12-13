import { getAncestors, getSiblingElement } from "enketo-core/src/js/dom-utils";
// @ts-ignore
import { Form } from "enketo-core";

export interface SCORE_FIELD {
  score: number;
  personal: number;
  max: number;
  max_personal: number;
}

interface TOC_ITEM extends SCORE_FIELD {
  tocParentId: number | null;
  parent: HTMLElement | null;
  tocId: number;
  level: number;
  element: Element;
  label: string;
  name: string;
  /**
   * index of the element in the repeat group
   */
  ind: number;
  children?: TOC_ITEM[];
}

export type TOC_ITEMS = TOC_ITEM[];

interface SUBMIT_SCORE extends SCORE_FIELD {
  name: string;
  label: string;
}

export default {
  /**
   * @type {Form}
   */
  // this will be populated during form init, but assigning
  // its type here improves intellisense.
  form: {} as typeof Form,

  /**
   * @type {boolean}
   * Whether the score module is active.
   */
  active: false,

  init() {
    if (!this.form) {
      throw new Error(
        "Score module not correctly instantiated with form property."
      );
    }
    this.active =
      this.form.model.evaluate(
        "boolean(sum(/model/instance/root/item/jr:score))",
        "boolean"
      ) || this.form.view.$.find(".or-appearance-score").length > 0;
  },

  getName(el: Element) {
    const name =
      el.getAttribute("name") ||
      el
        .querySelector("label.contains-ref-target")
        ?.getAttribute("data-contains-ref-target") ||
      el.getAttribute("data-contains-ref-target") ||
      "";
    return name;
  },
  getTitle(el: Element) {
    let tocItemText = "";
    const labelEl = el.querySelector(".question-label.active");
    if (labelEl && labelEl.textContent) {
      tocItemText = labelEl.textContent;
    } else {
      const hintEl = el.querySelector(".or-hint.active");
      if (hintEl && hintEl.textContent) {
        tocItemText = hintEl.textContent;
      }
    }
    return tocItemText.trim();
  },
  getTocItems() {
    const tocItems: TOC_ITEMS = [];

    const tocElements = [
      ...(this.form.view.$[0] as HTMLFormElement).querySelectorAll(
        '.question:not([role="comment"]), .or-group'
      ),
    ]
      .filter(
        (tocEl) =>
          // !tocEl.closest('.disabled') &&
          tocEl.matches(".question") ||
          // tocEl.querySelector(".question:not(.disabled)") ||
          tocEl.querySelector(".question:not(.non-select)") ||
          // or-repeat-info is only considered a page by itself if it has no sibling repeats When there are siblings repeats, we use CSS trickery to show the + button underneath the last repeat.
          (tocEl.matches(".or-repeat-info") &&
            !getSiblingElement(tocEl, ".or-repeat"))
      )
      .filter((tocEl) => !tocEl.classList.contains("or-repeat-info"));

    tocElements.forEach((element, index) => {
      const groupParents = getAncestors(element, ".or-group");
      tocItems.push({
        element,
        level: groupParents.length,
        parent:
          groupParents.length > 0
            ? groupParents[groupParents.length - 1]
            : null,
        tocId: index,
        tocParentId: null,
        name: this.getName(element),
        ind: this.form.repeats.getIndex(element.closest(".or-repeat")),
        label: this.getTitle(element),
        score: 0,
        personal: 0,
        max: 0,
        max_personal: 0,
      });
    });

    const _maxTocLevel = Math.max(...tocItems.map((el) => el.level));
    const newTocParents = tocItems.filter(
      (item) =>
        item.level < _maxTocLevel &&
        item.element.classList.contains("or-group") &&
        !item.element.classList.contains("or-appearance-zero")
    );

    tocItems.forEach((item) => {
      const parentItem = newTocParents.find(
        (parent) => item.parent === parent.element
      );
      if (parentItem) {
        item.tocParentId = parentItem.tocId;
      }
    });

    const map = new Map<TOC_ITEM["tocParentId"], TOC_ITEMS>(); // Using a Map to efficiently group TOC items by their parent ID

    // First pass: Group TOC items by their parent ID
    for (const tocItem of tocItems) {
      const parentId = tocItem.tocParentId;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)?.push(tocItem);
    }

    // Second pass: Append child TOC items to their respective parent's 'child' array
    for (const tocItem of tocItems) {
      const parentId = tocItem.tocId;
      if (map.has(parentId)) {
        tocItem.children = map.get(parentId);
      }
    }

    return tocItems
      .filter(
        (item) =>
          !item.element.classList.contains("non-select") ||
          item.element.classList.contains("or-appearance-score")
      )
      .filter((item) => item.name !== "");
  },

  /**
   * Calculates the scores for the TOC items.
   */
  getScore(debug = false) {
    const nodeName = this.form.model.node().getElement().nodeName;
    const tocItems = this.getTocItems();

    const that = this;

    function calculateScores(tocItems: TOC_ITEMS) {
      for (const tocItem of tocItems) {
        if (tocItem.name) {
          if (tocItem.children && tocItem.children.length > 0) {
            // Recursively calculate scores for children
            calculateScores(tocItem.children);
            // Calculate total score as sum of children's scores
            const { score, personal, max_personal, max } =
              tocItem.children.reduce<SCORE_FIELD>(
                (acc, item) => {
                  acc.score += item.score;
                  acc.personal += item.personal;
                  acc.max += item.max;
                  acc.max_personal += item.max_personal;
                  return acc;
                },
                { score: 0, personal: 0, max: 0, max_personal: 0 }
              );
            const maxCount =
              that.form.model.evaluate(`count(${tocItem.name})`, "number") || 1;

            tocItem.score = score / maxCount;
            tocItem.personal = personal / maxCount;
            tocItem.max = max / maxCount;
            tocItem.max_personal = max_personal / maxCount;

            if (tocItem.element.classList.contains("disabled")) {
              tocItem.score = 0;
              tocItem.personal = 0;
            }
          } else {
            let calculate_name = "";
            if (!!tocItem.element.closest(".or-repeat")) {
              const name = tocItem.name;
              const number = tocItem.ind + 1;
              calculate_name = name + "_score" + "[" + number + "]";
            } else {
              calculate_name = tocItem.name + "_score";
            }
            // first check if the calculation for this field present if yes calculate the score
            // find the field in xml model if not found then it is going to default calculation
            if (
              that.form.model
                .node("/model/instance[1]/" + calculate_name)
                .getElement()
            ) {
              const calculate_value = that.form.model
                .evaluate(
                  that.form.view.$.find(
                    `.calculation [name='${calculate_name}']`
                  ).attr("data-calculate"),
                  "string"
                )
                .split(" ")
                .map((v: string) => Number(v));
              if (calculate_value.length === 2) {
                tocItem.score = calculate_value[0];
                tocItem.max = calculate_value[1];
              }
            } else {
              const isMulti = !!tocItem.element.querySelector(
                "input[type=checkbox]"
              );
              const model_name =
                tocItem.name +
                (!!tocItem.element.closest(".or-repeat")
                  ? `[${tocItem.ind + 1}]`
                  : "");
              const value = that.form.model.evaluate(model_name, "string");

              let instanceName =
                tocItem.element
                  .querySelector("label.contains-ref-target")
                  ?.getAttribute("data-items-path") || "";

              const instanceNameRegex = /instance\('(.*)'\)\/root\/item/;
              const instanceNameMatch = instanceName.match(instanceNameRegex);
              if (instanceNameMatch) {
                instanceName = instanceNameMatch[0];
              }

              tocItem.max =
                that.form.model.evaluate(
                  `${isMulti ? "sum" : "max"}(${instanceName}/jr:score)`,
                  "number"
                ) || 0;

              if (tocItem.max > 0) {
                tocItem.score = value
                  ? that.form.model.evaluate(
                      `sum(${instanceName}[${value
                        .split(" ")
                        .map((v: string) => `contains(name, "${v}")`)
                        .join(" or ")}]/jr:score)`,
                      "number"
                    ) || 0
                  : 0;
              }
            }

            if (tocItem.element.classList.contains("disabled")) {
              tocItem.score = 0;
            }
            // update personal score
            const isScoreZero =
              that.form.model
                .evaluate(tocItem.name, "node")
                ?.getAttribute("score") === "0";

            tocItem.personal = isScoreZero ? 0 : tocItem.score;
            tocItem.max_personal = isScoreZero ? 0 : tocItem.max;
          }
        }
      }
    }

    calculateScores(tocItems);

    // remove items with max = 0
    const removeItems = (tocItems: TOC_ITEMS) => {
      for (let i = 0; i < tocItems.length; i++) {
        if (tocItems[i].max === 0) {
          tocItems.splice(i, 1);
          i--;
        } else {
          if (tocItems[i].children) {
            removeItems(tocItems[i].children as TOC_ITEMS);
          }
        }
      }
    };
    removeItems(tocItems);

    // Filter out items that have no parent
    return debug
      ? tocItems.filter((tocItem) => !tocItem.level)
      : tocItems
          .filter((tocItem) => !tocItem.level)
          .map<SUBMIT_SCORE>(
            ({ label, name, score, personal, max, max_personal }) => ({
              label,
              name: name.replace(["/", "/"].join(nodeName), ""),
              score,
              personal,
              max,
              max_personal,
            })
          );
  },
};
