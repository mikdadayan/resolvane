export const ErrorCode = {
  TICKET_NOT_FOUND: "TICKET_NOT_FOUND",
  ASSIGNEE_NOT_FOUND: "ASSIGNEE_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  ADMIN_UNDELETABLE: "ADMIN_UNDELETABLE",
  AI_AGENT_UNDELETABLE: "AI_AGENT_UNDELETABLE",
  REPLY_EMAIL_FAILED: "REPLY_EMAIL_FAILED",
  RESEND_FETCH_FAILED: "RESEND_FETCH_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

interface ErrorDefinition {
  statusCode: number;
  message: string;
  trackInSentry?: boolean;
}


export const ERROR_DEFINITIONS: Record<ErrorCode, ErrorDefinition> = {
  [ErrorCode.TICKET_NOT_FOUND]: { statusCode: 404, message: "Ticket not found", trackInSentry: true },
  [ErrorCode.ASSIGNEE_NOT_FOUND]: { statusCode: 400, message: "Assignee not found", trackInSentry: true },
  [ErrorCode.USER_NOT_FOUND]: { statusCode: 404, message: "User not found." },
  [ErrorCode.EMAIL_TAKEN]: { statusCode: 409, message: "A user with that email already exists." },
  [ErrorCode.ADMIN_UNDELETABLE]: { statusCode: 403, message: "Admin users cannot be deleted." },
  [ErrorCode.AI_AGENT_UNDELETABLE]: { statusCode: 403, message: "The AI agent cannot be deleted." },
  [ErrorCode.REPLY_EMAIL_FAILED]: {
    statusCode: 502,
    message: "Failed to send the reply email. The reply was not saved.",
  },
  [ErrorCode.RESEND_FETCH_FAILED]: {
    statusCode: 502,
    message: "Failed to fetch email content from Resend",
  },
};

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;

  constructor(code: ErrorCode) {
    const { statusCode, message } = ERROR_DEFINITIONS[code];
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isTrackedInSentry(code: ErrorCode): boolean {
  return ERROR_DEFINITIONS[code].trackInSentry ?? false;
}
