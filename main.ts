import 'bootstrap';
import Prism from "prismjs";  // Import Prism.js core
// import "prismjs/components/prism-html";  // Import language support (HTML)
import "prismjs/components/prism-css";   // Import CSS highlighting
import "prismjs/components/prism-javascript"; // Import JavaScript highlighting
import "prismjs/components/prism-typescript"; // Import TypeScript highlighting
// import trueCropper from "../src/index";

import "./assets/main.scss";
import TrueCropper from "truecropper";


function getDemoHtmlElement(selector: string) {
  // ------------------------------
  // Retrieve the Base Element
  // ------------------------------
  const base = document.querySelector(selector);
  if (!base) {
    console.error("Demo base element not found!");
    // Exit early if base element is missing.
    throw new Error("Demo base element not found!");
  }

  /**
   * Retrieves a single element within a given base element.
   * Throws an error if the element is not found.
   *
   * @param base - The parent element to search within.
   * @param selector - The CSS selector for the target element.
   * @returns The found element casted to the desired type.
   */
  const getElement = <T extends Element = Element>(base: ParentNode, selector: string): T => {
    const el = base.querySelector(selector);
    if (!el) {
      throw new Error(`${selector} element not found!`);
    }
    return el as T;
  };

  /**
   * Retrieves multiple elements within a given base element.
   * Throws an error if no elements are found.
   *
   * @param base - The parent element to search within.
   * @param selector - The CSS selector for the target elements.
   * @returns An array of found elements.
   */
  const getElements = <T extends Element = Element>(base: ParentNode, selector: string): T[] => {
    const nodeList = base.querySelectorAll(selector);
    if (!nodeList || nodeList.length === 0) {
      throw new Error(`${selector} elements not found!`);
    }
    return Array.from(nodeList) as T[];
  };

  // ------------------------------
  // Build HTML Elements Object
  // ------------------------------

  // Retrieve the form element from the base
  const form = getElement<HTMLFormElement>(base, "#trueCropperForm");

  // Create an object to store references to key HTML elements used in the demo
  const htmlElements = {
    form,
    image: getElement<HTMLImageElement>(base, "#trueCropper"),
    fileInput: getElement<HTMLInputElement>(base, "#demoFile"),
    error: getElement<HTMLElement>(base, "#demoError"),
    displayValues: {
      x: getElement<HTMLElement>(base, "#demoValuesX"),
      y: getElement<HTMLElement>(base, "#demoValuesY"),
      width: getElement<HTMLElement>(base, "#demoValuesWidth"),
      height: getElement<HTMLElement>(base, "#demoValuesHeight"),
    },
    inputElements: getElements<HTMLInputElement>(form, "input[name]"),
    selectElements: getElements<HTMLSelectElement>(form, "select[name]"),
    checkboxes: getElements<HTMLInputElement>(form, "[data-checkbox='values']"),
    inputs: [] as (HTMLInputElement | HTMLSelectElement)[],
  };

  // Combine all input and select elements into a single array for easier iteration
  htmlElements.inputs = [
    ...htmlElements.inputElements,
    ...htmlElements.selectElements,
  ];

  return htmlElements;
}
function demo() {
  const htmlElements = getDemoHtmlElement("#demo");
  if (htmlElements === null) {
    return;
  }

  // =======================
  // Default Options for trueCropper
  // =======================
  const defaultOptions = {
    returnMode: "relative" as const,
    allowFlip: true,
    allowNewSelection: true,
    allowResize: true,
    allowMove: true,
    // minSize: {width: 50, height: 50, unit: 'percent'},
    // minSize: {width: 200, height: 200, unit: 'real' as const},
    // aspectRatio: 1,
    // Callback to display error messages
    onError: (instance: TrueCropper, data: { message: string }) => {
      htmlElements.error.innerHTML = data.message;
      htmlElements.error.classList.remove("d-none");
    },
    // Callback to update crop values in the UI
    onCropEnd: (_klass: TrueCropper, data: { x: number; y: number; width: number; height: number }) => {
      Object.keys(data).map(key => {
        htmlElements.displayValues[key].innerHTML = data[key].toString();
      })
    },
  };
  // Initialize the cropper using the default options.
  let cropper = new TrueCropper(htmlElements.image, defaultOptions);

  // Define an update function that reinitializes the cropper with new options.
  const update = () => {
    cropper = updateCropperOptions(cropper);
  };
  // =======================
  // Function: Update Cropper Options
  // =======================
  /**
   * Reads form input values to create a new options object, destroys the old
   * cropper instance, reinitializes it with merged options, and updates the code display.
   * @param cropper - The current cropper instance.
   * @returns A new instance of trueCropper.
   */
  function updateCropperOptions(cropper: TrueCropper): TrueCropper {
    // Hide any error messages.
    htmlElements.error.classList.add("d-none");

    // Build new options from form inputs.
    const newOptions: any = {};

    for (const el of htmlElements.inputs) {
      if (el.disabled) continue;

      // Handle names like "option[subOption]"
      const [_, name, subName] = el.name.replace(/]/g, "").split("[");
      if (subName) {
        newOptions[name] = newOptions[name] || {};
        newOptions[name][subName] = subName === "unit" ? el.value : Number(el.value);
      } else {
        newOptions[name] = el.type === "checkbox" ? el.checked : Number(el.value);
      }
    }

    // Destroy the current cropper instance.
    cropper?.destroy();

    // Merge default options with new options.
    const options = { ...defaultOptions, ...newOptions };

    // Create and return a new cropper instance.
    return new TrueCropper(htmlElements.image, options);
  }

  // =======================
  // Function: Setup Checkbox Listeners
  // =======================
  /**
   * Sets up change event listeners for checkboxes that toggle the enabled state
   * of associated number and select inputs.
   * @param updateCallback - Callback to update the cropper when values change.
   */
  function setupCheckboxListeners(updateCallback: () => void): void {
    for (const el of htmlElements.checkboxes) {
      el.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (!target) return;

        const checked = target.checked;
        // Traverse up the DOM to get the parent container.
        const parent = target.parentNode?.parentNode?.parentNode;
        if (!parent) return;

        // Toggle the disabled state for all number inputs.
        const inputs = parent.querySelectorAll("input[type='number']");
        for (const input of inputs) {
          (input as HTMLInputElement).disabled = !checked;
        }

        // Toggle the disabled state for any select element.
        const select = parent.querySelector("select");
        if (select) {
          (select as HTMLSelectElement).disabled = !checked;
        }

        // Reinitialize cropper with updated options.
        updateCallback();
      });
    }
  }

  // =======================
  // Function: Setup Form Listeners
  // =======================
  /**
   * Adds change event listeners to all input and select elements within the form.
   * @param form - The form element to observe.
   * @param updateCallback - Callback to update the cropper when inputs change.
   */
  function setupFormListeners(updateCallback: () => void): void {
    for (const input of htmlElements.inputElements) {
      input.addEventListener("change", updateCallback);
    }
    for (const select of htmlElements.selectElements) {
      select.addEventListener("change", updateCallback);
    }
  }

  // =======================
  // Function: Setup File Input Listener
  // =======================
  /**
   * Sets up a file input listener to allow users to upload an image.
   * When a new file is selected, it reads the file and updates the image source.
   */
  function setupFileInputListener(): void {
    htmlElements.fileInput.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target) {
          htmlElements.image.src = e.target.result?.toString() || "";
        }
      };
      reader.readAsDataURL(files[0]);
    });

  }

  // Set up event listeners for checkboxes and other form elements.
  setupCheckboxListeners(update);
  setupFormListeners(update);

  // Set up the file input listener for image uploads.
  setupFileInputListener();
}


function example1() {
  // Select the image element for cropping
  const imageElement = document.querySelector("#example1") as HTMLImageElement;
  const cropper = new TrueCropper(imageElement);

  // Select the file input element
  const fileInput = document.querySelector("#exampleInput1");

  // Add an event listener for file input change
  fileInput?.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    // Exit if no files are selected
    if (!files || files.length === 0) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result) return;

      // Set the cropped image source
      cropper.setImage(result.toString());
      // Alternatively, update the image element's source directly
      // imageElement.src = result.toString();
    };

    // Read the selected file as a data URL
    reader.readAsDataURL(files[0]);
  });
}

function example2() {
  // Select the image element for cropping
  const imageElement = document.querySelector("#example2") as HTMLImageElement;
  const imageElementButton = document.querySelector("#exampleButtonImage2") as HTMLImageElement;
  const cropper = new TrueCropper(imageElement, {
    aspectRatio: 1,
    onCropEnd: (instance, data) => {
      const canvas = instance.getImagePreview();
      if (canvas) {
        imageElementButton.src = canvas.toDataURL();
      }
    },
  });

  imageElementButton.src = imageElement.src;
  // Select the file input element
  const fileInput = document.querySelector("#exampleInput2");

  // Add an event listener for file input change
  fileInput?.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    // Exit if no files are selected
    if (!files || files.length === 0) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result) return;

      // Set the cropped image source
      cropper.setImage(result.toString());
    };

    // Read the selected file as a data URL
    reader.readAsDataURL(files[0]);
  });
}

function example3() {
  const errorDiv = document.querySelector("#exampleError3") as HTMLImageElement;
  // Select the image element for cropping
  const imageElement = document.querySelector("#example3") as HTMLImageElement;
  const cropper = new TrueCropper(imageElement, {
    minSize: {
      width: 500,
      height: 500
    },
    onError: (instance, error) => {
      errorDiv.innerText = error.message;
      errorDiv.classList.remove('d-none');
      imageElement.classList.add('d-none');
    }
  });

  // Select the file input element
  const fileInput = document.querySelector("#exampleInput3");

  // Add an event listener for file input change
  fileInput?.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    // Exit if no files are selected
    if (!files || files.length === 0) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result) return;

      errorDiv.innerText = "";
      errorDiv.classList.add('d-none');
      // Set the cropped image source
      // cropper.setImage(result.toString());
      imageElement.src = result.toString();
      imageElement.classList.remove('d-none');
    };

    // Read the selected file as a data URL
    reader.readAsDataURL(files[0]);
  });
}

function example4() {
  const imageElement = document.querySelector("#example4") as HTMLImageElement;
  const cropper = new TrueCropper(imageElement);

  document.querySelector("#example4MoveLeft")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    cropper.moveTo({ x: currentValue.x - 10, y: currentValue.y });
  })
  document.querySelector("#example4MoveRight")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    cropper.moveTo({ x: currentValue.x + 10, y: currentValue.y });
  })
  document.querySelector("#example4MoveTop")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    cropper.moveTo({ x: currentValue.x, y: currentValue.y - 10 });
  })
  document.querySelector("#example4MoveBottom")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    cropper.moveTo({ x: currentValue.x, y: currentValue.y + 10 });
  })

  document.querySelector("#example4ResizeLeftTop")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    // for example use setValue
    const status = cropper.setValue({ x: currentValue.x - 10, y: currentValue.y - 10, width: currentValue.width + 10, height: currentValue.height + 10 });
    console.log(status);
  })
  document.querySelector("#example4ResizeLeftBottom")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    // for example use setValue
    const status = cropper.setValue({ x: currentValue.x - 10, y: currentValue.y, width: currentValue.width + 10, height: currentValue.height + 10 });
    console.log(status);
  })
  document.querySelector("#example4ResizeRightTop")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    // for example use resizeTo
    const status = cropper.resizeTo({ width: currentValue.width + 10, height: currentValue.height + 10 }, { x: 0, y: 1 });
    console.log(status);
  })
  document.querySelector("#example4ResizeRightBottom")?.addEventListener("click", () => {
    const currentValue = cropper.getValue();
    // for example use resizeTo
    const status = cropper.resizeTo({ width: currentValue.width + 10, height: currentValue.height + 10 }, { x: 0, y: 0 });
    console.log(status);
  })

  document.querySelector("#example4DownScale")?.addEventListener("click", () => {
    // { x: 0.5, y: 0.5 } is center
    // { x: 0, y: 1 } is left bottom
    // { x: 1, y: 0 } is right top
    // { x: 0.4, y: 0.3 } is 40% from left, is 30% from top
    const status = cropper.scaleBy(0.5, { x: 0.5, y: 0.5 });
    console.log(status);
  })
  document.querySelector("#example4UpScale")?.addEventListener("click", () => {
    const status = cropper.scaleBy(2);
    console.log(status);
  })
}

function example5() {
  // Select the image element for cropping
  const imageElement = document.querySelector("#example5") as HTMLImageElement;
  const imageElementPreview = document.querySelector("#examplePreview5") as HTMLImageElement;
  const cropper = new TrueCropper(imageElement, {
    onCropEnd: (instance, data) => {
      const canvas = instance.getImagePreview();
      if (canvas) {
        imageElementPreview.src = canvas.toDataURL();
      }
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  Prism.highlightAll();
  demo();
  example1();
  example2();
  example3();
  example4();
  example5();
});