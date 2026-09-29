"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const HEALTH_QUESTIONS = [
    // Your HEALTH_QUESTIONS array remains unchanged...
    { id: "exercise_frequency", question: "How often do you exercise per week?", options: [{ value: "none", label: "Never or rarely" }, { value: "1-2", label: "1-2 times" }, { value: "3-4", label: "3-4 times" }, { value: "5-6", label: "5-6 times" }, { value: "daily", label: "Daily" }] },
    { id: "sleep_hours", question: "How many hours do you sleep on average per night?", options: [{ value: "less-5", label: "Less than 5 hours" }, { value: "5-6", label: "5-6 hours" }, { value: "7-8", label: "7-8 hours" }, { value: "8-9", label: "8-9 hours" }, { value: "more-9", label: "More than 9 hours" }] },
    { id: "diet_quality", question: "How would you rate your overall diet quality?", options: [{ value: "poor", label: "Poor (mostly processed foods)" }, { value: "fair", label: "Fair (mixed diet)" }, { value: "good", label: "Good (balanced with some healthy foods)" }, { value: "excellent", label: "Excellent (mostly whole foods)" }] },
    { id: "stress_level", question: "How would you rate your average stress level?", options: [{ value: "very-low", label: "Very low" }, { value: "low", label: "Low" }, { value: "moderate", label: "Moderate" }, { value: "high", label: "High" }, { value: "very-high", label: "Very high" }] },
    { id: "water_intake", question: "How much water do you drink per day?", options: [{ value: "less-2", label: "Less than 2 glasses" }, { value: "2-4", label: "2-4 glasses" }, { value: "5-7", label: "5-7 glasses" }, { value: "8+", label: "8+ glasses" }] },
    { id: "smoking_status", question: "Do you smoke or use tobacco products?", options: [{ value: "never", label: "Never smoked" }, { value: "former", label: "Former smoker (quit over 1 year ago)" }, { value: "recent-quit", label: "Recently quit (less than 1 year)" }, { value: "occasional", label: "Occasional smoker" }, { value: "regular", label: "Regular smoker" }] },
    { id: "alcohol_consumption", question: "How often do you consume alcohol?", options: [{ value: "never", label: "Never" }, { value: "rarely", label: "Rarely (special occasions)" }, { value: "weekly", label: "1-2 times per week" }, { value: "several-weekly", label: "3-4 times per week" }, { value: "daily", label: "Daily" }] },
    { id: "mental_wellness", question: "How often do you feel happy and content?", options: [{ value: "rarely", label: "Rarely" }, { value: "sometimes", label: "Sometimes" }, { value: "often", label: "Often" }, { value: "very-often", label: "Very often" }, { value: "always", label: "Almost always" }] },
    { id: "social_connections", question: "How satisfied are you with your social connections?", options: [{ value: "very-unsatisfied", label: "Very unsatisfied" }, { value: "unsatisfied", label: "Unsatisfied" }, { value: "neutral", label: "Neutral" }, { value: "satisfied", label: "Satisfied" }, { value: "very-satisfied", label: "Very satisfied" }] },
    { id: "work_life_balance", question: "How would you rate your work-life balance?", options: [{ value: "very-poor", label: "Very poor" }, { value: "poor", label: "Poor" }, { value: "fair", label: "Fair" }, { value: "good", label: "Good" }, { value: "excellent", label: "Excellent" }] }
];

export default function HealthQuestionnaire({ isOpen, onClose, onComplete, previousResponses = {} }) {
    const [responses, setResponses] = useState(previousResponses);
    const [loading, setLoading] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const currentQuestion = HEALTH_QUESTIONS[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === HEALTH_QUESTIONS.length - 1;

    const handleAnswerChange = (questionId, value) => {
        setResponses(prev => ({ ...prev, [questionId]: value }));
        // Automatically move to the next question for a smoother flow
        setTimeout(() => {
            if (!isLastQuestion) handleNext();
        }, 200);
    };

    const handleNext = () => {
        if (!isLastQuestion) setCurrentQuestionIndex(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
    };

    const handleSubmit = async () => {
        const unansweredQuestions = HEALTH_QUESTIONS.filter(q => !responses[q.id]);
        if (unansweredQuestions.length > 0) {
            alert(`Please answer all ${unansweredQuestions.length} remaining questions.`);
            return;
        }
        setLoading(true);
        try {
            await onComplete(responses);
        } catch (error) {
            console.error("Error submitting questionnaire:", error);
        } finally {
            setLoading(false);
        }
    };

    const progress = (Object.keys(responses).length / HEALTH_QUESTIONS.length) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* Not a fixed height: the dialog grows with the question and is
                capped by the viewport, so a long option list scrolls the
                dialog body rather than clipping the footer buttons. */}
            <DialogContent className="flex max-h-[88vh] w-full max-w-md flex-col p-0">

                <DialogHeader className="flex-shrink-0 border-b border-[var(--border-subtle)] p-4 sm:p-5">
                    <DialogTitle>Health Assessment</DialogTitle>
                    <DialogDescription>
                        Answer all {HEALTH_QUESTIONS.length} questions for your health score.
                    </DialogDescription>
                    <div className="mt-2.5">
                        <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                            <span>{Object.keys(responses).length} of {HEALTH_QUESTIONS.length} answered</span>
                            <span className="tabular-nums">{Math.round(progress)}%</span>
                        </div>
                        <div className="cq-progress">
                            <span style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </DialogHeader>

                {/* A dialog body legitimately scrolls: the assessment is a
                    stepped flow, and a fixed-height modal is the one place an
                    inner scroller is correct. Page content never does this. */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {/* cq-reveal: one enter per question, pure CSS, replayed by the
                        existing `key` change — no new JS animation. */}
                    <div key={currentQuestion.id} className="cq-reveal">
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[12px] font-bold text-[var(--primary-foreground)] tabular-nums">
                                {currentQuestionIndex + 1}
                            </div>
                            <div className="flex-1">
                                <h3 className="nm-card-title mb-3 text-[14px]">
                                    {currentQuestion.question}
                                </h3>
                                {/* The options are an ordered choice list, so they read
                                    as hairline-separated rows rather than chips. */}
                                <RadioGroup
                                    value={responses[currentQuestion.id] || ""}
                                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                                >
                                    {currentQuestion.options.map((option) => (
                                        <Label
                                            key={option.value}
                                            htmlFor={`${currentQuestion.id}-${option.value}`}
                                            className={`flex min-h-11 cursor-pointer items-center gap-3 border-b border-[var(--border-subtle)] py-2.5 transition last:border-b-0 hover:bg-[var(--surface-subtle)] ${responses[currentQuestion.id] === option.value
                                                    ? 'rounded-[12px] bg-[var(--primary-soft)] px-3 font-semibold text-[var(--text-strong)]'
                                                    : 'px-1 text-[var(--text)]'
                                                }`}
                                        >
                                            <RadioGroupItem
                                                value={option.value}
                                                id={`${currentQuestion.id}-${option.value}`}
                                                className="border-[var(--border-strong)] data-[state=checked]:border-[var(--primary)] data-[state=checked]:text-[var(--primary)]"
                                            />
                                            <span className="flex-1 text-[12.5px] font-normal">
                                                {option.label}
                                            </span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 border-t border-[var(--border-subtle)] p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={loading || currentQuestionIndex === 0}
                        >
                            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                            Back
                        </Button>

                        {isLastQuestion ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || Object.keys(responses).length < HEALTH_QUESTIONS.length}
                                className="min-w-[150px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" strokeWidth={1.75} /> Get my score
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleNext}
                                disabled={loading || !responses[currentQuestion.id]}
                            >
                                Next <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}