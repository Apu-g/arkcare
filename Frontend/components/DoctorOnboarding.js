"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createDoctorProfile } from "@/actions/doctorActions";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";

const CATEGORIES = [
  "Cardiology",
  "Dermatology", 
  "Pediatrics",
  "Orthopedics",
  "Neurology",
  "Gynecology",
  "ENT",
  "Psychiatry",
  "General Medicine",
  "Surgery"
];

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00"
];

export default function DoctorOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialization: "",
    category: "",
    experience: "",
    qualifications: "",
    consultationFee: "",
    availability: DAYS.map(day => ({ day, slots: [], selected: false }))
  });

  // The account already knows who this doctor is.
  useEffect(() => {
    if (user?.fullName) {
      setFormData(prev => (prev.name ? prev : { ...prev, name: user.fullName }));
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayToggle = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map((avail, index) => 
        index === dayIndex 
          ? { ...avail, selected: !avail.selected, slots: !avail.selected ? [] : avail.slots }
          : avail
      )
    }));
  };

  const handleSlotToggle = (dayIndex, slot) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map((avail, index) => 
        index === dayIndex 
          ? {
              ...avail,
              slots: avail.slots.includes(slot)
                ? avail.slots.filter(s => s !== slot)
                : [...avail.slots, slot].sort()
            }
          : avail
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const qualificationsArray = formData.qualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      const availabilityData = formData.availability
        .filter(avail => avail.selected && avail.slots.length > 0)
        .map(avail => ({
          day: avail.day,
          slots: avail.slots
        }));

      const doctorData = {
        name: formData.name,
        phone: formData.phone,
        specialization: formData.specialization,
        category: formData.category,
        experience: parseInt(formData.experience),
        qualifications: qualificationsArray,
        consultationFee: parseFloat(formData.consultationFee),
        availability: availabilityData
      };

      await createDoctorProfile(doctorData);
    } catch (error) {
      console.error("Error creating profile:", error);
      setError(error.message || "Could not create doctor profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nm-stack mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* This page renders outside CareQuestShell, so it supplies its own page
          padding. Everything below the root uses the shared nm-* primitives. */}
        <Reveal>
        <section className="nm-dark-card p-6 md:p-7">
          <div className="flex flex-wrap gap-2">
            <span className="nm-dark-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dark-muted)]">Doctor onboarding</span>
            <span className="nm-dark-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dark-muted)]">Profile quest</span>
          </div>
          <MaskedText
            as="h1"
            className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--dark-text)] md:text-[22px]"
          >
            Build your care profile
          </MaskedText>
          <p className="mx-auto mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--dark-muted)]">
            Complete credentials, consultation details, and availability so patients can discover and book you.
          </p>
          <div className="mx-auto mt-5 max-w-sm">
            <div className="progress-track"><span /></div>
            <p className="mt-2 text-[11px] text-[var(--dark-muted)]">Profile setup · verification comes next</p>
          </div>
        </section>
        </Reveal>

        <form onSubmit={handleSubmit} className="nm-stack">
          {/* Each step is a ruled section, not a card. The form is one
              continuous document: rule, heading, lede, fields. */}
          <Reveal delay={60}>
          <section>
            <div className="section-rule">
              <span>Step 1</span>
            </div>
            <div className="section-head">
              <h2 className="section-title">Personal information</h2>
              <p className="section-lede">
                How patients and the care team reach you.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>
            </div>
          </section>
          </Reveal>

          <Reveal delay={120}>
          <section>
            <div className="section-rule">
              <span>Step 2</span>
            </div>
            <div className="section-head">
              <h2 className="section-title">Professional information</h2>
              <p className="section-lede">
                These credentials are what our team reviews before approving your
                profile.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization *</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="e.g. Internal Medicine"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger
                    id="category"
                    className="h-10 w-full rounded-[14px] border border-transparent bg-[var(--surface-subtle)] px-3.5 text-[14px] text-[var(--text)] shadow-[var(--shadow-inset)] focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experience">Years of experience *</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationFee">Consultation fee (₹) *</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.consultationFee}
                  onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="qualifications">Qualifications *</Label>
              <Textarea
                id="qualifications"
                className="min-h-[120px]"
                value={formData.qualifications}
                onChange={(e) => handleInputChange('qualifications', e.target.value)}
                placeholder="Enter qualifications separated by commas (e.g. MBBS, MD Internal Medicine, Fellowship in Cardiology)"
                required
              />
              <p className="text-[11px] text-muted-foreground">Separate multiple qualifications with commas</p>
            </div>
          </section>
          </Reveal>

          <Reveal delay={180}>
          <section>
            <div className="section-rule">
              <span>Step 3</span>
            </div>
            <div className="section-head">
              <h2 className="section-title">Availability</h2>
              <p className="section-lede">
                Select the days and time slots when you are available for
                consultations.
              </p>
            </div>
            <div className="nm-stack">
              {formData.availability.map((dayAvail, dayIndex) => (
                <div key={dayAvail.day} className="ledger-row grid-cols-1! items-start! gap-3!">
                  <div className="flex min-h-10 items-center gap-3">
                    <Checkbox
                      id={dayAvail.day}
                      checked={dayAvail.selected}
                      onCheckedChange={() => handleDayToggle(dayIndex)}
                      className="size-5 border-[var(--border-strong)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]"
                    />
                    <Label htmlFor={dayAvail.day} className="ledger-title">
                      {dayAvail.day}
                    </Label>
                  </div>

                  {dayAvail.selected && (
                    <div className="w-full space-y-3 pl-8">
                      <p className="text-[12px] text-muted-foreground">Select available time slots:</p>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                        {TIME_SLOTS.map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant={dayAvail.slots.includes(slot) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSlotToggle(dayIndex, slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                      {/* Selection count is a state indicator: icon + number,
                          never the celadon fill on its own. */}
                      {dayAvail.slots.length > 0 && (
                        <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--success)]">
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Selected: {dayAvail.slots.length} slots
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          </Reveal>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[16px] bg-[var(--destructive-soft)] px-4 py-3 text-[12px] leading-relaxed text-[var(--destructive)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              {error}
            </div>
          )}

          {/* Submit */}
          <Reveal delay={240}>
          <section>
            <div className="section-rule">
              <span>Step 4</span>
            </div>
            <div className="section-head">
              <h2 className="section-title">Submit for review</h2>
              <p className="section-lede">
                Your profile will be reviewed by our team and you&apos;ll be
                notified once approved.
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Creating Profile..." : "Submit for Review"}
            </Button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Your profile will be reviewed by our team and you&apos;ll be notified once approved.
            </p>
          </section>
          </Reveal>
        </form>
    </div>
  );
}
