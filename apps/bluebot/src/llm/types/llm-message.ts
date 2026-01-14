export interface LLMMessage {
  role: `user` | `assistant` | `system`;
  content: string;
}
