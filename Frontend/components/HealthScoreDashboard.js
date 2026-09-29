"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import PathMorph from "@/components/motion/PathMorph";
import {
    Heart, Brain, Activity, Apple, Moon, Smile,
    TrendingUp, TrendingDown, Minus, Play, RefreshCw,
    ChevronLeft,
    ShieldCheck
} from "lucide-react";
import HealthQuestionnaire from "./HealthQuestionnaire";
import { getHealthData, updateHealthScore } from "@/actions/healthActions";
import AIHealthInsights from "./AIHealthInsights";

// Monochrome theme: the accent is the theme's primary (celadon). SVG
// presentation attributes resolve var() inconsistently across browsers, so it is
// applied through style rather than stroke/fill attributes.
const ACCENT_COLOR = "var(--primary)";

/*
 * A real vitals trace rather than a decorative squiggle: the path is scrubbed by
 * PathMorph as the score card enters the viewport, so the reading is *drawn on*
 * exactly as the score beside it is revealed. Celadon, because this is care
 * data — copper is reserved for proof surfaces.
 */
const VitalsTrace = ({ className = "" }) => (
    <PathMorph
        d={
            "M0 108 L54 108 L64 108 L72 96 L80 122 L88 62 L96 138 L104 108 " +
            "L150 108 L160 108 L168 98 L176 120 L184 68 L192 132 L200 108 " +
            "L246 108 L256 108 L264 96 L272 122 L280 62 L288 138 L296 108 " +
            "L342 108 L352 108 L360 98 L368 120 L376 68 L384 132 L392 108 " +
            "L440 108 L450 108 L458 96 L466 122 L474 62 L482 138 L490 108 L500 108"
        }
        variant="vitals"
        mode="draw"
        viewBox="0 0 500 160"
        className={"h-14 w-full " + className}
    />
);

const GlowingScoreVisual = ({ score }) => {
    const circumference = 2 * Math.PI * 84;

    return (
        <div className="flex flex-shrink-0 flex-col items-center gap-4">
            <div className="relative h-40 w-40 md:h-44 md:w-44">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 192 192">
                    <circle cx="96" cy="96" r="84" fill="none" style={{ stroke: "var(--surface-muted)" }} strokeWidth="12" />
                    <circle
                        cx="96" cy="96" r="84" fill="none"
                        style={{ stroke: ACCENT_COLOR }}
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (score / 100) * circumference}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="flex h-full w-full items-center justify-center">
                    <Brain
                        className="h-16 w-16 text-[var(--text-subtle)] md:h-20 md:w-20"
                        strokeWidth={1.5}
                    />
                </div>
            </div>
            {/* Data surface: the trace is a reading, so it never sits on a blur. */}
            <div className="glass-data w-full rounded-[14px] px-3 py-2">
                <VitalsTrace />
                <div className="cq-kicker mt-1 text-center">Vitals trace · {score}/100</div>
            </div>
        </div>
    );
};

export default function HealthScoreDashboard({ patient }) {
    const [healthData, setHealthData] = useState(null);
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHealthData();
    }, []);

    const loadHealthData = async () => {
        try {
            const data = await getHealthData();
            setHealthData(data);
        } catch (error) {
            console.error("Error loading health data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuestionnaireComplete = async (responses) => {
        try {
            setLoading(true);
            const updatedData = await updateHealthScore(responses);
            setHealthData(updatedData);
            setShowQuestionnaire(false);
        } catch (error) {
            console.error("Error updating health score:", error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreStatus = (score) => {
        let text = "Needs Improvement";
        let variant = "destructive";
        if (score >= 80) { text = "Excellent"; variant = "success"; }
        else if (score >= 60) { text = "Good"; variant = "info"; }
        else if (score >= 40) { text = "Fair"; variant = "warning"; }
        return { text, variant };
    };

    const getTrendIcon = (trend) => {
        if (trend === 'improving') return <TrendingUp className="h-[18px] w-[18px] text-[var(--success)]" strokeWidth={1.75} />;
        if (trend === 'declining') return <TrendingDown className="h-[18px] w-[18px] text-[var(--destructive)]" strokeWidth={1.75} />;
        return <Minus className="h-[18px] w-[18px] text-[var(--text-subtle)]" strokeWidth={1.75} />;
    };

    if (loading) {
        return (
            <div className="grid min-h-[40vh] place-items-center">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-subtle)]" strokeWidth={1.75} />
                <span className="sr-only">Loading your health data</span>
            </div>
        );
    }

    const currentScore = healthData?.current_score || 0;
    const questionnaireScore = healthData?.questionnaire_score || 0;
    const aiScore = healthData?.ai_score || 0;
    const scoreStatus = getScoreStatus(currentScore);
    const categoryScores = healthData?.questionnaire?.categories || {};

    return (
        <div className="nm-dash">
            <div className="nm-dash-col nm-stack">
                <Reveal className="nm-stack-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <Button asChild variant="secondary" size="icon" aria-label="Go back to patient page">
                                <Link href="/patient">
                                    <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                </Link>
                            </Button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="status-chip">Health journey</span>
                                    <span className="cq-pixel-label">PROGRESS LAYER</span>
                                </div>
                                <MaskedText
                                    as="h1"
                                    className="mt-2 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)]"
                                >
                                    Health Journey
                                </MaskedText>
                                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                                    Turn assessments and reports into a trackable care progression.
                                </p>
                            </div>
                        </div>
                        <Button onClick={() => setShowQuestionnaire(true)}>
                            <Play className="h-4 w-4" strokeWidth={1.75} />
                            {healthData?.questionnaire ? "Retake assessment" : "Take assessment"}
                        </Button>
                    </div>
                </Reveal>

                {healthData?.questionnaire ? (
                    <Reveal>
                        <Card tone="data" className="overflow-hidden">
                            <CardContent className="grid grid-cols-1 gap-6 p-5 md:grid-cols-5 md:items-center md:p-6">
                                <div className="flex items-center justify-center md:col-span-2">
                                    <GlowingScoreVisual score={currentScore} />
                                </div>
                                <div className="space-y-4 md:col-span-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="nm-metric-xl tabular-nums" style={{ color: ACCENT_COLOR }}>
                                                {currentScore}
                                                <span className="text-[16px] text-[var(--text-muted)]">/100</span>
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={scoreStatus.variant}>{scoreStatus.text}</Badge>
                                                {healthData?.trend ? getTrendIcon(healthData.trend) : null}
                                            </div>
                                        </div>
                                        <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
                                            Your overall health score based on recent data.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                                            <span>Overall progress</span>
                                            <span className="tabular-nums">{currentScore}%</span>
                                        </div>
                                        <Progress value={currentScore} className="h-2" />
                                    </div>

                                    {(questionnaireScore > 0 || aiScore > 0) && (
                                        <div className="space-y-2">
                                            <h3 className="nm-card-title">Score breakdown</h3>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                {questionnaireScore > 0 && (
                                                    <div className="glass-data flex-1 rounded-[18px] px-3.5 py-3">
                                                        <div className="nm-stat-label">Assessment</div>
                                                        <div className="nm-stat-value mt-1 text-[22px] tabular-nums">
                                                            {questionnaireScore}
                                                        </div>
                                                    </div>
                                                )}
                                                {aiScore > 0 && (
                                                    <div className="glass-data flex-1 rounded-[18px] px-3.5 py-3">
                                                        <div className="nm-stat-label">AI analysis</div>
                                                        <div className="nm-stat-value mt-1 text-[22px] tabular-nums">
                                                            {aiScore}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </Reveal>
                ) : (
                    <Reveal>
                        <Card>
                            <CardContent className="p-8 text-center md:p-10">
                                <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[var(--primary)] text-[var(--dark-text)]">
                                    <Heart className="h-6 w-6" strokeWidth={1.75} />
                                </div>
                                <h3 className="cq-section-title mt-4">Start your health journey</h3>
                                <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-6 text-[var(--text-muted)]">
                                    Take our comprehensive health assessment to get your personalized
                                    score and AI-powered recommendations.
                                </p>
                                <Button onClick={() => setShowQuestionnaire(true)} className="mt-5">
                                    <Play className="h-4 w-4" strokeWidth={1.75} />
                                    Take health assessment
                                </Button>
                            </CardContent>
                        </Card>
                    </Reveal>
                )}

                {Object.keys(categoryScores).length > 0 && (
                    <Reveal className="nm-stack-sm">
                        <h2 className="cq-section-title">Category breakdown</h2>
                        {/* Readings, not decoration: near-opaque data surface. */}
                        <div className="nm-grid-2">
                            {Object.entries({
                                diet: { title: 'Diet & Nutrition', Icon: Apple },
                                exercise: { title: 'Physical Activity', Icon: Activity },
                                sleep: { title: 'Sleep & Rest', Icon: Moon },
                                mental_health: { title: 'Mental Wellness', Icon: Smile },
                            }).map(([key, { title, Icon }]) => (
                                <div key={key} className="glass-data rounded-[18px] p-3.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="nm-stat-icon">
                                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                            </div>
                                            <span className="nm-card-title text-[13px]">{title}</span>
                                        </div>
                                        <span className="nm-metric-xl text-[22px] tabular-nums">
                                            {categoryScores[key] || 0}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <Progress value={categoryScores[key] || 0} className="h-1.5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                )}

                {healthData?.questionnaire && (
                    <AIHealthInsights healthData={healthData} onRefresh={loadHealthData} />
                )}
            </div>

            {/* ------------------------------------------- right insight rail */}
            <aside className="nm-rail" aria-label="Score safety notes">
                {/* The one ink anchor on this screen — a number you must not misread. */}
                <div className="nm-dark-card p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--dark-muted)]">
                        Current score
                    </div>
                    <div className="mt-1.5 text-[30px] font-bold leading-none text-[var(--dark-text)] tabular-nums">
                        {currentScore}
                        <span className="text-[13px] font-semibold text-[var(--dark-muted)]">/100</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <Badge variant={scoreStatus.variant}>{scoreStatus.text}</Badge>
                        {healthData?.trend ? getTrendIcon(healthData.trend) : null}
                    </div>
                    <p className="mt-3 text-[10.5px] leading-4 text-[var(--dark-muted)]">
                        A progress signal only. It never changes a diagnosis, prescription or
                        treatment decision.
                    </p>
                </div>

                <div className="nm-stack-sm">
                    <div className="cq-kicker">HOW TO READ THIS</div>
                    <div className="nm-row justify-start text-[12px] leading-5 text-[var(--text-muted)]">
                        <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-[var(--text-strong)]" strokeWidth={1.75} />
                        Your score summarises your own answers and report data.
                    </div>
                    <div className="nm-row justify-start text-[12px] leading-5 text-[var(--text-muted)]">
                        <Brain className="h-[18px] w-[18px] shrink-0 text-[var(--text-strong)]" strokeWidth={1.75} />
                        AI analysis is informational and never prescriptive.
                    </div>
                    <div className="nm-row justify-start text-[12px] leading-5 text-[var(--text-muted)]">
                        <StethoscopeIcon />
                        A clinician confirms anything that affects your care.
                    </div>
                </div>

                <Link href="/patient" className="nm-btn-secondary w-full">
                    Back to patient home
                </Link>
            </aside>

            {showQuestionnaire && (
                <HealthQuestionnaire
                    isOpen={showQuestionnaire}
                    onClose={() => setShowQuestionnaire(false)}
                    onComplete={handleQuestionnaireComplete}
                    previousResponses={healthData?.questionnaire?.responses}
                />
            )}
        </div>
    );
}

function StethoscopeIcon() {
    return (
        <span
            aria-hidden="true"
            className="inline-block h-[18px] w-[18px] shrink-0"
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-strong)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M4.8 2.3v5.2a4.2 4.2 0 0 0 8.4 0V2.3" />
                <path d="M3 2.3h3.4M11.8 2.3h3.4" />
                <path d="M9 11.7v1.9a4.7 4.7 0 0 0 9.4 0v-1.5" />
                <circle cx="18.4" cy="10.4" r="1.8" />
            </svg>
        </span>
    );
}
