"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitReportQuiz } from "@/actions/reportActions";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";

/**
 * The report's 4-question RAG knowledge check. The correct answers are never
 * sent to the browser; grading happens server-side on submit and the Capsules
 * are awarded there.
 */
export default function ReportQuizCard({ report, onCompleted }) {
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const questions = report.quizQuestions || [];
  const answered = questions.length > 0 && questions.every((_, i) => answers[i]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const graded = await submitReportQuiz(
        report._id,
        questions.map((_, i) => answers[i])
      );
      setResult(graded);
      onCompleted?.(graded);
      window.dispatchEvent(new Event("arkcare-capsules"));
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!questions.length) return null;

  if (report.quizCompleted && !result) {
    return (
      <div className="rounded-[16px] bg-[var(--success-soft)] p-4 text-[12px] text-[var(--success)]">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold">
          <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.75} /> Knowledge check completed
        </div>
        <p className="mt-1">
          You scored {report.quizScore?.correct}/{report.quizScore?.total} and earned{" "}
          {report.awardedCapsules} Capsules.
        </p>
      </div>
    );
  }

  return (
    <div className="nm-stack-sm rounded-[16px] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="cq-kicker">KNOWLEDGE CHECK · 4 QUESTIONS</div>
      {questions.map((question, questionIndex) => (
        <fieldset key={question.questionId} className="space-y-2">
          <legend className="text-[12.5px] font-semibold text-[var(--text-strong)]">
            {questionIndex + 1}. {question.question}
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {question.options.map((option) => {
              const picked = answers[questionIndex] === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={picked}
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [questionIndex]: option }))
                  }
                  className={
                    "min-h-10 rounded-[12px] border px-3 py-2 text-left text-[12px] font-medium " +
                    (picked
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--text-strong)]"
                      : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text)] hover:bg-[var(--surface-hover)]")
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={submit} disabled={!answered || busy || result}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          )}
          Submit answers
        </Button>
        {!answered ? (
          <span className="text-[11px] text-[var(--text-muted)]">Answer all 4 to submit.</span>
        ) : null}
      </div>

      {error ? <p className="text-[11.5px] text-[var(--destructive)]">{error}</p> : null}

      {result ? (
        <div className="space-y-2 rounded-[14px] bg-[var(--surface-subtle)] p-3.5">
          <div className="text-[12.5px] font-semibold text-[var(--text-strong)]">
            You scored {result.correctCount}/{result.total} · +{result.awardedCapsules} Capsules
          </div>
          <ul className="space-y-1.5 text-[11.5px] leading-5 text-[var(--text-muted)]">
            {(result.graded || []).map((item, index) => (
              <li key={item.questionId} className="flex items-start gap-1.5">
                {item.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-[15px] w-[15px] shrink-0 text-[var(--success)]" strokeWidth={1.75} />
                ) : (
                  <XCircle className="mt-0.5 h-[15px] w-[15px] shrink-0 text-[var(--destructive)]" strokeWidth={1.75} />
                )}
                <span>
                  {index + 1}. Correct answer: <strong>{item.correctAnswer}</strong>
                  {item.explanation ? ` — ${item.explanation}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
