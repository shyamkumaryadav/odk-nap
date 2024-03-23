import event from "enketo-core/src/js/event";
// @ts-ignore
import { Form } from "enketo-core";
import { transform } from "enketo-transformer/web";
import "./styles/main.scss";

import { xmlDebug, setupDropdown, setupLocalStorage, add_now } from "./utils";

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
}

init();
