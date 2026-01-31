type FeedbackToastProps = {
  message: string;
};

export function FeedbackToast({ message }: FeedbackToastProps) {
  return <div className="feedback-toast">{message}</div>;
}
