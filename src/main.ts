import event from "enketo-core/src/js/event";
// @ts-ignore
import { Form } from "enketo-core";
import calcModule from "enketo-core/src/js/calculate";
import { FormModel } from "enketo-core/src/js/form-model";
import preloadModule from "enketo-core/src/js/preload";
import { transform } from "enketo-transformer/web";
import "./styles/main.scss";

import {
  xmlDebug,
  setupDropdown,
  setupLocalStorage,
  add_now,
  csvToXml,
} from "./utils";
import scoreModule from "./score";

if (localStorage.getItem("readonly_view") === "true") {
  console.log("readonly view");
  calcModule.update = () => {
    console.log("Calculations disabled.");
  };
  FormModel.prototype.setInstanceIdAndDeprecatedId = () => {
    console.log("InstanceID and deprecatedID population disabled.");
  };
  preloadModule.init = () => {
    console.log("Preloaders disabled.");
  };
}

const root = document.querySelector<HTMLDivElement>("#app")!;

setupDropdown(document.querySelector<HTMLDivElement>("#dropdown")!);
setupLocalStorage(document.querySelector<HTMLDivElement>("#localstorage")!);

export async function init(
  form_ = new URLSearchParams(window.location.search).get("form") ||
    localStorage.getItem("xform-odk")
) {
  if (!form_) {
    root.innerHTML =
      "set in url `?form=...` or Upload a valid XLS File On <a id='getodk' href='#' class='text-blue-500'>https://staging.xlsform.getodk.org/ <span class='font-bold text-green-600'> And Click on Download XForm to Download the XML File</span></a> <br/>";

    const getodk = document.querySelector("#getodk")!;
    const info_ = getodk.querySelector("span")!;
    getodk.addEventListener("click", () => {
      const popup = window.open(
        "https://staging.xlsform.getodk.org/",
        "getodk",
        "width=600,height=600"
      );

      function checkPopup() {
        if (popup && !popup.closed) {
          setTimeout(checkPopup, 1000); // Check again after 1 second
        } else {
          info_.innerHTML =
            " Popup is closed? You have Click on Download XForm? if not try again";
        }
      }

      setTimeout(checkPopup, 1000); // Initial check after 1 second
    });
    // add a form input to upload a file of xml type get a blob url of file set in form_
    const input = document.createElement("textarea");
    input.cols = 100;
    input.rows = 10;
    input.classList.add("border", "mb-3", "py-2", "px-3");
    input.placeholder = "Paste XML here or drag and drop a XML file";

    const message = document.createElement("div");
    message.id = "message";
    message.classList.add("message");
    message.innerHTML = "<p>Drop the file here</p>";
    root.appendChild(message);

    document.addEventListener("dragover", (event) => {
      event.preventDefault(); // Prevent default behavior (e.g., opening files)
      document.body.classList.add("dragover");
      message.classList.add("show");
    });

    document.addEventListener("dragleave", () => {
      document.body.classList.remove("dragover");
      message.classList.remove("show");
    });

    document.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.remove("dragover");
      message.classList.remove("show");
      const dt = e.dataTransfer;
      if (!dt) {
        return;
      }
      const files = dt.files;

      if (files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result;
          if (typeof text === "string") {
            init(text);
          }
        };
        reader.readAsText(files[0]);
      }
    });

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
  xmlDebug();

  const permissions = [
    {
      id: 1,
      survey_phase: [
        {
          id: 1,
          name: "Phase 1: Aug 2024",
          is_active: false,
          survey: 1,
        },
        {
          id: 2,
          name: "Phase 2: Sep 2024",
          is_active: true,
          survey: 1,
        },
      ],
      sid: "AAA",
      is_active: true,
    },
  ];

  const surveyData = permissions
    .filter((item) => item.is_active)
    .map((item) => ({
      label: item.sid,
      name: item.id,
    }));

  const phaseData = permissions
    .map((item) =>
      item.survey_phase
        .filter((phase) => phase.is_active)
        .map((phase) => ({
          label: phase.name,
          name: phase.id,
          survey: phase.survey,
        }))
    )
    .flat();

  const surveyContent =
    `<root>` +
    surveyData
      .map(
        (item) =>
          `<item>${Object.entries(item)
            .map(([key, value]) => `<${key}>${value}</${key}>`)
            .join("")}</item>`
      )
      .join("") +
    `</root>`;

  const phaseContent = `<root>${phaseData
    .map(
      (item) =>
        `<item>${Object.entries(item)
          .map(([key, value]) => `<${key}>${value}</${key}>`)
          .join("")}</item>`
    )
    .join("")}</root>`;

  const result = await transform({
    xform: xform,
    theme: "mnm",
    x_form: xform,
    media: {
      "nation.xml": "/odk-nap/nation.xml",
      // locations
      "state.xml": "/odk-nap/state.xml",
      "district.xml": "/odk-nap/district.xml",
      "sub_district.xml": "/odk-nap/sub_district.xml",
      "lgd_ulb_health_hulb.xml": "/odk-nap/lgd_ulb_health_hulb.xml",
      "health_facility.xml": "/odk-nap/health_facility.xml",
      "sub_centre.xml": "/odk-nap/sub_centre.xml",
      "session_site.xml": "/odk-nap/session_site.xml",
      // user data
      "designation.xml": "/odk-nap/designation.xml",
      "organization.xml": "/odk-nap/organization.xml",
      "level.xml": "/odk-nap/level.xml",
      // survey data
      "survey.xml": "survey",
      "phase.xml": "phase",
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
    ` <div class="form-footer select-none">
    <label class="inline-flex p-4 gap-3" for="page">Toggle Pages
      <input type="checkbox" id="page" class="ml-2" value="show" />
    </label>
    <label class="inline-flex p-4 gap-3" for="score">Real-Time Calculation (Slow)
      <input type="checkbox" id="score" class="ignore" value="show" />
    </label>
    <label class="inline-flex p-4 gap-3" for="readonly_view">View Form In Read-Only Mode
      <input type="checkbox" id="readonly_view" class="ignore" value="show" />
    </label>
    <br/>
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
    <textarea class="border !m-4 py-2 px-3 !h-24" cols="100" placeholder="Paste XML Instance Data here" id="load-mock"></textarea>
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
    if (!["survey", "phase"].includes(src)) {
      try {
        const res = await fetch(src);
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
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
        console.error(err);
      }
    } else {
      externalData.push({
        id: node.getAttribute("id")!,
        xml: parser.parseFromString(
          src === "survey"
            ? surveyContent
            : src === "phase"
            ? phaseContent
            : "",
          "text/xml"
        ),
      });
    }
  }

  const formEl = document.querySelector("form.or")!;

  formEl.classList.add(
    "max-h-[80vh]",
    "overflow-y-auto",
    "px-10",
    "rounded-lg",
    "border-solid",
    "border-2",
    "border-sky-500"
  );

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
          if (model.node("/model/instance[1]//" + path).getElement()) {
            model.node("/model/instance[1]//" + path).setVal(defaults[path]);
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
    name: "HF Name",
    designation: 3,
    // auto fill the survey and phase data
    survey: phaseData[0].survey,
    phase: phaseData[0].name,
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
  // add score module
  form.score = form.addModule(scoreModule);
  document.title = form.surveyName;

  window.odk_form = form;

  if (localStorage.getItem("readonly_view") === "true") {
    const formFragment = form.view.html;
    [
      ...formFragment.querySelectorAll<HTMLInputElement>(
        ".question input:not([readonly]), .question textarea:not([readonly]), .question select:not([readonly])"
      ),
    ].forEach((el) => {
      el.setAttribute("readonly", "readonly");
      el.classList.add("readonly-forced");
    });
    // Properly make native selects readonly (for touchscreens)
    formFragment
      .querySelectorAll<HTMLSelectElement>("input, textarea, select, button")
      .forEach((el: HTMLInputElement) => (el.disabled = true));
    // prevent adding an Add/Remove UI on repeats
    formFragment
      .querySelectorAll(".or-repeat-info")
      .forEach((el: HTMLElement) =>
        el.setAttribute("data-repeat-fixed", "fixed")
      );
    formFragment
      .querySelectorAll(".or-repeat-info")
      .forEach((el: HTMLElement) => {
        // loop on each repeat and count the number
        if (
          form.model.evaluate(
            `count(${el.parentElement?.getAttribute("name")})`,
            "number"
          ) === 1 &&
          form.model
            .evaluate(el.parentElement?.getAttribute("name"), "string")
            .trim() === ""
        ) {
          console.log("remove repeat");
        }
      });
  }

  // add date in 'ISO 8601' format and log the all question
  const form_logo = document.querySelector<HTMLElement>("section.form-logo");
  if (form_logo) {
    add_now(form_logo);
    form_logo.addEventListener("click", (event) => {
      // if ctrl keypress
      if (event.ctrlKey) {
        add_now(form_logo);
      } else {
        const performTimeConsumingOperation = () => {
          window.odk_form.score.logTOC();
        };

        if ("requestIdleCallback" in window) {
          requestIdleCallback(performTimeConsumingOperation);
        } else {
          setTimeout(performTimeConsumingOperation, 0); // Fallback
        }
      }
    });
  }

  if (loadErrors.length > 0) {
    console.error(loadErrors);
    alert("Form Errors:\n" + loadErrors.join("\n"));
  }

  const submitButton = document.querySelector("#submit-page")!;
  submitButton.addEventListener("click", () => {
    // to not delay validation unnecessarily we only clear non-relevants if necessary
    form.clearNonRelevant();

    const $container = form.view.$;

    // can't fire custom events on disabled elements therefore we set them all as valid
    $container
      .find(
        "fieldset:disabled input, fieldset:disabled select, fieldset:disabled textarea, " +
          "input:disabled, select:disabled, textarea:disabled"
      )
      .each(function (this: HTMLElement) {
        form.setValid(this);
      });

    const validations = $container
      .find(".question")
      .addBack(".question")
      .map(function (this: HTMLElement) {
        // only trigger validate on first input and use a **pure CSS** selector (huge performance impact)
        const elem = this.querySelector(
          "input:enabled:not(.ignore), select:enabled:not(.ignore), textarea:enabled:not(.ignore)"
        );
        if (!elem) {
          return Promise.resolve();
        }

        return form.validateInput(elem);
      })
      .toArray();

    Promise.all(validations);
    form.view.html.dispatchEvent(event.BeforeSave());
  });

  const draftButton = document.querySelector("#draft-page")!;
  draftButton.addEventListener("click", () => {
    const phase = form.model.evaluate("//phase", "number");
    console.log({
      phase,
    });
    const recordName = prompt("Please enter a record name", "form-odk");
    if (recordName) localStorage.setItem(recordName, form.model.getStr());
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

  const pages = document.querySelector<HTMLInputElement>("#page")!;
  pages.checked = localStorage.getItem("pages") === "true";
  if (pages.checked && form.features.pagination) {
    form.view.html.classList.toggle("pages");
  } else {
    pages.parentElement?.remove();
  }
  pages.addEventListener("change", () => {
    localStorage.setItem("pages", pages.checked ? "true" : "false");
    form.view.html.classList.toggle("pages");
  });

  const score = document.querySelector<HTMLInputElement>("#score")!;
  score.checked = localStorage.getItem("score") === "true";
  score.addEventListener("change", () => {
    localStorage.setItem("score", score.checked ? "true" : "false");
  });

  const readonly = document.querySelector<HTMLInputElement>("#readonly_view")!;
  readonly.checked = localStorage.getItem("readonly_view") === "true";
  readonly.addEventListener("change", () => {
    localStorage.setItem("readonly_view", readonly.checked ? "true" : "false");
    if (readonly.checked) {
      localStorage.setItem("form-odk", form.model.getStr());
    }
    window.location.reload();
  });

  document.addEventListener("xforms-value-changed", () => {
    if (score.checked) {
      const { score, total } = window.odk_form.score.getScore().reduce(
        (
          acc: { score: number; total: number },
          item: {
            score: number;
            score_total: number;
          }
        ) => {
          acc.score += item.score;
          acc.total += item.score_total;
          return acc;
        },
        { score: 0, total: 0 }
      );

      document.querySelector("section.form-logo")!.innerHTML =
        JSON.stringify({
          score: score.toFixed(1),
          total: total.toFixed(0),
          parentage: (score * (100 / total)).toFixed(1) + "%",
        }) || "";
    }
  });
}
