import { fireEvent } from "custom-card-helpers";

export interface ConfirmationDialogParams {
  title?: string;
  text: string;
  cancel?: string;
  okay?: string;
  confirm?: () => void;
  dismiss?: () => void;
}

export const loadConfirmationDialog = () =>
  import(/* webpackChunkName: "confirmation" */ "./dialog-confirmation");

export const showConfirmationDialog = (
  element: HTMLElement,
  systemLogDetailParams: ConfirmationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-confirmation",
    dialogImport: loadConfirmationDialog,
    dialogParams: systemLogDetailParams
  });
};
