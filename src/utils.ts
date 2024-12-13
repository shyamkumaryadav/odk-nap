import { init } from "./main";
import Papa from "papaparse";
import { SCORE_FIELD, TOC_ITEMS } from "./score";

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
  reloadSpan.title =
    "Reload Local Storage or Ctrl+Click to delete selected item or Alt+Click to delete current";
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
        .filter((key) => !["form-odk", "pages", "score"].includes(key))
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
  const btn = document.createElement("button");
  btn.innerHTML = "📑";
  btn.classList.add("hidden", "mx-4", "hover:bg-green-600", "rounded");
  summary.appendChild(btn);
  details.appendChild(summary);
  const pre = document.createElement("pre");
  pre.classList.add(
    "text-sm",
    "font-mono",
    "whitespace-pre-wrap",
    "overflow-x"
  );
  details.appendChild(pre);
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(pre.innerText.trim());
  });
  debug_.appendChild(details);
  details.addEventListener("toggle", (event) => {
    if (details.open) btn.classList.remove("hidden");
    else btn.classList.add("hidden");
    onToggle(pre, event);
  });
};

export function xmlDebug() {
  debug_.innerHTML = "";
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
      if (window.odk_form.score)
        pre.innerHTML = JSON.stringify(
          window.odk_form.score.getSubmitDict(),
          null,
          2
        );
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

export function printTOCScore() {
  const _X = window.odk_form;
  const newWindow = window.open(
    "",
    _X.surveyName,
    "width=800,height=600,popup"
  );

  const _tocItems: TOC_ITEMS = _X.score.getScore(true);

  // // Calculate max score and max score_max
  const { score, max, max_personal, personal } = _tocItems.reduce<SCORE_FIELD>(
    (acc, item) => {
      acc.score += item.score;
      acc.max += item.max;
      acc.personal += item.personal;
      acc.max_personal += item.max_personal;
      return acc;
    },
    { score: 0, max: 0, personal: 0, max_personal: 0 }
  );

  // Check if the new window is opened
  if (newWindow) {
    // Generate HTML content for the new window
    let htmlContent = `<!DOCTYPE html><html><head><title>${_X.surveyName}</title></head><style>span:hover { background-color: #58e94759; }</style><body>
                    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: center;">
                    <caption>${_X.surveyName} (${_X.version}) <button onclick="window.print()">Print</button></caption>
                    <thead><tr><th>ID</th><th>Name</th><th>Facility Score</th><th>Facility Max</th><th>Personnel Score</th><th>Personnel Max</th></tr></thead><tbody>`;

    function extractSuffixAndText(text: string) {
      const match = text.match(
        /^(([1-9]{1,2}\.?|[a-z]{1,4}\.?|[A-Z]\.?)*)\s+(.*)/
      );
      if (match) {
        const suffix = match[1];
        const label = match[3];
        // Check if the suffix has valid parts (1 character each, separated by a dot)
        const isValidSuffix = suffix
          .split(".")
          .every((part) => part.length <= 1);
        return isValidSuffix
          ? [["<b>", "</b>"].join(suffix), label]
          : [null, text];
      } else {
        return [null, text];
      }
    }

    _tocItems.forEach((item) => {
      const [suffix, text] = extractSuffixAndText(item.label);
      console.log({ suffix, text });
      htmlContent += `<tr title="${item.label}"><td><a href="#${item.name}">${suffix}</td><td>${text}</td><td>${item.score}</td><td>${item.max}</td><td>${item.personal}</td><td>${item.max_personal}</td></tr>`;
    });

    htmlContent += `</tbody><tfoot><tr><td>Parentage</td><td>${(
      (score * 100) /
      max
    ).toFixed(1)} % / ${((personal * 100) / max_personal).toFixed(
      1
    )} %</td><td>${score}</td><td>${max}</td><td>${personal}</td><td>${max_personal}</td></tr></tfoot></table>`;

    htmlContent += `<pre style="line-height: 1rem;background-image: linear-gradient(180deg, #eee 50%, #fff 50%); background-size: 100% 2rem; overflow: auto;">
    <span><mark><u>Select Multiple</u></mark> {NUMBER} Repet With Number</span>\n`;

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
        }/${item.max}] [${item.personal}/${item.max_personal}] ${styles.join(
          extractSuffixAndText(item.label).join(
            (item.element.closest(".or-repeat") ? ` {${item.ind}}` : "") +
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
}
