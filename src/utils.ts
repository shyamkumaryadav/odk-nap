import { init } from "./main";
import Papa from "papaparse";

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
    if (xh.status !== 200) {
      return;
    }
    const data: {
      title: string;
      path: string;
    }[] = JSON.parse(xh.responseText);
    const select = document.createElement("select");
    select.classList.add("border", "mb-3", "py-2", "px-3");
    const urlParams = new URLSearchParams(window.location.search);
    const form = urlParams.get("form");

    select.innerHTML =
      '<option value="">Select a form to preview</option>' +
      data
        .map((forms) => {
          return `<option value="${forms.path}">${forms.title}</option>`;
        })
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
    if (form && data.some((forms) => forms.path === form)) {
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
  genModelDebug("Form Score", (pre, event) => {
    const details = event.target as HTMLDetailsElement;
    if (details.open) {
      pre.innerHTML = "Loading...";
      pre.innerHTML = JSON.stringify(window.getSubmitDict(), null, 2);
    }
  });
}

const XML_LOCAL_NAME_PATTERN = (() => {
  const nameStartCharRanges = [
    "A-Z",
    "a-z",
    "_",
    "\\u{C0}-\\u{D6}",
    "\\u{D8}-\\u{F6}",
    "\\u{F8}-\\u{2FF}",
    "\\u{370}-\\u{37D}",
    "\\u{37F}-\\u{1FFF}",
    "\\u{200C}-\\u{200D}",
    "\\u{2070}-\\u{218F}",
    "\\u{2C00}-\\u{2FEF}",
    "\\u{3001}-\\u{D7FF}",
    "\\u{F900}-\\u{FDCF}",
    "\\u{FDF0}-\\u{FFFD}",
    "\\u{10000}-\\u{EFFFF}",
  ];
  const nameCharRanges = [
    "-", // Must come first or last in a `RegExp` character class
    ...nameStartCharRanges,
    // TODO: this looks like probably a mistake??
    '"."',
    "\\u{B7}",
    "0-9",
    // TODO: is this actually a "misleading character class" range?
    "\\u{0300}-\\u{036F}",
    "\\u{203F}-\\u{2040}",
  ];

  const nameStartChar = `[${nameStartCharRanges.join("")}]`;
  const nameChar = `[${nameCharRanges.join("")}]`;
  const name = `^${nameStartChar}${nameChar}*$`;

  // eslint-disable-next-line no-misleading-character-class
  return new RegExp(name, "u");
})();

/**
 * @param {string} csv
 */
function csvToArray(csv: string) {
  const input = csv.trim();
  const options = {
    skipEmptyLines: true,
  };

  let result = Papa.parse<string[]>(input, options);

  if (result.errors.some((error) => error.code === "UndetectableDelimiter")) {
    const parsed = Papa.parse<string[]>(input, {
      ...options,
      delimiter: ",",
    });

    if (
      parsed.errors.length === 0 &&
      parsed.data.every((line) => line.length === 1)
    ) {
      result = parsed;
    }
  }

  if (result.errors.length) {
    let [error] = result.errors;

    // if (!(error instanceof Error)) {
    //   error = new Error(error.message ?? String(error));
    // }

    throw error;
  }

  return result.data;
}

const throwInvalidCSVHeaderToXMLLocalName = (name: string) => {
  // Note: this is more restrictive than XML spec.
  // We cannot accept namespaces prefixes because there is no way of knowing the namespace uri in CSV.
  if (XML_LOCAL_NAME_PATTERN.test(name)) {
    return true;
  }

  throw new Error(
    `CSV column heading "${name}" cannot be turned into a valid XML element`
  );
};

function arrayToXml(rows: string[][]) {
  // var xmlStr;
  let headers = rows.shift()!;
  // var langAttrs = [];

  // Trim the headings
  headers = headers.map((header) => header.trim());

  // Check if headers are valid XML node names
  headers.every(throwInvalidCSVHeaderToXMLLocalName);

  // create an XML Document
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString("<root></root>", "text/xml");
  rows.forEach((row) => {
    const item = xmlDoc.createElement("item");
    xmlDoc.firstChild!.appendChild(item);
    row.forEach((value, index) => {
      const node = xmlDoc.createElement(headers[index]);
      // if (langs[index]) {
      //   node.setAttribute("lang", langs[index]);
      // }
      // encoding of XML entities is done automatically
      node.textContent = value.trim();
      item.appendChild(node);
    });
  });

  return xmlDoc;
}

export function csvToXml(csv: string) {
  const result = csvToArray(csv);

  return arrayToXml(result);
}
