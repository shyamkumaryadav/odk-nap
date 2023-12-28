import event from "enketo-core/src/js/event";
// @ts-ignore
import { Form } from "enketo-core";
import { transform } from "enketo-transformer/web";
import "./styles/main.scss";

import { xmlDebug, setupDropdown, setupLocalStorage } from "./utils";

const root = document.querySelector<HTMLDivElement>("#app")!;

setupDropdown(document.querySelector<HTMLDivElement>("#dropdown")!);
setupLocalStorage(document.querySelector<HTMLDivElement>("#localstorage")!);
xmlDebug();

export async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const form_url = urlParams.get("form");
  if (!form_url) {
    root.innerHTML = "Please select a form or set in url `?form=...`";
    return;
  }
  const xform = await fetch(form_url)
    .then((res) => res.text())
    .catch((err) => {
      root.innerHTML = err + " Change the url to a valid form";
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
  document.querySelector("section.form-logo")!.innerHTML =
    "now() " + window.odk_form.model.evaluate("now()", "string");

  if (loadErrors.length > 0) {
    console.error(loadErrors);
  }

  // document.addEventListener("xforms-value-changed", () => {
  //   console.log(
  //     form.model.evaluate("count(/data//*[. = 'yes'])", "number"),
  //     form.model.evaluate(
  //       "count(/data/*[. = 'yes']) + count(/data/*/*[. = 'yes']) +  count(/data/*/*/*[. = 'yes'])",
  //       "number"
  //     )
  //   );
  // });

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
}

init();
