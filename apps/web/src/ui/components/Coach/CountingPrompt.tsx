type CountingPromptProps = {
  prompt: string;
};

export function CountingPrompt({ prompt }: CountingPromptProps) {
  return <div className="counting-prompt">{prompt}</div>;
}
