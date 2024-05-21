import event from "enketo-core/src/js/event";
// @ts-ignore
import { Form } from "enketo-core";
import { getAncestors, getSiblingElement } from "enketo-core/src/js/dom-utils";
import { transform } from "enketo-transformer/web";
import "./styles/main.scss";

import { xmlDebug, setupDropdown, setupLocalStorage, add_now } from "./utils";
import { TOC_ITEM, TOC_ITEMS } from "../types";

const getName = (el: TOC_ITEM["element"]) => {
  const isRepeat = el.parentElement?.classList.contains("or-repeat");
  const name =
    el.getAttribute("name") ||
    el
      .querySelector("label.contains-ref-target")
      ?.getAttribute("data-contains-ref-target") ||
    "";
  return (
    name +
    (isRepeat
      ? `[${el.parentElement?.querySelector(".repeat-number")!.textContent}]`
      : "")
  );
};

const getTitle = (el: TOC_ITEM["element"]) => {
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
  // tocItemText =
  //   tocItemText.length > 25 ? tocItemText.slice(0, 25) + "..." : tocItemText;
  return tocItemText;
};

function logTOC(tocItems: TOC_ITEMS, prefix = "") {
  tocItems.forEach((item, index) => {
    const isLast = index === tocItems.length - 1;
    const currentPrefix = prefix + (isLast ? "└───" : "├───");
    const isMulti =
      !item.children && !!item.element.querySelector("input[type=checkbox]");
    console.log(
      `${currentPrefix} [${item.score}/${item.score_total}] ${
        isMulti ? "*" : ""
      }${item.label.length > 25 ? item.label.slice(0, 25) + "..." : item.label}`
    );
    if (item.children) {
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      logTOC(item.children, childPrefix);
    }
  });
}

const getToc = (form: typeof Form) => {
  const tocItems: TOC_ITEMS = [];

  const tocElements = [
    ...(form.view.$[0] as HTMLFormElement).querySelectorAll(
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
        groupParents.length > 0 ? groupParents[groupParents.length - 1] : null,
      tocId: index,
      tocParentId: null,
      name: getName(element).replace("/data/", ""),
      label: getTitle(element),
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

  return tocItems.filter(
    ({ element }) =>
      element.classList.contains("or-group") ||
      element.classList.contains("simple-select")
  );
};

const getScore = (form: typeof Form) => {
  function buildTree(tocArray: TOC_ITEMS) {
    const map = new Map<TOC_ITEM["tocParentId"], TOC_ITEMS>(); // Using a Map to efficiently group TOC items by their parent ID

    // First pass: Group TOC items by their parent ID
    for (const tocItem of tocArray) {
      const parentId = tocItem.tocParentId;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(tocItem);
    }

    // Second pass: Append child TOC items to their respective parent's 'child' array
    for (const tocItem of tocArray) {
      const parentId = tocItem.tocId;
      if (map.has(parentId)) {
        tocItem.children = map.get(parentId)!;
      }
    }

    // Third pass: Calculate scores
    function calculateScores(tocItems: TOC_ITEMS) {
      for (const tocItem of tocItems) {
        if (tocItem.children && tocItem.children.length > 0) {
          // Recursively calculate scores for children
          calculateScores(tocItem.children);
          // Calculate total score as sum of children's scores
          tocItem.score_total = tocItem.children.reduce(
            (total, child) => total + (child.score_total || 0),
            0
          );
          tocItem.score = tocItem.children.reduce(
            (total, child) => total + (child.score || 0),
            0
          );

          const repeat = [...tocItem.element.children].filter((node) => {
            return node.classList?.contains("or-repeat");
          });

          if (repeat.length > 0) {
            const maxCount =
              form.model.evaluate(`count(${tocItem.name})`, "number") || 1;

            tocItem.score = tocItem.score / maxCount;
            tocItem.score_total = tocItem.score_total / maxCount;
          }
        } else {
          let calculate_name = "";
          if (tocItem.name.match(/\/\w+\[\d+\]/)) {
            const name = tocItem.name.split("[")[0];
            const number = tocItem.name.split("[")[1].split("]")[0];
            calculate_name = name + "_score" + "[" + number + "]";
          } else {
            calculate_name = tocItem.name + "_score";
          }
          const calculate_value = form.model
            .evaluate(calculate_name, "string")
            .split(" ")
            .map((v: string) => Number(v));
          if (calculate_value.length === 2) {
            tocItem.score = calculate_value[0];
            tocItem.score_total = calculate_value[1];
          } else {
            const isMulti = !!tocItem.element.querySelector(
              "input[type=checkbox]"
            );
            const value = form.model.evaluate(tocItem.name, "string");

            const instanceName = tocItem.element
              .querySelector("label.contains-ref-target")!
              .getAttribute("data-items-path");

            tocItem.score_total =
              form.model.evaluate(
                `${isMulti ? "sum" : "max"}(${instanceName}/jr:score)`,
                "number"
              ) || 0;

            if (tocItem.score_total > 0) {
              tocItem.score = value
                ? form.model.evaluate(
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

    calculateScores(tocArray);
    // Filter out items that are not root items (i.e., items with no parent)
    return tocArray.filter((tocItem) => !tocItem.level);
  }

  const result = buildTree(getToc(form));

  const score = result.map((v) => v.score).reduce((p, c) => p + c, 0);

  const score_total = result
    .map((v) => v.score_total)
    .reduce((p, c) => p + c, 0);
  return { result, score, score_total };
};

window.getScore = getScore;

interface SUBMIT_SCORE {
  name: string;
  label: string;
  score: number;
  score_total: number;
  children?: SUBMIT_SCORE[];
}

const getSubmitDict = (obj: {
  result: TOC_ITEMS;
  score: number;
  score_total: number;
}) => {
  const { result, score, score_total } = obj;
  const getDict = ({
    name,
    label,
    score,
    score_total,
    children,
  }: TOC_ITEM): SUBMIT_SCORE => {
    return {
      name,
      label,
      score,
      score_total,
      ...(children ? { children: children.map(getDict) } : {}),
    };
  };
  return {
    score,
    score_total,
    parentage: (score * (100 / score_total)).toFixed(1) + "%",
    result: result.map<SUBMIT_SCORE>(getDict),
  };
};
// @ts-ignore
window.getSubmitDict = getSubmitDict;

const root = document.querySelector<HTMLDivElement>("#app")!;

setupDropdown(document.querySelector<HTMLDivElement>("#dropdown")!);
setupLocalStorage(document.querySelector<HTMLDivElement>("#localstorage")!);
xmlDebug();

export async function init(
  form_url = new URLSearchParams(window.location.search).get("form")
) {
  if (!form_url) {
    root.innerHTML = "set in url `?form=...` or Upload a valid XML File ";
    // add a form input to upload a file of xml type get a blob url of file set in form_url
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xml";
    input.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files![0];
      init(URL.createObjectURL(file));
    });
    root.appendChild(input);
    return;
  }
  const xform = await fetch(form_url)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.text();
    })
    .catch((err) => {
      root.innerHTML =
        err + " Change the url to a valid form click to hard reload page";
      root.classList.add("text-red-500", "font-bold", "text-2xl");
      root.addEventListener("click", () => {
        window.location.search = "";
      });
      return err;
    });
  const result = await transform({
    xform: xform,
    theme: "mnm",
    x_form: xform,
  });

  root.innerHTML = "";
  const div_ = document.createElement("div");
  div_.id = "mnm-form";
  div_.innerHTML =
    `  <header class="form-header clearfix">
    <div class="form-progress"></div>
    <span class="form-language-selector hide"
        ><span>Choose Language</span></span
    >
    <nav class="pages-toc hide" role="navigation">
        <label for="toc-toggle"></label>
        <input
            type="checkbox"
            id="toc-toggle"
            class="ignore"
            value="show"
        />
        <!-- this element can be placed anywhere, leaving it out will prevent running ToC-generating code -->
        <ul class="pages-toc__list"></ul>
        <div class="pages-toc__overlay"></div>
    </nav>
</header>` +
    result.form +
    ` <div class="form-footer">
    <button
      type="button"
      id="first-page"
      class="first-page bg-orange-300 hover:bg-orange-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out"
      tabindex="1"
    >
      First
    </button>
    <button
      type="button"
      id="previous-page"
      class="previous-page bg-orange-300 hover:bg-orange-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out"
      tabindex="1"
    >
      Previous
    </button>
    <button
      type="button"
      id="next-page"
      class="next-page bg-orange-300 hover:bg-orange-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out"
      tabindex="1"
    >
      Next
    </button>
    <button
      type="button"
      id="last-page"
      class="last-page bg-orange-300 hover:bg-orange-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out"
      tabindex="1"
    >
      Last
    </button>
    <button
      type="button"
      id="submit-page"
      class="submit-page bg-blue-500 hover:bg-blue-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out"
      tabindex="1"
    >
    Submit
    </button>
    <button
      type="button"
      id="draft-page"
      class="draft-page bg-blue-500 hover:bg-blue-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out"
      tabindex="1"
    >
    Save Draft
    </button>
    <input class="inline-block" type="file" id="load-mock" />
  </div>`;
  root.appendChild(div_);

  // result.form;
  const formEl = document.querySelector("form.or");

  const parser = new DOMParser();

  window.xform = result;

  const form = new Form(
    formEl,
    {
      // required string of the default instance defined in the XForm
      modelStr: result.model,
      // optional string of an existing instance to be edited
      instanceStr: localStorage.getItem("form-odk") || "",
      //   `
      // <data>
      //     <user_fullname>John Do</user_fullname>
      //     <user_deg>Full Stack Dev</user_deg>
      //     <user_org>who</user_org>
      // </data>
      // `,
      // optional boolean whether this instance has ever been submitted before
      submitted: false,
      // optional array of external data objects containing:
      // {id: 'someInstanceId', xml: XMLDocument}
      // {
      //   id: 'yna',
      //   xml: parser.parseFromString(
      //     `<root>
      //          <item>
      //            <name>0001</name>
      //            <label>Johnson</label>
      //            <rooms>2</rooms>
      //          </item>
      //      </root>`,
      //     'text/xml'
      //   ),
      // },
      // if instance[@id=user] avalabel or not in result model
      external: result.model.includes('src="jr://file/user.xml"')
        ? [
            // type: xml-external name: id
            {
              id: "user",
              xml: parser.parseFromString(
                `<root>
            <item>
              <name>username</name>
              <value>Admin User</value>
            </item>
            <item>
              <name>email</name>
              <value>test@123.com</value>
            </item>
            <item>
              <name>is_active</name>
              <value>1</value>
            </item>
          </root>
            `,
                "text/xml"
              ),
            },
          ]
        : [],
      // optional object of session properties
      // 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid'
      session: {},
    },
    {}
  );

  const loadErrors = form.init();

  window.odk_form = form;

  // add date in 'ISO 8601' format and log the all question
  const form_logo = document.querySelector<HTMLElement>("section.form-logo");
  if (form_logo) {
    add_now(form_logo);
    form_logo.addEventListener("click", (event) => {
      // if ctrl keypress
      if (event.ctrlKey) {
        add_now(form_logo);
      } else {
        // call the log all question
        const { result, score, score_total } = getScore(form);
        console.log(result);
        logTOC(result);
        console.log(
          JSON.stringify({ score, score_total }) +
            " %c" +
            "★".repeat((score * (100 / score_total)) / 10),
          "color: red"
        );
      }
    });
  }

  if (loadErrors.length > 0) {
    console.error(loadErrors);
  }

  const submitButton = document.querySelector("#submit-page")!;
  submitButton.addEventListener("click", () => {
    form.validate();
  });
  const draftButton = document.querySelector("#draft-page")!;
  draftButton.addEventListener("click", () => {
    form.view.html.dispatchEvent(event.BeforeSave());
    localStorage.setItem(`form-${form_url}`, form.getDataStr());
    // document.getElementById("reload-localstorage")?.click();
  });

  const loadMock = document.querySelector("#load-mock")!;
  loadMock.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files![0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      form.model.mergeXml(data);
      form.resetView();
    };
    reader.readAsText(file);
  });

  // on change
  document.addEventListener("xforms-value-changed", () => {
    const { score_total, score } = getScore(form);

    document.querySelector("section.form-logo")!.innerHTML =
      JSON.stringify({
        score: score.toFixed(1),
        total: score_total.toFixed(0),
        parentage: (score * (100 / score_total)).toFixed(1) + "%",
      }) || "";
  });
}

init();
