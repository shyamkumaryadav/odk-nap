import { init } from "./main";

const btnClass = [
  "px-3",
  "py-2",
  "bg-blue-500",
  "text-white",
  "rounded",
  "ml-3",
  "my-1",
  "hover:bg-blue-600",
  "transition-colors",
  "duration-200",
  "ease-in-out",
  "cursor-pointer",
  "select-none",
];

export const add_now = (el: Element) => {
  el.innerHTML = "now() " + window.odk_form.model.evaluate("now()", "string");
};

export function setupLocalStorage(element: HTMLDivElement) {
  element.innerHTML = "";
  const reloadSpan = document.createElement("button");
  reloadSpan.id = "reload-localstorage";
  reloadSpan.classList.add(...btnClass, "bg-green-500", "hover:bg-green-600");
  reloadSpan.innerHTML = "&#x21bb;";
  element.appendChild(reloadSpan);
  const select = document.createElement("select");
  select.classList.add(
    "border",
    "mb-3",
    "ml-2",
    "py-2",
    "px-3",
    "LOCALSTORAGE"
  );
  element.appendChild(select);
  const updateSpan = () => {
    console.log("UPDATE...");
    reloadSpan.classList.add("animate-spin");
    const keys = Object.keys(localStorage);
    select.disabled = keys.length === 0;

    select.innerHTML =
      '<option value="">Select a local storage data to load</option>' +
      keys
        .filter((key) => key !== "form-odk")
        .map((key) => `<option value="${key}">${key}</option>`)
        .join("");

    select.addEventListener("change", (event) => {
      const form = event.target as HTMLSelectElement;
      const value = localStorage.getItem(form.value);
      if (value) {
        localStorage.setItem("form-odk", value);
      }
    });
    reloadSpan.classList.remove("animate-spin");
    init();
  };
  updateSpan();
  reloadSpan.addEventListener("click", (event) => {
    if (event.ctrlKey) {
      if (select.value) {
        localStorage.removeItem(select.value);
      }
    }
    if (event.altKey) {
      localStorage.removeItem("form-odk");
    }
    updateSpan();
  });
}

export function setupDropdown(element: HTMLDivElement) {
  if (window.location.port === "") {
    return;
  }

  const xh = new XMLHttpRequest();
  xh.open("GET", "forms.json");

  xh.onload = function () {
    const data = JSON.parse(xh.responseText);
    const select = document.createElement("select");
    select.classList.add("border", "mb-3", "py-2", "px-3");
    const urlParams = new URLSearchParams(window.location.search);
    const form = urlParams.get("form");
    select.innerHTML =
      '<option value="">Select a form to preview</option>' +
      data.forms
        .map((form: any) => `<option value="${form}">${form}</option>`)
        .join("");
    element.appendChild(select);

    const a_ = document.createElement("a");
    a_.classList.add(...btnClass, "float-right");
    a_.href =
      "https://staging.enketo.getodk.org/preview?form=" +
      // http://localhost:5173/index%201.xml
      window.location.protocol +
      "//" +
      window.location.host +
      "/" +
      form;
    a_.target = "_blank";
    a_.innerHTML = "Enketo Form Preview";
    a_.style.display = form ? "block" : "none";
    element.appendChild(a_);
    if (form && data.forms.includes(form)) {
      select.value = form;
    }
    select.addEventListener("change", (event) => {
      const form = event.target as HTMLSelectElement;
      urlParams.set("form", form.value);
      window.location.search = urlParams.toString();
      a_.style.display = "block";
    });
  };
  xh.send();
}

const debug_ = document.querySelector<HTMLDivElement>("#debug")!;
const genModelDebug = (
  title: string,
  onToggle: (pre: HTMLPreElement, event: Event) => void
) => {
  const details = document.createElement("details");
  const colors = [
    "bg-red-100",
    "bg-yellow-100",
    "bg-green-100",
    "bg-blue-100",
    "bg-indigo-100",
    "bg-purple-100",
    "bg-pink-100",
  ];
  details.classList.add(
    "cursor-pointer",
    "my-3",
    "p-3",
    colors[Math.floor(Math.random() * colors.length)]
  );
  const summary = document.createElement("summary");
  summary.innerHTML = title;
  summary.classList.add("font-bold", "select-none");
  details.appendChild(summary);
  const pre = document.createElement("pre");
  pre.classList.add(
    "text-sm",
    "font-mono",
    "whitespace-pre-wrap",
    "overflow-x"
  );
  details.appendChild(pre);
  debug_.appendChild(details);
  details.addEventListener("toggle", (event) => {
    onToggle(pre, event);
  });
};

export function xmlDebug() {
  genModelDebug("XML Model", (pre, event) => {
    const details = event.target as HTMLDetailsElement;
    if (details.open && window.xform) {
      const escapedXmlContent = new Option(window.xform.model).innerHTML;
      pre.innerHTML = escapedXmlContent;
    }
  });
  genModelDebug("ODK Data", (pre, event) => {
    const details = event.target as HTMLDetailsElement;
    if (details.open && window.odk_form) {
      const escapedXmlContent = new Option(window.odk_form.getDataStr())
        .innerHTML;

      pre.innerHTML = escapedXmlContent;
    }
  });
  genModelDebug("Form XML", (pre, event) => {
    const details = event.target as HTMLDetailsElement;
    if (details.open && window.xform) {
      const escapedXmlContent = new Option(window.xform.x_form).innerHTML;
      pre.innerHTML = escapedXmlContent;
    }
  });
}
