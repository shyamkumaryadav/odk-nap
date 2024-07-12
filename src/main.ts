import event from "enketo-core/src/js/event";
// @ts-ignore
import { Form, FormModel } from "enketo-core";
import { getAncestors, getSiblingElement } from "enketo-core/src/js/dom-utils";
import { transform } from "enketo-transformer/web";
import "./styles/main.scss";

import {
  xmlDebug,
  setupDropdown,
  setupLocalStorage,
  add_now,
  csvToXml,
} from "./utils";
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

const getToc = (form: typeof Form = window.odk_form) => {
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

const getScore = (form: typeof Form = window.odk_form) => {
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
  form_ = new URLSearchParams(window.location.search).get("form") ||
    localStorage.getItem("xform-odk")
) {
  if (!form_) {
    root.innerHTML = "set in url `?form=...` or Upload a valid XML File ";
    // add a form input to upload a file of xml type get a blob url of file set in form_
    const input = document.createElement("textarea");
    input.cols = 100;
    input.rows = 10;
    input.classList.add("border", "mb-3", "py-2", "px-3");
    input.placeholder = "Paste XML here";

    input.addEventListener("change", (e) => {
      const value = (e.target as HTMLTextAreaElement).value;
      if (value) {
        init(value);
      }
    });
    root.appendChild(input);
    return;
  }
  const isURL = form_.endsWith(".xml");

  let xform = form_;
  if (isURL) {
    try {
      const res = await fetch(form_);
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      xform = await res.text();
    } catch (err) {
      root.innerHTML =
        err + " Change the url to a valid form click to hard reload page";
      root.classList.add("text-red-500", "font-bold", "text-2xl");
      root.addEventListener("click", () => {
        window.location.search = "";
      });
      return err;
    }
  }
  if (typeof xform === "string") {
    localStorage.setItem("xform-odk", xform);
  }
  const result = await transform({
    xform: xform,
    theme: "mnm",
    x_form: xform,
    media: {
      "nation.xml": "/odk-nap/nation.xml",
      "state.xml": "/odk-nap/state.xml",
      "district.xml": "/odk-nap/district.xml",
      "subdistrict.xml": "/odk-nap/subdistrict.xml",
      "block.xml": "/odk-nap/block.xml",
      "health_facility.xml": "/odk-nap/health_facility.xml",
      "sub_centre.xml": "/odk-nap/sub_centre.xml",
      "session_site.xml": "/odk-nap/session_site.xml",
      "village.xml": "/odk-nap/village.xml",
      // user data
      "designation.xml": "/odk-nap/designation.xml",
      "organization.xml": "/odk-nap/organization.xml",
      "level.xml": "/odk-nap/level.xml",
    },
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
      id="reload-localstorage"
      class="bg-green-500 hover:bg-green-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out"
      tabindex="1"
    >
      &#x21bb;
    </button>
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
    <button id="delete-localstorage" class="bg-red-500 hover:bg-red-200 px-3 py-2 rounded ml-3 transition-colors duration-200 ease-in-out">
      Delete Local Storage
    </button>
    <textarea class="border mb-3 py-2 px-3 !h-24" cols="100" placeholder="Paste XML Instance Data here" id="load-mock"></textarea>
  </div>`;
  root.appendChild(div_);

  const model = result.model;
  const parser = new DOMParser();
  const doc = parser.parseFromString(model, "text/xml");
  const nodes = doc.querySelectorAll("[src]");
  const externalData: {
    id: string;
    xml: Document;
  }[] = [];
  for (const node of nodes) {
    const src = node.getAttribute("src")!;
    try {
      const res = await fetch(src);
      const contentType = res.headers.get("Content-Type")!;
      const responseData = await res.text();
      let result: Document;
      switch (contentType) {
        case "text/csv":
          result = csvToXml(responseData);
          break;
        case "text/xml":
          result = parser.parseFromString(responseData, contentType);
          break;
        default:
          result = parser.parseFromString(responseData, "text/xml");
      }
      externalData.push({
        id: node.getAttribute("id")!,
        xml: result,
      });
    } catch (err) {
      console.log(err);
    }
  }

  const formEl = document.querySelector("form.or")!;
  if (location.hash === "#page") {
    formEl.classList.toggle("pages");
  }

  formEl.classList.add("max-h-[80vh]", "overflow-y-auto", "p-10");

  window.xform = result;

  function _prepareInstance(
    modelStr: string,
    defaults: {
      [key: string]: string | number | boolean | null | undefined;
    }
  ) {
    let model;
    let init_model;
    let existingInstance = null;

    for (const path in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, path)) {
        model =
          model ||
          new FormModel(modelStr, {
            full: false,
          });
        init_model = init_model || model.init();

        if (Object.prototype.hasOwnProperty.call(defaults, path)) {
          // if this fails, the FormModel will output a console error and ignore the instruction
          if (model.node("//" + path).getElement()) {
            model.node("//" + path).setVal(defaults[path]);
          }
        }
        // TODO: would be good to not include nodes that weren't in the defaults parameter
        // HOWEVER, that would also set number of repeats to 0, which may be undesired
        // TODO: would be good to just pass model along instead of converting to string first
        existingInstance = model.getStr();
      }
    }

    return existingInstance;
  }

  const defaults = {
    full_name: "Admin",
    email: "ABC@123.com",
    phone: "9999912345",
    designation: 3,
  };

  const form = new Form(
    formEl,
    {
      // required string of the default instance defined in the XForm
      modelStr: result.model,
      // optional string of an existing instance to be edited
      instanceStr:
        localStorage.getItem("form-odk") ||
        _prepareInstance(result.model, defaults),
      // optional boolean whether this instance has ever been submitted before
      submitted: false,
      external: externalData,
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
    // document.getElementById("reload-localstorage")?.click();
    localStorage.setItem("form-odk", form.model.getStr());
  });

  const loadMock = document.querySelector("#load-mock")!;
  loadMock.addEventListener("change", (e) => {
    const value = (e.target as HTMLTextAreaElement).value;
    if (value) {
      localStorage.setItem("form-odk", value);
      window.location.reload();
    }
  });

  const deleteLocalStorage = document.querySelector("#delete-localstorage")!;

  deleteLocalStorage.addEventListener("click", () => {
    localStorage.removeItem("form-odk");
    window.location.reload();
  });

  const reloadLocalStorage = document.querySelector("#reload-localstorage")!;
  reloadLocalStorage.addEventListener("click", () => {
    localStorage.removeItem("xform-odk");
    window.location.reload();
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
