interface DialogContentObj {
  msg?: string;
  message?: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmDialogState {
  isOpen: boolean;
  content: string;
  title: string;
  confirmText: string;
  cancelText: string;
  resolve: ((value: boolean) => void) | null;
}

class ConfirmDialogManager {
  private dialogElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private state: ConfirmDialogState = {
    isOpen: false,
    content: "",
    title: "Confirm",
    confirmText: "Yes",
    cancelText: "No",
    resolve: null,
  };

  constructor() {
    this.createDialogElements();
    this.attachEventListeners();
  }

  private createDialogElements(): void {
    // Create overlay
    this.overlayElement = document.createElement("div");
    this.overlayElement.className =
      "fixed inset-0 bg-black/50 z-[9999] opacity-0 transition-opacity duration-200 ease-in-out";
    this.overlayElement.style.display = "none";

    // Create dialog
    this.dialogElement = document.createElement("div");
    this.dialogElement.className =
      "fixed top-1/2 left-1/2 -translate-x-1/2 p-5 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full z-[10000] scale-95 transition-transform duration-200 ease-in-out";

    this.dialogElement.innerHTML = `
      <div>
        <h2 class="confirm-dialog-title text-lg font-semibold text-gray-900 mb-2"></h2>
        <p class="confirm-dialog-description mt-2 text-sm text-neutral-500 leading-relaxed"></p>
      </div>
      <div class="flex justify-end mt-2">
        <button class="confirm-dialog-confirm focus:outline-none border border-transparent transition ease-in-out duration-300 rounded-md px-4 py-2 text-xs text-primary enabled:hover:bg-gray-100 focus:ring-gray-500 mr-5">
          Yes
        </button>
        <button class="confirm-dialog-cancel focus:outline-none border border-transparent transition ease-in-out duration-300 rounded-md px-4 py-2 text-xs text-primary enabled:hover:bg-gray-100 focus:ring-gray-500">
          No
        </button>
      </div>
    `;
    document.body.appendChild(this.overlayElement);
    this.overlayElement.appendChild(this.dialogElement);
  }

  private attachEventListeners(): void {
    // Cancel button
    const cancelButton = this.dialogElement?.querySelector(
      ".confirm-dialog-cancel"
    ) as HTMLButtonElement;
    cancelButton?.addEventListener("click", () => this.handleCancel());

    // Confirm button
    const confirmButton = this.dialogElement?.querySelector(
      ".confirm-dialog-confirm"
    ) as HTMLButtonElement;
    confirmButton?.addEventListener("click", () => this.handleConfirm());

    // Overlay click
    this.overlayElement?.addEventListener("click", (e) => {
      if (e.target === this.overlayElement) {
        this.handleCancel();
      }
    });

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.state.isOpen) {
        this.handleCancel();
      }
    });
  }

  private handleConfirm(): void {
    if (this.state.resolve) {
      this.state.resolve(true);
    }
    this.closeDialog();
  }

  private handleCancel(): void {
    if (this.state.resolve) {
      this.state.resolve(false);
    }
    this.closeDialog();
  }

  private openDialog(): void {
    if (!this.overlayElement || !this.dialogElement) return;

    this.overlayElement.style.display = "block";

    // Force reflow
    this.overlayElement.offsetHeight;

    // Animate in
    this.overlayElement.classList.remove("opacity-0");
    this.overlayElement.classList.add("opacity-100");
    this.dialogElement.classList.remove("scale-95");
    this.dialogElement.classList.add("scale-100");

    // Focus management
    const confirmButton = this.dialogElement.querySelector(
      ".confirm-dialog-confirm"
    ) as HTMLButtonElement;
    confirmButton?.focus();

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }

  private closeDialog(): void {
    if (!this.overlayElement || !this.dialogElement) return;

    // Animate out
    this.overlayElement.classList.remove("opacity-100");
    this.overlayElement.classList.add("opacity-0");
    this.dialogElement.classList.remove("scale-100");
    this.dialogElement.classList.add("scale-95");

    setTimeout(() => {
      if (this.overlayElement) {
        this.overlayElement.style.display = "none";
      }
      // Restore body scroll
      document.body.style.overflow = "";
    }, 200);

    this.state.isOpen = false;
    this.state.resolve = null;
  }

  public confirm(content: string | DialogContentObj): Promise<boolean> {
    return new Promise((resolve) => {
      let dialogContent = "";
      let title = "Confirm";
      let confirmText = "Remove";
      let cancelText = "Cancel";

      if (typeof content === "object") {
        dialogContent = content.msg ?? content.message ?? "";
        title = content.title ?? "Confirm";
        confirmText = content.confirmText ?? "Remove";
        cancelText = content.cancelText ?? "Cancel";
      } else {
        dialogContent = content;
      }

      this.state = {
        isOpen: true,
        content: dialogContent,
        title,
        confirmText,
        cancelText,
        resolve,
      };

      // Update dialog content
      const titleElement = this.dialogElement?.querySelector(
        ".confirm-dialog-title"
      );
      const descriptionElement = this.dialogElement?.querySelector(
        ".confirm-dialog-description"
      );
      const cancelButton = this.dialogElement?.querySelector(
        ".confirm-dialog-cancel"
      ) as HTMLButtonElement;
      const confirmButton = this.dialogElement?.querySelector(
        ".confirm-dialog-confirm"
      ) as HTMLButtonElement;

      if (titleElement) titleElement.textContent = title;
      if (descriptionElement) descriptionElement.textContent = dialogContent;
      if (cancelButton) cancelButton.textContent = cancelText;
      if (confirmButton) confirmButton.textContent = confirmText;

      // Update button styles based on context
      // if (
      //   confirmText.toLowerCase().includes("delete") ||
      //   confirmText.toLowerCase().includes("remove")
      // ) {
      //   confirmButton.className =
      //     "confirm-dialog-confirm px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200";
      // } else {
      //   confirmButton.className =
      //     "confirm-dialog-confirm px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200";
      // }

      this.openDialog();
    });
  }
}

// Create global instance
const dialogManager = new ConfirmDialogManager();

// Export the confirm function
export function confirm(content: string | DialogContentObj): Promise<boolean> {
  return dialogManager.confirm(content);
}
