import axios from "axios";
import * as Sentry from "@sentry/react";

export function reportUnexpectedError(error: unknown) {
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
    return;
  }
  Sentry.captureException(error);
}
