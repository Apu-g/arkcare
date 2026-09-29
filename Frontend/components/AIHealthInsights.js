"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="nm-stat-icon shrink-0">
                        <Lightbulb className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <div>
                        <MaskedText as="h3" className="text-[13px] font-semibold leading-tight text-[var(--text-strong)]">
                            AI Health Insights
                        </MaskedText>
                        <CardDescription>Personalized analysis and recommendations.</CardDescription>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={generateInsights}
                    disabled={loading}
                    className="glass-interactive grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--surface)] text-[var(--text-muted)] shadow-[var(--shadow-card)] hover:text-[var(--text-strong)] disabled:opacity-50"
                    aria-label="Refresh insights"
                >
                    <RefreshCw className={`h-[18px] w-[18px] ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                </button>
            </CardHeader>
            <CardContent className="px-5 pb-5 md:px-6 md:pb-6">
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
                            <div className="glass-data rounded-[16px] p-4">
                                <h3 className="nm-card-title flex items-center gap-2">
                                    <Target className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                    Overall Assessment
                                </h3>
                                <p className="mt-1.5 text-[12.5px] leading-6 text-[var(--text-muted)]">
                                    {insights.overall_assessment}
                                </p>
                            </div>
                        )}

                        {/* Recommendations */}
                        {insights.recommendations?.length > 0 && (
                            <div className="space-y-2.5">
                                <h3 className="nm-card-title flex items-center gap-2">
                                    <TrendingUp className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                    Action Recommendations
                                </h3>
                                {insights.recommendations.map((rec, index) => (
                                    <div key={index} className="nm-row grid-cols-1 items-start gap-1 rounded-[16px] px-3.5 py-3">
                                        <div className="mb-1.5 flex items-start justify-between gap-2">
                                            <h4 className="text-[12.5px] font-semibold text-[var(--text-strong)]">
                                                {rec.title}
                                            </h4>
                                            {rec.priority && (
                                                <Badge variant={getPriorityVariant(rec.priority)}>
                                                    {rec.priority} priority
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[12px] leading-5 text-[var(--text-muted)]">
                                            {rec.description}
                                        </p>
                                        {rec.expected_impact && (
                                            <p className="mt-1.5 text-[11px] font-semibold text-[var(--success)]">
                                                Expected impact: {rec.expected_impact}
                                            </p>
                                        )}
                                    </div>
                                ))}
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
                            Click the refresh button to analyze your health data.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
        </Reveal>
    );
}
