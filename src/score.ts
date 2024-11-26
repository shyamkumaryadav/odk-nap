import { getAncestors, getSiblingElement } from "enketo-core/src/js/dom-utils";
// @ts-ignore
import { Form } from "enketo-core";

interface SUBMIT_SCORE {
  name: string;
  label: string;
  score: number;
  total_score: number;
  children?: SUBMIT_SCORE[];
}

interface SCORE_FIELD {
  score: number;
  /**
   * name typo just for log use so that this come after score field
   */
  score_total: number;
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

type TOC_ITEMS = TOC_ITEM[];

export default {
  tocItems: [],
  form: null,
  nodeName: "data",
  getName(el) {
    const name =
      el.getAttribute("name") ||
      el
        .querySelector("label.contains-ref-target")
        ?.getAttribute("data-contains-ref-target") ||
      "";
    return name;
  },
  getTitle(el) {
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
  getScore() {
    this.getToc();

    const that = this;

    function calculateScores(tocItems: TOC_ITEMS) {
      for (const tocItem of tocItems) {
        if (tocItem.name) {
          if (tocItem.children && tocItem.children.length > 0) {
            // Recursively calculate scores for children
            calculateScores(tocItem.children);
            // Calculate total score as sum of children's scores
            const { score, total } = tocItem.children.reduce(
              (acc: { score: number; total: number }, item) => {
                acc.score += item.score;
                acc.total += item.score_total;
                return acc;
              },
              { score: 0, total: 0 }
            );

            tocItem.score = score;
            tocItem.score_total = total;

            const repeat = [...tocItem.element.children].filter((node) => {
              return node.classList?.contains("or-repeat");
            });

            if (repeat.length > 0) {
              const maxCount =
                that.form.model.evaluate(`count(${tocItem.name})`, "number") ||
                1;

              tocItem.score = score / maxCount;
              tocItem.score_total = total / maxCount;
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
                .evaluate(calculate_name, "string")
                .split(" ")
                .map((v: string) => Number(v));
              if (calculate_value.length === 2) {
                tocItem.score = calculate_value[0];
                tocItem.score_total = calculate_value[1];
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

              let instanceName = tocItem.element
                .querySelector("label.contains-ref-target")!
                .getAttribute("data-items-path")!;

              const instanceNameRegex = /instance\('(.*)'\)\/root\/item/;
              const instanceNameMatch = instanceName.match(instanceNameRegex);
              if (instanceNameMatch) {
                instanceName = instanceNameMatch[0];
              }

              tocItem.score_total =
                that.form.model.evaluate(
                  `${isMulti ? "sum" : "max"}(${instanceName}/jr:score)`,
                  "number"
                ) || 0;

              if (tocItem.score_total > 0) {
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
          }
        }
      }
    }

    const _tocItems = this.tocItems.filter((item) => item.name !== "");

    calculateScores(_tocItems);

    // remove items with score_total = 0
    const removeItems = (tocItems: TOC_ITEMS) => {
      for (let i = 0; i < tocItems.length; i++) {
        if (tocItems[i].score_total === 0) {
          tocItems.splice(i, 1);
          i--;
        } else {
          if (tocItems[i].children) {
            removeItems(tocItems[i].children as TOC_ITEMS);
          }
        }
      }
    };
    removeItems(_tocItems);

    // Filter out items that have no parent
    return _tocItems.filter((tocItem) => !tocItem.level);
  },
  getToc() {
    this.nodeName = this.form.model.node().getElement().nodeName;
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
        score_total: 0,
      });
    });

    const _maxTocLevel = Math.max(...tocItems.map((el) => el.level));
    const newTocParents = tocItems.filter(
      (item) =>
        item.level < _maxTocLevel && item.element.classList.contains("or-group")
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
      map.get(parentId)!.push(tocItem);
    }

    // Second pass: Append child TOC items to their respective parent's 'child' array
    for (const tocItem of tocItems) {
      const parentId = tocItem.tocId;
      if (map.has(parentId)) {
        tocItem.children = map.get(parentId)!;
      }
    }

    this.tocItems = tocItems.filter(
      (item) => !item.element.classList.contains("non-select")
    );
  },
  logTOC() {
    const _X = this.form;
    // Create a new window
    const newWindow = window.open(
      "",
      _X.surveyName,
      "width=800,height=600,popup"
    );

    const _tocItems = this.getScore();

    // Calculate total score and total score_total
    const { score, total } = _tocItems.reduce(
      (acc, item) => {
        acc.score += item.score;
        acc.total += item.score_total;
        return acc;
      },
      { score: 0, total: 0 }
    );

    // Check if the new window is opened
    if (newWindow) {
      // Generate HTML content for the new window
      let htmlContent = `<!DOCTYPE html><html><head><title>${_X.surveyName}</title></head><style>span:hover { background-color: #58e94759; }</style><body>
                      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
                      <caption>${_X.surveyName} (${_X.version}) <button onclick="window.print()">Print</button></caption>
                      <thead><tr><th>ID</th><th>Name</th><th>Score</th><th>Total Score</th></tr></thead><tbody>`;

      function extractSuffixAndText(text: string) {
        const regex = /^([A-Z](?:\.\d+)*)(\.?)\s*(.*)$/;
        const match = text.match(regex);

        if (match) {
          let suffix = match[1];
          if (match[2]) {
            suffix = suffix.replace(/\.$/, ""); // Remove trailing dot from suffix if it exists
          }
          // Ensure that the suffix and text are correct
          return [["<b>", "</b>"].join(suffix), match[3].trim() || null];
        } else {
          // If no valid suffix pattern is matched, return entire text as the second part
          return [null, text.trim() || null];
        }
      }

      _tocItems.forEach((item) => {
        const [suffix, text] = extractSuffixAndText(item.label);
        htmlContent += `<tr title="${item.label}"><td><a href="#${item.name}">${suffix}</td><td>${text}</td><td>${item.score}</td><td>${item.score_total}</td></tr>`;
      });

      htmlContent += `</tbody><tfoot><tr><td>Parentage</td><td>${(
        (score * 100) / total || 0
      ).toFixed(
        1
      )} %</td><td>${score}</td><td>${total}</td></tr></tfoot></table>`;

      htmlContent += `<pre style="line-height: 1rem;background-image: linear-gradient(180deg, #eee 50%, #fff 50%); background-size: 100% 2rem; overflow: auto;">`;

      // Recursive function to build HTML content
      function buildHtml(tocItems: TOC_ITEMS, prefix = ""): void {
        tocItems.forEach((item, index) => {
          const isLast = index === tocItems.length - 1;
          const currentPrefix = prefix + (isLast ? "└───" : "├───");
          const isMulti =
            !item.children &&
            !!item.element.querySelector("input[type=checkbox]");

          const styles = isMulti ? ["<mark><u>", "</u></mark>"] : ["", ""];
          htmlContent += `<span data-info='${JSON.stringify(
            {
              ...item,
              element: undefined,
              children: undefined,
              parent: undefined,
              tocId: undefined,
              tocParentId: undefined,
              nodeName: _X.score.nodeName,
            },
            null,
            2
          )}' id="${
            item.name
          }" style="cursor: pointer;" onclick="alert(this.dataset.info);">${currentPrefix} [${
            item.score
          }/${item.score_total}] ${styles.join(
            extractSuffixAndText(item.label).join(
              (item.element.closest(".or-repeat") ? ` [${item.ind}]` : "") +
                " --> "
            )
          )}</span>\n`;

          if (item.children) {
            const childPrefix = prefix + (isLast ? "    " : "│   ");
            buildHtml(item.children, childPrefix);
          }
        });
      }

      // Build the HTML content
      buildHtml(_tocItems);

      // Close the <pre> tag and add the closing HTML tags
      htmlContent += "</pre></body></html>";

      // Write the HTML content to the new window
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      console.error("Failed to open a new window.");
    }
  },
  getSubmitDict() {
    const result = this.getScore();
    const nodeName = this.nodeName;
    const getDict = ({
      name,
      label,
      score,
      score_total,
      children,
    }: TOC_ITEM): SUBMIT_SCORE => {
      return {
        name: name.replace(["/", "/"].join(nodeName), ""),
        label,
        score,
        total_score: score_total,
        ...(children ? { children: children.map(getDict) } : {}),
      };
    };
    return [
      {
        name: nodeName,
        label: "A. Overall Score",
        score: result.reduce((acc, item) => acc + item.score, 0),
        total_score: result.reduce((acc, item) => acc + item.score_total, 0),
      },
      ...result.map<SUBMIT_SCORE>(getDict),
    ];
  },
} as {
  /**
   * The form object.
   */
  form: typeof Form;
  /**
   * An array of table of contents (TOC) items.
   */
  tocItems: TOC_ITEMS;
  /**
   * The name of the XML node.
   */
  nodeName: string;
  /**
   * Calculates the scores for the TOC items.
   */
  getScore: () => TOC_ITEMS;
  /**
   * Generates the table of contents (TOC) based on the form structure.
   */
  getToc: () => void;
  /**
   * Gets the title of an element.
   * @param el - The element.
   * @returns The title text.
   */
  getTitle: (el: TOC_ITEM["element"]) => string;
  /**
   * Gets the name attribute of an element.
   * @param el - The element.
   * @returns The name attribute value.
   */
  getName: (el: TOC_ITEM["element"]) => string;
  /**
   * Logs the table of contents (TOC) in a new window.
   */
  logTOC: () => void;
  getSubmitDict: () => SUBMIT_SCORE[];
};
