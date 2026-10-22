// Shared by the browser form and the API route so both validate the same way.

export const topics = [
  { value: "border", label: "A border or date is wrong" },
  { value: "missing", label: "A place or empire is missing" },
  { value: "bug", label: "Something isn't working" },
  { value: "classroom", label: "Using it in a classroom" },
  { value: "other", label: "Something else" },
] as const;

export type Topic = (typeof topics)[number]["value"];

export type FeedbackInput = {
  topic: Topic;
  era: string;
  region: string;
  message: string;
  source: string;
  name: string;
  email: string;
  /** honeypot: real people never see or fill this */
  website: string;
  /** ms timestamp when the form was rendered (bots submit instantly) */
  startedAt: number;
};

export type FieldErrors = Partial<Record<keyof FeedbackInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateFeedback(raw: Partial<Record<keyof FeedbackInput, unknown>>): { data: FeedbackInput; errors: FieldErrors } {
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const topic = topics.some((t) => t.value === raw.topic) ? (raw.topic as Topic) : "other";
  const data: FeedbackInput = {
    topic,
    era: str(raw.era, 40),
    region: str(raw.region, 120),
    message: str(raw.message, 4000),
    source: str(raw.source, 500),
    name: str(raw.name, 80),
    email: str(raw.email, 160),
    website: str(raw.website, 200),
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : Number(raw.startedAt) || 0,
  };
  const errors: FieldErrors = {};
  // checked in the order the fields appear, so focus goes to the first problem on the form
  if ((topic === "border" || topic === "missing") && !data.region) errors.region = "Which place is it about?";
  if (data.message.length < 10) errors.message = "Please write at least a sentence (10+ characters).";
  if (data.source && !/^https?:\/\//i.test(data.source)) errors.source = "Use a full link starting with http:// or https://";
  if (data.email && !EMAIL.test(data.email)) errors.email = "That email doesn't look right.";
  return { data, errors };
}
