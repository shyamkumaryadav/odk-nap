import event from "enketo-core/src/js/event";
// @ts-ignore
import { Form } from "enketo-core";
import { transform } from "enketo-transformer/web";
import "./styles/main.scss";

import { xmlDebug, setupDropdown, setupLocalStorage, add_now } from "./utils";
import { TOC_ITEMS } from "../types";

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

  window.xform = result;

  const form = new Form(
    formEl,
    {
      // required string of the default instance defined in the XForm
      modelStr: result.model,
      // optional string of an existing instance to be edited
      instanceStr:
        localStorage.getItem("form-odk") ||
        `
      <data>
          <user_fullname>John Do</user_fullname>
          <user_deg>Full Stack Dev</user_deg>
          <user_org>who</user_org>
      </data>
      `,
      // optional boolean whether this instance has ever been submitted before
      submitted: false,
      // optional array of external data objects containing:
      // {id: 'someInstanceId', xml: XMLDocument}
      // {
      //   id: 'yna',
      //   xml: parser.parseFromString(
      //     `<root>
      //     </item>
      //       <name>0001</name>
      //       <label>Johnson</label>
      //       <rooms>2</rooms>
      //     </item>
      //   </root>`,
      //     'text/xml'
      //   ),
      // },
      // external: [
      //   {
      //     id: "participants",
      //     xml: `<root>
      //       <item>
      //         <name>0001</name>
      //         <label>Johnson</label>
      //         <rooms>2</rooms>
      //       </item>`,
      //   },
      // ],
      // optional object of session properties
      // 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid'
      session: {},
    },
    {}
  );

  const loadErrors = form.init();

  window.odk_form = form;

  // add date in 'ISO 8601' format
  const form_logo = document.querySelector("section.form-logo");
  if (form_logo) {
    add_now(form_logo);
    form_logo.addEventListener("click", () => {
      add_now(form_logo);
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
    function buildTree(tocArray: TOC_ITEMS) {
      const map = new Map<string, TOC_ITEMS>(); // Using a Map to efficiently group TOC items by their parent ID

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
              const value = form.model.evaluate(tocItem.name, "string");

              const instanceName = tocItem.element
                .querySelector("label.contains-ref-target")!
                .getAttribute("data-items-path");

              tocItem.score_total =
                form.model.evaluate(
                  `sum(${instanceName}/jr:score)`,
                  "number"
                ) || 0;

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
        }
      }

      calculateScores(tocArray);
      // Filter out items that are not root items (i.e., items with no parent)
      return tocArray.filter((tocItem) => !tocItem.level);
    }

    const result = buildTree(
      (form.toc.tocItems as TOC_ITEMS)
        .filter(
          (item) =>
            item.element.classList.contains("or-group") ||
            item.element.classList.contains("simple-select")
        )
        .map((item) => {
          const getName = (el: HTMLElement) => {
            const isRepeat = el.parentElement?.classList.contains("or-repeat");
            const name =
              el.getAttribute("name") ||
              el
                .querySelector("label.contains-ref-target")!
                .getAttribute("data-contains-ref-target") ||
              "";
            return (
              name +
              (isRepeat
                ? `[${
                    el.parentElement?.querySelector(".repeat-number")!
                      .textContent
                  }]`
                : "")
            );
          };
          return {
            label:
              item.element.querySelector(".question-label.active")!
                .textContent || "",
            name: getName(item.element),
            score: 0,
            score_total: 0,
            tocId: item.tocId,
            tocParentId: item.tocParentId,
            level: item.level,
            element: item.element,
            // children: [],
          };
        })
    );

    const score = result.map((v) => v.score).reduce((p, c) => p + c, 0);

    const total = result.map((v) => v.score_total).reduce((p, c) => p + c, 0);

    // Total score
    console.log(result);

    document.querySelector("section.form-logo")!.innerHTML =
      JSON.stringify({
        score: score.toFixed(1),
        total: total.toFixed(0),
        parentage: (score * (100 / total)).toFixed(1) + "%",
      }) || "";

    // console.log(result);
    console.log("%c" + "★".repeat(15), "color: red");
  });
}

init();
