"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import { Lightbulb, Target, TrendingUp, RefreshCw, ShieldCheck } from "lucide-react";

export default function AIHealthInsights({ healthData, onRefresh }) {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Automatically generate insights when the component loads with data
        if (
            typeof healthData?.current_score === "number" &&
            healthData?.questionnaire
        ) {
            generateInsights();
        }
    }, [healthData]);

    const generateInsights = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/generate-health-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    health_score: healthData.current_score,
                    questionnaire_data: healthData.questionnaire
                })
            });

            if (!response.ok) throw new Error('Failed to generate insights');

            const data = await response.json();
            setInsights(data.insights);
        } catch (error) {
            console.error('Error generating insights:', error);
            // Optionally set an error state here to show a message to the user
        } finally {
            setLoading(false);
        }
    };

    if (!healthData?.questionnaire) {
        return null;
    }

    // Priority pills use the semantic status colors, never raw green/yellow.
    const getPriorityVariant = (priority) => {
        switch (priority) {
            case 'High':
                return 'success';
            case 'Medium':
                return 'warning';
            default:
                return 'secondary';
        }
    };

    return (
        <Reveal>
        <section className="plain-panel">
            <div className="section-rule">AI layer</div>
            <div className="section-head">
                <div>
                    <MaskedText as="h2" className="section-title flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
                        AI Health Insights
                    </MaskedText>
                    <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                        Personalized analysis and recommendations.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={generateInsights}
                    disabled={loading}
                    className="nm-btn-secondary shrink-0"
                    aria-label="Refresh insights"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                    {loading ? "Analyzing…" : "Refresh insights"}
                </button>
            </div>

            <p className="mb-4 flex items-start gap-1.5 rounded-[14px] bg-[var(--warning-soft)] px-3 py-2.5 text-[11.5px] leading-5 text-[var(--warning)]">
                <ShieldCheck className="mt-0.5 h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
                AI never prescribes, diagnoses or approves anything. These insights are
                informational and need clinician review before they affect your care.
            </p>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <RefreshCw className="mb-3 h-6 w-6 animate-spin text-[var(--text-subtle)]" strokeWidth={1.75} />
                    <p className="text-[13px] font-semibold text-[var(--text-strong)]">
                        Analyzing your health data...
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        Insights are generated locally from your own submissions.
                    </p>
                </div>
            ) : insights ? (
                <div className="space-y-5">
                    {/* Overall Assessment */}
                    {insights.overall_assessment && (
                        <div className="well">
                            <h3 className="nm-card-title flex items-center gap-2">
                                <Target className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                Overall Assessment
                            </h3>
                            <p className="mt-1.5 text-[12.5px] leading-6 text-[var(--text-muted)]">
                                {insights.overall_assessment}
                            </p>
                        </div>
                    )}

                    {/* Recommendations — an ordered list of actions, so a ledger. */}
                    {insights.recommendations?.length > 0 && (
                        <div>
                            <div className="section-head">
                                <h3 className="section-title text-[15px]! flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                                    Action recommendations
                                </h3>
                            </div>
                            <div className="ledger">
                                <div className="ledger-head">
                                    <span>Recommendation</span>
                                    <span>Priority</span>
                                </div>
                                {insights.recommendations.map((rec, index) => (
                                    <div key={index} className="ledger-row items-start">
                                        <div className="min-w-0">
                                            <h4 className="ledger-title">
                                                <span className="timeline-time mr-2">
                                                    {String(index + 1).padStart(2, "0")}
                                                </span>
                                                {rec.title}
                                            </h4>
                                            <p className="ledger-meta mt-1 max-w-2xl">
                                                {rec.description}
                                            </p>
                                            {rec.expected_impact && (
                                                <p className="mt-1.5 text-[11px] font-semibold text-[var(--success)]">
                                                    Expected impact: {rec.expected_impact}
                                                </p>
                                            )}
                                        </div>
                                        {rec.priority && (
                                            <div className="ledger-actions">
                                                <Badge variant={getPriorityVariant(rec.priority)}>
                                                    {rec.priority} priority
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Key Focus Areas */}
                    {insights.focus_areas?.length > 0 && (
                        <div>
                            <h3 className="nm-card-title mb-2">Key focus areas</h3>
                            <div className="flex flex-wrap gap-2">
                                {insights.focus_areas.map((area, index) => (
                                    <Badge key={index} variant="secondary">
                                        {area}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-10 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-[16px] bg-[var(--surface-subtle)]">
                        <Lightbulb className="h-5 w-5 text-[var(--text-subtle)]" strokeWidth={1.75} />
                    </div>
                    <p className="mt-3 text-[13px] font-semibold text-[var(--text-strong)]">
                        Ready for your insights?
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        Use “Refresh insights” to analyze your health data.
                    </p>
                </div>
            )}
        </section>
        </Reveal>
    );
}
