/**
 * Placeholder module for translator. It is meant to be overwritten by a translator used in your app.
 *
 * @module fake-translator
 */

// Define the shape of our translation strings
interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

// This is NOT a complete list of all enketo-core UI strings.
// Use a parser to find all strings. E.g. https://github.com/i18next/i18next-parser
const SOURCE_STRINGS: TranslationStrings = {
  constraint: {
    invalid: "Value not allowed",
    required: "This field is required",
  },
  filepicker: {
    placeholder: "Click here to upload file. (< __maxSize__)",
    notFound:
      "File __existing__ could not be found (leave unchanged if already submitted and you want to preserve it).",
    waitingForPermissions: "Waiting for user permissions.",
    resetWarning:
      "This will remove the __item__. Are you sure you want to do this?",
    toolargeerror: "File too large (> __maxSize__)",
    file: "file",
  },
  drawwidget: {
    drawing: "drawing",
    signature: "signature",
    annotation: "file and drawing",
  },
  form: {
    required: "required",
  },
  geopicker: {
    accuracy: "accuracy (m)",
    altitude: "altitude (m)",
    closepolygon: "close polygon",
    kmlcoords: "KML coordinates",
    kmlpaste: "paste KML coordinates here",
    latitude: "latitude (x.y °)",
    longitude: "longitude (x.y °)",
    points: "points",
    searchPlaceholder: "search for place or address",
    removePoint:
      "This will completely remove the current geopoint from the list of geopoints and cannot be undone. Are you sure you want to do this?",
  },
  selectpicker: {
    noneselected: "none selected",
    numberselected: "__number__ selected",
  },
  imagemap: {
    svgNotFound: "SVG image could not be found",
  },
  rankwidget: {
    tapstart: "Tap to start",
    clickstart: "Click to start",
  },
  widget: {
    comment: {
      update: "Update",
    },
  },
  alert: {
    gotonotfound: {
      msg: "Failed to find question '__path__' in form. Is it a valid path?",
    },
    valuehasspaces: {
      multiple:
        'Select multiple question has an illegal value "__value__" that contains a space.',
    },
  },
  confirm: {
    repeatremove: {
      heading: "Delete Item?",
      msg: "Do you really want to remove the item? This action is permanent.",
    },
  },
};

/**
 * Meant to be replaced by a real translator in the app that consumes enketo-core
 *
 * @param key - Translation key (e.g., "constraint.invalid")
 * @param options - Optional interpolation values
 * @returns The translated string
 */
function t(key: string, options?: Record<string, string | number>): string {
  let str: string | TranslationStrings = "";
  let target: string | TranslationStrings = SOURCE_STRINGS;

  // crude string getter
  key.split(".").forEach((part) => {
    if (typeof target === "object" && target !== null) {
      target = target[part] ?? "";
    }
    str = target;
  });

  // crude interpolator
  let output = typeof str === "string" ? str : "";
  if (options) {
    output = output.replace(/__([^_]+)__/g, (_match, p1) => {
      return options[p1] !== undefined ? String(options[p1]) : "";
    });
  }

  return output;
}

export { t };
