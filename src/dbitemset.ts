// @ts-nocheck
import { parseFunctionFromExpression } from "enketo-core/src/js/utils";
import {
  getChild,
  getSiblingElement,
  elementDataStore as data,
} from "enketo-core/src/js/dom-utils";
import events from "enketo-core/src/js/event";

import { getItemsFromStore } from "./db";

const DB_ITEMSET_TEMPLATE = "local_db";

export default {
  /**
   * @type {Form}
   */
  // this will be populated during form init, but assigning
  // its type here improves intellisense.
  form: {} as any,

  init() {
    if (!this.form) {
      throw new Error(
        "Itemset module not correctly instantiated with form property."
      );
    }

    if (!this.form.features.itemset) {
      this.update = () => {
        // Form noop
      };

      return;
    }
    const that = this;
    this.form.model.events.addEventListener(
      events.DataUpdate().type,
      (event) => {
        that.update.bind(that.form.dbitemset).call(that.form, event.detail);
      }
    );

    this.update();
  },

  /**
   * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
   */
  update(updated = {}) {
    const that = this;
    let nodes;

    if (updated.relevantPath) {
      // Questions that are descendants of a group:
      nodes = this.form
        .getRelatedNodes("data-items-path", ".itemset-template")
        .get()
        .filter(
          (template) =>
            template.querySelector(
              `[type="checkbox"][name^="${updated.relevantPath}/"]`
            ) || // checkboxes, ancestor relevant
            template.querySelector(
              `[type="radio"][data-name^="${updated.relevantPath}/"]`
            ) || //  radiobuttons, ancestor relevant
            template.parentElement.matches(
              `select[name^="${updated.relevantPath}/"]`
            ) || // select minimal, ancestor relevant
            template.parentElement.parentElement.querySelector(
              `input[list][name^="${updated.relevantPath}/"]`
            ) || // autocomplete, ancestor relevant
            template.querySelector(
              `[type="checkbox"][name="${updated.relevantPath}"]`
            ) || // checkboxes, self relevant
            template.querySelector(
              `[type="radio"][data-name="${updated.relevantPath}"]`
            ) || //  radiobuttons, self relevant
            template.parentElement.matches(
              `select[name="${updated.relevantPath}"]`
            ) || // select minimal, self relevant
            template.parentElement.parentElement.querySelector(
              `input[list][name="${updated.relevantPath}"]`
            ) // autocomplete, self relevant
        );

      // TODO: missing case: static shared itemlist in repeat
    } else {
      nodes = this.form
        .getRelatedNodes("data-items-path", ".itemset-template", updated)
        .get();
    }

    if (nodes.length === 0) {
      return;
    }

    nodes.forEach((template) => {
      // Nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
      if (template.closest(".disabled")) {
        return;
      }

      const templateParent = template.parentElement;
      const isShared =
        // Shared itemset datalists and their related DOM elements were
        // previously reparented directly under `repeat-info`. They're
        // now reparented to a container within `repeat-info` to fix a
        // bug when two or more such itemsets are present in the same
        // repeat.
        //
        // The original check for this condition was tightly coupled to
        // the previous structure, leading to errors even after the root
        // cause had been fixed. This has been revised to check for a
        // class explicitly describing the condition it's checking.
        //
        // TODO (2023-08-16): This continues to add to the view's role
        // as a (the) source of truth about both form state and form
        // definition. While expedient, it must be acknowledged as
        // additional technical debt.
        templateParent.classList.contains("repeat-shared-datalist-itemset") ||
        // It's currently unclear whether there are other cases this
        // would still handle. It's currently preserved in case its
        // removal might cause unknown regressions. See
        // https://en.wiktionary.org/wiki/Chesterton%27s_fence
        templateParent.parentElement.matches(".or-repeat-info");
      const inputAttributes = {};

      const newItems = {
        length: 0,
        text: "",
      };
      const prevItems = data.get(template, "items") || {};
      const templateNodeName = template.nodeName.toLowerCase();
      const list = template.parentElement.matches("select")
        ? // we only allow loc appearance
          template.parentElement
        : null;

      if (
        !(
          list &&
          list.parentElement.matches(".or-appearance-" + DB_ITEMSET_TEMPLATE)
        )
      ) {
        return;
      }

      let input;
      if (templateNodeName === "label") {
        const optionInput = getChild(template, "input");
        [].slice.call(optionInput.attributes).forEach((attr) => {
          inputAttributes[attr.name] = attr.value;
        });
        // If this is a ranking widget:
        input = optionInput.classList.contains("ignore")
          ? getSiblingElement(
              optionInput.closest(".option-wrapper"),
              "input.rank"
            )
          : optionInput;
      } else if (list && list.nodeName.toLowerCase() === "select") {
        input = list;
        if (input.matches("[readonly]")) {
          inputAttributes.disabled = "disabled";
        }
      } else if (list && list.nodeName.toLowerCase() === "datalist") {
        if (isShared) {
          // only the first input, is that okay?
          input = that.form.view.html.querySelector(
            `input[name="${list.dataset.name}"]`
          );
        } else {
          input = getSiblingElement(list, "input:not(.widget)");
        }
      }

      const labelsContainer = getSiblingElement(
        template.closest("label, select, datalist"),
        ".itemset-labels"
      );
      const itemsXpath = template.dataset.itemsPath;
      let { labelType } = labelsContainer.dataset;
      let { labelRef } = labelsContainer.dataset;
      // TODO: if translate() becomes official, move determination of labelType to enketo-xslt
      // and set labelRef correct in enketo-xslt
      const matches = parseFunctionFromExpression(labelRef, "translate");
      if (matches.length) {
        labelRef = matches[0][1][0];
        labelType = "langs";
      }

      const { valueRef } = labelsContainer.dataset;

      // Shared datalists are under .or-repeat-info. Context is not relevant as these are static lists (without relative nodes).
      const context = that.form.input.getName(input);
      /*
       * Determining the index is expensive, so we only do this when the itemset is inside a cloned repeat and not shared.
       * It can be safely set to 0 for other branches.
       */
      const index = !isShared ? that.form.input.getIndex(input) : 0;

      const instanceRegex = /instance\(\s*['"]([^'"]+)['"]\s*\)/;
      const parentRegex = /\[\s*(\w+)\s*=\s*([^\]]+)\s*\]/;

      const instanceMatch = itemsXpath.match(instanceRegex);
      const parentMatch = itemsXpath.match(parentRegex);

      const detail = {
        instance: instanceMatch ? instanceMatch[1] : null,
        parent_id: parentMatch ? parentMatch[1] : null,
        parent_value: parentMatch ? parentMatch[2] : null,
      };
      const parentValue =
        (detail.parent_value &&
          (that.form.model.evaluate(detail.parent_value, "number") || -1)) ||
        NaN;
      const message = `Tabel [${detail.instance}] --> ${parentValue}`;
      console.time(message);
      // remove all existing option
      [...list.querySelectorAll(templateNodeName)]
        .filter((el) => el !== template)
        .forEach((el) => el.remove());

      getItemsFromStore(detail.instance, parentValue).then((instanceItems) => {
        console.timeEnd(message);
        // This property allows for more efficient 'itemschanged' detection
        newItems.length = instanceItems.length;
        // TODO: This may cause problems for large itemsets. Use md5 instead?
        newItems.text = instanceItems.map((item) => item.label).join("");
        if (
          newItems.length === prevItems.length &&
          newItems.text === prevItems.text
        ) {
          // check if it's has relevent or not
          return;
        }

        data.put(template, "items", newItems);
        const optionsFragment = document.createDocumentFragment();
        // sort items based on label A-Z
        instanceItems.sort((a, b) => {
          if (a.label < b.label) {
            return -1;
          }
          if (a.label > b.label) {
            return 1;
          }
          return 0;
        });
        instanceItems.forEach((item) => {
          optionsFragment.appendChild(that.createInput(item.name, item.label));
        });
        template.parentNode.appendChild(optionsFragment);
        const currentValue = that.form.model.node(context, index).getVal();
        if (currentValue !== "") {
          that.form.input.setVal(input, currentValue, events.Change());
        }
      });
    });
  },
  createInput(value: number, label: string) {
    const option = document.createElement("option");
    option.textContent = label;
    option.value = String(value);
    return option;
  },
};
